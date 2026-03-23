<?php
/**
 * api/metas.php — UC05: Configurar Meta de Ahorro
 * GET    ?action=list
 * POST   ?action=create
 * PUT    ?action=abonar&id=X  { monto }
 * PUT    ?action=transferir&id=X
 * DELETE ?action=delete&id=X
 */
require_once __DIR__ . '/../middleware/Response.php';
require_once __DIR__ . '/../middleware/Session.php';
require_once __DIR__ . '/../models/MetaAhorro.php';
require_once __DIR__ . '/../models/Transaccion.php';
require_once __DIR__ . '/../models/Cuenta.php';
require_once __DIR__ . '/../models/GestorFinanciero.php';

Response::init();
$user   = Session::requireAuth();
$action = $_GET['action'] ?? 'list';
$model  = new MetaAhorro();

switch ($action) {
    case 'list':
        $metas = $model->findAllByUsuario($user['id_usuario']);
        Response::success($metas);
        break;

    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') Response::error('Método no permitido', 405);
        $b = Response::body();
        if (empty($b['nombre'])) Response::error('Nombre requerido.');
        if (empty($b['monto_objetivo']) || (float)$b['monto_objetivo'] <= 0)
            Response::error('Monto objetivo inválido.');
        if (empty($b['fecha_limite'])) Response::error('Fecha límite requerida.');
        $id = $model->crear($user['id_usuario'], $b);
        Response::success(['id_meta' => $id], 'Espacio de ahorro creado.', 201);
        break;

    case 'abonar':
        $id    = (int)($_GET['id'] ?? 0);
        $b     = Response::body();
        $monto = (float)($b['monto'] ?? 0);
        if (!$id || $monto <= 0) Response::error('ID y monto requeridos.');
        $pct = $model->abonar($id, $monto, $user['id_usuario']);
        Response::success(['porcentaje' => $pct], 'Abono registrado.');
        break;

    case 'transferir':
        $id     = (int)($_GET['id'] ?? 0);
        $cuenta = (new Cuenta())->findByUsuario($user['id_usuario']);
        if (!$id || !$cuenta) Response::error('Datos inválidos.');
        $monto = $model->transferirACuenta($id, $user['id_usuario'], $cuenta->idCuenta);
        if ($monto === null) Response::error('Meta no encontrada.', 404);
        // Crear transacción de ingreso
        $gf = new GestorFinanciero();
        $gf->crearMovimiento([
            'monto'       => $monto,
            'fecha'       => date('Y-m-d'),
            'descripcion' => 'Meta de ahorro completada transferida',
            'tipo'        => 'ingreso',
            'id_categoria'=> null,
        ], $user['id_usuario']);
        Response::success(['monto_transferido' => $monto], "$$monto transferidos a tu cuenta.");
        break;

    case 'delete':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) Response::error('ID requerido.');
        $ok = $model->eliminar($id, $user['id_usuario']);
        if (!$ok) Response::error('Meta no encontrada.', 404);
        Response::success(null, 'Meta eliminada.');
        break;

    default:
        Response::error('Acción no encontrada.', 404);
}
