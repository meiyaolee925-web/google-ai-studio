import Database from 'better-sqlite3';

const db = new Database('records.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    role TEXT,
    score INTEGER,
    answers TEXT,
    file_path TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
  db.exec('ALTER TABLE candidates ADD COLUMN phone TEXT');
} catch (e) {
  // Ignore if column already exists
}

export default db;
