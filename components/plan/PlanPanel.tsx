'use client';

import { useState, useRef } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { PlanItem } from './PlanItem';
import { ExerciseSearch } from './ExerciseSearch';

interface PlanPanelProps {
  onShowToast: (msg: string) => void;
}

export function PlanPanel({ onShowToast }: PlanPanelProps) {
  const { state, removeExercise, reorderRoutine } = useWorkout();
  const [searchOpen, setSearchOpen] = useState(false);
  const dragSrcIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function handleDragStart(idx: number) {
    dragSrcIdx.current = idx;
  }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }
  function handleDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault();
    if (dragSrcIdx.current !== null && dragSrcIdx.current !== toIdx) {
      reorderRoutine(dragSrcIdx.current, toIdx);
    }
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  }
  function handleDragEnd() {
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '52px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 32, fontWeight: 900,
          textTransform: 'uppercase', color: '#f0f0f0',
        }}>
          Plan
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, color: '#888',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          ← swipe to today
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
        {state.routine.map((ex, idx) => (
          <PlanItem
            key={ex.id}
            ex={ex}
            idx={idx}
            onDelete={i => { removeExercise(i); onShowToast(`${ex.name} removed`); }}
            dragHandleProps={{
              draggable: true,
              onDragStart: () => handleDragStart(idx),
            }}
            isDragOver={dragOverIdx === idx}
            onDragOver={e => handleDragOver(e, idx)}
            onDrop={e => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
          />
        ))}

        {/* Add button */}
        <button
          onClick={() => setSearchOpen(true)}
          style={{
            marginTop: 20,
            width: '100%',
            border: '1px dashed #444',
            borderRadius: 16,
            background: 'transparent',
            color: '#888',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 22, fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: 'pointer',
            marginBottom: 40,
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1 }}>+</span>
          Add Exercise
        </button>
      </div>

      {/* Search overlay */}
      <ExerciseSearch
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAdded={name => onShowToast(`${name} added`)}
      />
    </div>
  );
}
