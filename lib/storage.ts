// Local storage helpers — all safe to call during SSR (no-ops if no window)

import type { Exercise, QueuedExercise, Feel } from '@/types';

const ROUTINE_KEY   = 'brogress_routine';
const DEVICE_ID_KEY = 'brogress_device_id';
const SESSION_KEY   = 'brogress_session_progress';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

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

export function saveWeight(exId: string, weight: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`brogress_weight_${exId}`, String(weight));
}

export function loadWeight(exId: string): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`brogress_weight_${exId}`);
  return raw !== null ? parseFloat(raw) : null;
}

// ─── SESSION SNAPSHOT ─────────────────────────────────────────────────────────
// Persists in-progress workout state so a page refresh restores it.

export interface SessionSnapshot {
  /** Comma-joined exercise IDs of the routine when the session was saved.
   *  Used to detect stale snapshots (routine changed between sessions). */
  routineIds: string;
  queue: QueuedExercise[];
  skipped: QueuedExercise[];
  currentExIdx: number;
  currentSet: number;
  completedSets: number;
  totalSets: number;
  sessionFeel: Record<string, Feel>;
  currentSessionId: string;
}

export function saveSession(snap: SessionSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(snap));
  } catch {}
}

export function loadSession(): SessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionSnapshot) : null;
  } catch { return null; }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}
