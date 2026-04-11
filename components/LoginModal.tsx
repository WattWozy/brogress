'use client';

import { useState } from 'react';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
}

export function LoginModal({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0e0e0e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Mono', monospace",
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        padding: '40px 32px',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900, fontSize: 36,
            color: '#f5a623', letterSpacing: 1,
            marginBottom: 4,
          }}>
            BROGRESS
          </div>
          <div style={{ color: '#444', fontSize: 11, letterSpacing: '0.04em', marginBottom: 12 }}>
            No bloat. No distraction. Just brogress.
          </div>

        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            style={inputStyle}
          />

          {error && (
            <div style={{ color: '#e05a5a', fontSize: 12 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              height: 48,
              background: loading ? '#333' : '#f5a623',
              color: loading ? '#666' : '#000',
              border: 'none',
              borderRadius: 4,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800, fontSize: 18,
              letterSpacing: 1,
              cursor: loading ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? '...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
          style={{
            background: 'none', border: 'none',
            color: '#555', fontSize: 12,
            cursor: 'pointer', textAlign: 'left',
            padding: 0,
          }}
        >
          {mode === 'login' ? "don't have an account? register" : 'already have an account? sign in'}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: 4,
  color: '#f0f0f0',
  fontFamily: "'DM Mono', monospace",
  fontSize: 14,
  padding: '0 14px',
  outline: 'none',
};
