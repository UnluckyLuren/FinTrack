<?php
/**
 * Response.php — Helper JSON con CORS configurado para GitHub Pages
 */
class Response {
    public static function init(): void {
        header('Content-Type: application/json; charset=utf-8');

        // ── CORS: permitir peticiones desde GitHub Pages ──────────────────────
        // Cambia esta URL por la tuya cuando configures el túnel
        $allowed = [
            'https://unluckyluren.github.io',
            'http://localhost:3000',      // desarrollo local
            'http://localhost:8080',
            'http://127.0.0.1:5500',      // Live Server de VS Code
        ];
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowed, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
        } else {
            // En desarrollo puedes poner '*'; en producción quita esta línea
            header('Access-Control-Allow-Origin: *');
        }
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Vary: Origin');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    public static function success($data = null, string $message = 'OK', int $code = 200): void {
        http_response_code($code);
        echo json_encode(['success' => true, 'message' => $message, 'data' => $data],
            JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $message, int $code = 400, $data = null): void {
        http_response_code($code);
        echo json_encode(['success' => false, 'error' => $message, 'data' => $data],
            JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function body(): array {
        $raw  = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
