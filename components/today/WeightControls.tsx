'use client';

import { useRef } from 'react';
import { useWorkout } from '@/context/WorkoutContext';

export function WeightControls() {
  const { state, handleAdjustWeight } = useWorkout();
  const ex = state.queue[state.currentExIdx];
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  function startHold(delta: number) {
    holdTimer.current = setTimeout(() => {
      holdInterval.current = setInterval(() => handleAdjustWeight(delta * 0.5), 80);
    }, 400);
  }
  function stopHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (holdInterval.current) clearInterval(holdInterval.current);
  }

  if (!ex) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8 }}>
      <button
        className="weight-btn"
        onClick={() => handleAdjustWeight(-2.5)}
        onPointerDown={() => startHold(-2.5)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
      >
        −
      </button>
      <div style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize: 'clamp(64px, 18vw, 110px)',
        fontWeight: 800,
        lineHeight: 1,
        color: '#f0f0f0',
        flex: 1,
        textAlign: 'center',
      }}>
        {ex.weight}
      </div>
      <span style={{
        fontFamily: "'Nunito', sans-serif",
        fontSize: 13,
        color: '#888',
        alignSelf: 'flex-end',
        paddingBottom: 12,
        marginLeft: 6,
      }}>
        kg
      </span>
      <button
        className="weight-btn"
        onClick={() => handleAdjustWeight(2.5)}
        onPointerDown={() => startHold(2.5)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
      >
        +
      </button>
    </div>
  );
}
