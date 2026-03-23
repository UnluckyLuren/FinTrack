<?php
/**
 * api/ocr.php — UC02: Escanear Estado de Cuenta
 * POST   ?action=procesar   (multipart: archivo)
 * POST   ?action=confirmar  { campos_extraidos, url_archivo, texto_plano }
 * GET    ?action=list
 */
require_once __DIR__ . '/../middleware/Response.php';
require_once __DIR__ . '/../middleware/Session.php';
require_once __DIR__ . '/../models/DocumentoOCR.php';
require_once __DIR__ . '/../models/GestorFinanciero.php';

Response::init();
$user   = Session::requireAuth();
$action = $_GET['action'] ?? 'list';
$model  = new DocumentoOCR();

switch ($action) {
    // ── PROCESAR ARCHIVO ────────────────────────────────────
    case 'procesar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') Response::error('Método no permitido', 405);
        if (empty($_FILES['archivo'])) Response::error('No se recibió archivo.');

        $file = $_FILES['archivo'];
        // Validar tipo
        $allowed = ['application/pdf','image/png','image/jpeg','image/jpg'];
        if (!in_array($file['type'], $allowed) && $file['type'] !== 'application/octet-stream') {
            // Fallback: validar extensión
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['pdf','png','jpg','jpeg']))
                Response::error('Formato no soportado. Use PDF, PNG o JPG.');
        }
        // Tamaño máx. 10MB
        if ($file['size'] > 10 * 1024 * 1024) Response::error('El archivo supera 10MB.');

        $doc    = new DocumentoOCR();
        $campos = $doc->procesarArchivo($file);
        $hash   = $doc->generarHash();

        Response::success([
            'campos_extraidos' => $campos,
            'url_archivo'      => $doc->urlArchivo,
            'texto_plano'      => $doc->textPlano,
            'hash_previo'      => $hash,
        ], 'OCR procesado. Confirme los datos.');
        break;

    // ── CONFIRMAR Y GUARDAR ─────────────────────────────────
    case 'confirmar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') Response::error('Método no permitido', 405);
        $b = Response::body();

        $doc = new DocumentoOCR();
        $doc->urlArchivo      = $b['url_archivo']   ?? '';
        $doc->textPlano       = $b['texto_plano']    ?? '';
        $doc->camposExtraidos = $b['campos_extraidos'] ?? [];

        // Auto-crear transacción con monto extraído
        $idTx = null;
        $campos = $doc->camposExtraidos;
        $montoStr = str_replace(['$',','], '', $campos['MontoTotal'] ?? '0');
        $monto    = (float)$montoStr;

        if ($monto > 0) {
            $gf   = new GestorFinanciero();
            $res  = $gf->crearMovimiento([
                'monto'           => $monto,
                'fecha'           => $campos['FechaEmision'] ?? date('Y-m-d'),
                'descripcion'     => 'OCR: ' . basename($doc->urlArchivo),
                'tipo'            => 'gasto',
                'id_categoria'    => null,
                'es_automatizada' => 1,
            ], $user['id_usuario']);
            $idTx = $res['id_transaccion'] ?? null;
        }

        $idDoc = $doc->guardar($user['id_usuario'], $idTx);
        Response::success([
            'id_documento'    => $idDoc,
            'id_transaccion'  => $idTx,
            'hash_documento'  => $doc->hashDocumento,
            'monto_registrado'=> $monto,
        ], 'Documento guardado con hash NOM-151.', 201);
        break;

    // ── LISTAR DOCUMENTOS ───────────────────────────────────
    case 'list':
        Response::success($model->findAllByUsuario($user['id_usuario']));
        break;

    default:
        Response::error('Acción no encontrada.', 404);
}
