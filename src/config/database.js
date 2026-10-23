const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aulacheck',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ Conexión a MySQL establecida correctamente');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar a MySQL:', err.message);
  });

module.exports = pool;
