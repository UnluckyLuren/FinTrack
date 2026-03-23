<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * AuditLog — Postcondición general (Ley Fintech)
 * Genera logs de auditoría para cada transacción
 */
class AuditLog {
    public static function registrar(
        ?int   $idUsuario,
        string $accion,
        string $entidad,
        string $idEntidad    = '',
        array  $datosAntes   = [],
        array  $datosDespues = []
    ): void {
        try {
            $db   = Database::getInstance()->getConnection();
            $stmt = $db->prepare(
                'INSERT INTO audit_logs
                    (id_usuario, accion, entidad, id_entidad,
                     datos_anteriores, datos_nuevos, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $idUsuario,
                $accion,
                $entidad,
                $idEntidad,
                $datosAntes   ? json_encode($datosAntes,   JSON_UNESCAPED_UNICODE) : null,
                $datosDespues ? json_encode($datosDespues, JSON_UNESCAPED_UNICODE) : null,
                $_SERVER['REMOTE_ADDR'] ?? '',
                substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 499),
            ]);
        } catch (Exception $e) {
            // Silencioso: logs nunca deben interrumpir el flujo principal
        }
    }
}
