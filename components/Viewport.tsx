'use client';

import { useRef, useState, useEffect } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { useGestures } from '@/hooks/useGestures';
import { useToast } from '@/hooks/useToast';
import { Toast } from './Toast';
import { TodayPanel } from './today/TodayPanel';
import { PlanPanel } from './plan/PlanPanel';
import { HistoryPanel } from './history/HistoryPanel';

export function Viewport() {
  const { state, dispatch } = useWorkout();
  const viewportRef = useRef<HTMLDivElement>(null);
  const { message, visible, showToast } = useToast();
  const [showHints, setShowHints] = useState(true);
  const [planReady, setPlanReady] = useState(false);
  const prevPanelRef = useRef(1);

  // Restore persisted state on mount
  useEffect(() => {
    if (localStorage.getItem('brogress_hints_seen')) setShowHints(false);
    if (localStorage.getItem('brogress_plan_ready')) setPlanReady(true);
  }, []);

  useEffect(() => {
    const prev = prevPanelRef.current;
    prevPanelRef.current = state.activePanel;

    // Dismiss swipe hints on first navigation away from Today
    if (state.activePanel !== 1 && showHints) {
      setShowHints(false);
      localStorage.setItem('brogress_hints_seen', '1');
    }

    // Mark plan as ready when user returns to Today from Plan for the first time
    if (prev === 0 && state.activePanel === 1 && !planReady) {
      setPlanReady(true);
      localStorage.setItem('brogress_plan_ready', '1');
    }
  }, [state.activePanel]); // eslint-disable-line react-hooks/exhaustive-deps

  const { goToPanel } = useGestures({
    panelCount: 3,
    currentPanel: state.activePanel,
    onPanelChange: panel => dispatch({ type: 'SET_PANEL', panel }),
    viewportRef,
  });

  return (
    <>
      {/* 3-panel horizontal viewport */}
      <div
        ref={viewportRef}
        style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'row',
          width: '300vw', height: '100%',
          // Initial position: today (panel 1) is in view
          transform: `translateX(${-state.activePanel * 100}vw)`,
          willChange: 'transform',
        }}
      >
        {/* PLAN */}
        <div style={{ width: '100vw', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0e0e0e' }}>
          <PlanPanel onShowToast={showToast} planReady={planReady} />
        </div>

        {/* TODAY */}
        <div style={{ width: '100vw', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0e0e0e', position: 'relative' }}>
          <TodayPanel onShowToast={showToast} planReady={planReady} />
        </div>

        {/* HISTORY */}
        <div style={{ width: '100vw', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0e0e0e' }}>
          <HistoryPanel />
        </div>
      </div>

      <Toast message={message} visible={visible} />

      {/* First-visit swipe hints */}
      {showHints && (
        <>
          {/* Left hint — Plan */}
          <div style={{
            position: 'fixed', left: 0, top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 6, padding: '16px 10px',
            pointerEvents: 'none',
            animation: 'hint-pulse 2s ease-in-out infinite',
          }}>
            <span style={{ fontSize: 22, color: '#f5a623' }}>←</span>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9, letterSpacing: '0.12em',
              color: '#f5a623', textTransform: 'uppercase',
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            }}>Plan</span>
          </div>

          {/* Right hint — History */}
          <div style={{
            position: 'fixed', right: 0, top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 6, padding: '16px 10px',
            pointerEvents: 'none',
            animation: 'hint-pulse 2s ease-in-out infinite',
            animationDelay: '0.4s',
          }}>
            <span style={{ fontSize: 22, color: '#888' }}>→</span>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9, letterSpacing: '0.12em',
              color: '#888', textTransform: 'uppercase',
              writingMode: 'vertical-rl',
            }}>History</span>
          </div>
        </>
      )}
    </>
  );
}
