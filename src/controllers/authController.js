const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// GET /auth/login
const getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Iniciar Sesión - AulaCheck', layout: 'auth' });
};

// POST /auth/login
const postLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash('error', 'Por favor ingresa tu correo y contraseña.');
    return res.redirect('/auth/login');
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND activo = TRUE',
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      req.flash('error', 'Correo o contraseña incorrectos.');
      return res.redirect('/auth/login');
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      req.flash('error', 'Correo o contraseña incorrectos.');
      return res.redirect('/auth/login');
    }

    req.session.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    };

    req.flash('success', `Bienvenido, ${user.nombre}!`);

    // Redirect based on role
    switch (user.rol) {
      case 'admin':
        return res.redirect('/admin');
      case 'tecnico':
        return res.redirect('/incidencias');
      default:
        return res.redirect('/dashboard');
    }
  } catch (err) {
    console.error('Error en login:', err);
    req.flash('error', 'Error interno del servidor. Intenta de nuevo.');
    res.redirect('/auth/login');
  }
};

// GET /auth/register
const getRegister = async (req, res) => {
  try {
    // Allow register if no admin exists, or if current user is admin
    const [admins] = await pool.query("SELECT id FROM users WHERE rol = 'admin' LIMIT 1");
    const isFirstSetup = admins.length === 0;
    const isAdminUser = req.session.user && req.session.user.rol === 'admin';

    if (!isFirstSetup && !isAdminUser) {
      req.flash('error', 'El registro solo está disponible para administradores.');
      return res.redirect('/auth/login');
    }

    res.render('auth/register', {
      title: 'Registro - AulaCheck',
      layout: 'auth',
      isFirstSetup,
      isAdminUser
    });
  } catch (err) {
    console.error('Error en getRegister:', err);
    req.flash('error', 'Error al cargar el formulario de registro.');
    res.redirect('/auth/login');
  }
};

// POST /auth/register
const postRegister = async (req, res) => {
  const { nombre, email, password, confirmar_password, rol } = req.body;

  // Validations
  if (!nombre || !email || !password || !confirmar_password) {
    req.flash('error', 'Todos los campos son obligatorios.');
    return res.redirect('/auth/register');
  }

  if (password !== confirmar_password) {
    req.flash('error', 'Las contraseñas no coinciden.');
    return res.redirect('/auth/register');
  }

  if (password.length < 6) {
    req.flash('error', 'La contraseña debe tener al menos 6 caracteres.');
    return res.redirect('/auth/register');
  }

  try {
    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      req.flash('error', 'Este correo electrónico ya está registrado.');
      return res.redirect('/auth/register');
    }

    // Determine role
    const [admins] = await pool.query("SELECT id FROM users WHERE rol = 'admin' LIMIT 1");
    const isFirstSetup = admins.length === 0;
    const isAdminUser = req.session.user && req.session.user.rol === 'admin';

    let assignedRol = 'docente';
    if (isFirstSetup) assignedRol = 'admin';
    else if (isAdminUser && rol && ['admin', 'docente', 'tecnico'].includes(rol)) assignedRol = rol;

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre.trim(), email.trim().toLowerCase(), hashedPassword, assignedRol]
    );

    req.flash('success', 'Usuario registrado exitosamente.');

    if (isAdminUser) {
      return res.redirect('/admin/usuarios');
    }

    req.flash('info', 'Ahora puedes iniciar sesión con tus credenciales.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Error en registro:', err);
    req.flash('error', 'Error al registrar el usuario. Intenta de nuevo.');
    res.redirect('/auth/register');
  }
};

// GET /auth/logout
const logout = (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Error al cerrar sesión:', err);
    res.redirect('/auth/login');
  });
};

module.exports = { getLogin, postLogin, getRegister, postRegister, logout };
