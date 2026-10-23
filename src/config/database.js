const mysql = require('mysql2/promise');
require('dotenv').config();

// Railway usa IPv6 en red interna; si hay MYSQL_URL la usamos directamente
const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

let pool;

if (mysqlUrl) {
  pool = mysql.createPool(mysqlUrl + '?connectionLimit=10&connectTimeout=30000');
} else {
  pool = mysql.createPool({
    host:     process.env.MYSQLHOST     || process.env.DB_HOST     || 'localhost',
    user:     process.env.MYSQLUSER     || process.env.DB_USER     || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME     || 'aulacheck',
    port:  parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000,
    charset: 'utf8mb4'
  });
}

pool.getConnection()
  .then(conn => {
    console.log('✅ Conexión a MySQL establecida');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error al conectar a MySQL:', err.message);
  });

module.exports = pool;
