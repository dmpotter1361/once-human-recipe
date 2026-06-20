const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

// Write tracker.db to data/ subdirectory if running in production or if data/ folder exists (for Docker volume mounting)
let dbDir = __dirname;
if (process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'data'))) {
  dbDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

const dbPath = path.join(dbDir, 'tracker.db');
const db = new DatabaseSync(dbPath);

// Initialize schema tables matching the implementation plan
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('user', 'admin')) NOT NULL DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS guilds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      join_passcode TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      scenario_name TEXT NOT NULL,
      UNIQUE(name, scenario_name)
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      guild_id INTEGER,
      server_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE SET NULL,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
      UNIQUE(server_id, name)
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT UNIQUE NOT NULL,
      formula TEXT,
      category TEXT,
      reverse_engineering_points INTEGER,
      acquired_by TEXT,
      is_approved INTEGER DEFAULT 1, -- 0 = pending, 1 = global approved
      submitted_by INTEGER,
      FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS character_recipes (
      character_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('learned', 'learning')) NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (character_id, recipe_id),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

module.exports = {
  db,
  initSchema
};
