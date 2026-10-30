const pool = require('../config/database');
const authService = require('../services/authService');

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.ip ||
  req.connection?.remoteAddress ||
  'unknown';

// GET /auth/login
const getLogin = (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Iniciar Sesión - AulaCheck', layout: 'auth' });
};

// POST /auth/login
const postLogin = async (req, res) => {
  const { email, password } = req.body;
  const ip = getClientIp(req);

  try {
    const user = await authService.findUserByEmail(email);

    if (!user) {
      await authService.logAuthEvent(null, 'login_failed_unknown', ip, email);
      req.flash('error', 'Credenciales incorrectas. Verifica tu correo y contraseña.');
      return res.redirect('/auth/login');
    }

    const locked = await authService.isLocked(user);
    if (locked) {
      const minutes = await authService.getLockoutMinutesRemaining(user);
      await authService.logAuthEvent(user.id, 'login_blocked', ip);
      req.flash('error', `Cuenta temporalmente bloqueada. Intenta de nuevo en ${minutes} minuto(s).`);
      return res.redirect('/auth/login');
    }

    const valid = await authService.verifyPassword(password, user.password);
    if (!valid) {
      const { attempts, locked: nowLocked } = await authService.recordFailedAttempt(user.id);
      await authService.logAuthEvent(user.id, 'login_failed', ip);
      if (nowLocked) {
        req.flash('error', 'Demasiados intentos fallidos. Cuenta bloqueada por 30 minutos.');
      } else {
        const remaining = Math.max(0, 5 - attempts);
        req.flash('error', `Credenciales incorrectas. Te quedan ${remaining} intento(s) antes del bloqueo.`);
      }
      return res.redirect('/auth/login');
    }

    await authService.resetFailedAttempts(user.id);
    await authService.updateLastLogin(user.id, ip);
    await authService.logAuthEvent(user.id, 'login_success', ip);

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        req.flash('error', 'Error de sesión. Por favor intenta de nuevo.');
        return res.redirect('/auth/login');
      }
      req.session.user = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
      req.flash('success', `Bienvenido de vuelta, ${user.nombre.split(' ')[0]}.`);
      switch (user.rol) {
        case 'admin': return res.redirect('/admin');
        case 'tecnico': return res.redirect('/incidencias');
        default: return res.redirect('/dashboard');
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    req.flash('error', 'Error interno del servidor. Por favor intenta de nuevo.');
    res.redirect('/auth/login');
  }
};

// GET /auth/register
const getRegister = async (req, res) => {
  try {
    const [admins] = await pool.query("SELECT id FROM users WHERE rol = 'admin' LIMIT 1");
    const isFirstSetup = admins.length === 0;
    const isAdminUser = req.session.user?.rol === 'admin';

    if (!isFirstSetup && !isAdminUser) {
      req.flash('error', 'El registro de usuarios está restringido a administradores.');
      return res.redirect('/auth/login');
    }

    res.render('auth/register', {
      title: 'Registro de Usuario - AulaCheck',
      layout: 'auth',
      isFirstSetup,
      isAdminUser,
    });
  } catch (err) {
    console.error('Error en getRegister:', err);
    req.flash('error', 'Error al cargar el formulario.');
    res.redirect('/auth/login');
  }
};

// POST /auth/register
const postRegister = async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  const ip = getClientIp(req);

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [
      email.trim().toLowerCase(),
    ]);
    if (existing.length > 0) {
      req.flash('error', 'Este correo electrónico ya está registrado en el sistema.');
      return res.redirect('/auth/register');
    }

    const [admins] = await pool.query("SELECT id FROM users WHERE rol = 'admin' LIMIT 1");
    const isFirstSetup = admins.length === 0;
    const isAdminUser = req.session.user?.rol === 'admin';

    let assignedRol = 'docente';
    if (isFirstSetup) assignedRol = 'admin';
    else if (isAdminUser && ['admin', 'docente', 'tecnico'].includes(rol)) assignedRol = rol;

    const userId = await authService.createUser({ nombre, email, password, rol: assignedRol });
    await authService.logAuthEvent(userId, 'user_created', ip, `rol:${assignedRol}`);

    req.flash('success', `Usuario "${nombre.trim()}" registrado correctamente con rol ${assignedRol}.`);
    return isAdminUser ? res.redirect('/admin/usuarios') : res.redirect('/auth/login');
  } catch (err) {
    console.error('Error en registro:', err);
    req.flash('error', 'Error al registrar el usuario. Por favor intenta de nuevo.');
    res.redirect('/auth/register');
  }
};

// GET /auth/logout
const logout = async (req, res) => {
  const userId = req.session.user?.id;
  const ip = getClientIp(req);
  req.session.destroy(async (err) => {
    if (err) console.error('Error al cerrar sesión:', err);
    if (userId) await authService.logAuthEvent(userId, 'logout', ip).catch(() => {});
    res.clearCookie('ac.sid');
    res.redirect('/auth/login');
  });
};

module.exports = { getLogin, postLogin, getRegister, postRegister, logout };
