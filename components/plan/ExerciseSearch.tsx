'use client';

import { useState } from 'react';
import { EXERCISE_LIBRARY } from '@/lib/defaults';
import { useWorkout } from '@/context/WorkoutContext';
import type { Exercise } from '@/types';
import { exerciseId } from '@/lib/appwrite';

interface ExerciseSearchProps {
  visible: boolean;
  onClose: () => void;
  onAdded: (name: string) => void;
}

export function ExerciseSearch({ visible, onClose, onAdded }: ExerciseSearchProps) {
  const { addExercise, state } = useWorkout();
  const [query, setQuery] = useState('');

  const filtered = query
    ? EXERCISE_LIBRARY.filter(n => n.toLowerCase().includes(query.toLowerCase()))
    : EXERCISE_LIBRARY;

  const showCustom = query.length > 0 &&
    !EXERCISE_LIBRARY.some(n => n.toLowerCase() === query.toLowerCase());

  function handleAdd(name: string) {
    const ex: Exercise = { id: exerciseId(name), name, sets: 3, reps: 10, weight: 20 };
    addExercise(ex);
    setQuery('');
    onClose();
    onAdded(name);
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0e0e0e',
      zIndex: 60,
      display: 'flex', flexDirection: 'column',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.2s',
    }}>
      <div style={{ padding: '52px 24px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#888', fontSize: 24, cursor: 'pointer', padding: 4 }}
        >
          ✕
        </button>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search exercises..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1,
            background: '#2a2a2a',
            border: '1px solid #444',
            color: '#f0f0f0',
            fontFamily: "'Nunito', sans-serif",
            fontSize: 15,
            padding: '12px 16px',
            borderRadius: 12,
            outline: 'none',
            WebkitAppearance: 'none',
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
        {showCustom && (
          <div
            onClick={() => handleAdd(query)}
            style={{
              padding: '16px 0',
              borderBottom: '1px solid #2a2a2a',
              fontFamily: "'Raleway', sans-serif",
              fontSize: 20, fontWeight: 700,
              textTransform: 'uppercase',
              color: '#f472b6',
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            + Add &quot;{query}&quot;
          </div>
        )}
        {filtered.map(name => (
          <div
            key={name}
            onClick={() => handleAdd(name)}
            style={{
              padding: '16px 0',
              borderBottom: '1px solid #2a2a2a',
              fontFamily: "'Raleway', sans-serif",
              fontSize: 20, fontWeight: 700,
              textTransform: 'uppercase',
              color: '#f0f0f0',
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
