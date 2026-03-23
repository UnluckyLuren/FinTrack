<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Clase: MetaAhorro
 * Atributos: idMeta, nombre, montoObjetivo, ahorroActual, fechaLimite
 * Métodos:   porcentajeProgreso(), aplicarRedondeo()
 */
class MetaAhorro {
    private PDO $db;

    public int    $idMeta;
    public int    $idUsuario;
    public string $nombre         = '';
    public string $emoji          = '🎯';
    public float  $montoObjetivo  = 0.0;
    public float  $ahorroActual   = 0.0;
    public string $fechaLimite    = '';

    public function __construct(array $row = []) {
        $this->db = Database::getInstance()->getConnection();
        if ($row) $this->hydrate($row);
    }

    private function hydrate(array $r): void {
        $this->idMeta        = (int)$r['id_meta'];
        $this->idUsuario     = (int)$r['id_usuario'];
        $this->nombre        = $r['nombre'];
        $this->emoji         = $r['emoji'] ?? '🎯';
        $this->montoObjetivo = (float)$r['monto_objetivo'];
        $this->ahorroActual  = (float)$r['ahorro_actual'];
        $this->fechaLimite   = $r['fecha_limite'];
    }

    public function findAllByUsuario(int $idUsuario): array {
        $stmt = $this->db->prepare(
            'SELECT * FROM metas_ahorro WHERE id_usuario = ? ORDER BY fecha_limite'
        );
        $stmt->execute([$idUsuario]);
        return array_map(function($r) {
            $m   = new self($r);
            $arr = $m->toArray();
            $arr['porcentaje_progreso'] = $m->porcentajeProgreso();
            $arr['dias_restantes']      = $m->diasRestantes();
            return $arr;
        }, $stmt->fetchAll());
    }

    public function findById(int $id): ?self {
        $stmt = $this->db->prepare('SELECT * FROM metas_ahorro WHERE id_meta = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? new self($row) : null;
    }

    // ── porcentajeProgreso() : int ────────────────────────────
    public function porcentajeProgreso(): int {
        if ($this->montoObjetivo <= 0) return 0;
        return (int)min(100, round(($this->ahorroActual / $this->montoObjetivo) * 100));
    }

    // ── aplicarRedondeo() : vacio ────────────────────────────
    public function aplicarRedondeo(float $monto): float {
        $redondeo = ceil($monto) - $monto;
        if ($redondeo > 0) {
            $this->ahorroActual += $redondeo;
            $stmt = $this->db->prepare(
                'UPDATE metas_ahorro SET ahorro_actual = ahorro_actual + ? WHERE id_meta = ?'
            );
            $stmt->execute([$redondeo, $this->idMeta]);
        }
        return $redondeo;
    }

    public function diasRestantes(): int {
        $diff = (new DateTime())->diff(new DateTime($this->fechaLimite));
        return max(0, $diff->invert ? 0 : $diff->days);
    }

    public function crear(int $idUsuario, array $datos): int {
        $stmt = $this->db->prepare(
            'INSERT INTO metas_ahorro (id_usuario, nombre, emoji, monto_objetivo, ahorro_actual, fecha_limite)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $idUsuario,
            $datos['nombre'],
            $datos['emoji'] ?? '🎯',
            $datos['monto_objetivo'],
            $datos['ahorro_actual'] ?? 0,
            $datos['fecha_limite'],
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function abonar(int $idMeta, float $monto, int $idUsuario): float {
        $stmt = $this->db->prepare(
            'UPDATE metas_ahorro SET ahorro_actual = ahorro_actual + ?
             WHERE id_meta = ? AND id_usuario = ?'
        );
        $stmt->execute([$monto, $idMeta, $idUsuario]);
        $meta = $this->findById($idMeta);
        return $meta ? $meta->porcentajeProgreso() : 0;
    }

    public function transferirACuenta(int $idMeta, int $idUsuario, int $idCuenta): ?float {
        $meta = $this->findById($idMeta);
        if (!$meta || $meta->idUsuario !== $idUsuario) return null;
        // Eliminar meta
        $this->db->prepare('DELETE FROM metas_ahorro WHERE id_meta = ?')->execute([$idMeta]);
        return $meta->ahorroActual;
    }

    public function eliminar(int $id, int $idUsuario): bool {
        $stmt = $this->db->prepare(
            'DELETE FROM metas_ahorro WHERE id_meta = ? AND id_usuario = ?'
        );
        $stmt->execute([$id, $idUsuario]);
        return $stmt->rowCount() > 0;
    }

    public function toArray(): array {
        return [
            'id_meta'        => $this->idMeta,
            'nombre'         => $this->nombre,
            'emoji'          => $this->emoji,
            'monto_objetivo' => $this->montoObjetivo,
            'ahorro_actual'  => $this->ahorroActual,
            'fecha_limite'   => $this->fechaLimite,
        ];
    }
}
