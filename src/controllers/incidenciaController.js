const pool = require('../config/database');

// GET /incidencias
const index = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const rol = req.session.user.rol;
    const { estado, prioridad, aula_id, page = 1 } = req.query;
    const perPage = 10;
    const offset = (parseInt(page) - 1) * perPage;

    let where = [];
    let params = [];

    if (rol === 'docente') {
      where.push('i.usuario_id = ?');
      params.push(userId);
    }
    if (estado) { where.push('i.estado = ?'); params.push(estado); }
    if (prioridad) { where.push('i.prioridad = ?'); params.push(prioridad); }
    if (aula_id) { where.push('i.aula_id = ?'); params.push(aula_id); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [incidencias] = await pool.query(
      `SELECT i.*, a.nombre as aula_nombre, e.tipo as equipo_tipo, e.nombre as equipo_nombre,
        u.nombre as usuario_nombre
      FROM incidencias i
      LEFT JOIN aulas a ON i.aula_id = a.id
      LEFT JOIN equipos e ON i.equipo_id = e.id
      LEFT JOIN users u ON i.usuario_id = u.id
      ${whereClause}
      ORDER BY i.fecha_creacion DESC
      LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM incidencias i ${whereClause}`,
      params
    );

    const [aulas] = await pool.query('SELECT id, nombre FROM aulas WHERE activa = TRUE ORDER BY nombre');

    res.render('incidencias/index', {
      title: 'Incidencias - AulaCheck',
      layout: 'main',
      incidencias,
      aulas,
      filters: { estado, prioridad, aula_id },
      pagination: {
        total,
        page: parseInt(page),
        perPage,
        totalPages: Math.ceil(total / perPage)
      }
    });
  } catch (err) {
    console.error('Error en incidencias index:', err);
    req.flash('error', 'Error al cargar las incidencias.');
    res.redirect('/dashboard');
  }
};

// GET /incidencias/nueva
const nueva = async (req, res) => {
  try {
    const [aulas] = await pool.query('SELECT * FROM aulas WHERE activa = TRUE ORDER BY nombre');
    const { aula_id, from_diagnostico } = req.query;

    let equipos = [];
    if (aula_id) {
      [equipos] = await pool.query(
        'SELECT * FROM equipos WHERE aula_id = ? ORDER BY tipo',
        [aula_id]
      );
    }

    res.render('incidencias/nueva', {
      title: 'Nueva Incidencia - AulaCheck',
      layout: 'main',
      aulas,
      equipos,
      selectedAula: aula_id || null,
      fromDiagnostico: from_diagnostico === '1'
    });
  } catch (err) {
    console.error('Error en nueva incidencia:', err);
    req.flash('error', 'Error al cargar el formulario.');
    res.redirect('/incidencias');
  }
};

