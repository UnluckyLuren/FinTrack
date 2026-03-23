<?php
/**
 * api/transacciones.php — UC01: Registrar Gasto/Ingreso
 * GET    ?action=list
 * POST   ?action=create
 * DELETE ?action=delete&id=X
 * GET    ?action=sugerir&id_categoria=X
 * GET    ?action=dashboard  (resumen para UC03)
 */
require_once __DIR__ . '/../middleware/Response.php';
require_once __DIR__ . '/../middleware/Session.php';
require_once __DIR__ . '/../models/Transaccion.php';
require_once __DIR__ . '/../models/Cuenta.php';
require_once __DIR__ . '/../models/GestorFinanciero.php';

Response::init();
$user   = Session::requireAuth();
$action = $_GET['action'] ?? 'list';
$gf     = new GestorFinanciero();
$txModel= new Transaccion();
$ctaM   = new Cuenta();

switch ($action) {

    // ── LISTAR ──────────────────────────────────────────────
    case 'list':
        $cuenta = $ctaM->findByUsuario($user['id_usuario']);
        if (!$cuenta) Response::error('Cuenta no encontrada.', 404);
        $filtros = [
            'tipo'         => $_GET['tipo']         ?? null,
            'id_categoria' => $_GET['id_categoria'] ?? null,
            'mes'          => $_GET['mes']           ?? null,
        ];
        $txs = $txModel->findByCuenta($cuenta->idCuenta, array_filter($filtros));
        Response::success($txs);
        break;

    // ── CREAR (UC01) ─────────────────────────────────────────
    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') Response::error('Método no permitido', 405);
        $datos = Response::body();
        // Validar campos requeridos
        if (empty($datos['monto']) || (float)$datos['monto'] <= 0)
            Response::error('El monto debe ser un valor numérico positivo.');
        if (empty($datos['fecha']))
            Response::error('La fecha es requerida.');
        if (empty($datos['tipo']) || !in_array($datos['tipo'], ['ingreso','gasto']))
            Response::error('El tipo debe ser "ingreso" o "gasto".');

        try {
            $res = $gf->crearMovimiento($datos, $user['id_usuario']);
            Response::success($res, 'Movimiento registrado exitosamente.', 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 500);
        }
        break;

    // ── ELIMINAR ─────────────────────────────────────────────
    case 'delete':
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') Response::error('Método no permitido', 405);
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) Response::error('ID requerido.');
        $ok = $txModel->eliminar($id, $user['id_usuario']);
        if (!$ok) Response::error('Transacción no encontrada.', 404);
        [$ing,$gas,$saldo] = (new Cuenta())->sincronizarReporte($user['id_usuario']);
        Response::success(['saldo_actual' => $saldo], 'Transacción eliminada.');
        break;

    // ── SUGERIR MONTO HISTÓRICO ───────────────────────────────
    case 'sugerir':
        $idCat  = (int)($_GET['id_categoria'] ?? 0);
        $cuenta = $ctaM->findByUsuario($user['id_usuario']);
        if (!$cuenta || !$idCat) Response::success(['monto' => null]);
        $avg = $txModel->sugerirMonto($cuenta->idCuenta, $idCat);
        Response::success(['monto' => $avg]);
        break;

    // ── DASHBOARD (UC03) ─────────────────────────────────────
    case 'dashboard':
        [$ing,$gas,$saldo] = (new Cuenta())->sincronizarReporte($user['id_usuario']);
        $cuenta = $ctaM->findByUsuario($user['id_usuario']);
        $txs    = $txModel->findByCuenta($cuenta->idCuenta);
        $ultimas= array_slice($txs, 0, 8);
        $porCat = $gf->gastosPorCategoria($user['id_usuario']);
        $flujo  = $gf->flujoMensual($user['id_usuario']);
        $presup = $gf->calcularPresupuestos($user['id_usuario']);
        Response::success([
            'saldo_actual'         => $saldo,
            'total_ingresos'       => $ing,
            'total_gastos'         => $gas,
            'total_transacciones'  => count($txs),
            'ultimas_transacciones'=> $ultimas,
            'gastos_por_categoria' => $porCat,
            'flujo_mensual'        => $flujo,
            'presupuestos'         => $presup,
            'cuenta'               => $cuenta?->toArray(),
        ]);
        break;

    default:
        Response::error('Acción no encontrada.', 404);
}
