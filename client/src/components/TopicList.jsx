// client/src/components/TopicList.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import PomodoroTimer from './PomodoroTimer';


function TopicForm({ subjectId, onAdded }) {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(30);
  

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await api.post(`/subjects/${subjectId}/topics`, {
      title: title.trim(),
      estimated_minutes: Number(minutes) || 30
    });
    setTitle('');
    setMinutes(30);
    onAdded(res.data);
  };

  return (
    <form onSubmit={submit} style={{ marginTop: 8 }}>
      <input
        placeholder="New topic title"
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
        style={{ marginRight: 6 }}
      />
      <input
        type="number"
        min="5"
        value={minutes}
        onChange={(e)=>setMinutes(e.target.value)}
        style={{ width: 80, marginRight: 6 }}
      />
      <button type="submit">Add Topic</button>
    </form>
  );
}

export default function TopicList({ subject, onBack }) {
  const [topics, setTopics] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMinutes, setEditMinutes] = useState(30);
  const [activeTopicForTimer, setActiveTopicForTimer] = useState(null);

  const load = async () => {
    const res = await api.get(`/subjects/${subject.id}/topics`);
    setTopics(res.data);
  };

  useEffect(()=>{ if(subject) load(); }, [subject]);

  const onAdded = (topic) => setTopics(prev => [...prev, topic]);

  const toggleComplete = async (t) => {
    const res = await api.put(`/topics/${t.id}`, {
      completed: t.completed ? 0 : 1
    });
    setTopics(prev => prev.map(p => p.id === t.id ? res.data : p));
  };

  const startEdit = (t) => {
    setEditing(t.id);
    setEditTitle(t.title);
    setEditMinutes(t.estimated_minutes);
  };

  const saveEdit = async () => {
    const res = await api.put(`/topics/${editing}`, {
      title: editTitle,
      estimated_minutes: Number(editMinutes)
    });
    setTopics(prev => prev.map(p => p.id === res.data.id ? res.data : p));
    setEditing(null);
  };

  const del = async (t) => {
    if(!confirm('Delete topic?')) return;
    await api.delete(`/topics/${t.id}`);
    setTopics(prev => prev.filter(p => p.id !== t.id));
  };

  if(!subject) return null;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack} style={{ marginBottom: 10 }}>← Back to subjects</button>
      <h2>{subject.name} — Topics</h2>

<ul>
  {topics.map(t => (
    <li key={t.id} style={{ marginBottom: 8 }}>
      <input type="checkbox" checked={!!t.completed} onChange={()=>toggleComplete(t)} />
      {editing === t.id ? (
        <>
          <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} style={{ marginLeft:8 }} />
          <input value={editMinutes} onChange={e=>setEditMinutes(e.target.value)} style={{ width:80, marginLeft:8 }} />
          <button onClick={saveEdit} style={{ marginLeft:8 }}>Save</button>
          <button onClick={()=>setEditing(null)} style={{ marginLeft:6 }}>Cancel</button>
        </>
      ) : (
        <>
          <span style={{ marginLeft: 8 }}>{t.title} ({t.estimated_minutes}m)</span>
          <button onClick={()=>startEdit(t)} style={{ marginLeft: 8 }}>Edit</button>
          <button onClick={()=>del(t)} style={{ marginLeft: 6 }}>Delete</button>
          <button onClick={()=>setActiveTopicForTimer(t)} style={{ marginLeft: 8 }}>Start Pomodoro</button>
        </>
      )}

      {/* Inline timer for active topic */}
      {activeTopicForTimer && activeTopicForTimer.id === t.id && (
        <div style={{ marginTop: 8 }}>
          <PomodoroTimer
            subjectId={subject.id}
            topicId={t.id}
            onSessionSaved={(session) => {
              // Optional: after a session stops you can refresh topic list or analytics
              console.log('Session saved:', session);
            }}
            focusMinutes={Math.min(55, Math.max(5, t.estimated_minutes))} // optional: set focus length from topic
          />
          <button onClick={()=>setActiveTopicForTimer(null)} style={{ marginLeft: 8, marginTop: 6 }}>Close Timer</button>
        </div>
      )}
    </li>
  ))}
</ul>


      <TopicForm subjectId={subject.id} onAdded={onAdded} />
    </div>
  );
}
