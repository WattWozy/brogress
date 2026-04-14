'use client';

import { useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import type { Exercise } from '@/types';

interface PlanItemProps {
  ex: Exercise;
  idx: number;
  total: number;
  onDelete: (idx: number) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
}

export function PlanItem({ ex, idx, total, onDelete, onMoveUp, onMoveDown }: PlanItemProps) {
  const { updateRoutineExercise } = useWorkout();
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderBottom: '1px solid #2a2a2a',
        padding: '18px 0',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Up/Down arrows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button
            onClick={() => onMoveUp(idx)}
            disabled={idx === 0}
            style={{
              background: 'none',
              border: 'none',
              color: idx === 0 ? '#333' : '#666',
              fontSize: 14,
              cursor: idx === 0 ? 'default' : 'pointer',
              padding: '2px 6px',
              lineHeight: 1,
            }}
          >
            ▲
          </button>
          <button
            onClick={() => onMoveDown(idx)}
            disabled={idx === total - 1}
            style={{
              background: 'none',
              border: 'none',
              color: idx === total - 1 ? '#333' : '#666',
              fontSize: 14,
              cursor: idx === total - 1 ? 'default' : 'pointer',
              padding: '2px 6px',
              lineHeight: 1,
            }}
          >
            ▼
          </button>
        </div>

        {/* Info */}
        <div
          style={{ flex: 1, cursor: 'pointer' }}
          onClick={() => setOpen(o => !o)}
        >
          <div style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: 22, fontWeight: 700,
            textTransform: 'uppercase',
            color: '#f0f0f0',
            letterSpacing: '0.02em',
          }}>
            {ex.name}
          </div>
          <div style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 10,
            color: '#888',
            letterSpacing: '0.08em',
            marginTop: 2,
          }}>
            {ex.sets} × {ex.reps} &nbsp;·&nbsp; {ex.weight} kg
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(idx)}
          style={{
            background: 'none',
            border: 'none',
            color: '#555',
            fontSize: 18,
            cursor: 'pointer',
            padding: '4px 8px',
            flexShrink: 0,
            lineHeight: 1,
            transition: 'color 0.12s',
          }}
          onPointerDown={e => (e.currentTarget.style.color = '#e05555')}
          onPointerUp={e => (e.currentTarget.style.color = '#555')}
          onPointerLeave={e => (e.currentTarget.style.color = '#555')}
        >
          ✕
        </button>
      </div>

      {/* Inline editor */}
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 16 }}>
          {(['sets', 'reps', 'weight'] as const).map(field => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: 9, color: '#888',
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {field === 'weight' ? 'Weight (kg)' : field.charAt(0).toUpperCase() + field.slice(1)}
              </div>
              <input
                type="number"
                inputMode="decimal"
                defaultValue={ex[field]}
                min={0}
                step={field === 'weight' ? 2.5 : 1}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0) updateRoutineExercise(idx, { [field]: val });
                }}
                style={{
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#f0f0f0',
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 15,
                  padding: '8px 12px',
                  borderRadius: 8,
                  width: field === 'weight' ? 100 : 80,
                  textAlign: 'center',
                  WebkitAppearance: 'none',
                  outline: 'none',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
