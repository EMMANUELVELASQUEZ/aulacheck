/**
 * Authentication and authorization middleware for AulaCheck
 */

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Debes iniciar sesión para acceder a esta página.');
  res.redirect('/auth/login');
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.rol === 'admin') {
    return next();
  }
  req.flash('error', 'No tienes permisos para acceder a esta sección.');
  res.redirect('/dashboard');
};

// Check if user is tecnico or admin
const isTecnico = (req, res, next) => {
  if (req.session && req.session.user &&
      (req.session.user.rol === 'tecnico' || req.session.user.rol === 'admin')) {
    return next();
  }
  req.flash('error', 'No tienes permisos para realizar esta acción.');
  res.redirect('/incidencias');
};

// Set global locals for views
const setLocals = (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = req.session.user ? req.session.user.rol === 'admin' : false;
  res.locals.isTecnico = req.session.user ?
    (req.session.user.rol === 'tecnico' || req.session.user.rol === 'admin') : false;
  res.locals.isDocente = req.session.user ? req.session.user.rol === 'docente' : false;
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.info_msg = req.flash('info');
  next();
};

module.exports = { isAuthenticated, isAdmin, isTecnico, setLocals };
