-- AulaCheck Database Schema
-- Universidad Veracruzana - Sistema de diagnóstico de aulas híbridas

CREATE DATABASE IF NOT EXISTS aulacheck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE aulacheck;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin','docente','tecnico') DEFAULT 'docente',
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aulas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  edificio VARCHAR(100),
  piso VARCHAR(20),
  capacidad INT,
  descripcion TEXT,
  activa BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS equipos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aula_id INT,
  tipo ENUM('camara','microfono','bocinas','proyector','computadora','internet','videoconferencia') NOT NULL,
  nombre VARCHAR(100),
  descripcion TEXT,
  estado ENUM('operativo','falla','mantenimiento') DEFAULT 'operativo',
  FOREIGN KEY (aula_id) REFERENCES aulas(id)
);

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
  FOREIGN KEY (usuario_id) REFERENCES users(id),
  FOREIGN KEY (aula_id) REFERENCES aulas(id),
  FOREIGN KEY (equipo_id) REFERENCES equipos(id)
);

CREATE TABLE IF NOT EXISTS seguimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incidencia_id INT,
  usuario_id INT,
  comentario TEXT NOT NULL,
  estado_nuevo VARCHAR(50),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incidencia_id) REFERENCES incidencias(id),
  FOREIGN KEY (usuario_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS diagnosticos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT,
  aula_id INT,
  checklist JSON,
  resultado ENUM('ok','falla_detectada') DEFAULT 'ok',
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES users(id),
  FOREIGN KEY (aula_id) REFERENCES aulas(id)
);

-- =========================================================
-- SAMPLE DATA
-- =========================================================

-- Users (passwords are hashed with bcryptjs)
-- admin@uv.mx     : Admin123!
-- docente1@uv.mx  : Docente123!
-- docente2@uv.mx  : Docente123!
-- tecnico@uv.mx   : Tecnico123!
-- NOTE: Login page also supports demo credentials with 'password'
INSERT INTO users (nombre, email, password, rol, activo) VALUES
('Administrador UV', 'admin@uv.mx', '$2a$10$4ZGE4m4hGVSsGzfbCAtCkefRIS.J8wBPt8tqPGW8VmUu/NOm91WWu', 'admin', TRUE),
('Dr. Carlos Mendoza', 'docente1@uv.mx', '$2a$10$/gfhxin6yoAUtofX4pJNZOJPsMEU2wIYQM6XE07KB7TYdXUos641K', 'docente', TRUE),
('Mtra. Laura Sánchez', 'docente2@uv.mx', '$2a$10$/gfhxin6yoAUtofX4pJNZOJPsMEU2wIYQM6XE07KB7TYdXUos641K', 'docente', TRUE),
('Ing. Roberto Torres', 'tecnico@uv.mx', '$2a$10$ZKXkz3aXDNFlTOFblox.EuavSBvKpwnNOXLDWjEFdftpdqf4PA402', 'tecnico', TRUE);

-- Aulas
INSERT INTO aulas (nombre, edificio, piso, capacidad, descripcion, activa) VALUES
('Aula H101', 'Edificio H', '1', 40, 'Aula híbrida principal con equipo completo de videoconferencia', TRUE),
('Aula H201', 'Edificio H', '2', 35, 'Aula equipada con proyector y sistema de audio', TRUE),
('Laboratorio Cómputo A', 'Edificio A', 'PB', 30, 'Laboratorio de cómputo con 30 estaciones de trabajo', TRUE),
('Sala de Conferencias', 'Rectoría', '1', 50, 'Sala principal para videoconferencias y eventos', TRUE),
('Aula Virtual B302', 'Edificio B', '3', 25, 'Aula pequeña para clases en línea', TRUE);

-- Equipos para Aula H101
INSERT INTO equipos (aula_id, tipo, nombre, descripcion, estado) VALUES
(1, 'camara', 'Cámara Logitech C920', 'Cámara web HD para videoconferencia', 'operativo'),
(1, 'microfono', 'Micrófono Jabra Speak 710', 'Micrófono omnidireccional de conferencia', 'operativo'),
(1, 'bocinas', 'Bocinas JBL', 'Sistema de audio estéreo empotrado', 'operativo'),
(1, 'proyector', 'Proyector Epson EB-X51', 'Proyector de 3600 lúmenes', 'falla'),
(1, 'computadora', 'PC Dell OptiPlex', 'Computadora de escritorio para docente', 'operativo'),
(1, 'internet', 'Router WiFi Cisco', 'Conexión inalámbrica 500 Mbps', 'operativo'),
(1, 'videoconferencia', 'Zoom Room Kit', 'Sistema integrado de videoconferencia', 'operativo');

-- Equipos para Aula H201
INSERT INTO equipos (aula_id, tipo, nombre, descripcion, estado) VALUES
(2, 'camara', 'Cámara Logitech C615', 'Cámara web Full HD', 'operativo'),
(2, 'microfono', 'Micrófono USB Blue Yeti', 'Micrófono condensador USB', 'falla'),
(2, 'proyector', 'Proyector BenQ MX550', 'Proyector XGA 3600 lúmenes', 'operativo'),
(2, 'internet', 'Switch Cisco SG110', 'Switch de red 8 puertos', 'operativo');

