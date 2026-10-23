const pool = require('../config/database');

// GET /estadisticas
const index = async (req, res) => {
  try {
    // Incidents by equipment type
    const [byEquipType] = await pool.query(
      `SELECT e.tipo, COUNT(i.id) as total
      FROM incidencias i
      LEFT JOIN equipos e ON i.equipo_id = e.id
      WHERE e.tipo IS NOT NULL
      GROUP BY e.tipo
      ORDER BY total DESC`
    );

    // Incidents by status
    const [byStatus] = await pool.query(
      `SELECT estado, COUNT(*) as total FROM incidencias GROUP BY estado`
    );

    // Incidents by aula
    const [byAula] = await pool.query(
      `SELECT a.nombre, COUNT(i.id) as total
      FROM incidencias i
      LEFT JOIN aulas a ON i.aula_id = a.id
      GROUP BY a.id, a.nombre
      ORDER BY total DESC
      LIMIT 8`
    );

    // Incidents per month (last 6 months)
    const [byMonth] = await pool.query(
      `SELECT DATE_FORMAT(fecha_creacion, '%Y-%m') as mes,
        DATE_FORMAT(fecha_creacion, '%b %Y') as mes_label,
        COUNT(*) as total
      FROM incidencias
      WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY mes, mes_label
      ORDER BY mes ASC`
    );

    // Summary stats
    const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM incidencias');
    const [[{ resueltas }]] = await pool.query("SELECT COUNT(*) as resueltas FROM incidencias WHERE estado = 'resuelto'");
    const [[{ avg_time }]] = await pool.query(
      `SELECT AVG(TIMESTAMPDIFF(HOUR, fecha_creacion, fecha_actualizacion)) as avg_time
      FROM incidencias WHERE estado = 'resuelto'`
    );

    // Most problematic equipment
    const [[topEquipo]] = await pool.query(
      `SELECT e.nombre, e.tipo, COUNT(i.id) as total
      FROM incidencias i
      LEFT JOIN equipos e ON i.equipo_id = e.id
      WHERE e.id IS NOT NULL
      GROUP BY e.id, e.nombre, e.tipo
      ORDER BY total DESC
      LIMIT 1`
    );

    const resolutionRate = total > 0 ? Math.round((resueltas / total) * 100) : 0;

    res.render('estadisticas/index', {
      title: 'Estadísticas - AulaCheck',
      layout: 'main',
      chartData: {
        byEquipType: JSON.stringify(byEquipType),
        byStatus: JSON.stringify(byStatus),
        byAula: JSON.stringify(byAula),
        byMonth: JSON.stringify(byMonth)
      },
      summary: {
        total,
        resueltas,
        resolutionRate,
        avgTime: avg_time ? Math.round(avg_time) : 0,
        topEquipo: topEquipo || null
      }
    });
  } catch (err) {
    console.error('Error en estadísticas:', err);
    req.flash('error', 'Error al cargar las estadísticas.');
    res.redirect('/dashboard');
  }
};

// GET /api/stats - JSON for charts (AJAX)
const apiStats = async (req, res) => {
  try {
    const [byEquipType] = await pool.query(
      `SELECT e.tipo, COUNT(i.id) as total
      FROM incidencias i
      LEFT JOIN equipos e ON i.equipo_id = e.id
      WHERE e.tipo IS NOT NULL GROUP BY e.tipo`
    );
    const [byStatus] = await pool.query(
      'SELECT estado, COUNT(*) as total FROM incidencias GROUP BY estado'
    );
    const [byMonth] = await pool.query(
      `SELECT DATE_FORMAT(fecha_creacion,'%Y-%m') as mes,
        DATE_FORMAT(fecha_creacion,'%b %Y') as mes_label, COUNT(*) as total
      FROM incidencias
      WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY mes, mes_label ORDER BY mes`
    );

    res.json({ byEquipType, byStatus, byMonth });
  } catch (err) {
    console.error('Error en API stats:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

module.exports = { index, apiStats };
