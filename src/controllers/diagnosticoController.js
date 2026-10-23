const pool = require('../config/database');

// GET /diagnostico
const index = async (req, res) => {
  try {
    const [aulas] = await pool.query('SELECT * FROM aulas WHERE activa = TRUE ORDER BY nombre');

    res.render('diagnostico/index', {
      title: 'Diagnóstico de Aula - AulaCheck',
      layout: 'main',
      aulas
    });
  } catch (err) {
    console.error('Error en diagnóstico:', err);
    req.flash('error', 'Error al cargar la página de diagnóstico.');
    res.redirect('/dashboard');
  }
};

// POST /diagnostico
const postDiagnostico = async (req, res) => {
  const { aula_id, checklist, resultado } = req.body;
  const userId = req.session.user.id;

  if (!aula_id) {
    req.flash('error', 'Debes seleccionar un aula.');
    return res.redirect('/diagnostico');
  }

  try {
    // Parse checklist data
    let checklistData = {};
    if (typeof checklist === 'string') {
      try { checklistData = JSON.parse(checklist); } catch { checklistData = {}; }
    } else if (typeof checklist === 'object') {
      checklistData = checklist;
    }

    const resultadoFinal = resultado === 'falla' ? 'falla_detectada' : 'ok';

    await pool.query(
      'INSERT INTO diagnosticos (usuario_id, aula_id, checklist, resultado) VALUES (?, ?, ?, ?)',
      [userId, aula_id, JSON.stringify(checklistData), resultadoFinal]
    );

    if (resultadoFinal === 'falla_detectada') {
      req.flash('info', 'Se detectaron fallas en el diagnóstico. Por favor reporta la incidencia.');
      return res.redirect(`/incidencias/nueva?aula_id=${aula_id}&from_diagnostico=1`);
    }

    req.flash('success', 'Diagnóstico completado. Todo el equipo funciona correctamente.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error al guardar diagnóstico:', err);
    req.flash('error', 'Error al guardar el diagnóstico. Intenta de nuevo.');
    res.redirect('/diagnostico');
  }
};

module.exports = { index, postDiagnostico };
