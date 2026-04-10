'use client';

import React, {
  createContext, useContext, useReducer, useCallback,
  useEffect, useRef, type Dispatch,
} from 'react';
import type { Exercise, Feel, QueuedExercise } from '@/types';
import { DEFAULT_EXERCISES } from '@/lib/defaults';
import { saveRoutine, loadRoutine, saveWeight } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import {
  seedAppwrite, loadWeightsFromAppwrite,
  persistWeight, persistRoutine,
  awWrite, flushQueue,
} from '@/lib/appwrite';
import { COL_SESSIONS, COL_SETS } from '@/lib/config';

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
  sessionStarted: boolean;
  currentSessionId: string;
  deviceId: string;
  /** which panel is active: 0=plan 1=today 2=history */
  activePanel: number;
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────
export type WorkoutAction =
  | { type: 'INIT'; routine: Exercise[]; deviceId: string }
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

function newSessionId() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

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
        sessionStarted: false,
        currentSessionId: newSessionId(),
        deviceId: action.deviceId,
      };
    }

    case 'SET_ROUTINE': {
      return { ...state, routine: action.routine };
    }

    case 'ADVANCE_SET': {
      return { ...state, currentSet: state.currentSet + 1, completedSets: state.completedSets + 1 };
    }

    case 'ADVANCE_EXERCISE': {
      const nextIdx = state.currentExIdx + 1;
      // If we've exhausted the queue (skipped will be handled in the hook)
      return {
        ...state,
        currentExIdx: nextIdx,
        currentSet: 1,
        completedSets: state.completedSets,
      };
    }

    case 'SKIP_EXERCISE': {
      const ex = state.queue[state.currentExIdx];
      const newQueue = [...state.queue];
      newQueue.splice(state.currentExIdx, 1);
      const newSkipped = [...state.skipped, ex];
      let newIdx = state.currentExIdx;
      if (newIdx >= newQueue.length) newIdx = 0;
      return {
        ...state,
        queue: newQueue,
        skipped: newSkipped,
        currentExIdx: newIdx,
        currentSet: 1,
      };
    }

    case 'REINJECT_SKIPPED': {
      const ex = state.skipped[action.idx];
      const newSkipped = [...state.skipped];
      newSkipped.splice(action.idx, 1);
      const newQueue = [...state.queue];
      newQueue.splice(state.currentExIdx + 1, 0, ex);
      return {
        ...state,
        queue: newQueue,
        skipped: newSkipped,
        totalSets: state.totalSets + ex.sets,
      };
    }

    case 'SET_FEEL': {
      return {
        ...state,
        sessionFeel: { ...state.sessionFeel, [action.exerciseId]: action.feel },
      };
    }

    case 'ADJUST_WEIGHT': {
      const ex = state.queue[state.currentExIdx];
      if (!ex) return state;
      const newWeight = Math.max(0, Math.round((ex.weight + action.delta) * 10) / 10);
      const newQueue = state.queue.map((e, i) =>
        i === state.currentExIdx ? { ...e, weight: newWeight } : e,
      );
      const newRoutine = state.routine.map(e =>
        e.id === ex.id ? { ...e, weight: newWeight } : e,
      );
      return { ...state, queue: newQueue, routine: newRoutine };
    }

    case 'SET_WEIGHT': {
      const newQueue = state.queue.map(e =>
        e.id === action.exId ? { ...e, weight: action.weight } : e,
      );
      const newRoutine = state.routine.map(e =>
        e.id === action.exId ? { ...e, weight: action.weight } : e,
      );
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
        sessionStarted: false,
        currentSessionId: newSessionId(),
      };
    }

    case 'SET_PANEL': {
      return { ...state, activePanel: action.panel };
    }

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
  sessionStarted: false,
  currentSessionId: newSessionId(),
  deviceId: '',
  activePanel: 1,
};

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
interface WorkoutContextValue {
  state: WorkoutState;
  dispatch: Dispatch<WorkoutAction>;
  // Convenience actions that also handle side effects
  handleDone: () => void;
  handleSkip: () => void;
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
  const sessionStartedRef = useRef(false);

  // ─── INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    const deviceId = user.$id;
    const stored = loadRoutine();

    if (stored && stored.length > 0) {
      dispatch({ type: 'INIT', routine: stored, deviceId });
      // Background: refresh weights from Appwrite
      loadWeightsFromAppwrite(deviceId, stored).then(updated => {
        if (JSON.stringify(updated) !== JSON.stringify(stored)) {
          dispatch({ type: 'SET_ROUTINE', routine: updated });
          saveRoutine(updated);
        }
      });
    } else {
      dispatch({ type: 'INIT', routine: DEFAULT_EXERCISES, deviceId });
      saveRoutine(DEFAULT_EXERCISES);
      seedAppwrite(deviceId);
    }

