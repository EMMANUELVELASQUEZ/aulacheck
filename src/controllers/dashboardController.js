const pool = require('../config/database');

// GET /dashboard
const index = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const rol = req.session.user.rol;

    // Count active aulas
    const [[{ total_aulas }]] = await pool.query(
      'SELECT COUNT(*) as total_aulas FROM aulas WHERE activa = TRUE'
    );

    // Count pending incidents
    let pendingQuery = "SELECT COUNT(*) as pendientes FROM incidencias WHERE estado = 'pendiente'";
    let pendingParams = [];
    if (rol === 'docente') {
      pendingQuery += ' AND usuario_id = ?';
      pendingParams = [userId];
    }
    const [[{ pendientes }]] = await pool.query(pendingQuery, pendingParams);

    // Count resolved this month
    let resolvedQuery = `SELECT COUNT(*) as resueltas FROM incidencias
      WHERE estado = 'resuelto'
      AND MONTH(fecha_actualizacion) = MONTH(NOW())
      AND YEAR(fecha_actualizacion) = YEAR(NOW())`;
    let resolvedParams = [];
    if (rol === 'docente') {
      resolvedQuery += ' AND usuario_id = ?';
      resolvedParams = [userId];
    }
    const [[{ resueltas }]] = await pool.query(resolvedQuery, resolvedParams);

    // Count total equipment
    const [[{ total_equipos }]] = await pool.query(
      "SELECT COUNT(*) as total_equipos FROM equipos WHERE estado != 'mantenimiento'"
    );

    // Recent incidents (last 5)
    let recentQuery = `SELECT i.*, a.nombre as aula_nombre, e.tipo as equipo_tipo,
        u.nombre as usuario_nombre
      FROM incidencias i
      LEFT JOIN aulas a ON i.aula_id = a.id
      LEFT JOIN equipos e ON i.equipo_id = e.id
      LEFT JOIN users u ON i.usuario_id = u.id`;
    let recentParams = [];

    if (rol === 'docente') {
      recentQuery += ' WHERE i.usuario_id = ?';
      recentParams = [userId];
    }
    recentQuery += ' ORDER BY i.fecha_creacion DESC LIMIT 5';

    const [recentIncidencias] = await pool.query(recentQuery, recentParams);

    // Count in_process
    let inProcessQuery = "SELECT COUNT(*) as en_proceso FROM incidencias WHERE estado = 'en_proceso'";
    let inProcessParams = [];
    if (rol === 'docente') {
      inProcessQuery += ' AND usuario_id = ?';
      inProcessParams = [userId];
    }
    const [[{ en_proceso }]] = await pool.query(inProcessQuery, inProcessParams);

    res.render('dashboard/index', {
      title: 'Dashboard - AulaCheck',
      layout: 'main',
      stats: { total_aulas, pendientes, resueltas, total_equipos, en_proceso },
      recentIncidencias
    });
  } catch (err) {
    console.error('Error en dashboard:', err);
    req.flash('error', 'Error al cargar el dashboard.');
    res.redirect('/');
  }
};

module.exports = { index };
