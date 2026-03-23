<?php
require_once __DIR__ . '/../config/Database.php';

/**
 * Clase: DocumentoOCR
 * Atributos: idDocumento, urlArchivo, textPlano, camposExtraidos
 * Métodos:   procesarArchivo(), generarHash()
 */
class DocumentoOCR {
    private PDO $db;

    public int    $idDocumento;
    public int    $idUsuario;
    public ?int   $idTransaccion  = null;
    public string $urlArchivo     = '';
    public string $textPlano      = '';
    public array  $camposExtraidos= [];
    public string $hashDocumento  = '';

    public function __construct(array $row = []) {
        $this->db = Database::getInstance()->getConnection();
        if ($row) $this->hydrate($row);
    }

    private function hydrate(array $r): void {
        $this->idDocumento     = (int)$r['id_documento'];
        $this->idUsuario       = (int)$r['id_usuario'];
        $this->idTransaccion   = isset($r['id_transaccion']) ? (int)$r['id_transaccion'] : null;
        $this->urlArchivo      = $r['url_archivo'] ?? '';
        $this->textPlano       = $r['texto_plano']  ?? '';
        $this->camposExtraidos = is_string($r['campos_extraidos'])
            ? (json_decode($r['campos_extraidos'], true) ?? [])
            : ($r['campos_extraidos'] ?? []);
        $this->hashDocumento   = $r['hash_documento'] ?? '';
    }

    // ── procesarArchivo() : vacio ─────────────────────────────
    // Extrae campos desde archivo subido (simulación OCR server-side)
    public function procesarArchivo(array $file): array {
        $nombreArchivo = basename($file['name']);
        $this->urlArchivo = 'uploads/' . $nombreArchivo;

        // Mover archivo al servidor
        $destino = __DIR__ . '/../uploads/' . $nombreArchivo;
        if (isset($file['tmp_name']) && is_uploaded_file($file['tmp_name'])) {
            move_uploaded_file($file['tmp_name'], $destino);
        }

        // Extracción OCR simulada (campos CFDI)
        $this->camposExtraidos = [
            'RFC_Emisor'   => 'XAXX010101000',
            'Folio'        => 'CFDI-' . strtoupper(substr(md5($nombreArchivo), 0, 9)),
            'IVA'          => '$' . number_format(rand(10, 500) + rand(0,99)/100, 2),
            'MontoTotal'   => '$' . number_format(rand(100, 5000) + rand(0,99)/100, 2),
            'FechaEmision' => date('Y-m-d'),
            'Concepto'     => 'Comprobante fiscal digital',
        ];
        $this->textPlano = json_encode($this->camposExtraidos, JSON_UNESCAPED_UNICODE);
        return $this->camposExtraidos;
    }

    // ── generarHash() : string ───────────────────────────────
    // Simula integridad NOM-151 con SHA-256
    public function generarHash(): string {
        $this->hashDocumento = 'sha256:' . hash('sha256', $this->textPlano . $this->urlArchivo);
        return $this->hashDocumento;
    }

    public function guardar(int $idUsuario, ?int $idTransaccion = null): int {
        $hash = $this->generarHash();
        $stmt = $this->db->prepare(
            'INSERT INTO documentos_ocr
                (id_usuario, id_transaccion, url_archivo, texto_plano,
                 campos_extraidos, hash_documento)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $idUsuario,
            $idTransaccion,
            $this->urlArchivo,
            $this->textPlano,
            json_encode($this->camposExtraidos, JSON_UNESCAPED_UNICODE),
            $hash,
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function findAllByUsuario(int $idUsuario): array {
        $stmt = $this->db->prepare(
            'SELECT * FROM documentos_ocr WHERE id_usuario = ? ORDER BY created_at DESC'
        );
        $stmt->execute([$idUsuario]);
        return array_map(function($r) {
            $d = new self($r);
            $arr = $d->toArray();
            $arr['hash_documento'] = $d->hashDocumento;
            return $arr;
        }, $stmt->fetchAll());
    }

    public function toArray(): array {
        return [
            'id_documento'    => $this->idDocumento,
            'url_archivo'     => $this->urlArchivo,
            'campos_extraidos'=> $this->camposExtraidos,
            'hash_documento'  => $this->hashDocumento,
        ];
    }
}
