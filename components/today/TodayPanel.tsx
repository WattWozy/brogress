'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { ProgressBar } from './ProgressBar';
import { ExerciseCard } from './ExerciseCard';
import { FeelOverlay } from './FeelOverlay';
import { WorkoutDoneOverlay } from './WorkoutDoneOverlay';
import { QueuedStrip } from './QueuedStrip';
import type { Feel } from '@/types';

interface TodayPanelProps {
  onShowToast: (msg: string) => void;
}

export function TodayPanel({ onShowToast }: TodayPanelProps) {
  const { state, dispatch, handleDone, handleSkip, handleSetFeel, isWorkoutComplete } = useWorkout();
  const [showFeel, setShowFeel] = useState(false);
  const [doneBtnFlash, setDoneBtnFlash] = useState(false);
  const prevSetRef = useRef(state.currentSet);
  const prevExIdRef = useRef(state.queue[state.currentExIdx]?.id);

  const currentEx = state.queue[state.currentExIdx];
  const currentFeel = currentEx ? (state.sessionFeel[currentEx.id] ?? null) as Feel | null : null;

  // Detect when we've hit the last set (currentSet > ex.sets) to show feel overlay
  useEffect(() => {
    if (!currentEx) return;
    if (state.currentSet > currentEx.sets && prevExIdRef.current === currentEx.id) {
      setShowFeel(true);
    }
    prevSetRef.current = state.currentSet;
  }, [state.currentSet, currentEx]);

  // Track exercise changes
  useEffect(() => {
    prevExIdRef.current = currentEx?.id;
  }, [currentEx?.id]);

  const onDone = useCallback(() => {
    setDoneBtnFlash(true);
    handleDone();
    setTimeout(() => setDoneBtnFlash(false), 400);
  }, [handleDone]);

  const onSkip = useCallback(() => {
    if (!currentEx) return;
    handleSkip();
    onShowToast(`↓ ${currentEx.name} queued to end`);
  }, [currentEx, handleSkip, onShowToast]);

  const onFeelSelect = useCallback((feel: Feel) => {
    if (!currentEx) return;
    handleSetFeel(feel);
    setShowFeel(false);

    // Advance to next exercise
    const nextIdx = state.currentExIdx + 1;
    if (nextIdx >= state.queue.length && state.skipped.length === 0) {
      // workout complete — handled via isWorkoutComplete
      dispatch({ type: 'ADVANCE_EXERCISE' });
    } else if (nextIdx >= state.queue.length && state.skipped.length > 0) {
      // re-inject skipped
      const newQueue = [...state.queue, ...state.skipped];
      // Simple: push all skipped back, clear skipped
      dispatch({ type: 'ADVANCE_EXERCISE' });
    } else {
      dispatch({ type: 'ADVANCE_EXERCISE' });
    }
  }, [currentEx, dispatch, state.currentExIdx, state.queue.length, state.skipped.length]);

  const onReinject = useCallback((idx: number) => {
    const name = state.skipped[idx]?.name;
    dispatch({ type: 'REINJECT_SKIPPED', idx });
    if (name) onShowToast(`${name} moved up`);
  }, [dispatch, state.skipped, onShowToast]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 3, overflow: 'hidden' }}>
      <ProgressBar completed={state.completedSets} total={state.totalSets} />

      {/* Exercise card area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'stretch',
        padding: '0 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <ExerciseCard onFeelRequired={() => setShowFeel(true)} feel={currentFeel} />
        <FeelOverlay visible={showFeel} onSelect={onFeelSelect} />
        <WorkoutDoneOverlay visible={isWorkoutComplete} />
      </div>

      {/* Queued strip */}
      <QueuedStrip onReinject={onReinject} />

      {/* Action buttons */}
      <div style={{ padding: '0 24px 36px', display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <button
          onClick={onDone}
          style={{
            flex: 1,
            background: '#f5a623',
            color: '#000',
            border: 'none',
            borderRadius: 100,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 26, fontWeight: 900,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '20px 0',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            userSelect: 'none',
            animation: doneBtnFlash ? 'done-flash 0.35s ease-out' : 'none',
            transition: 'transform 0.12s, background 0.12s',
          }}
        >
          DONE
        </button>
        <button
          onClick={onSkip}
          style={{
            width: 90,
            background: '#2a2a2a',
            color: '#888',
            border: '1px solid #444',
            borderRadius: 100,
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '20px 0',
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          }}
        >
          <span style={{ fontSize: 16 }}>↓</span>
          <span>SKIP</span>
        </button>
      </div>
    </div>
  );
}
