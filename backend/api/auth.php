<?php
/**
 * api/auth.php — UC06: Autenticar Usuario
 * POST /api/auth.php?action=login
 * POST /api/auth.php?action=logout
 * GET  /api/auth.php?action=me
 */
require_once __DIR__ . '/../middleware/Response.php';
require_once __DIR__ . '/../middleware/Session.php';
require_once __DIR__ . '/../controllers/ControladorAutenticacion.php';

Response::init();
Session::start();

$action = $_GET['action'] ?? '';

switch ($action) {
    // ── LOGIN ────────────────────────────────────────────────
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') Response::error('Método no permitido', 405);
        $body  = Response::body();
        $correo= trim($body['correo'] ?? '');
        $pass  = $body['password'] ?? '';

        $ctrl = new ControladorAutenticacion();
        $res  = $ctrl->validarCredenciales($correo, $pass);

        if ($res['ok']) {
            Response::success([
                'usuario' => $res['usuario'],
                'token'   => $res['token'],
            ], 'Autenticación exitosa.');
        } else {
            $code = $res['error'] === 'bloqueado' ? 423 : 401;
            Response::error($res['error'], $code, [
                'restantes' => $res['restantes'] ?? null,
                'segundos'  => $res['segundos']  ?? null,
            ]);
        }
        break;

    // ── LOGOUT ───────────────────────────────────────────────
    case 'logout':
        $user = Session::getUser();
        if ($user) {
            require_once __DIR__ . '/../models/Usuario.php';
            $u = (new Usuario())->findById($user['id_usuario']);
            if ($u) $u->cerrarSesion();
        }
        Session::destroy();
        Response::success(null, 'Sesión cerrada.');
        break;

    // ── ME ───────────────────────────────────────────────────
    case 'me':
        $user = Session::requireAuth();
        require_once __DIR__ . '/../models/Usuario.php';
        $u = (new Usuario())->findById($user['id_usuario']);
        Response::success($u ? $u->toArray() : null);
        break;

    // ── REGISTER ─────────────────────────────────────────────
    case 'register':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') Response::error('Método no permitido', 405);
        $body  = Response::body();
        $correo= trim($body['correo'] ?? '');
        $pass  = $body['password'] ?? '';
        if (empty($correo) || empty($pass)) Response::error('Correo y contraseña requeridos.');
        if (strlen($pass) < 8) Response::error('La contraseña debe tener mínimo 8 caracteres.');
        $u = new Usuario();
        if ($u->findByEmail($correo)) Response::error('El correo ya está registrado.', 409);
        $id = $u->crear($correo, $pass);
        Response::success(['id_usuario' => $id], 'Usuario creado.', 201);
        break;

    default:
        Response::error('Acción no encontrada.', 404);
}

// NUEVO ENDPOINT DE REGISTRO
if (isset($_GET['action']) && $_GET['action'] === 'register') {
    $data = json_decode(file_get_contents("php://input"), true);
    $correo = trim($data['correo'] ?? '');
    $pass = $data['password'] ?? '';

    if (empty($correo) || empty($pass)) {
        echo json_encode(['success' => false, 'error' => 'Datos incompletos.']);
        exit;
    }
    
    // Obtenemos la conexión desde tu Singleton Database
    $db = Database::getInstance()->getConnection();
    
    // 1. Evitar correos duplicados en MySQL
    $stmt = $db->prepare("SELECT id_usuario FROM usuarios WHERE correo_electronico = ?");
    $stmt->execute([$correo]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'error' => 'El correo ya está registrado.']);
        exit;
    }
    
    // 2. Insertar usuario de forma segura
    $hash = password_hash($pass, PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT INTO usuarios (correo_electronico, password_hash) VALUES (?, ?)");
    
    if ($stmt->execute([$correo, $hash])) {
        $idUsuario = $db->lastInsertId();
        
        // 3. Crear una cuenta (billetera) base para que el Dashboard funcione
        $stmtCuenta = $db->prepare("INSERT INTO cuentas (id_usuario, tipo, nombre_institucion, saldo_actual) VALUES (?, 'efectivo', 'Mi Billetera', 0)");
        $stmtCuenta->execute([$idUsuario]);
        
        // 4. Iniciar sesión automáticamente
        Session::setUser([
            'id_usuario'         => $idUsuario,
            'correo_electronico' => $correo,
        ]);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'usuario' => [
                    'idUsuario' => $idUsuario,
                    'correo_electronico' => $correo,
                    'ultimo_acceso' => date('Y-m-d H:i:s')
                ]
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al guardar en la base de datos.']);
    }
    exit;
}