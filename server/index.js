const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// connect to database
const db = new Database('data.db');

// create tables (run once)
function init() {
  db.prepare(`CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    color TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER,
    start_time TEXT,
    end_time TEXT,
    duration_minutes INTEGER
  )`).run();
}
init();

// routes
app.get('/api/subjects', (req, res) => {
  const rows = db.prepare('SELECT * FROM subjects').all();
  res.json(rows);
});

app.post('/api/subjects', (req, res) => {
  const { name, priority, color } = req.body;
  const info = db.prepare(
    'INSERT INTO subjects (name, priority, color) VALUES (?, ?, ?)'
  ).run(name, priority, color);
  res.json({ id: info.lastInsertRowid });
});

// start server
app.listen(4000, () => console.log("Backend running on http://localhost:4000"));
