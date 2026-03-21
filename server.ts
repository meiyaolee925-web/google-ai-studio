import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Setup SQLite
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

// Setup Multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`)
});
const upload = multer({ storage });

app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// API Routes
app.get('/api/check', (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.json({ submitted: false });
    }
    const record = db.prepare(`
      SELECT id FROM candidates 
      WHERE name = ? AND datetime(submitted_at) >= datetime('now', '-24 hours')
    `).get(name);
    res.json({ submitted: !!record });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check' });
  }
});

app.post('/api/submit', upload.single('file'), (req, res) => {
  try {
    const { name, phone, role, score, answers } = req.body;
    
    // Check for duplicate within 24 hours
    const duplicate = db.prepare(`
      SELECT id FROM candidates 
      WHERE name = ? AND datetime(submitted_at) >= datetime('now', '-24 hours')
    `).get(name);
    
    if (duplicate) {
      return res.status(400).json({ error: 'Duplicate submission within 24 hours' });
    }

    const filePath = req.file ? `/uploads/${req.file.filename}` : null;
    
    const stmt = db.prepare('INSERT INTO candidates (name, phone, role, score, answers, file_path) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(name, phone, role, parseInt(score || '0'), answers, filePath);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Failed to submit' });
  }
});

app.get('/api/records', (req, res) => {
  try {
    const records = db.prepare('SELECT * FROM candidates ORDER BY submitted_at DESC').all();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
