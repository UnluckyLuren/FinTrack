-- ============================================================
-- FINTRACK — Schema MySQL
-- Ejecutar: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS fintrack
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fintrack;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    correo_electronico VARCHAR(255) NOT NULL UNIQUE,
    hash_contrasena    VARCHAR(255) NOT NULL,
    secreto_mfa        VARCHAR(64)  DEFAULT '',
    consentimiento     TINYINT(1)   DEFAULT 1,
    ultimo_acceso      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    intentos_fallidos  TINYINT      DEFAULT 0,
    bloqueado_hasta    DATETIME     NULL,
    created_at         DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cuentas (
    id_cuenta             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario            INT UNSIGNED NOT NULL,
    tipo                  ENUM('débito','crédito','ahorro') DEFAULT 'débito',
    hash_contrasena       VARCHAR(255) DEFAULT '',
    saldo_actual          DECIMAL(15,2) DEFAULT 0.00,
    nombre_institucion    VARCHAR(100)  DEFAULT 'FinTrack Personal',
    ultima_sincronizacion DATETIME      DEFAULT CURRENT_TIMESTAMP,
    created_at            DATETIME      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cuenta_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categorias (
    id_categoria        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario          INT UNSIGNED NOT NULL,
    nombre              VARCHAR(100)  NOT NULL,
    presupuesto_mensual DECIMAL(15,2) DEFAULT 0.00,
    codigo_color        VARCHAR(20)   DEFAULT '#00e5a0',
    created_at          DATETIME      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categoria_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transacciones (
    id_transaccion  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_cuenta       INT UNSIGNED NOT NULL,
    id_categoria    INT UNSIGNED NULL,
    monto           DECIMAL(15,2) NOT NULL,
    fecha           DATE          NOT NULL,
    descripcion     VARCHAR(500)  DEFAULT '',
    tipo            ENUM('ingreso','gasto') NOT NULL,
    es_automatizada TINYINT(1)    DEFAULT 0,
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tx_cuenta    FOREIGN KEY (id_cuenta)
        REFERENCES cuentas(id_cuenta) ON DELETE CASCADE,
    CONSTRAINT fk_tx_categoria FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS suscripciones (
    id_suscripcion     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario         INT UNSIGNED NOT NULL,
    nombre_servicio    VARCHAR(100)  NOT NULL,
    emoji              VARCHAR(10)   DEFAULT '💳',
    costo              DECIMAL(15,2) NOT NULL,
    frecuencia_cobro   ENUM('semanal','mensual','trimestral','anual') DEFAULT 'mensual',
    proxima_fecha_pago DATE          NOT NULL,
    es_recurrente      TINYINT(1)    DEFAULT 1,
    created_at         DATETIME      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sub_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS metas_ahorro (
    id_meta        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario     INT UNSIGNED NOT NULL,
    nombre         VARCHAR(100)  NOT NULL,
    emoji          VARCHAR(10)   DEFAULT '🎯',
    monto_objetivo DECIMAL(15,2) NOT NULL,
    ahorro_actual  DECIMAL(15,2) DEFAULT 0.00,
    fecha_limite   DATE          NOT NULL,
    created_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_meta_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS documentos_ocr (
    id_documento     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario       INT UNSIGNED NOT NULL,
    id_transaccion   INT UNSIGNED NULL,
    url_archivo      VARCHAR(500)  DEFAULT '',
    texto_plano      TEXT,
    campos_extraidos JSON,
    hash_documento   VARCHAR(200)  DEFAULT '',
    created_at       DATETIME      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ocr_usuario     FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_ocr_transaccion FOREIGN KEY (id_transaccion)
        REFERENCES transacciones(id_transaccion) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tickets_soporte (
    id_ticket   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario  INT UNSIGNED NOT NULL,
    asunto      VARCHAR(200) NOT NULL,
    tipo        ENUM('error','duda','sugerencia','seguridad') DEFAULT 'error',
    descripcion TEXT         NOT NULL,
    status      ENUM('abierto','en_proceso','respondido','cerrado') DEFAULT 'abierto',
    respuesta   TEXT         NULL,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ticket_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
    id_log           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario       INT UNSIGNED NULL,
    accion           VARCHAR(100) NOT NULL,
    entidad          VARCHAR(100) NOT NULL,
    id_entidad       VARCHAR(50)  DEFAULT '',
    datos_anteriores JSON         NULL,
    datos_nuevos     JSON         NULL,
    ip_address       VARCHAR(50)  DEFAULT '',
    user_agent       VARCHAR(500) DEFAULT '',
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SEED: usuario demo ────────────────────────────────────────────────────────
-- Hash bcrypt de 'fintrack123' (generado con PHP password_hash)
INSERT INTO usuarios (correo_electronico, hash_contrasena) VALUES
('admin@fintrack.mx',
 '$2y$12$6T1WBLrsm8B9GKNI5P5lCe6YBkY6bApE9.0HCpuFzs8T3Qdijkuq');

INSERT INTO cuentas (id_usuario, tipo, nombre_institucion, saldo_actual) VALUES
(1, 'débito', 'FinTrack Personal', 0.00);

INSERT INTO categorias (id_usuario, nombre, presupuesto_mensual, codigo_color) VALUES
(1, 'Alimentación',    5000.00, '#10b981'),
(1, 'Transporte',      1500.00, '#3b82f6'),
(1, 'Entretenimiento',  800.00, '#8b5cf6'),
(1, 'Salud',           2000.00, '#f43f5e'),
(1, 'Servicios',       1200.00, '#f59e0b'),
(1, 'Educación',       1000.00, '#ec4899'),
(1, 'Ingresos',           0.00, '#00e5a0');

INSERT INTO suscripciones (id_usuario, nombre_servicio, emoji, costo, frecuencia_cobro, proxima_fecha_pago) VALUES
(1, 'Netflix',  '🎬', 219.00, 'mensual', DATE_ADD(CURDATE(), INTERVAL 10 DAY)),
(1, 'Spotify',  '🎵',  99.00, 'mensual', DATE_ADD(CURDATE(), INTERVAL  6 DAY)),
(1, 'iCloud',   '☁️',  29.00, 'mensual', DATE_ADD(CURDATE(), INTERVAL 14 DAY)),
(1, 'Gimnasio', '🏋️', 450.00, 'mensual', DATE_ADD(CURDATE(), INTERVAL  9 DAY));

INSERT INTO metas_ahorro (id_usuario, nombre, emoji, monto_objetivo, ahorro_actual, fecha_limite) VALUES
(1, 'Vacaciones', '🏖️', 25000.00, 12500.00, DATE_ADD(CURDATE(), INTERVAL 250 DAY)),
(1, 'Fondo Emergencia', '🛡️', 50000.00, 38000.00, DATE_ADD(CURDATE(), INTERVAL 100 DAY)),
(1, 'Laptop Nueva', '💻', 22000.00, 5500.00, DATE_ADD(CURDATE(), INTERVAL 177 DAY));

INSERT INTO transacciones (id_cuenta, id_categoria, monto, fecha, descripcion, tipo) VALUES
(1, 7, 18500.00, CURDATE(), 'Sueldo Mensual', 'ingreso'),
(1, 1,  3200.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Supermercado Walmart', 'gasto'),
(1, 2,   850.00, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'Gasolina', 'gasto'),
(1, 3,   299.00, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'Netflix', 'gasto'),
(1, 4,   450.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY), 'Farmacia', 'gasto'),
(1, 5,   650.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'CFE', 'gasto'),
(1, 7,  3500.00, DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'Freelance web', 'ingreso');
