'use client';

import { useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { ProgressionModal } from './ProgressionModal';

interface WorkoutDoneOverlayProps {
  visible: boolean;
}

export function WorkoutDoneOverlay({ visible }: WorkoutDoneOverlayProps) {
  const { state, resetSession, progressionSuggestions, applyProgression } = useWorkout();
  const [showProgression, setShowProgression] = useState(false);

  const hasGains = progressionSuggestions.length > 0;

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
        fontFamily: "'Raleway', sans-serif",
        fontSize: 96, fontWeight: 900,
        textTransform: 'uppercase',
        color: '#f472b6',
        lineHeight: 0.9,
        textAlign: 'center',
        letterSpacing: '-0.02em',
      }}>
        Session<br />Done
      </div>
      <div style={{
        fontFamily: "'Nunito', sans-serif",
        fontSize: 11,
        color: '#888',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}>
        That&apos;s a wrap
      </div>
      <div style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize: 20,
        color: '#888',
        textAlign: 'center',
        padding: '0 24px',
      }}>
        {state.completedSets} sets across{' '}
        {state.queue.length + state.skipped.length} exercises
      </div>

      {hasGains ? (
        <button
          onClick={() => setShowProgression(true)}
          style={{
            marginTop: 8,
            background: '#f472b6',
            color: '#000',
            border: 'none',
            borderRadius: 100,
            fontFamily: "'Raleway', sans-serif",
            fontSize: 22, fontWeight: 900,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '18px 40px',
            cursor: 'pointer',
          }}
        >
          Review gains →
        </button>
      ) : (
        <div style={{
          marginTop: 8,
          background: '#1a1a1a',
          color: '#555',
          border: '1px solid #333',
          borderRadius: 100,
          fontFamily: "'Raleway', sans-serif",
          fontSize: 20, fontWeight: 900,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          padding: '16px 40px',
          userSelect: 'none',
        }}>
          Well done. Now rest
        </div>
      )}

      {/* Progression review modal — slides in on top */}
      {showProgression && (
        <ProgressionModal
          suggestions={progressionSuggestions}
          onApply={(accepted) => {
            applyProgression(accepted);
            setShowProgression(false);
          }}
        />
      )}
    </div>
  );
}
