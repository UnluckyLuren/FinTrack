<?php
/**
 * api/dashboard.php — UC03: Consultar Dashboard
 * Endpoint único que provee todos los datos del dashboard
 */
require_once __DIR__ . '/../middleware/Response.php';
require_once __DIR__ . '/../middleware/Session.php';
require_once __DIR__ . '/../models/GestorFinanciero.php';
require_once __DIR__ . '/../models/Cuenta.php';
require_once __DIR__ . '/../models/Transaccion.php';

Response::init();
$user = Session::requireAuth();

$gf     = new GestorFinanciero();
$ctaM   = new Cuenta();
$txM    = new Transaccion();

[$ing, $gas, $saldo] = $ctaM->sincronizarReporte($user['id_usuario']);
$cuenta  = $ctaM->findByUsuario($user['id_usuario']);
$txs     = $cuenta ? $txM->findByCuenta($cuenta->idCuenta) : [];

Response::success([
    'saldo_actual'         => $saldo,
    'total_ingresos'       => $ing,
    'total_gastos'         => $gas,
    'total_transacciones'  => count($txs),
    'ultimas_transacciones'=> array_slice($txs, 0, 8),
    'gastos_por_categoria' => $gf->gastosPorCategoria($user['id_usuario']),
    'flujo_mensual'        => $gf->flujoMensual($user['id_usuario']),
    'presupuestos'         => $gf->calcularPresupuestos($user['id_usuario']),
    'cuenta'               => $cuenta?->toArray(),
]);
