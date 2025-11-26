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
  user_id INTEGER,
  subject_id INTEGER,
  topic_id INTEGER,
  start_time TEXT,
  end_time TEXT,
  duration_minutes INTEGER,
  type TEXT DEFAULT 'pomodoro',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  db.prepare(`CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    estimated_minutes INTEGER DEFAULT 30,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
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

app.get('/api/subjects/:id/topics', (req, res) => {
  const subjectId = req.params.id;
  const rows = db.prepare('SELECT * FROM topics WHERE subject_id = ? ORDER BY created_at').all(subjectId);
  res.json(rows);
});
// Start a session (creates a row with start_time)
app.post('/api/sessions/start', (req, res) => {
  try {
    const { user_id = null, subject_id = null, topic_id = null, type = 'pomodoro' } = req.body;
    const start_time = new Date().toISOString();
    const info = db.prepare(
      `INSERT INTO study_sessions (user_id, subject_id, topic_id, start_time, type)
       VALUES (?, ?, ?, ?, ?)`
    ).run(user_id, subject_id, topic_id, start_time, type);
    const session = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(info.lastInsertRowid);
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Stop a session (set end_time & duration_minutes)
app.post('/api/sessions/stop', (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    const session = db.prepare('SELECT start_time FROM study_sessions WHERE id = ?').get(session_id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const end_time = new Date().toISOString();
    const duration_minutes = Math.max(0, Math.round((new Date(end_time) - new Date(session.start_time)) / 60000));
    db.prepare('UPDATE study_sessions SET end_time = ?, duration_minutes = ? WHERE id = ?')
      .run(end_time, duration_minutes, session_id);
    const updated = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(session_id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to stop session' });
  }
});

// Get sessions (optionally filter by subject/topic)
app.get('/api/sessions', (req, res) => {
  try {
    const { subject_id, topic_id, from, to } = req.query;
    let q = 'SELECT * FROM study_sessions WHERE 1=1';
    const params = [];
    if (subject_id) { q += ' AND subject_id = ?'; params.push(subject_id); }
    if (topic_id) { q += ' AND topic_id = ?'; params.push(topic_id); }
    if (from) { q += ' AND start_time >= ?'; params.push(from); }
    if (to) { q += ' AND start_time <= ?'; params.push(to); }
    q += ' ORDER BY start_time DESC';
    const rows = db.prepare(q).all(...params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});


// Create a topic under a subject
app.post('/api/subjects/:id/topics', (req, res) => {
  const subjectId = req.params.id;
  const { title, estimated_minutes } = req.body;
  if(!title || !title.trim()) return res.status(400).json({ error: 'Title required' });
  const info = db.prepare(
    'INSERT INTO topics (subject_id, title, estimated_minutes) VALUES (?, ?, ?)'
  ).run(subjectId, title.trim(), estimated_minutes || 30);
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(info.lastInsertRowid);
  res.json(topic);
});

// Update topic (title, estimated_minutes, completed)
app.put('/api/topics/:id', (req, res) => {
  const id = req.params.id;
  const { title, estimated_minutes, completed } = req.body;
  const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(id);
  if(!existing) return res.status(404).json({ error: 'Topic not found' });

  db.prepare('UPDATE topics SET title = ?, estimated_minutes = ?, completed = ? WHERE id = ?')
    .run(title ?? existing.title, estimated_minutes ?? existing.estimated_minutes, completed ?? existing.completed, id);

  const updated = db.prepare('SELECT * FROM topics WHERE id = ?').get(id);
  res.json(updated);
});

// Delete topic
app.delete('/api/topics/:id', (req, res) => {
  const id = req.params.id;
  const info = db.prepare('DELETE FROM topics WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Topic not found' });
  res.json({ success: true });
});

// start server
app.listen(4000, () => console.log("Backend running on http://localhost:4000"));
