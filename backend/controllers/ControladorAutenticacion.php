<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/Usuario.php';
require_once __DIR__ . '/../models/AuditLog.php';
require_once __DIR__ . '/../middleware/Session.php';

/**
 * Clase: ControladorAutenticacion
 * Métodos: validarCredenciales(), gestionarMFA()
 * UC06 — Autenticar Usuario
 */
class ControladorAutenticacion {
    private Usuario $usuarioModel;

    public function __construct() {
        $this->usuarioModel = new Usuario();
    }

    // ── validarCredenciales() : booleano ─────────────────────
    public function validarCredenciales(string $correo, string $pass): array {
        if (empty($correo) || empty($pass)) {
            return ['ok' => false, 'error' => 'Campos requeridos vacíos.'];
        }

        $usuario = $this->usuarioModel->findByEmail($correo);
        if (!$usuario) {
            AuditLog::registrar(null, 'LOGIN_FAIL', 'usuarios', '', ['email' => $correo]);
            return ['ok' => false, 'error' => 'Credenciales incorrectas.', 'restantes' => null];
        }

        // Verificar bloqueo temporal
        if ($usuario->bloqueadoHasta && strtotime($usuario->bloqueadoHasta) > time()) {
            $segundos = strtotime($usuario->bloqueadoHasta) - time();
            return ['ok' => false, 'error' => 'bloqueado', 'segundos' => $segundos];
        }

        // Verificar contraseña
        if (!$usuario->autenticar($pass)) {
            $intentos = $usuario->registrarIntentoFallido();
            AuditLog::registrar($usuario->idUsuario, 'LOGIN_FAIL', 'usuarios',
                (string)$usuario->idUsuario);

            if ($intentos >= 3) {
                $usuario->bloquearCuenta(60); // 60 segundos
                return ['ok' => false, 'error' => 'bloqueado', 'segundos' => 60];
            }
            return ['ok' => false, 'error' => 'Credenciales incorrectas.',
                    'restantes' => 3 - $intentos];
        }

        // Login exitoso
        $usuario->actualizarUltimoAcceso();
        Session::setUser([
            'id_usuario'         => $usuario->idUsuario,
            'correo_electronico' => $usuario->correoElectronico,
        ]);
        AuditLog::registrar($usuario->idUsuario, 'LOGIN', 'usuarios',
            (string)$usuario->idUsuario);

        return [
            'ok'     => true,
            'usuario'=> $usuario->toArray(),
            'token'  => $_SESSION['token'],
        ];
    }

    // ── gestionarMFA() ───────────────────────────────────────
    public function gestionarMFA(int $idUsuario): string {
        $usuario = $this->usuarioModel->findById($idUsuario);
        if (!$usuario) return '';
        return $usuario->habilitarMFA();
    }
}
