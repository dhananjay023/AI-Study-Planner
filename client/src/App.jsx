// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import api from './api';
import TopicList from './components/TopicList';

export default function App() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState('');
  const [activeSubject, setActiveSubject] = useState(null);

  const loadSubjects = async () => {
    const res = await api.get('/subjects');
    setSubjects(res.data);
  };

  useEffect(()=>{ loadSubjects(); }, []);

  const addSubject = async () => {
    if (!name.trim()) return;
    await api.post('/subjects', { name, priority: 1, color: "#ff7777" });
    setName('');
    loadSubjects();
  };

  const delSubject = async (s) => {
    if(!confirm('Delete subject and its topics?')) return;
    await api.delete(`/subjects/${s.id}`);
    loadSubjects();
  };

  if(activeSubject) {
    return <TopicList subject={activeSubject} onBack={() => { setActiveSubject(null); loadSubjects(); }} />
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>AI Study Planner</h1>

      <div style={{ marginBottom: 12 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Subject name" />
        <button onClick={addSubject} style={{ marginLeft: 8 }}>Add</button>
      </div>

      <ul>
        {subjects.map(s => (
          <li key={s.id} style={{ marginBottom: 8 }}>
            <span style={{ cursor: 'pointer' }} onClick={()=>setActiveSubject(s)}>{s.name}</span>
            <button onClick={()=>delSubject(s)} style={{ marginLeft: 12 }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
