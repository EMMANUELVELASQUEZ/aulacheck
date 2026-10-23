const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// GET /admin
const index = async (req, res) => {
  try {
    const [[{ total_users }]] = await pool.query('SELECT COUNT(*) as total_users FROM users WHERE activo = TRUE');
    const [[{ total_aulas }]] = await pool.query('SELECT COUNT(*) as total_aulas FROM aulas WHERE activa = TRUE');
    const [[{ total_equipos }]] = await pool.query('SELECT COUNT(*) as total_equipos FROM equipos');
    const [[{ incidencias_pendientes }]] = await pool.query(
      "SELECT COUNT(*) as incidencias_pendientes FROM incidencias WHERE estado = 'pendiente'"
    );
    const [[{ equipos_en_falla }]] = await pool.query(
      "SELECT COUNT(*) as equipos_en_falla FROM equipos WHERE estado = 'falla'"
    );

    const [recentUsers] = await pool.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT 5'
    );

    res.render('admin/index', {
      title: 'Administración - AulaCheck',
      layout: 'main',
      stats: { total_users, total_aulas, total_equipos, incidencias_pendientes, equipos_en_falla },
      recentUsers
    });
  } catch (err) {
    console.error('Error en admin index:', err);
    req.flash('error', 'Error al cargar el panel de administración.');
    res.redirect('/dashboard');
  }
};

// GET /admin/usuarios
const usuarios = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT * FROM users ORDER BY rol, nombre'
    );
    res.render('admin/usuarios', {
      title: 'Usuarios - AulaCheck',
      layout: 'main',
      users
    });
  } catch (err) {
    console.error('Error en admin usuarios:', err);
    req.flash('error', 'Error al cargar los usuarios.');
    res.redirect('/admin');
  }
};

// GET /admin/usuarios/nuevo
const nuevoUsuario = (req, res) => {
  res.render('admin/usuario_form', {
    title: 'Nuevo Usuario - AulaCheck',
    layout: 'main',
    user: null,
    action: '/admin/usuarios',
    method: 'POST'
  });
};

// POST /admin/usuarios
const crearUsuario = async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password || !rol) {
    req.flash('error', 'Todos los campos son obligatorios.');
    return res.redirect('/admin/usuarios/nuevo');
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      req.flash('error', 'Este correo ya está registrado.');
      return res.redirect('/admin/usuarios/nuevo');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre.trim(), email.trim().toLowerCase(), hashedPassword, rol]
    );

    req.flash('success', 'Usuario creado exitosamente.');
    res.redirect('/admin/usuarios');
  } catch (err) {
    console.error('Error al crear usuario:', err);
    req.flash('error', 'Error al crear el usuario.');
    res.redirect('/admin/usuarios/nuevo');
  }
};

// GET /admin/usuarios/:id/edit
const editarUsuario = async (req, res) => {
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      req.flash('error', 'Usuario no encontrado.');
      return res.redirect('/admin/usuarios');
    }

    res.render('admin/usuario_form', {
      title: 'Editar Usuario - AulaCheck',
      layout: 'main',
      user,
      action: `/admin/usuarios/${user.id}`,
      method: 'PUT'
    });
  } catch (err) {
    console.error('Error al cargar usuario para editar:', err);
    req.flash('error', 'Error al cargar el usuario.');
    res.redirect('/admin/usuarios');
  }
};

// PUT /admin/usuarios/:id
const actualizarUsuario = async (req, res) => {
  const { nombre, email, rol, password } = req.body;
  const { id } = req.params;

  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      req.flash('error', 'Usuario no encontrado.');
      return res.redirect('/admin/usuarios');
    }

    if (password && password.trim()) {
      const hashed = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET nombre = ?, email = ?, rol = ?, password = ? WHERE id = ?',
        [nombre.trim(), email.trim().toLowerCase(), rol, hashed, id]
      );
    } else {
      await pool.query(
        'UPDATE users SET nombre = ?, email = ?, rol = ? WHERE id = ?',
        [nombre.trim(), email.trim().toLowerCase(), rol, id]
      );
    }

    req.flash('success', 'Usuario actualizado correctamente.');
    res.redirect('/admin/usuarios');
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    req.flash('error', 'Error al actualizar el usuario.');
    res.redirect(`/admin/usuarios/${id}/edit`);
  }
};

// POST /admin/usuarios/:id/toggle
const toggleUsuario = async (req, res) => {
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      req.flash('error', 'Usuario no encontrado.');
      return res.redirect('/admin/usuarios');
    }

    // Prevent disabling yourself
    if (user.id === req.session.user.id) {
      req.flash('error', 'No puedes desactivar tu propia cuenta.');
      return res.redirect('/admin/usuarios');
    }

    const newState = !user.activo;
    await pool.query('UPDATE users SET activo = ? WHERE id = ?', [newState, req.params.id]);

    req.flash('success', `Usuario ${newState ? 'activado' : 'desactivado'} correctamente.`);
    res.redirect('/admin/usuarios');
  } catch (err) {
    console.error('Error al toggle usuario:', err);
    req.flash('error', 'Error al cambiar estado del usuario.');
    res.redirect('/admin/usuarios');
  }
};

