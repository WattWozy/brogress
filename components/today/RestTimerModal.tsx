'use client';

import { useEffect, useState, useRef } from 'react';

interface RestTimerModalProps {
  visible: boolean;
  duration: number; // seconds
  onDismiss: () => void;
}

export function RestTimerModal({ visible, duration, onDismiss }: RestTimerModalProps) {
  const [remaining, setRemaining] = useState(duration);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!visible) {
      setRemaining(duration);
      return;
    }
    setRemaining(duration);
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismissRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, duration]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const pct = remaining / duration;
  const dash = circumference * pct;

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(14,14,14,0.97)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        gap: 28, zIndex: 60,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
        transition: 'opacity 0.2s',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{
        fontFamily: "'Nunito', sans-serif",
        fontSize: 11,
        letterSpacing: '0.14em',
        color: '#888',
        textTransform: 'uppercase',
      }}>
        Rest
      </div>

      {/* Circular countdown */}
      <div style={{ position: 'relative', width: 136, height: 136 }}>
        <svg width="136" height="136" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="68" cy="68" r={radius} fill="none" stroke="#1e1e1e" strokeWidth="5" />
          <circle
            cx="68" cy="68" r={radius} fill="none"
            stroke="#f472b6" strokeWidth="5"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.85s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Raleway', sans-serif",
          fontSize: 56, fontWeight: 900,
          color: '#f0f0f0',
          letterSpacing: '-0.02em',
        }}>
          {remaining}
        </div>
      </div>

      <div style={{
        fontFamily: "'Nunito', sans-serif",
        fontSize: 10,
        letterSpacing: '0.12em',
        color: '#444',
        textTransform: 'uppercase',
      }}>
        tap to skip
      </div>
    </div>
  );
}
