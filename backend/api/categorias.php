<?php
/**
 * api/categorias.php
 * GET    ?action=list
 * POST   ?action=create
 * DELETE ?action=delete&id=X
 */
require_once __DIR__ . '/../middleware/Response.php';
require_once __DIR__ . '/../middleware/Session.php';
require_once __DIR__ . '/../models/Categoria.php';

Response::init();
$user   = Session::requireAuth();
$action = $_GET['action'] ?? 'list';
$model  = new Categoria();

switch ($action) {
    case 'list':
        Response::success($model->findAllByUsuario($user['id_usuario']));
        break;

    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') Response::error('Método no permitido', 405);
        $b = Response::body();
        if (empty($b['nombre'])) Response::error('El nombre es requerido.');
        $id = $model->crear(
            $user['id_usuario'],
            $b['nombre'],
            (float)($b['presupuesto_mensual'] ?? 0),
            $b['codigo_color'] ?? '#00e5a0'
        );
        Response::success(['id_categoria' => $id], 'Categoría creada.', 201);
        break;

    case 'delete':
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') Response::error('Método no permitido', 405);
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) Response::error('ID requerido.');
        $ok = $model->eliminar($id, $user['id_usuario']);
        if (!$ok) Response::error('Categoría no encontrada.', 404);
        Response::success(null, 'Categoría eliminada.');
        break;

    default:
        Response::error('Acción no encontrada.', 404);
}
