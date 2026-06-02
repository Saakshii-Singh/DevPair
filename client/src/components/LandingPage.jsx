import React, { useState, useEffect } from 'react';
import { Terminal, Users, Video, Code, ShieldCheck } from 'lucide-react';

function LandingPage({ appState, queueStatus, onStartMatching, onCancelMatching }) {
  const [name, setName] = useState('');
  const [seconds, setSeconds] = useState(0);

  // Timer for matchmaking queue duration
  useEffect(() => {
    let interval = null;
    if (appState === 'MATCHING') {
      setSeconds(0);
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [appState]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onStartMatching(name.trim());
    }
  };

  return (
    <div className="landing-layout">
      {appState === 'LANDING' ? (
        <div className="landing-card glass-panel">
          <div className="landing-logo">
            <span style={{ color: 'var(--primary)' }}>⚡</span> DevPair
          </div>
          <p>Collaborative peer-to-peer interview room with integrated code editor, WebRTC video calling, and LeetCode-style questions.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Choose your Nickname</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., AdaLovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              Find Match
            </button>
          </form>

          {/* Value Props Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginTop: '2.5rem',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Video size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.15rem' }}>1v1 Video Stream</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Low latency, direct connection.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Code size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.15rem' }}>Shared IDE</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Monaco editor with typing sync.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Terminal size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.15rem' }}>Mock Compiler</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Execute JS code on test cases.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Users size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.15rem' }}>Peer Matchmaking</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Get paired with developers instantly.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="landing-card glass-panel" style={{ padding: '3.5rem 2rem' }}>
          <div className="matchmaker-container">
            <div className="radar-circle">
              <div className="radar-core"></div>
            </div>
            
            <h3 className="matchmaker-title">Finding an Interview Partner...</h3>
            <p className="matchmaker-subtitle">
              Time elapsed: <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{formatTime(seconds)}</span>
            </p>
            
            <div className="glass-panel" style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
              background: 'rgba(255, 255, 255, 0.01)'
            }}>
              Queue position: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{queueStatus.position}</span> / {queueStatus.totalInQueue} waiting developers
            </div>

            <button onClick={onCancelMatching} className="cancel-btn">
              Cancel Matchmaking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
