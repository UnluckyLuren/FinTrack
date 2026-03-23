<?php
/**
 * Session.php — Middleware de sesión y token
 * Genera y valida token de sesión temporal (UC06)
 */
class Session {
    public static function start(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_set_cookie_params([
                'lifetime' => 3600,
                'path'     => '/',
                'secure'   => false,     // true en HTTPS producción
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
            session_start();
        }
    }

    public static function setUser(array $user): void {
        self::start();
        $_SESSION['user_id']    = $user['id_usuario'];
        $_SESSION['user_email'] = $user['correo_electronico'];
        $_SESSION['token']      = self::generateToken();
        $_SESSION['created_at'] = time();
    }

    public static function generateToken(): string {
        return bin2hex(random_bytes(32));
    }

    public static function getUser(): ?array {
        self::start();
        if (!isset($_SESSION['user_id'])) return null;
        // Expirar sesión después de 2 horas
        if ((time() - ($_SESSION['created_at'] ?? 0)) > 7200) {
            self::destroy();
            return null;
        }
        return [
            'id_usuario'        => $_SESSION['user_id'],
            'correo_electronico'=> $_SESSION['user_email'],
            'token'             => $_SESSION['token'] ?? '',
        ];
    }

    public static function requireAuth(): array {
        $user = self::getUser();
        if (!$user) {
            http_response_code(401);
            die(json_encode(['success' => false, 'error' => 'No autenticado. Token inválido.']));
        }
        return $user;
    }

    public static function destroy(): void {
        self::start();
        session_unset();
        session_destroy();
    }

    public static function isAuthenticated(): bool {
        return self::getUser() !== null;
    }
}
