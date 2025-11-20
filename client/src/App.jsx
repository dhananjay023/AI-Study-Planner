import { useState, useEffect } from 'react';
import api from './api';

function App() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");

  // load subjects
  useEffect(() => {
    api.get('/subjects').then(res => setSubjects(res.data));
  }, []);

  // add new subject
  const addSubject = async () => {
    if (!name.trim()) return;
    await api.post('/subjects', { name, priority: 1, color: "#ff7777" });
    const updated = await api.get('/subjects');
    setSubjects(updated.data);
    setName("");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>AI Study Planner</h1>

      <input 
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Subject name"
      />
      <button onClick={addSubject}>Add</button>

      <ul>
        {subjects.map(s => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