    flushQueue();
  }, []);

  // ─── DERIVED ───────────────────────────────────────────────────────
  const currentEx = state.queue[state.currentExIdx] ?? null;
  const isLastSetOfExercise = currentEx ? state.currentSet >= currentEx.sets : false;
  const isLastExercise = state.currentExIdx >= state.queue.length - 1 && state.skipped.length === 0;
  const isWorkoutComplete =
    state.queue.length > 0 &&
    state.currentExIdx >= state.queue.length &&
    state.skipped.length === 0;

  // ─── PERSIST SESSION ───────────────────────────────────────────────
  function ensureSessionStarted() {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    dispatch({ type: 'ADVANCE_SET' }); // will be undone below — just for side-effect
    awWrite('create', COL_SESSIONS, state.currentSessionId, {
      userId: state.deviceId,
      date: new Date().toISOString().slice(0, 10),
      startedAt: new Date().toISOString(),
    });
  }

  function persistSet(ex: Exercise, setNum: number) {
    const setId = `set_${state.currentSessionId}_${ex.id}_${setNum}`;
    awWrite('create', COL_SETS, setId, {
      sessionId: state.currentSessionId,
      exerciseId: ex.id,
      exerciseName: ex.name,
      setNumber: setNum,
      reps: ex.reps,
      weight: ex.weight,
      feel: '',
    });
  }

  // ─── HANDLE DONE ───────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    if (!currentEx) return;

    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true;
      awWrite('create', COL_SESSIONS, state.currentSessionId, {
        userId: state.deviceId,
        date: new Date().toISOString().slice(0, 10),
        startedAt: new Date().toISOString(),
      });
    }

    persistSet(currentEx, state.currentSet);

    if (!isLastSetOfExercise) {
      dispatch({ type: 'ADVANCE_SET' });
    } else {
      // Last set — advance set count but signal that feel overlay should show
      dispatch({ type: 'ADVANCE_SET' });
      // feel overlay will be triggered by consumer watching set === sets + 1
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEx, state.currentSet, isLastSetOfExercise, state.currentSessionId, state.deviceId]);

  // ─── HANDLE SKIP ───────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    dispatch({ type: 'SKIP_EXERCISE' });
  }, []);

  // ─── WEIGHT ────────────────────────────────────────────────────────
  const handleAdjustWeight = useCallback((delta: number) => {
    dispatch({ type: 'ADJUST_WEIGHT', delta });
  }, []);

  // Persist weight changes (debounced via ref)
  const weightPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentEx || !state.deviceId) return;
    saveWeight(currentEx.id, currentEx.weight);
    if (weightPersistTimer.current) clearTimeout(weightPersistTimer.current);
    weightPersistTimer.current = setTimeout(() => {
      persistWeight(state.deviceId, currentEx.id, currentEx.weight);
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEx?.weight]);

  // ─── ROUTINE MUTATIONS ─────────────────────────────────────────────
  const updateRoutineExercise = useCallback((idx: number, fields: Partial<Exercise>) => {
    const updated = state.routine.map((e, i) => i === idx ? { ...e, ...fields } : e);
    dispatch({ type: 'SET_ROUTINE', routine: updated });
    saveRoutine(updated);
    persistRoutine(state.deviceId, updated);
    if (fields.weight !== undefined) {
      saveWeight(state.routine[idx].id, fields.weight);
      persistWeight(state.deviceId, state.routine[idx].id, fields.weight);
    }
  }, [state.routine, state.deviceId]);

  const addExercise = useCallback((ex: Exercise) => {
    const updated = [...state.routine, ex];
    dispatch({ type: 'SET_ROUTINE', routine: updated });
    saveRoutine(updated);
    persistRoutine(state.deviceId, updated);
  }, [state.routine, state.deviceId]);

  const removeExercise = useCallback((idx: number) => {
    const updated = state.routine.filter((_, i) => i !== idx);
    dispatch({ type: 'SET_ROUTINE', routine: updated });
    saveRoutine(updated);
    persistRoutine(state.deviceId, updated);
  }, [state.routine, state.deviceId]);

  const reorderRoutine = useCallback((from: number, to: number) => {
    const updated = [...state.routine];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    dispatch({ type: 'SET_ROUTINE', routine: updated });
    saveRoutine(updated);
    persistRoutine(state.deviceId, updated);
  }, [state.routine, state.deviceId]);

  const resetSession = useCallback(() => {
    sessionStartedRef.current = false;
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  return (
    <WorkoutContext.Provider value={{
      state, dispatch,
      handleDone, handleSkip, handleAdjustWeight,
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
