const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? AND activo = TRUE',
    [email.trim().toLowerCase()]
  );
  return rows[0] || null;
}

async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

async function isLocked(user) {
  if (!user.locked_until) return false;
  if (new Date(user.locked_until) > new Date()) return true;
  await pool.query(
    'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?',
    [user.id]
  );
  return false;
}

async function getLockoutMinutesRemaining(user) {
  if (!user.locked_until) return 0;
  const ms = new Date(user.locked_until) - new Date();
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

async function recordFailedAttempt(userId) {
  const [[row]] = await pool.query('SELECT login_attempts FROM users WHERE id = ?', [userId]);
  const attempts = (row?.login_attempts ?? 0) + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
    : null;
  await pool.query(
    'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
    [attempts, lockedUntil, userId]
  );
  return { attempts, locked: attempts >= MAX_ATTEMPTS };
}

async function resetFailedAttempts(userId) {
  await pool.query(
    'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?',
    [userId]
  );
}

async function updateLastLogin(userId, ip) {
  await pool.query(
    'UPDATE users SET last_login = NOW(), last_login_ip = ? WHERE id = ?',
    [ip, userId]
  );
}

async function logAuthEvent(userId, event, ip, detail = null) {
  try {
    await pool.query(
      'INSERT INTO auth_logs (user_id, event, ip_address, detail) VALUES (?, ?, ?, ?)',
      [userId || null, event, ip, detail]
    );
  } catch {
    // Non-critical: don't let logging failures break the auth flow
  }
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function createUser({ nombre, email, password, rol }) {
  const hashed = await hashPassword(password);
  const [result] = await pool.query(
    'INSERT INTO users (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
    [nombre.trim(), email.trim().toLowerCase(), hashed, rol]
  );
  return result.insertId;
}

module.exports = {
  findUserByEmail,
  verifyPassword,
  isLocked,
  getLockoutMinutesRemaining,
  recordFailedAttempt,
  resetFailedAttempts,
  updateLastLogin,
  logAuthEvent,
  hashPassword,
  createUser,
};
