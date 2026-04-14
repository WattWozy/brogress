'use client';

import { useState, useEffect, useRef } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { PlanItem } from './PlanItem';
import { ExerciseSearch } from './ExerciseSearch';
import { TemplateManager } from './TemplateManager';

interface PlanPanelProps {
  onShowToast: (msg: string) => void;
  planReady: boolean;
}

export function PlanPanel({ onShowToast, planReady }: PlanPanelProps) {
  const { state, removeExercise, reorderRoutine, activeTemplateName, activeTemplateId, templates } = useWorkout();
  const [searchOpen, setSearchOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [openNewOnManager, setOpenNewOnManager] = useState(false);

  // Track the exercise-ID baseline when the active template is loaded/switched.
  // Changes to weights/sets/reps auto-save to the active template and don't count.
  // Only composition changes (added, removed, reordered exercises) light up the button.
  const baselineRef = useRef<string>('');
  useEffect(() => {
    const t = templates.find(t => t.id === activeTemplateId);
    if (t) baselineRef.current = t.exercises.map(e => e.id).join(',');
  }, [activeTemplateId]);

  const currentIds = state.routine.map(e => e.id).join(',');
  const hasExerciseChanges = baselineRef.current !== '' && currentIds !== baselineRef.current;

  function openManager(withNew: boolean) {
    setOpenNewOnManager(withNew);
    setTemplateManagerOpen(true);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '52px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: 32, fontWeight: 900,
            textTransform: 'uppercase', color: '#f0f0f0',
          }}>
            Plan
          </div>
          {activeTemplateName ? (
            <>
              <button
                onClick={() => setTemplateManagerOpen(true)}
                style={{
                  background: 'none', border: 'none', padding: '2px 0',
                  cursor: 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 10, color: '#f472b6',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 4,
                  opacity: 1,
                  transition: 'opacity 0.12s',
                }}
                onPointerDown={e => (e.currentTarget.style.opacity = '0.5')}
                onPointerUp={e => (e.currentTarget.style.opacity = '1')}
                onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {activeTemplateName}
                <span style={{ fontSize: 8, lineHeight: 1 }}>▾</span>
              </button>
              {!planReady && (
                <div style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 9, letterSpacing: '0.1em',
                  color: '#f472b6', textTransform: 'uppercase',
                  marginTop: 6,
                  display: 'flex', alignItems: 'center', gap: 5,
                  animation: 'hint-blink 2s ease-in-out infinite',
                }}>
                  <span style={{ fontSize: 11 }}>↑</span> tap to save / select plan
                </div>
              )}
            </>
          ) : null}
        </div>
        <button
          onClick={() => openManager(hasExerciseChanges)}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: 'pointer',
            fontFamily: "'Nunito', sans-serif",
            fontSize: 10,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: hasExerciseChanges ? '#f472b6' : '#888',
            transition: 'color 0.2s',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {hasExerciseChanges ? (
            <>save as new <span style={{ fontSize: 13, lineHeight: 1 }}>+</span></>
          ) : (
            <>← swipe to today</>
          )}
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
        {state.routine.map((ex, idx) => (
          <PlanItem
            key={ex.id}
            ex={ex}
            idx={idx}
            total={state.routine.length}
            onDelete={i => { removeExercise(i); onShowToast(`${ex.name} removed`); }}
            onMoveUp={i => reorderRoutine(i, i - 1)}
            onMoveDown={i => reorderRoutine(i, i + 1)}
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
            fontFamily: "'Raleway', sans-serif",
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

      {/* Template manager overlay */}
      <TemplateManager
        visible={templateManagerOpen}
        openNew={openNewOnManager}
        onClose={() => { setTemplateManagerOpen(false); setOpenNewOnManager(false); }}
      />
    </div>
  );
}
