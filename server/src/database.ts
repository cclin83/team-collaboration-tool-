import Database from 'better-sqlite3';
import path from 'path';

// Use /var/data for Render persistent disk, fallback to local
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
const DB_PATH = path.join(DATA_DIR, 'data.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_color TEXT NOT NULL DEFAULT '#FF6B35',
    total_score INTEGER NOT NULL DEFAULT 0,
    speak_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS speak_records (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    encouragement TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );
`);

export default db;
