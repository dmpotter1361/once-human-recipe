// reset-admin.js
const { db, initSchema } = require('./db');
const crypto = require('crypto');

// Initialize schema in case it's a new database
initSchema();

// Priority: 1. CLI argument, 2. Env variable, 3. Default
const newPassword = process.argv[2] || process.env.ADMIN_PASSWORD;
const adminUsername = process.argv[3] || process.env.ADMIN_USERNAME || 'admin';

if (!newPassword && !process.env.ADMIN_PASSWORD) {
  console.log("Error: Password not specified.");
  console.log("Usage: node reset-admin.js <new_password> [admin_username]");
  console.log("Alternatively, run with ADMIN_PASSWORD environment variable set.");
  process.exit(1);
}

const targetPassword = newPassword || 'admin123';
const passwordHash = crypto.createHash('sha256').update(targetPassword).digest('hex');

try {
  const existingAdmin = db.prepare(`SELECT id, role FROM users WHERE username = ?`).get(adminUsername);
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')
    `).run(adminUsername, passwordHash);
    console.log(`Successfully created admin user: username='${adminUsername}', password='${targetPassword}'`);
  } else {
    db.prepare(`
      UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?
    `).run(passwordHash, existingAdmin.id);
    console.log(`Successfully reset admin user: username='${adminUsername}', role forced to 'admin', password updated.`);
  }
} catch (err) {
  console.error("Failed to reset/update admin user:", err.message);
  process.exit(1);
}
