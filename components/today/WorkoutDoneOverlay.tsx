'use client';

import { useWorkout } from '@/context/WorkoutContext';

interface WorkoutDoneOverlayProps {
  visible: boolean;
}

export function WorkoutDoneOverlay({ visible }: WorkoutDoneOverlayProps) {
  const { state, resetSession } = useWorkout();

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(14,14,14,0.97)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      gap: 20, zIndex: 80,
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.3s',
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 96, fontWeight: 900,
        textTransform: 'uppercase',
        color: '#f5a623',
        lineHeight: 0.9,
        textAlign: 'center',
        letterSpacing: '-0.02em',
      }}>
        Session<br />Done
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: '#888',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}>
        That&apos;s a wrap
      </div>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 20,
        color: '#888',
        textAlign: 'center',
        padding: '0 24px',
      }}>
        {state.completedSets} sets across{' '}
        {state.queue.length + state.skipped.length} exercises
      </div>
      <button
        onClick={resetSession}
        style={{
          marginTop: 20,
          background: '#f5a623',
          color: '#000',
          border: 'none',
          borderRadius: 100,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 20, fontWeight: 900,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          padding: '16px 40px',
          cursor: 'pointer',
        }}
      >
        New Session
      </button>
    </div>
  );
}
