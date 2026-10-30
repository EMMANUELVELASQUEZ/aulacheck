const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/css') || req.path.startsWith('/js'),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    req.flash('error', 'Demasiados intentos de acceso. Espera 15 minutos e intenta de nuevo.');
    res.redirect('/auth/login');
  },
});

module.exports = { globalLimiter, loginLimiter };
