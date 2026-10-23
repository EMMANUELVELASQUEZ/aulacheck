const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.MYSQLHOST     || process.env.DB_HOST     || 'localhost',
  user:     process.env.MYSQLUSER     || process.env.DB_USER     || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME     || 'aulacheck',
  port:     process.env.MYSQLPORT     || process.env.DB_PORT     || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
