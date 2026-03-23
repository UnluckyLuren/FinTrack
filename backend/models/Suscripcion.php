<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Clase: Suscripcion
 * Atributos: idSuscripcion, nombreServicio, costo, frecuenciaCobro, proximaFechaPago
 * Métodos:   estimarCostoAnual(), estimarCostoMensual(), estimarCostoSemanal(),
 *            recordatorioCancelacion()
 */
class Suscripcion {
    private PDO $db;

    public int    $idSuscripcion;
    public int    $idUsuario;
    public string $nombreServicio   = '';
    public string $emoji            = '💳';
    public float  $costo            = 0.0;
    public string $frecuenciaCobro  = 'mensual';
    public string $proximaFechaPago = '';
    public bool   $esRecurrente     = true;

    private array $factores = [
        'semanal'    => ['anual' => 52,   'mensual' => 4.33, 'semanal' => 1],
        'mensual'    => ['anual' => 12,   'mensual' => 1,    'semanal' => 1/4.33],
        'trimestral' => ['anual' => 4,    'mensual' => 1/3,  'semanal' => 1/13],
        'anual'      => ['anual' => 1,    'mensual' => 1/12, 'semanal' => 1/52],
    ];

    public function __construct(array $row = []) {
        $this->db = Database::getInstance()->getConnection();
        if ($row) $this->hydrate($row);
    }

    private function hydrate(array $r): void {
        $this->idSuscripcion   = (int)$r['id_suscripcion'];
        $this->idUsuario       = (int)$r['id_usuario'];
        $this->nombreServicio  = $r['nombre_servicio'];
        $this->emoji           = $r['emoji'] ?? '💳';
        $this->costo           = (float)$r['costo'];
        $this->frecuenciaCobro = $r['frecuencia_cobro'];
        $this->proximaFechaPago= $r['proxima_fecha_pago'];
        $this->esRecurrente    = (bool)$r['es_recurrente'];
    }

    public function findAllByUsuario(int $idUsuario): array {
        $stmt = $this->db->prepare(
            'SELECT * FROM suscripciones WHERE id_usuario = ? ORDER BY proxima_fecha_pago'
        );
        $stmt->execute([$idUsuario]);
        return array_map(function($r) {
            $s = new self($r);
            $arr = $s->toArray();
            $arr['costo_mensual'] = round($s->estimarCostoMensual(), 2);
            $arr['costo_anual']   = round($s->estimarCostoAnual(), 2);
            $arr['recordatorio']  = $s->recordatorioCancelacion();
            return $arr;
        }, $stmt->fetchAll());
    }

    // ── estimarCostoAnual() : float ──────────────────────────
    public function estimarCostoAnual(): float {
        return $this->costo * ($this->factores[$this->frecuenciaCobro]['anual'] ?? 12);
    }

    // ── estimarCostoMensual() : float ────────────────────────
    public function estimarCostoMensual(): float {
        return $this->costo * ($this->factores[$this->frecuenciaCobro]['mensual'] ?? 1);
    }

    // ── estimarCostoSemanal() : float ────────────────────────
    public function estimarCostoSemanal(): float {
        return $this->costo * ($this->factores[$this->frecuenciaCobro]['semanal'] ?? 0.23);
    }

    // ── recordatorioCancelacion() : string|null ───────────────
    public function recordatorioCancelacion(): ?string {
        $diff = (new DateTime($this->proximaFechaPago))->diff(new DateTime())->days;
        $dias = (int)((new DateTime())->diff(new DateTime($this->proximaFechaPago))->days);
        if (strtotime($this->proximaFechaPago) < time()) return null;
        return $dias <= 7 ? "⚠️ Cobro de {$this->nombreServicio} en {$dias} días" : null;
    }

    public function crear(int $idUsuario, array $datos): int {
        $stmt = $this->db->prepare(
            'INSERT INTO suscripciones
                (id_usuario, nombre_servicio, emoji, costo, frecuencia_cobro, proxima_fecha_pago)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $idUsuario,
            $datos['nombre_servicio'],
            $datos['emoji'] ?? '💳',
            $datos['costo'],
            $datos['frecuencia_cobro'],
            $datos['proxima_fecha_pago'],
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function eliminar(int $id, int $idUsuario): bool {
        $stmt = $this->db->prepare(
            'DELETE FROM suscripciones WHERE id_suscripcion = ? AND id_usuario = ?'
        );
        $stmt->execute([$id, $idUsuario]);
        return $stmt->rowCount() > 0;
    }

    public function marcarNoRecurrente(int $id, int $idUsuario): bool {
        $stmt = $this->db->prepare(
            'UPDATE suscripciones SET es_recurrente = 0
             WHERE id_suscripcion = ? AND id_usuario = ?'
        );
        $stmt->execute([$id, $idUsuario]);
        return $stmt->rowCount() > 0;
    }

    public function toArray(): array {
        return [
            'id_suscripcion'     => $this->idSuscripcion,
            'nombre_servicio'    => $this->nombreServicio,
            'emoji'              => $this->emoji,
            'costo'              => $this->costo,
            'frecuencia_cobro'   => $this->frecuenciaCobro,
            'proxima_fecha_pago' => $this->proximaFechaPago,
            'es_recurrente'      => $this->esRecurrente,
        ];
    }
}
