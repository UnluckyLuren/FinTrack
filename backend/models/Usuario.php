<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/AuditLog.php';

/**
 * Clase: Usuario
 * Diagrama de Clases — FinTrack
 * Atributos: idUsuario, correoElectronico, #hashContrasena,
 *            secretoMFA, consentimiento, ultimoAcceso
 * Métodos:   autenticar(), cerrarSesion(), habilitarMFA(),
 *            exportarDatosPersonales()
 */
class Usuario {
    private PDO $db;

    public int    $idUsuario;
    public string $correoElectronico;
    private string $hashContrasena;
    public string $secretoMFA        = '';
    public bool   $consentimiento    = true;
    public string $ultimoAcceso;
    public int    $intentosFallidos  = 0;
    public ?string $bloqueadoHasta   = null;

    public function __construct(array $row = []) {
        $this->db = Database::getInstance()->getConnection();
        if ($row) $this->hydrate($row);
    }

    private function hydrate(array $r): void {
        $this->idUsuario          = (int)$r['id_usuario'];
        $this->correoElectronico  = $r['correo_electronico'];
        $this->hashContrasena     = $r['hash_contrasena'];
        $this->secretoMFA         = $r['secreto_mfa']       ?? '';
        $this->consentimiento     = (bool)$r['consentimiento'];
        $this->ultimoAcceso       = $r['ultimo_acceso']      ?? '';
        $this->intentosFallidos   = (int)($r['intentos_fallidos'] ?? 0);
        $this->bloqueadoHasta     = $r['bloqueado_hasta']    ?? null;
    }

    // ── Buscar por correo ────────────────────────────────────
    public function findByEmail(string $email): ?self {
        $stmt = $this->db->prepare(
            'SELECT * FROM usuarios WHERE correo_electronico = ? LIMIT 1'
        );
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        if (!$row) return null;
        return new self($row);
    }

    public function findById(int $id): ?self {
        $stmt = $this->db->prepare('SELECT * FROM usuarios WHERE id_usuario = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? new self($row) : null;
    }

    // ── autenticar() : booleano ──────────────────────────────
    public function autenticar(string $pass): bool {
        return password_verify($pass, $this->hashContrasena);
    }

    // ── cerrarSesion() : vacio ───────────────────────────────
    public function cerrarSesion(): void {
        $stmt = $this->db->prepare(
            'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?'
        );
        $stmt->execute([$this->idUsuario]);
        AuditLog::registrar($this->idUsuario, 'LOGOUT', 'usuarios', (string)$this->idUsuario);
    }

    // ── habilitarMFA() : vacio ───────────────────────────────
    public function habilitarMFA(): string {
        $secreto = bin2hex(random_bytes(16));
        $stmt    = $this->db->prepare(
            'UPDATE usuarios SET secreto_mfa = ? WHERE id_usuario = ?'
        );
        $stmt->execute([$secreto, $this->idUsuario]);
        $this->secretoMFA = $secreto;
        return $secreto;
    }

    // ── exportarDatosPersonales() : JSON ────────────────────
    public function exportarDatosPersonales(): array {
        AuditLog::registrar($this->idUsuario, 'EXPORT', 'usuarios', (string)$this->idUsuario);
        return [
            'id_usuario'         => $this->idUsuario,
            'correo_electronico' => $this->correoElectronico,
            'consentimiento'     => $this->consentimiento,
            'ultimo_acceso'      => $this->ultimoAcceso,
            'exportado_en'       => date('c'),
        ];
    }

    // ── Actualizar último acceso ─────────────────────────────
    public function actualizarUltimoAcceso(): void {
        $stmt = $this->db->prepare(
            'UPDATE usuarios SET ultimo_acceso = NOW(), intentos_fallidos = 0 WHERE id_usuario = ?'
        );
        $stmt->execute([$this->idUsuario]);
    }

    // ── Registrar intento fallido ────────────────────────────
    public function registrarIntentoFallido(): int {
        $stmt = $this->db->prepare(
            'UPDATE usuarios SET intentos_fallidos = intentos_fallidos + 1 WHERE id_usuario = ?'
        );
        $stmt->execute([$this->idUsuario]);
        $this->intentosFallidos++;
        return $this->intentosFallidos;
    }

    // ── Bloquear cuenta ──────────────────────────────────────
    public function bloquearCuenta(int $segundos = 60): void {
        $stmt = $this->db->prepare(
            'UPDATE usuarios SET bloqueado_hasta = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id_usuario = ?'
        );
        $stmt->execute([$segundos, $this->idUsuario]);
    }

    // ── Cambiar contraseña ───────────────────────────────────
    public function cambiarContrasena(string $nuevaPass): void {
        $hash = password_hash($nuevaPass, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare(
            'UPDATE usuarios SET hash_contrasena = ? WHERE id_usuario = ?'
        );
        $stmt->execute([$hash, $this->idUsuario]);
        AuditLog::registrar($this->idUsuario, 'CHANGE_PASSWORD', 'usuarios', (string)$this->idUsuario);
    }

    // ── Crear usuario ────────────────────────────────────────
    public function crear(string $email, string $pass): int {
        $hash = password_hash($pass, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare(
            'INSERT INTO usuarios (correo_electronico, hash_contrasena) VALUES (?, ?)'
        );
        $stmt->execute([$email, $hash]);
        $id = (int)$this->db->lastInsertId();
        // Crear cuenta por defecto
        $stmt2 = $this->db->prepare(
            'INSERT INTO cuentas (id_usuario, tipo, nombre_institucion) VALUES (?, "débito", "FinTrack Personal")'
        );
        $stmt2->execute([$id]);
        // Crear categorías por defecto
        $cats = [
            ['Alimentación',    5000, '#10b981'],
            ['Transporte',      1500, '#3b82f6'],
            ['Entretenimiento',  800, '#8b5cf6'],
            ['Salud',           2000, '#f43f5e'],
            ['Servicios',       1200, '#f59e0b'],
            ['Educación',       1000, '#ec4899'],
            ['Ingresos',           0, '#00e5a0'],
        ];
        $stmtC = $this->db->prepare(
            'INSERT INTO categorias (id_usuario, nombre, presupuesto_mensual, codigo_color) VALUES (?,?,?,?)'
        );
        foreach ($cats as $c) $stmtC->execute([$id, $c[0], $c[1], $c[2]]);
        return $id;
    }

    public function toArray(): array {
        return [
            'id_usuario'         => $this->idUsuario,
            'correo_electronico' => $this->correoElectronico,
            'consentimiento'     => $this->consentimiento,
            'ultimo_acceso'      => $this->ultimoAcceso,
            'secreto_mfa'        => !empty($this->secretoMFA) ? 'habilitado' : 'deshabilitado',
        ];
    }
}
