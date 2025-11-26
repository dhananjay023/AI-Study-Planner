// client/src/components/PomodoroTimer.jsx
import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

/*
Props:
  subjectId (number|null)
  topicId (number|null)
  onSessionSaved (optional) -> called with session object after stop
  focusMinutes (default 25), shortBreakMinutes (5), longBreakMinutes (15)
*/
export default function PomodoroTimer({
  subjectId = null,
  topicId = null,
  onSessionSaved = () => {},
  focusMinutes = 25,
  shortBreakMinutes = 5,
  longBreakMinutes = 15
}) {
  // modes: 'idle' (not started), 'focus', 'short_break', 'long_break', 'paused'
  const [mode, setMode] = useState('idle');
  const [remaining, setRemaining] = useState(focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0); // number of focus sessions completed modulo 4
  const intervalRef = useRef(null);
  const sessionRef = useRef(null); // holds session row while a focus session is active

  useEffect(() => {
    // sync remaining when durations change
    if (mode === 'focus' || mode === 'idle') setRemaining(focusMinutes * 60);
    if (mode === 'short_break') setRemaining(shortBreakMinutes * 60);
    if (mode === 'long_break') setRemaining(longBreakMinutes * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMinutes, shortBreakMinutes, longBreakMinutes]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => r - 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (remaining <= 0 && mode !== 'idle') {
      // automatic completion of the current mode
      handleComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const startFocus = async () => {
    // create a session record when focus starts
    try {
      const res = await api.post('/sessions/start', {
        subject_id: subjectId,
        topic_id: topicId,
        type: 'pomodoro'
      });
      sessionRef.current = res.data; // store server session row (has id & start_time)
    } catch (err) {
      console.error('Failed to start session:', err);
      // still continue locally but session won't be recorded server-side
    }
    setMode('focus');
    setRemaining(focusMinutes * 60);
    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
    setMode(prev => (prev === 'focus' ? 'paused' : prev));
  };

  const resume = () => {
    setRunning(true);
    setMode(prev => (prev === 'paused' ? 'focus' : prev));
  };

  const stop = async () => {
    // stop current activity and if a focus session is active, stop it on server
    setRunning(false);
    if (sessionRef.current && sessionRef.current.id) {
      try {
        const res = await api.post('/sessions/stop', { session_id: sessionRef.current.id });
        onSessionSaved(res.data);
      } catch (err) {
        console.error('Failed to stop session on server:', err);
      }
      sessionRef.current = null;
    }
    // reset to idle
    setMode('idle');
    setRemaining(focusMinutes * 60);
    setCycleCount(0);
  };

  const handleComplete = async () => {
    // Completed a mode (focus or break). If focus finished, stop session on server.
    if (mode === 'focus' && sessionRef.current && sessionRef.current.id) {
      try {
        const res = await api.post('/sessions/stop', { session_id: sessionRef.current.id });
        onSessionSaved(res.data);
      } catch (err) {
        console.error('Failed to stop session on server:', err);
      }
      sessionRef.current = null;
      const nextCycle = cycleCount + 1;
      setCycleCount(nextCycle);
      // after focus -> decide break
      if (nextCycle % 4 === 0) {
        setMode('long_break');
        setRemaining(longBreakMinutes * 60);
        setRunning(true);
      } else {
        setMode('short_break');
        setRemaining(shortBreakMinutes * 60);
        setRunning(true);
      }
      return;
    }

    // if a break completed -> move to focus
    if (mode === 'short_break' || mode === 'long_break') {
      setMode('focus');
      setRemaining(focusMinutes * 60);
      setRunning(true);
      return;
    }

    // if paused or idle just ensure state is reset
    setRunning(false);
    setMode('idle');
    setRemaining(focusMinutes * 60);
  };

  const secondsToMMSS = (s) => {
    if (s < 0) s = 0;
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      padding: 12,
      borderRadius: 8,
      display: 'inline-block',
      minWidth: 220
    }}>
      <div style={{ fontSize: 14, marginBottom: 6 }}>
        {topicId ? `Topic ID: ${topicId}` : (subjectId ? `Subject ID: ${subjectId}` : 'No subject/topic')}
      </div>

      <div style={{ fontSize: 28, fontWeight: 600 }}>{secondsToMMSS(remaining)}</div>
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <small>Mode: {mode}</small>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {mode === 'idle' && (
          <button onClick={startFocus}>Start Focus ({focusMinutes}m)</button>
        )}

        {(mode === 'focus' || mode === 'paused') && (
          running ? (
            <button onClick={pause}>Pause</button>
          ) : (
            <button onClick={resume}>Resume</button>
          )
        )}

        {mode !== 'idle' && <button onClick={stop}>Stop</button>}
      </div>

      <div style={{ marginTop: 8 }}>
        <small>Cycles completed: {cycleCount}</small>
      </div>
    </div>
  );
}
