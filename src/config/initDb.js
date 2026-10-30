const pool = require('./database');

async function addColumnSafe(conn, table, column, definition) {
  try {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  } catch (err) {
    if (err.errno !== 1060) throw err; // 1060 = ER_DUP_FIELDNAME (column already exists)
  }
}

async function initDb() {
  const conn = await pool.getConnection();
  try {
    // ── Core Tables ──────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol ENUM('admin','docente','tecnico') DEFAULT 'docente',
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── Security Columns (idempotent migrations) ──────────────────────────────
    await addColumnSafe(conn, 'users', 'login_attempts', 'INT NOT NULL DEFAULT 0');
    await addColumnSafe(conn, 'users', 'locked_until', 'DATETIME NULL DEFAULT NULL');
    await addColumnSafe(conn, 'users', 'last_login', 'DATETIME NULL DEFAULT NULL');
    await addColumnSafe(conn, 'users', 'last_login_ip', 'VARCHAR(45) NULL DEFAULT NULL');

    // ── Auth Audit Log ────────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS auth_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        event VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        detail VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_event (event),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS aulas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        edificio VARCHAR(100),
        piso VARCHAR(20),
        capacidad INT,
        descripcion TEXT,
        activa BOOLEAN DEFAULT TRUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS equipos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aula_id INT,
        tipo ENUM('camara','microfono','bocinas','proyector','computadora','internet','videoconferencia') NOT NULL,
        nombre VARCHAR(100),
        descripcion TEXT,
        estado ENUM('operativo','falla','mantenimiento') DEFAULT 'operativo',
        FOREIGN KEY (aula_id) REFERENCES aulas(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS incidencias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        aula_id INT,
        equipo_id INT,
        descripcion TEXT NOT NULL,
        prioridad ENUM('baja','media','alta','critica') DEFAULT 'media',
        estado ENUM('pendiente','en_proceso','resuelto','cancelado') DEFAULT 'pendiente',
        solucion TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (aula_id) REFERENCES aulas(id) ON DELETE SET NULL,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS seguimientos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        incidencia_id INT,
        usuario_id INT,
        comentario TEXT NOT NULL,
        estado_nuevo VARCHAR(50),
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS diagnosticos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        aula_id INT,
        checklist JSON,
        resultado ENUM('ok','falla_detectada') DEFAULT 'ok',
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (aula_id) REFERENCES aulas(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── Seed Data (only if fresh install) ────────────────────────────────────
    const [[{ count }]] = await conn.query('SELECT COUNT(*) as count FROM users');
    if (count === 0) {
      await conn.query(`
        INSERT INTO users (nombre, email, password, rol, activo) VALUES
        ('Administrador UV', 'admin@uv.mx', '$2a$10$4ZGE4m4hGVSsGzfbCAtCkefRIS.J8wBPt8tqPGW8VmUu/NOm91WWu', 'admin', TRUE),
        ('Dr. Carlos Mendoza', 'docente1@uv.mx', '$2a$10$/gfhxin6yoAUtofX4pJNZOJPsMEU2wIYQM6XE07KB7TYdXUos641K', 'docente', TRUE),
        ('Mtra. Laura Sánchez', 'docente2@uv.mx', '$2a$10$/gfhxin6yoAUtofX4pJNZOJPsMEU2wIYQM6XE07KB7TYdXUos641K', 'docente', TRUE),
        ('Ing. Roberto Torres', 'tecnico@uv.mx', '$2a$10$ZKXkz3aXDNFlTOFblox.EuavSBvKpwnNOXLDWjEFdftpdqf4PA402', 'tecnico', TRUE)
      `);

      await conn.query(`
        INSERT INTO aulas (nombre, edificio, piso, capacidad, descripcion, activa) VALUES
        ('Aula H101', 'Edificio H', '1', 40, 'Aula híbrida principal con equipo completo de videoconferencia', TRUE),
        ('Aula H201', 'Edificio H', '2', 35, 'Aula equipada con proyector y sistema de audio', TRUE),
        ('Laboratorio Cómputo A', 'Edificio A', 'PB', 30, 'Laboratorio de cómputo con 30 estaciones de trabajo', TRUE),
        ('Sala de Conferencias', 'Rectoría', '1', 50, 'Sala principal para videoconferencias y eventos', TRUE),
        ('Aula Virtual B302', 'Edificio B', '3', 25, 'Aula pequeña para clases en línea', TRUE)
      `);

      await conn.query(`
        INSERT INTO equipos (aula_id, tipo, nombre, descripcion, estado) VALUES
        (1,'camara','Cámara Logitech C920','Cámara web HD para videoconferencia','operativo'),
        (1,'microfono','Micrófono Jabra Speak 710','Micrófono omnidireccional de conferencia','operativo'),
        (1,'bocinas','Bocinas JBL','Sistema de audio estéreo empotrado','operativo'),
        (1,'proyector','Proyector Epson EB-X51','Proyector de 3600 lúmenes','falla'),
        (1,'computadora','PC Dell OptiPlex','Computadora de escritorio para docente','operativo'),
        (1,'internet','Router WiFi Cisco','Conexión inalámbrica 500 Mbps','operativo'),
        (1,'videoconferencia','Zoom Room Kit','Sistema integrado de videoconferencia','operativo'),
        (2,'camara','Cámara Logitech C615','Cámara web Full HD','operativo'),
        (2,'microfono','Micrófono USB Blue Yeti','Micrófono condensador USB','falla'),
        (2,'proyector','Proyector BenQ MX550','Proyector XGA 3600 lúmenes','operativo'),
        (2,'internet','Switch Cisco SG110','Switch de red 8 puertos','operativo'),
        (3,'computadora','PC HP ProDesk x30','Estaciones de trabajo HP','operativo'),
        (3,'proyector','Proyector Epson EB-W52','Proyector WXGA para laboratorio','operativo'),
        (3,'internet','Switch HP ProCurve','Switch de red para laboratorio','mantenimiento'),
        (4,'camara','Cámara PTZ Sony SRG-300H','Cámara PTZ controlada remotamente','operativo'),
        (4,'microfono','Sistema Shure MXA910','Micrófono de techo para conferencias','operativo'),
        (4,'bocinas','Sistema QSC K10.2','Altavoces activos profesionales','operativo'),
        (4,'videoconferencia','Cisco Webex Room Kit Pro','Sistema profesional de videoconferencia','operativo'),
        (4,'internet','Router Cisco ISR 4321','Router empresarial de alta disponibilidad','operativo'),
        (5,'camara','Cámara Webcam Genius','Cámara web básica 1080p','operativo'),
        (5,'microfono','Micrófono Samson Go Mic','Micrófono condensador portátil','operativo'),
        (5,'proyector','Proyector ViewSonic PA503S','Proyector SVGA 3500 lúmenes','falla'),
        (5,'internet','Access Point TP-Link','Punto de acceso WiFi 6','operativo')
      `);

      await conn.query(`
        INSERT INTO incidencias (usuario_id, aula_id, equipo_id, descripcion, prioridad, estado, solucion, fecha_creacion) VALUES
        (2,1,4,'El proyector no enciende. Se escucha un clic pero la pantalla permanece oscura.','alta','en_proceso',NULL,DATE_SUB(NOW(),INTERVAL 2 DAY)),
        (3,2,9,'El micrófono USB no es detectado por la computadora.','media','pendiente',NULL,DATE_SUB(NOW(),INTERVAL 1 DAY)),
        (2,5,22,'El proyector del aula B302 muestra píxeles muertos en la imagen.','media','pendiente',NULL,DATE_SUB(NOW(),INTERVAL 3 DAY)),
        (3,1,1,'La cámara pierde conexión intermitentemente durante las videollamadas.','alta','resuelto','Se reemplazó el cable USB. El problema fue causado por un cable dañado.',DATE_SUB(NOW(),INTERVAL 7 DAY)),
        (2,3,14,'El switch del laboratorio presenta intermitencia en varias estaciones.','critica','en_proceso',NULL,DATE_SUB(NOW(),INTERVAL 4 DAY)),
        (3,4,15,'La cámara PTZ no responde a los controles del panel.','alta','resuelto','Se actualizó el firmware y se recalibró el sistema de control PTZ.',DATE_SUB(NOW(),INTERVAL 14 DAY)),
        (2,2,10,'El proyector del aula H201 tiene la imagen desenfocada en los bordes.','baja','resuelto','Se limpió la lente y se ajustó el keystone digital.',DATE_SUB(NOW(),INTERVAL 10 DAY)),
        (3,1,7,'El sistema Zoom Room no conecta automáticamente al reiniciar.','media','en_proceso',NULL,DATE_SUB(NOW(),INTERVAL 5 DAY)),
        (2,4,19,'El router principal reinicia espontáneamente interrumpiendo conexiones.','critica','resuelto','Se instaló ventilación adicional y se actualizó el firmware.',DATE_SUB(NOW(),INTERVAL 20 DAY)),
        (3,5,21,'El micrófono del aula B302 tiene un zumbido constante a 60Hz.','media','cancelado',NULL,DATE_SUB(NOW(),INTERVAL 6 DAY))
      `);

      await conn.query(`
        INSERT INTO seguimientos (incidencia_id, usuario_id, comentario, estado_nuevo, fecha) VALUES
        (1,4,'Revisión inicial. Falla en fuente de poder. Solicitada refacción al almacén.','en_proceso',DATE_SUB(NOW(),INTERVAL 1 DAY)),
        (4,4,'Cable USB reemplazado. Prueba de 2 horas sin interrupciones.','resuelto',DATE_SUB(NOW(),INTERVAL 6 DAY)),
        (5,4,'Puerto defectuoso en switch. Tráfico redirigido temporalmente.','en_proceso',DATE_SUB(NOW(),INTERVAL 3 DAY)),
        (8,4,'Certificado de Zoom Room vencido. En proceso de renovación.','en_proceso',DATE_SUB(NOW(),INTERVAL 4 DAY)),
        (9,4,'Temperatura normalizada. Firmware actualizado. Incidencia resuelta.','resuelto',DATE_SUB(NOW(),INTERVAL 15 DAY))
      `);

      console.log('Base de datos inicializada con datos de ejemplo');
    }

    console.log('Tablas verificadas correctamente');
  } finally {
    conn.release();
  }
}

module.exports = initDb;
