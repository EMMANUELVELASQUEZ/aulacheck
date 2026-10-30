require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const pool = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Trust Proxy (Railway / Render / Heroku) ───────────────────────────────────
app.set('trust proxy', 1);

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── HTTP Request Logging ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── View Engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// ── Static Files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Method Override (PUT/DELETE from forms) ───────────────────────────────────
app.use(methodOverride('_method'));

// ── Session ───────────────────────────────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'ac_dev_secret_change_in_production',
    resave: false,
    saveUninitialized: false,
    name: 'ac.sid',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
      sameSite: 'lax',
    },
  })
);

// ── Flash Messages ────────────────────────────────────────────────────────────
app.use(flash());

// ── Global View Locals ────────────────────────────────────────────────────────
const { setLocals } = require('./src/middlewares/auth');
app.use(setLocals);

// ── Global Rate Limiter ───────────────────────────────────────────────────────
const { globalLimiter } = require('./src/middlewares/rateLimiter');
app.use(globalLimiter);

// ── API Routes ────────────────────────────────────────────────────────────────
const { isAuthenticated } = require('./src/middlewares/auth');

app.get('/api/equipos/:aulaId', isAuthenticated, async (req, res) => {
  try {
    const [equipos] = await pool.query(
      'SELECT id, tipo, nombre, estado FROM equipos WHERE aula_id = ? ORDER BY tipo',
      [req.params.aulaId]
    );
    res.json(equipos);
  } catch {
    res.status(500).json({ error: 'Error al obtener equipos' });
  }
});

const estadisticasController = require('./src/controllers/estadisticasController');
app.get('/api/stats', isAuthenticated, estadisticasController.apiStats);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', require('./src/routes/index'));
app.use('/auth', require('./src/routes/auth'));
app.use('/dashboard', require('./src/routes/dashboard'));
app.use('/diagnostico', require('./src/routes/diagnostico'));
app.use('/incidencias', require('./src/routes/incidencias'));
app.use('/admin', require('./src/routes/admin'));
app.use('/estadisticas', require('./src/routes/estadisticas'));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: 'Página no encontrada - AulaCheck', layout: 'main' });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).render('error', {
    title: 'Error del servidor - AulaCheck',
    layout: 'main',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const initDb = require('./src/config/initDb');

app.listen(PORT, () => {
  console.log(`AulaCheck v2.0 corriendo en http://localhost:${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
});

async function initWithRetry(attempts = 10, delay = 5000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await initDb();
      return;
    } catch (err) {
      console.error(`DB intento ${i}/${attempts}: ${err.message}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, delay));
    }
  }
  console.error('No se pudo inicializar la base de datos después de varios intentos.');
}

initWithRetry();
module.exports = app;
