import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'survey.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER,
    command TEXT,
    status TEXT NOT NULL DEFAULT 'idle',
    started_at TEXT,
    ended_at TEXT,
    current_url TEXT,
    current_provider TEXT,
    current_model TEXT,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
  );
`);

// Insert a log entry
export function addLog(eventType, message, details = null) {
  const stmt = db.prepare('INSERT INTO change_log (event_type, message, details) VALUES (?, ?, ?)');
  const result = stmt.run(eventType, message, details ? JSON.stringify(details) : null);
  return result.lastInsertRowid;
}

// Get recent log entries
export function getLogs(limit = 200) {
  return db.prepare('SELECT * FROM change_log ORDER BY id DESC LIMIT ?').all(limit).reverse();
}

// Profile operations
export function saveProfile(name, content) {
  const existing = db.prepare('SELECT id FROM profiles WHERE name = ?').get(name);
  if (existing) {
    db.prepare('UPDATE profiles SET content = ?, updated_at = datetime(\'now\') WHERE id = ?').run(content, existing.id);
    return existing.id;
  }
  const result = db.prepare('INSERT INTO profiles (name, content) VALUES (?, ?)').run(name, content);
  return result.lastInsertRowid;
}

export function getProfiles() {
  return db.prepare('SELECT * FROM profiles ORDER BY updated_at DESC').all();
}

export function getProfile(id) {
  return db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
}

// Session operations
export function createSession(profileId, command) {
  const result = db.prepare('INSERT INTO sessions (profile_id, command, status, started_at) VALUES (?, ?, \'running\', datetime(\'now\'))').run(profileId, command);
  return result.lastInsertRowid;
}

export function updateSession(id, updates) {
  const keys = Object.keys(updates);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => updates[k]);
  db.prepare(`UPDATE sessions SET ${setClause} WHERE id = ?`).run(...values, id);
}

export function getSession(id) {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

export function getLatestSession() {
  return db.prepare('SELECT * FROM sessions ORDER BY id DESC LIMIT 1').get();
}

export function getRecentSessions(limit = 10) {
  return db.prepare('SELECT * FROM sessions ORDER BY id DESC LIMIT ?').all(limit);
}

export default db;