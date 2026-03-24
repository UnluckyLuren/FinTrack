<?php
/**
 * api/auth.php — UC06: Autenticar Usuario
 * POST /api/auth.php?action=login
 * POST /api/auth.php?action=logout
 * GET  /api/auth.php?action=me
 * POST /api/auth.php?action=register
 */
require_once __DIR__ . '/../middleware/Response.php';
require_once __DIR__ . '/../middleware/Session.php';
require_once __DIR__ . '/../controllers/ControladorAutenticacion.php';
require_once __DIR__ . '/../config/Database.php'; // Agregado para el registro

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
                'token'   => $res['token'] ?? '',
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
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Método no permitido', 405);
            exit;
        }
        
        $body  = Response::body();
        $correo= trim($body['correo'] ?? '');
        $pass  = $body['password'] ?? '';
        
        if (empty($correo) || empty($pass)) {
            Response::error('Correo y contraseña requeridos.');
            exit;
        }
        if (strlen($pass) < 8) {
            Response::error('La contraseña debe tener mínimo 8 caracteres.');
            exit;
        }
        
        try {
            $db = Database::getInstance()->getConnection();
            
            // 1. Evitar correos duplicados
            $stmt = $db->prepare("SELECT id_usuario FROM usuarios WHERE correo_electronico = ?");
            $stmt->execute([$correo]);
            if ($stmt->fetch()) {
                // AQUÍ ESTABA EL BUG: Faltaba el exit para detener a PHP
                Response::error('El correo ya está registrado.', 409);
                exit; 
            }
            
            // 2. Insertar usuario de forma segura
            $hash = password_hash($pass, PASSWORD_BCRYPT);
            $stmt = $db->prepare("INSERT INTO usuarios (correo_electronico, hash_contrasena) VALUES (?, ?)");
            $stmt->execute([$correo, $hash]);
            $idUsuario = $db->lastInsertId();
            
            // 3. Crear una cuenta (billetera) base
    
            $stmtCuenta = $db->prepare("INSERT INTO cuentas (id_usuario, tipo, nombre_institucion, saldo_actual) VALUES (?, 'débito', 'Mi Billetera', 0)");
            $stmtCuenta->execute([$idUsuario]);
            
            // 4. Iniciar sesión automáticamente
            Session::setUser([
                'id_usuario'         => $idUsuario,
                'correo_electronico' => $correo,
            ]);
            
            Response::success([
                'usuario' => [
                    'idUsuario' => $idUsuario,
                    'correo_electronico' => $correo,
                    'ultimo_acceso' => date('Y-m-d H:i:s')
                ]
            ], 'Usuario creado.', 201);
            exit;
            
        } catch (PDOException $e) {
            // Si la base de datos se queja, lo devolvemos como JSON limpio
            Response::error('Error interno de BD: ' . $e->getMessage(), 500);
            exit;
        }
        break;

    default:
        Response::error('Acción no encontrada.', 404);
}