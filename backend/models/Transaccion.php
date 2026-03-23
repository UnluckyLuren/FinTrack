<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/AuditLog.php';

/**
 * Clase: Transaccion
 * Atributos: idTransaccion, monto, fecha, descripcion, esAutomatizada
 * Métodos:   actualizarCategoria(), dividirTransaccion()
 */
class Transaccion {
    private PDO $db;

    public int    $idTransaccion;
    public int    $idCuenta;
    public ?int   $idCategoria   = null;
    public float  $monto;
    public string $fecha;
    public string $descripcion   = '';
    public string $tipo;
    public bool   $esAutomatizada= false;

    public function __construct(array $row = []) {
        $this->db = Database::getInstance()->getConnection();
        if ($row) $this->hydrate($row);
    }

    private function hydrate(array $r): void {
        $this->idTransaccion  = (int)$r['id_transaccion'];
        $this->idCuenta       = (int)$r['id_cuenta'];
        $this->idCategoria    = isset($r['id_categoria']) ? (int)$r['id_categoria'] : null;
        $this->monto          = (float)$r['monto'];
        $this->fecha          = $r['fecha'];
        $this->descripcion    = $r['descripcion'] ?? '';
        $this->tipo           = $r['tipo'];
        $this->esAutomatizada = (bool)($r['es_automatizada'] ?? false);
    }

    // ── Listar por cuenta con JOIN de categoría ───────────────
    public function findByCuenta(int $idCuenta, array $filtros = []): array {
        $sql = 'SELECT t.*, c.nombre AS categoria_nombre, c.codigo_color
                FROM transacciones t
                LEFT JOIN categorias c ON t.id_categoria = c.id_categoria
                WHERE t.id_cuenta = ?';
        $params = [$idCuenta];

        if (!empty($filtros['tipo'])) {
            $sql .= ' AND t.tipo = ?';
            $params[] = $filtros['tipo'];
        }
        if (!empty($filtros['id_categoria'])) {
            $sql .= ' AND t.id_categoria = ?';
            $params[] = $filtros['id_categoria'];
        }
        if (!empty($filtros['mes'])) {
            $sql .= ' AND DATE_FORMAT(t.fecha, "%Y-%m") = ?';
            $params[] = $filtros['mes'];
        }
        $sql .= ' ORDER BY t.fecha DESC, t.id_transaccion DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // ── Crear transacción ────────────────────────────────────
    public function crear(array $datos, int $idCuenta, int $idUsuario): int {
        $stmt = $this->db->prepare(
            'INSERT INTO transacciones
                (id_cuenta, id_categoria, monto, fecha, descripcion, tipo, es_automatizada)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $idCuenta,
            $datos['id_categoria'] ?? null,
            (float)$datos['monto'],
            $datos['fecha'],
            $datos['descripcion'] ?? '',
            $datos['tipo'],
            $datos['es_automatizada'] ?? 0,
        ]);
        $id = (int)$this->db->lastInsertId();
        AuditLog::registrar($idUsuario, 'CREATE', 'transacciones', (string)$id,
            [], $datos);
        return $id;
    }

    // ── actualizarCategoria() : vacio ────────────────────────
    public function actualizarCategoria(int $idTransaccion, int $idCat, int $idUsuario): void {
        $stmt = $this->db->prepare(
            'UPDATE transacciones SET id_categoria = ?
             WHERE id_transaccion = ?'
        );
        $stmt->execute([$idCat, $idTransaccion]);
        AuditLog::registrar($idUsuario, 'UPDATE_CAT', 'transacciones', (string)$idTransaccion);
    }

    // ── dividirTransaccion() : array ─────────────────────────
    public function dividirTransaccion(int $idTransaccion, array $montos, int $idCuenta, int $idUsuario): array {
        $original = $this->findById($idTransaccion);
        if (!$original) return [];
        $ids = [];
        foreach ($montos as $i => $monto) {
            $ids[] = $this->crear([
                'monto'       => $monto,
                'fecha'       => $original['fecha'],
                'descripcion' => $original['descripcion'] . ' (parte ' . ($i+1) . ')',
                'tipo'        => $original['tipo'],
                'id_categoria'=> $original['id_categoria'],
                'es_automatizada' => 0,
            ], $idCuenta, $idUsuario);
        }
        // Eliminar original
        $this->eliminar($idTransaccion, $idUsuario);
        return $ids;
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare('SELECT * FROM transacciones WHERE id_transaccion = ?');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    public function eliminar(int $id, int $idUsuario): bool {
        $ant  = $this->findById($id);
        $stmt = $this->db->prepare('DELETE FROM transacciones WHERE id_transaccion = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() > 0) {
            AuditLog::registrar($idUsuario, 'DELETE', 'transacciones', (string)$id, $ant ?? []);
            return true;
        }
        return false;
    }

    // ── Sugerir monto histórico por categoría ────────────────
    public function sugerirMonto(int $idCuenta, int $idCategoria): ?float {
        $stmt = $this->db->prepare(
            'SELECT AVG(monto) FROM transacciones
             WHERE id_cuenta = ? AND id_categoria = ? AND tipo = "gasto"'
        );
        $stmt->execute([$idCuenta, $idCategoria]);
        $avg = $stmt->fetchColumn();
        return $avg ? round((float)$avg, 2) : null;
    }
}
