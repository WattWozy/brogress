// Local storage cache — offline-safe reads, Appwrite is the source of truth for writes.

import type { Exercise } from '@/types';

const ROUTINE_KEY = 'brogress_routine';

export function saveRoutine(routine: Exercise[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROUTINE_KEY, JSON.stringify(routine));
}

export function loadRoutine(): Exercise[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ROUTINE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
