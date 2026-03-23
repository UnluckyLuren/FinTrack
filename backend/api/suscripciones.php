<?php
/**
 * api/suscripciones.php — UC04: Administrar Gastos Fijos
 * GET    ?action=list
 * POST   ?action=create
 * DELETE ?action=delete&id=X
 * PUT    ?action=no_recurrente&id=X
 */
require_once __DIR__ . '/../middleware/Response.php';
require_once __DIR__ . '/../middleware/Session.php';
require_once __DIR__ . '/../models/Suscripcion.php';

Response::init();
$user   = Session::requireAuth();
$action = $_GET['action'] ?? 'list';
$model  = new Suscripcion();

switch ($action) {
    case 'list':
        $subs = $model->findAllByUsuario($user['id_usuario']);
        // Totales
        $mensual = array_sum(array_column($subs, 'costo_mensual'));
        $anual   = array_sum(array_column($subs, 'costo_anual'));
        Response::success([
            'suscripciones'  => $subs,
            'total_mensual'  => round($mensual, 2),
            'total_anual'    => round($anual, 2),
        ]);
        break;

    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') Response::error('Método no permitido', 405);
        $b = Response::body();
        if (empty($b['nombre_servicio'])) Response::error('Nombre del servicio requerido.');
        if (empty($b['costo']) || (float)$b['costo'] <= 0) Response::error('Costo inválido.');
        if (empty($b['proxima_fecha_pago'])) Response::error('Fecha de cobro requerida.');
        $id = $model->crear($user['id_usuario'], $b);
        Response::success(['id_suscripcion' => $id], 'Suscripción creada.', 201);
        break;

    case 'delete':
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') Response::error('Método no permitido', 405);
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) Response::error('ID requerido.');
        $ok = $model->eliminar($id, $user['id_usuario']);
        if (!$ok) Response::error('Suscripción no encontrada.', 404);
        Response::success(null, 'Suscripción eliminada.');
        break;

    case 'no_recurrente':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) Response::error('ID requerido.');
        $model->marcarNoRecurrente($id, $user['id_usuario']);
        Response::success(null, 'Marcada como no recurrente.');
        break;

    default:
        Response::error('Acción no encontrada.', 404);
}
