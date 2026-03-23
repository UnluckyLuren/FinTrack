<?php
/**
 * api/perfil.php
 * GET  ?action=get
 * PUT  ?action=update_password  { password_actual, password_nuevo }
 * GET  ?action=exportar
 * PUT  ?action=consentimiento   { valor: true/false }
 */
require_once __DIR__ . '/../middleware/Response.php';
require_once __DIR__ . '/../middleware/Session.php';
require_once __DIR__ . '/../models/Usuario.php';
require_once __DIR__ . '/../models/Cuenta.php';

Response::init();
$user   = Session::requireAuth();
$action = $_GET['action'] ?? 'get';
$uModel = new Usuario();
$cModel = new Cuenta();

switch ($action) {
    case 'get':
        $u = $uModel->findById($user['id_usuario']);
        if (!$u) Response::error('Usuario no encontrado.', 404);
        $c = $cModel->findByUsuario($user['id_usuario']);
        Response::success([
            'usuario' => $u->toArray(),
            'cuenta'  => $c ? $c->toArray() : null,
        ]);
        break;

    case 'update_password':
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') Response::error('Método no permitido', 405);
        $b       = Response::body();
        $actual  = $b['password_actual'] ?? '';
        $nuevo   = $b['password_nuevo']  ?? '';
        if (strlen($nuevo) < 8) Response::error('La contraseña nueva debe tener mínimo 8 caracteres.');
        $u = $uModel->findById($user['id_usuario']);
        if (!$u || !$u->autenticar($actual)) Response::error('Contraseña actual incorrecta.', 401);
        $u->cambiarContrasena($nuevo);
        Response::success(null, 'Contraseña actualizada.');
        break;

    case 'exportar':
        $u = $uModel->findById($user['id_usuario']);
        if (!$u) Response::error('Usuario no encontrado.', 404);
        $data = $u->exportarDatosPersonales();
        header('Content-Disposition: attachment; filename="datos_personales.json"');
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;

    case 'consentimiento':
        $b    = Response::body();
        $val  = isset($b['valor']) ? (bool)$b['valor'] : true;
        $db   = \Database::getInstance()->getConnection();
        $stmt = $db->prepare('UPDATE usuarios SET consentimiento = ? WHERE id_usuario = ?');
        $stmt->execute([$val ? 1 : 0, $user['id_usuario']]);
        Response::success(null, 'Consentimiento actualizado.');
        break;

    default:
        Response::error('Acción no encontrada.', 404);
}
