'use client';

import { useWorkout } from '@/context/WorkoutContext';

interface QueuedStripProps {
  onReinject: (idx: number) => void;
}

export function QueuedStrip({ onReinject }: QueuedStripProps) {
  const { state } = useWorkout();

  if (state.skipped.length === 0) return <div style={{ minHeight: 28, padding: '0 24px 16px' }} />;

  return (
    <div style={{
      minHeight: 28,
      display: 'flex', gap: 8, flexWrap: 'wrap',
      padding: '0 24px 16px',
    }}>
      {state.skipped.map((ex, i) => (
        <div
          key={ex.id + i}
          onClick={() => onReinject(i)}
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 10,
            color: '#444',
            border: '1px solid #2a2a2a',
            borderRadius: 100,
            padding: '4px 10px',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          ↓ {ex.name} — queued
        </div>
      ))}
    </div>
  );
}