-- Equipos para Laboratorio Cómputo A
INSERT INTO equipos (aula_id, tipo, nombre, descripcion, estado) VALUES
(3, 'computadora', 'PC HP ProDesk x30', 'Estaciones de trabajo HP (30 unidades)', 'operativo'),
(3, 'proyector', 'Proyector Epson EB-W52', 'Proyector WXGA para laboratorio', 'operativo'),
(3, 'internet', 'Switch HP ProCurve', 'Switch de red para laboratorio', 'mantenimiento');

-- Equipos para Sala de Conferencias
INSERT INTO equipos (aula_id, tipo, nombre, descripcion, estado) VALUES
(4, 'camara', 'Cámara PTZ Sony SRG-300H', 'Cámara PTZ controlada remotamente', 'operativo'),
(4, 'microfono', 'Sistema Shure MXA910', 'Micrófono de techo para conferencias', 'operativo'),
(4, 'bocinas', 'Sistema QSC K10.2', 'Altavoces activos profesionales', 'operativo'),
(4, 'videoconferencia', 'Cisco Webex Room Kit Pro', 'Sistema profesional de videoconferencia', 'operativo'),
(4, 'internet', 'Router Cisco ISR 4321', 'Router empresarial de alta disponibilidad', 'operativo');

-- Equipos para Aula Virtual B302
INSERT INTO equipos (aula_id, tipo, nombre, descripcion, estado) VALUES
(5, 'camara', 'Cámara Webcam Genius', 'Cámara web básica 1080p', 'operativo'),
(5, 'microfono', 'Micrófono Samson Go Mic', 'Micrófono condensador portátil', 'operativo'),
(5, 'proyector', 'Proyector ViewSonic PA503S', 'Proyector SVGA 3500 lúmenes', 'falla'),
(5, 'internet', 'Access Point TP-Link', 'Punto de acceso WiFi 6', 'operativo');

-- Sample Incidents
INSERT INTO incidencias (usuario_id, aula_id, equipo_id, descripcion, prioridad, estado, solucion, fecha_creacion) VALUES
(2, 1, 4, 'El proyector no enciende al presionar el botón de encendido. Se escucha un clic pero la pantalla permanece oscura.', 'alta', 'en_proceso', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 2, 9, 'El micrófono USB no es detectado por la computadora. Aparece un error de dispositivo no reconocido en Windows.', 'media', 'pendiente', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 5, 23, 'El proyector del aula B302 muestra una línea horizontal de píxeles muertos en el centro de la imagen.', 'media', 'pendiente', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 1, 1, 'La cámara pierde conexión intermitentemente durante las videollamadas. El problema ocurre cada 10-15 minutos.', 'alta', 'resuelto', 'Se reemplazó el cable USB por uno de mayor calidad. El problema fue causado por un cable dañado.', DATE_SUB(NOW(), INTERVAL 7 DAY)),
(2, 3, 15, 'El switch del laboratorio presenta intermitencia. Algunas estaciones de trabajo pierden conexión a internet esporádicamente.', 'critica', 'en_proceso', NULL, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, 4, 16, 'La cámara PTZ no responde a los controles del panel. Se mueve sola ocasionalmente.', 'alta', 'resuelto', 'Se actualizó el firmware de la cámara y se recalibró el sistema de control PTZ.', DATE_SUB(NOW(), INTERVAL 14 DAY)),
(2, 2, 10, 'El proyector del aula H201 tiene la imagen desenfocada en los bordes. El ajuste manual no corrige el problema.', 'baja', 'resuelto', 'Se limpió la lente del proyector y se ajustó el keystone digital. Imagen restaurada.', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(3, 1, 7, 'El sistema Zoom Room no conecta automáticamente. Requiere configuración manual cada vez que se reinicia.', 'media', 'en_proceso', NULL, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, 4, 20, 'El router principal de la sala de conferencias reinicia espontáneamente. Interrumpe todas las conexiones activas.', 'critica', 'resuelto', 'Se identificó sobrecalentamiento como causa raíz. Se instaló ventilación adicional y se actualizó el firmware.', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(3, 5, 22, 'El micrófono del aula B302 tiene un zumbido constante a 60Hz. Es audible para todos los participantes remotos.', 'media', 'cancelado', NULL, DATE_SUB(NOW(), INTERVAL 6 DAY));

-- Sample Seguimientos
INSERT INTO seguimientos (incidencia_id, usuario_id, comentario, estado_nuevo, fecha) VALUES
(1, 4, 'Revisión inicial realizada. El proyector presenta falla en la fuente de poder. Se solicitó refacción al almacén.', 'en_proceso', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 4, 'Cable USB reemplazado. Prueba de 2 horas sin interrupciones. Incidencia resuelta.', 'resuelto', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(5, 4, 'Se identificó un puerto defectuoso en el switch. Se redirigió el tráfico temporalmente. Pendiente reemplazo del equipo.', 'en_proceso', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(8, 4, 'Se verificó la configuración de Zoom Room. El problema parece ser un certificado vencido. En proceso de renovación.', 'en_proceso', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(9, 4, 'Temperatura del router medida en 78°C (límite: 70°C). Instalada ventilación adicional. Pendiente monitoreo.', 'en_proceso', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(9, 4, 'Temperatura normalizada a 62°C después de mejoras de ventilación. Firmware actualizado. Incidencia resuelta.', 'resuelto', DATE_SUB(NOW(), INTERVAL 15 DAY));
