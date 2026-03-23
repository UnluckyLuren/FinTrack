<?php
/**
 * api/soporte.php — UC07: Solicitar Asistencia Técnica
 * POST ?action=crear
 * GET  ?action=list
 * PUT  ?action=responder&id=X   (admin)
 */
require_once __DIR__ . '/../middleware/Response.php';
require_once __DIR__ . '/../middleware/Session.php';
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../models/AuditLog.php';

Response::init();
$user   = Session::requireAuth();
$action = $_GET['action'] ?? 'list';
$db     = Database::getInstance()->getConnection();

switch ($action) {
    // ── CREAR TICKET ─────────────────────────────────────────
    case 'crear':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') Response::error('Método no permitido', 405);
        $b = Response::body();
        if (empty($b['asunto']))     Response::error('El asunto es requerido.');
        if (empty($b['descripcion']))Response::error('La descripción es requerida.');

        $tipos_validos = ['error','duda','sugerencia','seguridad'];
        $tipo = in_array($b['tipo'] ?? '', $tipos_validos) ? $b['tipo'] : 'error';

        $stmt = $db->prepare(
            'INSERT INTO tickets_soporte (id_usuario, asunto, tipo, descripcion)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$user['id_usuario'], $b['asunto'], $tipo, $b['descripcion']]);
        $idTicket = (int)$db->lastInsertId();
        AuditLog::registrar($user['id_usuario'], 'CREATE_TICKET', 'tickets_soporte',
            (string)$idTicket);

        // Respuesta automática del sistema
        $respuestaAuto = "Hemos recibido tu reporte (Folio: TKT-{$idTicket}). " .
            "El equipo de soporte revisará tu caso en menos de 12 horas. " .
            "Si el problema es urgente, ha sido escalado automáticamente.";

        $stmtR = $db->prepare(
            'UPDATE tickets_soporte SET status = "respondido", respuesta = ?
             WHERE id_ticket = ?'
        );
        $stmtR->execute([$respuestaAuto, $idTicket]);

        Response::success([
            'id_ticket' => $idTicket,
            'folio'     => 'TKT-' . str_pad($idTicket, 6, '0', STR_PAD_LEFT),
            'respuesta' => $respuestaAuto,
        ], 'Ticket enviado. Respuesta en máx. 12 horas.', 201);
        break;

    // ── LISTAR TICKETS DEL USUARIO ───────────────────────────
    case 'list':
        $stmt = $db->prepare(
            'SELECT *, CONCAT("TKT-", LPAD(id_ticket, 6, "0")) AS folio
             FROM tickets_soporte WHERE id_usuario = ?
             ORDER BY created_at DESC'
        );
        $stmt->execute([$user['id_usuario']]);
        Response::success($stmt->fetchAll());
        break;

    // ── RESPONDER (admin) ────────────────────────────────────
    case 'responder':
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') Response::error('Método no permitido', 405);
        $id = (int)($_GET['id'] ?? 0);
        $b  = Response::body();
        if (!$id || empty($b['respuesta'])) Response::error('ID y respuesta requeridos.');
        $stmt = $db->prepare(
            'UPDATE tickets_soporte
             SET status = "respondido", respuesta = ?
             WHERE id_ticket = ?'
        );
        $stmt->execute([$b['respuesta'], $id]);
        Response::success(null, 'Ticket respondido.');
        break;

    default:
        Response::error('Acción no encontrada.', 404);
}