// POST /incidencias
const crear = async (req, res) => {
  const { aula_id, equipo_id, descripcion, prioridad } = req.body;
  const userId = req.session.user.id;

  if (!aula_id || !descripcion) {
    req.flash('error', 'El aula y la descripción son obligatorios.');
    return res.redirect('/incidencias/nueva');
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO incidencias (usuario_id, aula_id, equipo_id, descripcion, prioridad)
      VALUES (?, ?, ?, ?, ?)`,
      [userId, aula_id, equipo_id || null, descripcion.trim(), prioridad || 'media']
    );

    req.flash('success', 'Incidencia reportada exitosamente.');
    res.redirect(`/incidencias/${result.insertId}`);
  } catch (err) {
    console.error('Error al crear incidencia:', err);
    req.flash('error', 'Error al crear la incidencia. Intenta de nuevo.');
    res.redirect('/incidencias/nueva');
  }
};

// GET /incidencias/:id
const detalle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const rol = req.session.user.rol;

    const [[incidencia]] = await pool.query(
      `SELECT i.*, a.nombre as aula_nombre, a.edificio, e.tipo as equipo_tipo,
        e.nombre as equipo_nombre, u.nombre as usuario_nombre, u.email as usuario_email
      FROM incidencias i
      LEFT JOIN aulas a ON i.aula_id = a.id
      LEFT JOIN equipos e ON i.equipo_id = e.id
      LEFT JOIN users u ON i.usuario_id = u.id
      WHERE i.id = ?`,
      [id]
    );

    if (!incidencia) {
      req.flash('error', 'Incidencia no encontrada.');
      return res.redirect('/incidencias');
    }

    // Docentes can only see their own incidents
    if (rol === 'docente' && incidencia.usuario_id !== userId) {
      req.flash('error', 'No tienes permiso para ver esta incidencia.');
      return res.redirect('/incidencias');
    }

    const [seguimientos] = await pool.query(
      `SELECT s.*, u.nombre as usuario_nombre, u.rol as usuario_rol
      FROM seguimientos s
      LEFT JOIN users u ON s.usuario_id = u.id
      WHERE s.incidencia_id = ?
      ORDER BY s.fecha ASC`,
      [id]
    );

    res.render('incidencias/detalle', {
      title: `Incidencia #${id} - AulaCheck`,
      layout: 'main',
      incidencia,
      seguimientos
    });
  } catch (err) {
    console.error('Error en detalle incidencia:', err);
    req.flash('error', 'Error al cargar la incidencia.');
    res.redirect('/incidencias');
  }
};

// PUT /incidencias/:id
const actualizar = async (req, res) => {
  const { id } = req.params;
  const { estado, prioridad, solucion } = req.body;
  const userId = req.session.user.id;

  try {
    const [[incidencia]] = await pool.query('SELECT * FROM incidencias WHERE id = ?', [id]);
    if (!incidencia) {
      req.flash('error', 'Incidencia no encontrada.');
      return res.redirect('/incidencias');
    }

    await pool.query(
      'UPDATE incidencias SET estado = ?, prioridad = ?, solucion = ? WHERE id = ?',
      [estado, prioridad, solucion || null, id]
    );

    // Add automatic followup if status changed
    if (estado !== incidencia.estado) {
      const estadoLabels = {
        pendiente: 'Pendiente',
        en_proceso: 'En Proceso',
        resuelto: 'Resuelto',
        cancelado: 'Cancelado'
      };
      await pool.query(
        'INSERT INTO seguimientos (incidencia_id, usuario_id, comentario, estado_nuevo) VALUES (?, ?, ?, ?)',
        [id, userId, `Estado actualizado a: ${estadoLabels[estado] || estado}`, estado]
      );
    }

    req.flash('success', 'Incidencia actualizada correctamente.');
    res.redirect(`/incidencias/${id}`);
  } catch (err) {
    console.error('Error al actualizar incidencia:', err);
    req.flash('error', 'Error al actualizar la incidencia.');
    res.redirect(`/incidencias/${id}`);
  }
};

// POST /incidencias/:id/seguimiento
const agregarSeguimiento = async (req, res) => {
  const { id } = req.params;
  const { comentario } = req.body;
  const userId = req.session.user.id;

  if (!comentario || !comentario.trim()) {
    req.flash('error', 'El comentario no puede estar vacío.');
    return res.redirect(`/incidencias/${id}`);
  }

  try {
    await pool.query(
      'INSERT INTO seguimientos (incidencia_id, usuario_id, comentario) VALUES (?, ?, ?)',
      [id, userId, comentario.trim()]
    );

    req.flash('success', 'Nota de seguimiento agregada.');
    res.redirect(`/incidencias/${id}`);
  } catch (err) {
    console.error('Error al agregar seguimiento:', err);
    req.flash('error', 'Error al agregar el seguimiento.');
    res.redirect(`/incidencias/${id}`);
  }
};

module.exports = { index, nueva, crear, detalle, actualizar, agregarSeguimiento };
