<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/Transaccion.php';
require_once __DIR__ . '/../models/Cuenta.php';
require_once __DIR__ . '/../models/Categoria.php';

/**
 * Clase: GestorFinanciero
 * Métodos: crearMovimiento(), calcularPresupuestos(), sincronizarAPIBancaria()
 */
class GestorFinanciero {
    private PDO         $db;
    private Transaccion $txModel;
    private Cuenta      $cuentaModel;
    private Categoria   $catModel;

    public function __construct() {
        $this->db          = Database::getInstance()->getConnection();
        $this->txModel     = new Transaccion();
        $this->cuentaModel = new Cuenta();
        $this->catModel    = new Categoria();
    }

    // ── crearMovimiento() ────────────────────────────────────
    public function crearMovimiento(array $datos, int $idUsuario): array {
        $cuenta = $this->cuentaModel->findByUsuario($idUsuario);
        if (!$cuenta) throw new RuntimeException('Cuenta no encontrada');

        $idTx = $this->txModel->crear($datos, $cuenta->idCuenta, $idUsuario);

        // Redondeo hacia meta activa (UC05 extensión)
        $redondeo = 0.0;
        if (!empty($datos['aplicar_redondeo']) && $datos['tipo'] === 'gasto') {
            $stmt = $this->db->prepare(
                'SELECT * FROM metas_ahorro WHERE id_usuario = ? ORDER BY created_at LIMIT 1'
            );
            $stmt->execute([$idUsuario]);
            $row = $stmt->fetch();
            if ($row) {
                require_once __DIR__ . '/MetaAhorro.php';
                $meta     = new MetaAhorro($row);
                $redondeo = $meta->aplicarRedondeo((float)$datos['monto']);
            }
        }

        [$ing, $gas, $saldo] = $this->cuentaModel->sincronizarReporte($idUsuario);

        return [
            'id_transaccion' => $idTx,
            'saldo_actual'   => $saldo,
            'ingresos'       => $ing,
            'gastos'         => $gas,
            'redondeo'       => $redondeo,
        ];
    }

    // ── calcularPresupuestos() ───────────────────────────────
    public function calcularPresupuestos(int $idUsuario): array {
        $cuenta = $this->cuentaModel->findByUsuario($idUsuario);
        if (!$cuenta) return [];

        $cats = $this->catModel->findAllByUsuario($idUsuario);
        return array_map(function($c) use ($cuenta) {
            $cat = new Categoria($c + ['id_usuario' => 0]);
            // Reconstruir objeto correctamente
            $stmt = Database::getInstance()->getConnection()->prepare(
                'SELECT * FROM categorias WHERE id_categoria = ?'
            );
            $stmt->execute([$c['id_categoria']]);
            $row = $stmt->fetch();
            if (!$row) return $c;
            $catObj  = new Categoria($row);
            $gastado = $catObj->obtenerMontoGastado($cuenta->idCuenta);
            return [
                'id_categoria'        => $c['id_categoria'],
                'nombre'              => $c['nombre'],
                'codigo_color'        => $c['codigo_color'],
                'presupuesto_mensual' => $c['presupuesto_mensual'],
                'gastado'             => $gastado,
                'fuera_presupuesto'   => ($c['presupuesto_mensual'] > 0 && $gastado > $c['presupuesto_mensual']),
            ];
        }, $cats);
    }

    // ── sincronizarAPIBancaria() ─────────────────────────────
    public function sincronizarAPIBancaria(int $idUsuario): array {
        [$ing, $gas, $saldo] = $this->cuentaModel->sincronizarReporte($idUsuario);
        return ['sincronizado' => true, 'saldo' => $saldo,
                'ingresos' => $ing, 'gastos' => $gas,
                'timestamp' => date('c')];
    }

    // ── gastosPorCategoria() ─────────────────────────────────
    public function gastosPorCategoria(int $idUsuario, ?string $mes = null): array {
        $mes   = $mes ?? date('Y-m');
        $cuenta = $this->cuentaModel->findByUsuario($idUsuario);
        if (!$cuenta) return [];

        $stmt = $this->db->prepare(
            'SELECT c.nombre, c.codigo_color,
                    COALESCE(SUM(t.monto),0) AS total
             FROM categorias c
             LEFT JOIN transacciones t
                ON t.id_categoria = c.id_categoria
               AND t.id_cuenta = ?
               AND t.tipo = "gasto"
               AND DATE_FORMAT(t.fecha, "%Y-%m") = ?
             WHERE c.id_usuario = ?
             GROUP BY c.id_categoria, c.nombre, c.codigo_color
             HAVING total > 0
             ORDER BY total DESC'
        );
        $stmt->execute([$cuenta->idCuenta, $mes, $idUsuario]);
        return $stmt->fetchAll();
    }

    // ── flujoMensual() — últimos 6 meses ────────────────────
    public function flujoMensual(int $idUsuario): array {
        $cuenta = $this->cuentaModel->findByUsuario($idUsuario);
        if (!$cuenta) return [];

        $stmt = $this->db->prepare(
            'SELECT DATE_FORMAT(fecha, "%Y-%m") AS mes,
                    tipo,
                    COALESCE(SUM(monto), 0) AS total
             FROM transacciones
             WHERE id_cuenta = ?
               AND fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
             GROUP BY mes, tipo
             ORDER BY mes'
        );
        $stmt->execute([$cuenta->idCuenta]);
        $rows = $stmt->fetchAll();

        $meses = [];
        foreach ($rows as $r) {
            $meses[$r['mes']][$r['tipo']] = (float)$r['total'];
        }
        $result = [];
        foreach ($meses as $mes => $vals) {
            $result[] = [
                'mes'      => $mes,
                'ingresos' => $vals['ingreso'] ?? 0,
                'gastos'   => $vals['gasto']   ?? 0,
            ];
        }
        return $result;
    }
}
