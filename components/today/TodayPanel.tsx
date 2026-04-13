'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { ProgressBar } from './ProgressBar';
import { ExerciseCard } from './ExerciseCard';
import { FeelOverlay } from './FeelOverlay';
import { RestTimerModal } from './RestTimerModal';
import { WorkoutDoneOverlay } from './WorkoutDoneOverlay';
import { QueuedStrip } from './QueuedStrip';
import type { Feel } from '@/types';

const REST_DURATIONS = [60, 90, 120, 180] as const;

interface TodayPanelProps {
  onShowToast: (msg: string) => void;
  planReady: boolean;
}

export function TodayPanel({ onShowToast, planReady }: TodayPanelProps) {
  const { state, dispatch, handleDone, handleSkip, handleSetFeel, isWorkoutComplete, isLastSetOfExercise, sessionCompletedToday } = useWorkout();
  const isDone = isWorkoutComplete || sessionCompletedToday;
  const [showFeel, setShowFeel] = useState(false);
  const [doneBtnFlash, setDoneBtnFlash] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [restDuration, setRestDuration] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('restDuration');
    if (!saved || saved === 'null') return null;
    return parseInt(saved, 10);
  });
  const prevExIdRef = useRef(state.queue[state.currentExIdx]?.id);

  const currentEx = state.queue[state.currentExIdx];
  const currentFeel = currentEx ? (state.sessionFeel[currentEx.id] ?? null) as Feel | null : null;

  // Track exercise changes
  useEffect(() => {
    prevExIdRef.current = currentEx?.id;
  }, [currentEx?.id]);

  const cycleRestDuration = useCallback(() => {
    setRestDuration(prev => {
      let next: number | null;
      if (prev === null) {
        next = REST_DURATIONS[0];
      } else {
        const idx = REST_DURATIONS.indexOf(prev as typeof REST_DURATIONS[number]);
        next = idx >= REST_DURATIONS.length - 1 ? null : REST_DURATIONS[idx + 1];
      }
      localStorage.setItem('restDuration', String(next));
      return next;
    });
  }, []);

  const onDone = useCallback(() => {
    setDoneBtnFlash(true);
    setTimeout(() => setDoneBtnFlash(false), 400);
    if (isLastSetOfExercise) {
      // Show feel overlay first — progress bar will advance only after feel is picked
      setShowFeel(true);
    } else {
      handleDone();
      if (restDuration) setShowRest(true);
    }
  }, [handleDone, isLastSetOfExercise, restDuration]);

  const onSkip = useCallback(() => {
    if (!currentEx) return;
    handleSkip();
    onShowToast(`↓ ${currentEx.name} queued to end`);
  }, [currentEx, handleSkip, onShowToast]);

  const onFeelSelect = useCallback((feel: Feel) => {
    if (!currentEx) return;
    handleDone();                        // save set to DB + advance progress bar
    handleSetFeel(feel);                 // record feel
    setShowFeel(false);
    dispatch({ type: 'ADVANCE_EXERCISE' });
    if (restDuration) setShowRest(true);
  }, [currentEx, handleDone, handleSetFeel, dispatch, restDuration]);

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
        {planReady ? (
          <>
            <ExerciseCard onFeelRequired={() => setShowFeel(true)} feel={currentFeel} />
            <FeelOverlay visible={showFeel} onSelect={onFeelSelect} />
            <RestTimerModal
              visible={showRest}
              duration={restDuration ?? 90}
              onDismiss={() => setShowRest(false)}
            />
            <WorkoutDoneOverlay visible={isDone} />
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 'clamp(52px, 14vw, 88px)',
              fontWeight: 900, lineHeight: 0.92,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              color: '#222',
            }}>
              BUILD YOUR<br />PLAN FIRST
            </div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11, color: '#444',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: 28,
            }}>
              ← swipe left to get started
            </div>
          </div>
        )}
      </div>

      {/* Queued strip + action buttons — hidden until plan is ready, hidden when workout is complete */}
      {planReady && !isDone && (
        <>
          <QueuedStrip onReinject={onReinject} />
          <div style={{ padding: '0 24px 36px', display: 'flex', gap: 12, alignItems: 'stretch' }}>
            {/* Rest timer toggle */}
            <button
              onClick={cycleRestDuration}
              style={{
                width: 72,
                background: restDuration ? 'rgba(245,166,35,0.08)' : '#2a2a2a',
                color: restDuration ? '#f5a623' : '#555',
                border: `1px solid ${restDuration ? '#f5a623' : '#333'}`,
                borderRadius: 100,
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '20px 0',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                transition: 'color 0.2s, border-color 0.2s, background 0.2s',
              }}
            >
              <span style={{ fontSize: 16 }}>⏱</span>
              <span>{restDuration ? `${restDuration}s` : 'off'}</span>
            </button>
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
        </>
      )}
    </div>
  );
}
