'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseGesturesOptions {
  panelCount: number;
  currentPanel: number;
  onPanelChange: (panel: number) => void;
  viewportRef: React.RefObject<HTMLDivElement | null>;
}

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY  = 0.3; // px/ms

export function useGestures({
  panelCount, currentPanel, onPanelChange, viewportRef,
}: UseGesturesOptions) {
  const startX    = useRef(0);
  const startY    = useRef(0);
  const startTime = useRef(0);
  const isDragging = useRef(false);
  const currentPanelRef = useRef(currentPanel);

  useEffect(() => { currentPanelRef.current = currentPanel; }, [currentPanel]);

  const applyTransform = useCallback((x: number, animate: boolean) => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.style.transition = animate ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' : 'none';
    vp.style.transform = `translateX(${x}px)`;
  }, [viewportRef]);

  const goToPanel = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(panelCount - 1, idx));
    applyTransform(-clamped * window.innerWidth, true);
    onPanelChange(clamped);
  }, [panelCount, applyTransform, onPanelChange]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      startX.current    = t.clientX;
      startY.current    = t.clientY;
      startTime.current = Date.now();
      isDragging.current = false;
      applyTransform(-currentPanelRef.current * window.innerWidth, false);
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      if (!isDragging.current && Math.abs(dy) > Math.abs(dx)) return;
      isDragging.current = true;
      e.preventDefault();

      const baseX = -currentPanelRef.current * window.innerWidth;
      applyTransform(baseX + dx, false);
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isDragging.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const dt = Date.now() - startTime.current;
      const velocity = Math.abs(dx) / dt;
      const shouldSwipe = Math.abs(dx) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;

      if (shouldSwipe) {
        if (dx < 0) goToPanel(currentPanelRef.current + 1);
        else        goToPanel(currentPanelRef.current - 1);
      } else {
        goToPanel(currentPanelRef.current);
      }
    }

    vp.addEventListener('touchstart', onTouchStart, { passive: true });
    vp.addEventListener('touchmove',  onTouchMove,  { passive: false });
    vp.addEventListener('touchend',   onTouchEnd);

    return () => {
      vp.removeEventListener('touchstart', onTouchStart);
      vp.removeEventListener('touchmove',  onTouchMove);
      vp.removeEventListener('touchend',   onTouchEnd);
    };
  }, [applyTransform, goToPanel, viewportRef]);

  // Sync CSS transform when currentPanel changes programmatically
  useEffect(() => {
    applyTransform(-currentPanel * window.innerWidth, true);
  }, [currentPanel, applyTransform]);

  return { goToPanel };
}
