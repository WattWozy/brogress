'use client';

import type { Feel } from '@/types';

interface FeelOverlayProps {
  visible: boolean;
  onSelect: (feel: Feel) => void;
}

const OPTIONS: { feel: Feel; emoji: string; label: string }[] = [
  { feel: 'easy',  emoji: '😮‍💨', label: 'Too Easy'   },
  { feel: 'right', emoji: '✅',    label: 'Just Right' },
  { feel: 'hard',  emoji: '😤',    label: 'Too Hard'   },
];

export function FeelOverlay({ visible, onSelect }: FeelOverlayProps) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(14,14,14,0.97)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      gap: 32, zIndex: 50,
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.2s',
    }}>
      <div style={{
        fontFamily: "'Nunito', sans-serif",
        fontSize: 11,
        letterSpacing: '0.14em',
        color: '#888',
        textTransform: 'uppercase',
      }}>
        How did it feel?
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        {OPTIONS.map(o => (
          <button
            key={o.feel}
            onClick={() => onSelect(o.feel)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: 16,
              border: '1px solid #444',
              borderRadius: 16,
              background: 'transparent',
              cursor: 'pointer',
              minWidth: 72,
              color: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>{o.emoji}</span>
            <span style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: 9,
              color: '#888',
              letterSpacing: '0.08em',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}>
              {o.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
