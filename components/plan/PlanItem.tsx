'use client';

import { useState, useRef } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import type { Exercise } from '@/types';

interface PlanItemProps {
  ex: Exercise;
  idx: number;
  onDelete: (idx: number) => void;
  dragHandleProps: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
  };
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function PlanItem({
  ex, idx, onDelete,
  dragHandleProps, isDragOver, onDragOver, onDrop, onDragEnd,
}: PlanItemProps) {
  const { updateRoutineExercise } = useWorkout();
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleLongPress() {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      if (window.confirm(`Remove ${ex.name}?`)) {
        onDelete(idx);
      }
    }, 400);
  }

  function onPointerDown() {
    longPressTimer.current = setTimeout(handleLongPress, 600);
  }
  function onPointerUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        borderBottom: `1px solid ${isDragOver ? '#f5a623' : '#2a2a2a'}`,
        borderTop: isDragOver ? '2px solid #f5a623' : 'none',
        padding: '18px 0',
        position: 'relative',
        animation: shake ? 'shake 0.4s ease-out' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          style={{
            color: '#444',
            fontSize: 18,
            cursor: 'grab',
            padding: '4px 8px 4px 0',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          ⠿
        </div>

        {/* Info */}
        <div
          style={{ flex: 1, cursor: 'pointer' }}
          onClick={() => setOpen(o => !o)}
        >
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 22, fontWeight: 700,
            textTransform: 'uppercase',
            color: '#f0f0f0',
            letterSpacing: '0.02em',
          }}>
            {ex.name}
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: '#888',
            letterSpacing: '0.08em',
            marginTop: 2,
          }}>
            {ex.sets} × {ex.reps} &nbsp;·&nbsp; {ex.weight} kg
          </div>
        </div>
      </div>

      {/* Inline editor */}
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 16 }}>
          {(['sets', 'reps', 'weight'] as const).map(field => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
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
                  fontFamily: "'DM Mono', monospace",
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
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9, color: '#444',
            letterSpacing: '0.08em',
            paddingTop: 8, width: '100%',
            textTransform: 'uppercase',
          }}>
            Long press to remove
          </div>
        </div>
      )}
    </div>
  );
}
