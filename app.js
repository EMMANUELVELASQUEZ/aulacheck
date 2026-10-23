require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const pool = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── View Engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Method Override (PUT/DELETE from forms) ──────────────────────────────────
app.use(methodOverride('_method'));

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'aulacheck_secret_key_change_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
}));

// ─── Flash Messages ───────────────────────────────────────────────────────────
app.use(flash());

// ─── Global Middleware (setLocals) ────────────────────────────────────────────
const { setLocals } = require('./src/middlewares/auth');
app.use(setLocals);

// ─── API Routes (before main routes) ─────────────────────────────────────────
const { isAuthenticated } = require('./src/middlewares/auth');

// API: Get equipos by aula (AJAX)
app.get('/api/equipos/:aulaId', isAuthenticated, async (req, res) => {
  try {
    const [equipos] = await pool.query(
      'SELECT id, tipo, nombre, estado FROM equipos WHERE aula_id = ? ORDER BY tipo',
      [req.params.aulaId]
    );
    res.json(equipos);
  } catch (err) {
    console.error('Error en API equipos:', err);
    res.status(500).json({ error: 'Error al obtener equipos' });
  }
});

// API: Stats for charts (AJAX)
const estadisticasController = require('./src/controllers/estadisticasController');
app.get('/api/stats', isAuthenticated, estadisticasController.apiStats);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', require('./src/routes/index'));
app.use('/auth', require('./src/routes/auth'));
app.use('/dashboard', require('./src/routes/dashboard'));
app.use('/diagnostico', require('./src/routes/diagnostico'));
app.use('/incidencias', require('./src/routes/incidencias'));
app.use('/admin', require('./src/routes/admin'));
app.use('/estadisticas', require('./src/routes/estadisticas'));

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página no encontrada - AulaCheck',
    layout: 'main'
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err.stack);
  res.status(500).render('error', {
    title: 'Error del servidor - AulaCheck',
    layout: 'main',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const initDb = require('./src/config/initDb');

// Levanta el servidor inmediatamente para que Railway detecte el puerto
app.listen(PORT, () => {
  console.log(`🚀 AulaCheck corriendo en http://localhost:${PORT}`);
  console.log(`📚 Universidad Veracruzana - Sistema de Aulas Híbridas`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

// Inicializa la base de datos con reintentos en background
async function initWithRetry(attempts = 10, delay = 5000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await initDb();
      console.log('✅ Base de datos lista');
      return;
    } catch (err) {
      console.error(`⚠️  DB intento ${i}/${attempts}: ${err.message}`);
      if (i < attempts) await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('❌ No se pudo conectar a la base de datos después de varios intentos');
}

initWithRetry();

module.exports = app;
