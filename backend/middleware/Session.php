<?php
/**
 * Session.php — Middleware de sesión y token
 * Genera y valida token de sesión temporal (UC06)
 */
// Permitir GitHub Pages y cualquier subdominio de Cloudflare para pruebas
header("Access-Control-Allow-Origin: https://unluckyluren.github.io");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Manejo de peticiones "Preflight"
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    // Si Chrome solo está "preguntando" por los permisos, le decimos que sí y cortamos la ejecución.
    http_response_code(200);
    exit();
}

class Session {
    public static function start(): void {
        // Detenemos la sesión si ya hay una para reconfigurarla
        if (session_status() === PHP_SESSION_NONE) {
            // Forzamos a la cookie a viajar entre dominios de forma segura
            session_set_cookie_params([
                'lifetime' => 86400,
                'path' => '/',
                'domain' => '',           // Lo dejamos vacío para que detecte Cloudflare
                'secure' => true,         // Obliga a usar HTTPS
                'httponly' => true,       // Protege contra ataques XSS en Javascript
                'samesite' => 'None'      // LA MAGIA: Permite el cruce entre GitHub y Cloudflare
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
