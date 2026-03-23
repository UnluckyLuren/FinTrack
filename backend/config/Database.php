<?php
/**
 * Database.php — Singleton PDO
 * Lee credenciales de variables de entorno (Docker) o valores por defecto
 */
class Database {
    private static ?Database $instance = null;
    private PDO $pdo;

    private function __construct() {
        // Variables de entorno inyectadas por Docker Compose
        $host    = getenv('DB_HOST')     ?: 'localhost';
        $dbname  = getenv('DB_NAME')     ?: 'fintrack';
        $user    = getenv('DB_USER')     ?: 'root';
        $pass    = getenv('DB_PASSWORD') ?: '';
        $charset = 'utf8mb4';

        $dsn     = "mysql:host={$host};dbname={$dbname};charset={$charset}";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $this->pdo = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['success' => false, 'error' => 'DB Error: ' . $e->getMessage()]));
        }
    }

    public static function getInstance(): Database {
        if (self::$instance === null) self::$instance = new self();
        return self::$instance;
    }

    public function getConnection(): PDO { return $this->pdo; }
    private function __clone() {}
}
