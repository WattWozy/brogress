'use client';

import { useEffect, useRef, useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { WeightControls } from './WeightControls';
import type { Feel } from '@/types';

interface ExerciseCardProps {
  onFeelRequired: () => void;
  feel: Feel | null;
}

export function ExerciseCard({ onFeelRequired, feel }: ExerciseCardProps) {
  const { state, dispatch } = useWorkout();
  const ex = state.queue[state.currentExIdx];
  const cardRef = useRef<HTMLDivElement>(null);
  const [slideClass, setSlideClass] = useState('');
  const prevExId = useRef<string>('');

  // Animate when exercise changes
  useEffect(() => {
    if (!ex) return;
    if (prevExId.current && prevExId.current !== ex.id) {
      const card = cardRef.current;
      if (!card) return;
      card.style.transition = 'none';
      card.style.transform = 'translateX(60px)';
      card.style.opacity = '0';
      requestAnimationFrame(() => {
        card.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s';
        card.style.transform = 'translateX(0)';
        card.style.opacity = '1';
      });
    }
    prevExId.current = ex.id;
  }, [ex?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const weightRec = feel === 'easy'
    ? '↑ consider going heavier next time'
    : feel === 'hard'
      ? '↓ consider going lighter next time'
      : '';

  if (!ex) return null;

  const isClass = ex.type === 'class' || ex.reps === 0;

  return (
    <div
      ref={cardRef}
      style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        opacity: 1, transform: 'translateX(0)',
      }}
    >
      {/* Exercise name */}
      <div style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize: 'clamp(52px, 14vw, 88px)',
        fontWeight: 900,
        lineHeight: 0.92,
        letterSpacing: '-0.01em',
        textTransform: 'uppercase',
        color: '#f0f0f0',
        marginBottom: 24,
        wordBreak: 'break-word',
      }}>
        {ex.name}
      </div>

      {isClass ? (
        /* Class: just show the "1 pass" badge, no weight */
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          marginBottom: 56,
        }}>
          <span style={{
            background: 'rgba(244,114,182,0.12)',
            border: '1px solid rgba(244,114,182,0.3)',
            color: '#f472b6',
            borderRadius: 100,
            fontFamily: "'Nunito', sans-serif",
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '5px 14px',
          }}>
            Class · 1 pass
          </span>
        </div>
      ) : (
        <>
          {/* Set info */}
          <div style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 13,
            letterSpacing: '0.12em',
            color: '#888',
            textTransform: 'uppercase',
            marginBottom: 32,
          }}>
            <span style={{ color: '#f472b6' }}>SET {state.currentSet}</span>
            {' / '}
            {ex.sets}
            <span style={{ marginLeft: 16 }}>×</span>
            <span style={{ marginLeft: 4 }}>{ex.reps}</span>
          </div>

          {/* Weight */}
          <WeightControls />

          {/* Weight recommendation */}
          <div style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 11,
            color: '#444',
            letterSpacing: '0.08em',
            minHeight: 16,
            marginBottom: 32,
          }}>
            {weightRec}
          </div>
        </>
      )}
    </div>
  );
}
