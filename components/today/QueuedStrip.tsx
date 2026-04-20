'use client';

import { useWorkout } from '@/context/WorkoutContext';

export function QueuedStrip() {
  const { state } = useWorkout();

  const upcoming = state.queue.filter((e, i) => i > state.currentExIdx && !e.done);
  if (upcoming.length === 0) return <div style={{ minHeight: 28, padding: '0 24px 16px' }} />;

  return (
    <div style={{
      minHeight: 28,
      display: 'flex', gap: 8, flexWrap: 'wrap',
      padding: '0 24px 16px',
    }}>
      {upcoming.map((ex, i) => (
        <div
          key={ex.id + i}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: '#444',
            border: '1px solid #2a2a2a',
            borderRadius: 100,
            padding: '4px 10px',
            letterSpacing: '0.08em',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {ex.name}
        </div>
      ))}
    </div>
  );
}
