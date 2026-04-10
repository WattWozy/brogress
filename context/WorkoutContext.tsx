'use client';

import React, {
  createContext, useContext, useReducer, useCallback,
  useEffect, useRef, type Dispatch,
} from 'react';
import type { Exercise, Feel, QueuedExercise } from '@/types';
import { DEFAULT_EXERCISES } from '@/lib/defaults';
import { saveRoutine, loadRoutine } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import {
  loadTemplate, saveTemplate, createSession, completeSession,
  saveSet, updateSetsFeel, exerciseId,
} from '@/lib/appwrite';

// ─── STATE ────────────────────────────────────────────────────────────────────
export interface WorkoutState {
  routine: Exercise[];
  queue: QueuedExercise[];
  skipped: QueuedExercise[];
  currentExIdx: number;
  currentSet: number;
  completedSets: number;
  totalSets: number;
  sessionFeel: Record<string, Feel>;
  activePanel: number;
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────
export type WorkoutAction =
  | { type: 'INIT'; routine: Exercise[] }
  | { type: 'SET_ROUTINE'; routine: Exercise[] }
  | { type: 'ADVANCE_SET' }
  | { type: 'ADVANCE_EXERCISE' }
  | { type: 'SKIP_EXERCISE' }
  | { type: 'REINJECT_SKIPPED'; idx: number }
  | { type: 'SET_FEEL'; exerciseId: string; feel: Feel }
  | { type: 'ADJUST_WEIGHT'; delta: number }
  | { type: 'SET_WEIGHT'; exId: string; weight: number }
  | { type: 'RESET_SESSION' }
  | { type: 'SET_PANEL'; panel: number };

function buildQueue(routine: Exercise[]): QueuedExercise[] {
  return routine.map(e => ({ ...e }));
}
function totalSetsOf(queue: QueuedExercise[]) {
  return queue.reduce((s, e) => s + e.sets, 0);
}

// ─── REDUCER ─────────────────────────────────────────────────────────────────
function reducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case 'INIT': {
      const queue = buildQueue(action.routine);
      return {
        ...state,
        routine: action.routine,
        queue,
        skipped: [],
        currentExIdx: 0,
        currentSet: 1,
        completedSets: 0,
        totalSets: totalSetsOf(queue),
        sessionFeel: {},
      };
    }

    case 'SET_ROUTINE':
      return { ...state, routine: action.routine };

    case 'ADVANCE_SET':
      return { ...state, currentSet: state.currentSet + 1, completedSets: state.completedSets + 1 };

    case 'ADVANCE_EXERCISE':
      return { ...state, currentExIdx: state.currentExIdx + 1, currentSet: 1 };

    case 'SKIP_EXERCISE': {
      const ex = state.queue[state.currentExIdx];
      const newQueue = [...state.queue];
      newQueue.splice(state.currentExIdx, 1);
      const newSkipped = [...state.skipped, ex];
      let newIdx = state.currentExIdx;
      if (newIdx >= newQueue.length) newIdx = 0;
      return { ...state, queue: newQueue, skipped: newSkipped, currentExIdx: newIdx, currentSet: 1 };
    }

    case 'REINJECT_SKIPPED': {
      const ex = state.skipped[action.idx];
      const newSkipped = [...state.skipped];
      newSkipped.splice(action.idx, 1);
      const newQueue = [...state.queue];
      newQueue.splice(state.currentExIdx + 1, 0, ex);
      return { ...state, queue: newQueue, skipped: newSkipped, totalSets: state.totalSets + ex.sets };
    }

    case 'SET_FEEL':
      return { ...state, sessionFeel: { ...state.sessionFeel, [action.exerciseId]: action.feel } };

    case 'ADJUST_WEIGHT': {
      const ex = state.queue[state.currentExIdx];
      if (!ex) return state;
      const newWeight = Math.max(0, Math.round((ex.weight + action.delta) * 10) / 10);
      const newQueue   = state.queue.map((e, i)   => i === state.currentExIdx ? { ...e, weight: newWeight } : e);
      const newRoutine = state.routine.map(e => e.id === ex.id ? { ...e, weight: newWeight } : e);
      return { ...state, queue: newQueue, routine: newRoutine };
    }

    case 'SET_WEIGHT': {
      const newQueue   = state.queue.map(e   => e.id === action.exId ? { ...e, weight: action.weight } : e);
      const newRoutine = state.routine.map(e => e.id === action.exId ? { ...e, weight: action.weight } : e);
      return { ...state, queue: newQueue, routine: newRoutine };
    }

    case 'RESET_SESSION': {
      const queue = buildQueue(state.routine);
      return {
        ...state,
        queue,
        skipped: [],
        currentExIdx: 0,
        currentSet: 1,
        completedSets: 0,
        totalSets: totalSetsOf(queue),
        sessionFeel: {},
      };
    }

    case 'SET_PANEL':
      return { ...state, activePanel: action.panel };

    default: return state;
  }
}

const initialState: WorkoutState = {
  routine: [],
  queue: [],
  skipped: [],
  currentExIdx: 0,
  currentSet: 1,
  completedSets: 0,
  totalSets: 0,
  sessionFeel: {},
  activePanel: 1,
};

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
interface WorkoutContextValue {
  state: WorkoutState;
  dispatch: Dispatch<WorkoutAction>;
  handleDone: () => void;
  handleSkip: () => void;
  handleSetFeel: (feel: Feel) => void;
  handleAdjustWeight: (delta: number) => void;
  updateRoutineExercise: (idx: number, fields: Partial<Exercise>) => void;
  addExercise: (ex: Exercise) => void;
  removeExercise: (idx: number) => void;
  reorderRoutine: (from: number, to: number) => void;
  resetSession: () => void;
  isWorkoutComplete: boolean;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Session is created on the first set of a workout; its Appwrite $id lives here.
  const sessionIdRef = useRef<string | null>(null);
  const sessionCreateRef = useRef<Promise<string> | null>(null);

