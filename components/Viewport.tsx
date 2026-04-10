'use client';

import { useRef } from 'react';
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
          <PlanPanel onShowToast={showToast} />
        </div>

        {/* TODAY */}
        <div style={{ width: '100vw', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0e0e0e', position: 'relative' }}>
          <TodayPanel onShowToast={showToast} />
        </div>

        {/* HISTORY */}
        <div style={{ width: '100vw', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0e0e0e' }}>
          <HistoryPanel />
        </div>
      </div>

      <Toast message={message} visible={visible} />
    </>
  );
}
