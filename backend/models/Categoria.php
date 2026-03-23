<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Clase: Categoria
 * Atributos: idCategoria, nombre, presupuestoMensual, codigoColor
 * Métodos:   obtenerMontoGastado(), estaFueraDePresupuesto()
 */
class Categoria {
    private PDO $db;

    public int    $idCategoria;
    public int    $idUsuario;
    public string $nombre              = '';
    public float  $presupuestoMensual  = 0.0;
    public string $codigoColor         = '#00e5a0';

    public function __construct(array $row = []) {
        $this->db = Database::getInstance()->getConnection();
        if ($row) $this->hydrate($row);
    }

    private function hydrate(array $r): void {
        $this->idCategoria       = (int)$r['id_categoria'];
        $this->idUsuario         = (int)$r['id_usuario'];
        $this->nombre            = $r['nombre'];
        $this->presupuestoMensual= (float)$r['presupuesto_mensual'];
        $this->codigoColor       = $r['codigo_color'];
    }

    public function findAllByUsuario(int $idUsuario): array {
        $stmt = $this->db->prepare(
            'SELECT * FROM categorias WHERE id_usuario = ? ORDER BY nombre'
        );
        $stmt->execute([$idUsuario]);
        return array_map(fn($r) => (new self($r))->toArray(), $stmt->fetchAll());
    }

    // ── obtenerMontoGastado() : float ────────────────────────
    public function obtenerMontoGastado(int $idCuenta, ?string $mesAnio = null): float {
        $mes = $mesAnio ?? date('Y-m');
        $stmt = $this->db->prepare(
            'SELECT COALESCE(SUM(t.monto),0) AS total
             FROM transacciones t
             WHERE t.id_cuenta = ? AND t.id_categoria = ?
               AND t.tipo = "gasto"
               AND DATE_FORMAT(t.fecha, "%Y-%m") = ?'
        );
        $stmt->execute([$idCuenta, $this->idCategoria, $mes]);
        return (float)$stmt->fetchColumn();
    }

    // ── estaFueraDePresupuesto() : booleano ──────────────────
    public function estaFueraDePresupuesto(int $idCuenta): bool {
        if ($this->presupuestoMensual <= 0) return false;
        return $this->obtenerMontoGastado($idCuenta) > $this->presupuestoMensual;
    }

    public function crear(int $idUsuario, string $nombre, float $presupuesto, string $color): int {
        $stmt = $this->db->prepare(
            'INSERT INTO categorias (id_usuario, nombre, presupuesto_mensual, codigo_color)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$idUsuario, $nombre, $presupuesto, $color]);
        return (int)$this->db->lastInsertId();
    }

    public function eliminar(int $idCategoria, int $idUsuario): bool {
        $stmt = $this->db->prepare(
            'DELETE FROM categorias WHERE id_categoria = ? AND id_usuario = ?'
        );
        $stmt->execute([$idCategoria, $idUsuario]);
        return $stmt->rowCount() > 0;
    }

    public function toArray(): array {
        return [
            'id_categoria'        => $this->idCategoria,
            'nombre'              => $this->nombre,
            'presupuesto_mensual' => $this->presupuestoMensual,
            'codigo_color'        => $this->codigoColor,
        ];
    }
}