// GET /admin/aulas
const aulas = async (req, res) => {
  try {
    const [aulas] = await pool.query(
      `SELECT a.*, COUNT(e.id) as total_equipos,
        SUM(CASE WHEN e.estado = 'falla' THEN 1 ELSE 0 END) as equipos_falla
      FROM aulas a
      LEFT JOIN equipos e ON a.id = e.aula_id
      GROUP BY a.id
      ORDER BY a.nombre`
    );

    res.render('admin/aulas', {
      title: 'Aulas - AulaCheck',
      layout: 'main',
      aulas
    });
  } catch (err) {
    console.error('Error en admin aulas:', err);
    req.flash('error', 'Error al cargar las aulas.');
    res.redirect('/admin');
  }
};

// GET /admin/aulas/nueva
const nuevaAula = (req, res) => {
  res.render('admin/aula_form', {
    title: 'Nueva Aula - AulaCheck',
    layout: 'main',
    aula: null,
    equipos: [],
    action: '/admin/aulas',
    method: 'POST'
  });
};

// POST /admin/aulas
const crearAula = async (req, res) => {
  const { nombre, edificio, piso, capacidad, descripcion, equipos } = req.body;

  if (!nombre) {
    req.flash('error', 'El nombre del aula es obligatorio.');
    return res.redirect('/admin/aulas/nueva');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO aulas (nombre, edificio, piso, capacidad, descripcion) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), edificio || null, piso || null, capacidad || null, descripcion || null]
    );

    const aulaId = result.insertId;

    // Insert equipment if provided (supports array or object from form)
    let equiposList = [];
    if (Array.isArray(equipos)) {
      equiposList = equipos;
    } else if (equipos && typeof equipos === 'object') {
      // Express parses equipos[0][tipo] as nested object
      equiposList = Object.values(equipos);
    }
    for (const equipo of equiposList) {
      if (equipo && equipo.tipo && equipo.nombre) {
        await conn.query(
          'INSERT INTO equipos (aula_id, tipo, nombre, descripcion) VALUES (?, ?, ?, ?)',
          [aulaId, equipo.tipo, equipo.nombre.trim(), equipo.descripcion || null]
        );
      }
    }

    await conn.commit();
    req.flash('success', 'Aula creada exitosamente.');
    res.redirect('/admin/aulas');
  } catch (err) {
    await conn.rollback();
    console.error('Error al crear aula:', err);
    req.flash('error', 'Error al crear el aula.');
    res.redirect('/admin/aulas/nueva');
  } finally {
    conn.release();
  }
};

// GET /admin/aulas/:id/edit
const editarAula = async (req, res) => {
  try {
    const [[aula]] = await pool.query('SELECT * FROM aulas WHERE id = ?', [req.params.id]);
    if (!aula) {
      req.flash('error', 'Aula no encontrada.');
      return res.redirect('/admin/aulas');
    }

    const [equipos] = await pool.query(
      'SELECT * FROM equipos WHERE aula_id = ? ORDER BY tipo',
      [req.params.id]
    );

    res.render('admin/aula_form', {
      title: 'Editar Aula - AulaCheck',
      layout: 'main',
      aula,
      equipos,
      action: `/admin/aulas/${aula.id}`,
      method: 'PUT'
    });
  } catch (err) {
    console.error('Error al cargar aula para editar:', err);
    req.flash('error', 'Error al cargar el aula.');
    res.redirect('/admin/aulas');
  }
};

// PUT /admin/aulas/:id
const actualizarAula = async (req, res) => {
  const { nombre, edificio, piso, capacidad, descripcion, activa } = req.body;
  const { id } = req.params;

  try {
    await pool.query(
      'UPDATE aulas SET nombre = ?, edificio = ?, piso = ?, capacidad = ?, descripcion = ?, activa = ? WHERE id = ?',
      [nombre.trim(), edificio || null, piso || null, capacidad || null, descripcion || null, activa === 'on' || activa === '1' ? 1 : 0, id]
    );

    req.flash('success', 'Aula actualizada correctamente.');
    res.redirect('/admin/aulas');
  } catch (err) {
    console.error('Error al actualizar aula:', err);
    req.flash('error', 'Error al actualizar el aula.');
    res.redirect(`/admin/aulas/${id}/edit`);
  }
};

module.exports = {
  index, usuarios, nuevoUsuario, crearUsuario, editarUsuario,
  actualizarUsuario, toggleUsuario, aulas, nuevaAula, crearAula,
  editarAula, actualizarAula
};