  // Debounce template saves so rapid weight adjustments don't hammer Appwrite.
  const templateSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Show cached routine immediately.
    const cached = loadRoutine();
    const fallback = cached?.length ? cached : DEFAULT_EXERCISES;
    dispatch({ type: 'INIT', routine: fallback });

    // 2. Sync from Appwrite in background; update if different.
    loadTemplate(user.$id).then(remote => {
      if (remote && remote.length > 0) {
        dispatch({ type: 'SET_ROUTINE', routine: remote });
        saveRoutine(remote);
      } else {
        // First login — seed Appwrite with the local/default routine.
        saveTemplate(user.$id, fallback);
        saveRoutine(fallback);
      }
    });
  }, []);

  // ─── DERIVED ───────────────────────────────────────────────────────
  const currentEx = state.queue[state.currentExIdx] ?? null;
  const isLastSetOfExercise = currentEx ? state.currentSet >= currentEx.sets : false;
  const isWorkoutComplete =
    state.queue.length > 0 &&
    state.currentExIdx >= state.queue.length &&
    state.skipped.length === 0;

  // ─── SESSION HELPERS ───────────────────────────────────────────────
  // Returns the session $id, creating it in Appwrite on first call.
  // Clears the promise ref on failure so the next tap can retry.
  function ensureSession(): Promise<string> {
    if (sessionIdRef.current) return Promise.resolve(sessionIdRef.current);
    if (!sessionCreateRef.current) {
      sessionCreateRef.current = createSession(user.$id, 'My Workout')
        .then(id => { sessionIdRef.current = id; return id; })
        .catch(e => { sessionCreateRef.current = null; throw e; });
    }
    return sessionCreateRef.current;
  }

  // ─── COMPLETE SESSION ──────────────────────────────────────────────
  useEffect(() => {
    if (isWorkoutComplete && sessionIdRef.current) {
      completeSession(sessionIdRef.current);
    }
  }, [isWorkoutComplete]);

  // ─── HANDLE DONE ───────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    if (!currentEx) return;
    const setNum = state.currentSet;

    ensureSession().then(sessionId => {
      saveSet(sessionId, user.$id, currentEx.name, setNum, currentEx.reps, currentEx.weight, '');
    });

    dispatch({ type: 'ADVANCE_SET' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEx, state.currentSet, user.$id]);

  // ─── HANDLE SKIP ───────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    dispatch({ type: 'SKIP_EXERCISE' });
  }, []);

  // ─── HANDLE FEEL ───────────────────────────────────────────────────
  const handleSetFeel = useCallback((feel: Feel) => {
    if (!currentEx) return;
    dispatch({ type: 'SET_FEEL', exerciseId: currentEx.id, feel });
    if (sessionIdRef.current) {
      updateSetsFeel(sessionIdRef.current, currentEx.name, feel);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEx]);

  // ─── WEIGHT ────────────────────────────────────────────────────────
  const handleAdjustWeight = useCallback((delta: number) => {
    dispatch({ type: 'ADJUST_WEIGHT', delta });
  }, []);

  // ─── TEMPLATE PERSISTENCE ──────────────────────────────────────────
  function scheduleSaveTemplate(routine: Exercise[]) {
    saveRoutine(routine);
    if (templateSaveTimer.current) clearTimeout(templateSaveTimer.current);
    templateSaveTimer.current = setTimeout(() => {
      saveTemplate(user.$id, routine);
    }, 800);
  }

  // ─── ROUTINE MUTATIONS ─────────────────────────────────────────────
  const updateRoutineExercise = useCallback((idx: number, fields: Partial<Exercise>) => {
    const updated = state.routine.map((e, i) => i === idx ? { ...e, ...fields } : e);
    dispatch({ type: 'SET_ROUTINE', routine: updated });
    scheduleSaveTemplate(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.routine, user.$id]);

  const addExercise = useCallback((ex: Exercise) => {
    const updated = [...state.routine, ex];
    dispatch({ type: 'SET_ROUTINE', routine: updated });
    scheduleSaveTemplate(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.routine, user.$id]);

  const removeExercise = useCallback((idx: number) => {
    const updated = state.routine.filter((_, i) => i !== idx);
    dispatch({ type: 'SET_ROUTINE', routine: updated });
    scheduleSaveTemplate(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.routine, user.$id]);

  const reorderRoutine = useCallback((from: number, to: number) => {
    const updated = [...state.routine];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    dispatch({ type: 'SET_ROUTINE', routine: updated });
    scheduleSaveTemplate(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.routine, user.$id]);

  const resetSession = useCallback(() => {
    sessionIdRef.current = null;
    sessionCreateRef.current = null;
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  return (
    <WorkoutContext.Provider value={{
      state, dispatch,
      handleDone, handleSkip, handleSetFeel, handleAdjustWeight,
      updateRoutineExercise, addExercise, removeExercise, reorderRoutine,
      resetSession,
      isWorkoutComplete,
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used inside WorkoutProvider');
  return ctx;
}
