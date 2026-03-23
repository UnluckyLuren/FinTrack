<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/AuditLog.php';

/**
 * Clase: Cuenta
 * Atributos: idCuenta, tipo, hashContrasena, saldoActual,
 *            nombreInstitucion, ultimaSincronizacion
 * Métodos:   sincronizarReporte(), obtenerEstadoCuenta()
 */
class Cuenta {
    private PDO $db;

    public int    $idCuenta;
    public int    $idUsuario;
    public string $tipo                 = 'débito';
    public float  $saldoActual          = 0.0;
    public string $nombreInstitucion    = 'FinTrack Personal';
    public string $ultimaSincronizacion = '';

    public function __construct(array $row = []) {
        $this->db = Database::getInstance()->getConnection();
        if ($row) $this->hydrate($row);
    }

    private function hydrate(array $r): void {
        $this->idCuenta             = (int)$r['id_cuenta'];
        $this->idUsuario            = (int)$r['id_usuario'];
        $this->tipo                 = $r['tipo'];
        $this->saldoActual          = (float)$r['saldo_actual'];
        $this->nombreInstitucion    = $r['nombre_institucion'];
        $this->ultimaSincronizacion = $r['ultima_sincronizacion'] ?? '';
    }

    public function findByUsuario(int $idUsuario): ?self {
        $stmt = $this->db->prepare(
            'SELECT * FROM cuentas WHERE id_usuario = ? LIMIT 1'
        );
        $stmt->execute([$idUsuario]);
        $row = $stmt->fetch();
        return $row ? new self($row) : null;
    }

    // ── sincronizarReporte() : array ─────────────────────────
    public function sincronizarReporte(int $idUsuario): array {
        $cuenta = $this->findByUsuario($idUsuario);
        if (!$cuenta) return [0, 0, 0];

        $stmt = $this->db->prepare(
            'SELECT tipo, COALESCE(SUM(monto),0) AS total
             FROM transacciones
             WHERE id_cuenta = ?
             GROUP BY tipo'
        );
        $stmt->execute([$cuenta->idCuenta]);
        $rows = $stmt->fetchAll();

        $ingresos = 0.0;
        $gastos   = 0.0;
        foreach ($rows as $r) {
            if ($r['tipo'] === 'ingreso') $ingresos = (float)$r['total'];
            else                          $gastos   = (float)$r['total'];
        }
        $saldo = $ingresos - $gastos;

        $this->db->prepare(
            'UPDATE cuentas
             SET saldo_actual = ?, ultima_sincronizacion = NOW()
             WHERE id_cuenta = ?'
        )->execute([$saldo, $cuenta->idCuenta]);

        return [$ingresos, $gastos, $saldo];
    }

    // ── obtenerEstadoCuenta() : string ────────────────────────
    public function obtenerEstadoCuenta(int $idUsuario): string {
        [$ing, $gas, $saldo] = $this->sincronizarReporte($idUsuario);
        $c = $this->findByUsuario($idUsuario);
        return "Cuenta {$c->tipo} — {$c->nombreInstitucion} | " .
               "Ingresos: \${$ing} | Gastos: \${$gas} | Saldo: \${$saldo}";
    }

    public function toArray(): array {
        return [
            'id_cuenta'             => $this->idCuenta,
            'tipo'                  => $this->tipo,
            'saldo_actual'          => $this->saldoActual,
            'nombre_institucion'    => $this->nombreInstitucion,
            'ultima_sincronizacion' => $this->ultimaSincronizacion,
        ];
    }
}
