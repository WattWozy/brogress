'use client';

import React, {
  createContext, useContext, useReducer, useCallback,
  useEffect, useRef, useState, type Dispatch,
} from 'react';

import type { Exercise, Feel, QueuedExercise, StoredSet, WorkoutTemplate } from '@/types';
import { computeProgressionSuggestions, type ProgressionSuggestion } from '@/lib/progression';
import { DEFAULT_EXERCISES } from '@/lib/defaults';
import { saveRoutine, loadRoutine } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import {
  loadAllTemplates, saveTemplate, deleteTemplate as deleteTemplateDoc,
  createSession, completeSession, persistSessionSets, exerciseId,
} from '@/lib/appwrite';

// ─── IN-PROGRESS SESSION PERSISTENCE ──────────────────────────────────────────
const PROGRESS_KEY = 'brogress_session_progress';
interface PersistedProgress {
  date: string;
  sessionId: string;
  sets: StoredSet[];
  currentExIdx: number;
  currentSet: number;
  completedSets: number;
}
function readPersistedProgress(): PersistedProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedProgress;
    if (parsed.date !== new Date().toISOString().slice(0, 10)) return null;
    return parsed;
  } catch { return null; }
}
function writePersistedProgress(p: PersistedProgress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* storage full */ }
}
function clearPersistedProgress() {
  try { localStorage.removeItem(PROGRESS_KEY); } catch { /* ignore */ }
}

// Remembers which template was active so page refreshes restore the right plan.
const ACTIVE_TEMPLATE_KEY = 'brogress_active_template';
function readStoredActiveTemplateId(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(ACTIVE_TEMPLATE_KEY); } catch { return null; }
}
function writeStoredActiveTemplateId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_TEMPLATE_KEY, id);
    else localStorage.removeItem(ACTIVE_TEMPLATE_KEY);
  } catch { /* storage full */ }
}

const DONE_KEY = 'brogress_session_done';
function readDoneToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DONE_KEY);
    if (!raw) return false;
    return JSON.parse(raw).date === new Date().toISOString().slice(0, 10);
  } catch { return false; }
}
function writeDoneToday() {
  try { localStorage.setItem(DONE_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10) })); }
  catch { /* storage full */ }
}

const PROGRESSION_KEY = 'brogress_progression';
function readStoredProgression(): ProgressionSuggestion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROGRESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed.date !== new Date().toISOString().slice(0, 10)) return [];
    return parsed.suggestions ?? [];
  } catch { return []; }
}
function writeStoredProgression(suggestions: ProgressionSuggestion[]) {
  try {
    localStorage.setItem(PROGRESSION_KEY, JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      suggestions,
    }));
  } catch { /* storage full */ }
}
function clearStoredProgression() {
  try { localStorage.removeItem(PROGRESSION_KEY); } catch { /* ignore */ }
}

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
  | { type: 'SET_PANEL'; panel: number }
  | { type: 'RESTORE_PROGRESS'; currentExIdx: number; currentSet: number; completedSets: number };

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

    case 'SET_ROUTINE': {
      if (state.completedSets === 0 && state.skipped.length === 0) {
        const queue = buildQueue(action.routine);
        return { ...state, routine: action.routine, queue, totalSets: totalSetsOf(queue) };
      }
      return { ...state, routine: action.routine };
    }

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

    case 'RESTORE_PROGRESS':
      return {
        ...state,
        currentExIdx: action.currentExIdx,
        currentSet: action.currentSet,
        completedSets: action.completedSets,
      };

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
  isLastSetOfExercise: boolean;
  sessionCompletedToday: boolean;
  progressionSuggestions: ProgressionSuggestion[];
  applyProgression: (accepted: ProgressionSuggestion[]) => void;
  // ─── Templates ───
  templates: WorkoutTemplate[];
  activeTemplateId: string | null;
  activeTemplateName: string;
  selectTemplate: (id: string) => Promise<void>;
  saveAsNewTemplate: (name: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  renameTemplate: (id: string, name: string) => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Session is created on the first set of a workout; its Appwrite $id lives here.
  // sessionId state mirrors the ref so effects can react when it's first assigned.
  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionCreateRef = useRef<Promise<string> | null>(null);

  // Accumulates every set logged in the current session (source of truth for DB writes).
  const sessionSetsRef = useRef<StoredSet[]>([]);
  // Write queue: ensures rapid DONE taps never produce out-of-order or missing writes.
  const pendingFlushRef = useRef<Promise<void> | null>(null);
  const needsReflushRef = useRef(false);

  // Debounce template saves so rapid weight adjustments don't hammer Appwrite.
  const templateSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The routine that is waiting to be persisted; lets flushPendingTemplateSave
  // know what data to write when we need to commit synchronously (e.g. on switch).
  const pendingRoutineRef = useRef<Exercise[] | null>(null);

  const [sessionCompletedToday, setSessionCompletedToday] = useState(readDoneToday);
  const [progressionSuggestions, setProgressionSuggestions] = useState<ProgressionSuggestion[]>(readStoredProgression);

  // ─── TEMPLATES ─────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateIdState] = useState<string | null>(null);

  // Refs mirror state so closure-captured callbacks always see the latest value.
  const templatesRef = useRef<WorkoutTemplate[]>([]);
  const activeTemplateIdRef = useRef<string | null>(null);

  function applyTemplates(ts: WorkoutTemplate[]) {
    templatesRef.current = ts;
    setTemplates(ts);
  }
  function applyActiveId(id: string | null) {
    activeTemplateIdRef.current = id;
    setActiveTemplateIdState(id);
    writeStoredActiveTemplateId(id);
  }

  const activeTemplateName =
    templates.find(t => t.id === activeTemplateId)?.name ?? '';

  // ─── INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Show cached routine immediately.
    const cached = loadRoutine();
    const fallback = cached?.length ? cached : DEFAULT_EXERCISES;
    dispatch({ type: 'INIT', routine: fallback });

    // 2. Sync templates from Appwrite; restore the previously-active template if
    //    it is still present, otherwise fall back to the first template in the list.
    loadAllTemplates(user.$id).then(async remote => {
      if (remote.length > 0) {
        applyTemplates(remote);
        const storedId = readStoredActiveTemplateId();
        const initial = remote.find(t => t.id === storedId) ?? remote[0];
        applyActiveId(initial.id);
        // Deep-copy exercises into state so state.routine is never aliased to a
        // template's exercise array — mutations always produce distinct objects.
        const exercises = initial.exercises.map(e => ({ ...e }));
        dispatch({ type: 'SET_ROUTINE', routine: exercises });
        saveRoutine(exercises);

        // Restore any in-progress session from today so a closed browser doesn't
        // lose workout progress — reuse the existing session document.
        const progress = readPersistedProgress();
        if (progress) {
          sessionIdRef.current = progress.sessionId;
          setSessionId(progress.sessionId);
          sessionSetsRef.current = progress.sets;
          dispatch({
            type: 'RESTORE_PROGRESS',
            currentExIdx: progress.currentExIdx,
            currentSet: progress.currentSet,
            completedSets: progress.completedSets,
          });
        }
      } else {
        // First login — seed Appwrite with the local/default routine.
        const newId = await saveTemplate(user.$id, fallback, 'My Workout');
        const t: WorkoutTemplate = { id: newId, name: 'My Workout', exercises: fallback };
        applyTemplates([t]);
        applyActiveId(newId);
        saveRoutine(fallback);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        .then(id => { sessionIdRef.current = id; setSessionId(id); return id; })
        .catch(e => { sessionCreateRef.current = null; throw e; });
    }
    return sessionCreateRef.current;
  }

  // Writes the full current sets blob to the session document.
  // If a write is already in-flight, flags that another write is needed afterwards
  // so the latest data is never lost even with rapid DONE taps.
  function flushSets(sessionId: string) {
    if (pendingFlushRef.current) {
      needsReflushRef.current = true;
      return;
    }
    const sets = sessionSetsRef.current;
    pendingFlushRef.current = persistSessionSets(sessionId, sets).finally(() => {
      pendingFlushRef.current = null;
      if (needsReflushRef.current) {
        needsReflushRef.current = false;
        flushSets(sessionId);
      }
    });
  }

  // ─── COMPLETE SESSION ──────────────────────────────────────────────
  useEffect(() => {
    if (isWorkoutComplete && sessionIdRef.current) {
      completeSession(sessionIdRef.current);
      clearPersistedProgress();
      writeDoneToday();
      setSessionCompletedToday(true);
      const suggestions = computeProgressionSuggestions(state.routine, sessionSetsRef.current);
      const ready = suggestions.filter(s => s.ready);
      setProgressionSuggestions(ready);
      writeStoredProgression(ready);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkoutComplete]);

  // ─── PERSIST PROGRESS ─────────────────────────────────────────────
  // After every set the workout position is saved to localStorage so the
  // user can resume if they close the browser mid-workout.
  useEffect(() => {
    if (!sessionId || sessionSetsRef.current.length === 0) return;
    writePersistedProgress({
      date: new Date().toISOString().slice(0, 10),
      sessionId,
      sets: sessionSetsRef.current,
      currentExIdx: state.currentExIdx,
      currentSet: state.currentSet,
      completedSets: state.completedSets,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, state.currentExIdx, state.currentSet, state.completedSets]);

  // ─── HANDLE DONE ───────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    if (!currentEx) return;
    sessionSetsRef.current = [
      ...sessionSetsRef.current,
      { exerciseName: currentEx.name, setNumber: state.currentSet, reps: currentEx.reps, weight: currentEx.weight, feel: '' },
    ];
    dispatch({ type: 'ADVANCE_SET' });
    ensureSession().then(sessionId => flushSets(sessionId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEx, state.currentSet]);

  // ─── HANDLE SKIP ───────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    dispatch({ type: 'SKIP_EXERCISE' });
  }, []);

  // ─── HANDLE FEEL ───────────────────────────────────────────────────
  const handleSetFeel = useCallback((feel: Feel) => {
    if (!currentEx) return;
    dispatch({ type: 'SET_FEEL', exerciseId: currentEx.id, feel });
    sessionSetsRef.current = sessionSetsRef.current.map(s =>
      s.exerciseName === currentEx.name ? { ...s, feel } : s
    );
    if (sessionIdRef.current) flushSets(sessionIdRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEx]);

  // ─── WEIGHT ────────────────────────────────────────────────────────
  const handleAdjustWeight = useCallback((delta: number) => {
    dispatch({ type: 'ADJUST_WEIGHT', delta });
  }, []);

  // ─── TEMPLATE PERSISTENCE ──────────────────────────────────────────
  function scheduleSaveTemplate(routine: Exercise[]) {
    saveRoutine(routine);
    // Capture the active template ID NOW — before the 800ms delay — so a template
    // switch or deletion that occurs during the debounce window cannot redirect the
    // write to the wrong (now-active) template.
    const id = activeTemplateIdRef.current;
    if (!id) return;
    // Always track the latest pending routine so flushPendingTemplateSave can
    // write the correct data even if the timer is cancelled early.
    pendingRoutineRef.current = routine;
    if (templateSaveTimer.current) clearTimeout(templateSaveTimer.current);
    templateSaveTimer.current = setTimeout(async () => {
      templateSaveTimer.current = null;
      pendingRoutineRef.current = null;
      // Guard: skip if the template was deleted while the timer was pending.
      if (!templatesRef.current.some(t => t.id === id)) return;
      const name = templatesRef.current.find(t => t.id === id)?.name ?? 'My Workout';
      await saveTemplate(user.$id, routine, name, id);
      // Re-check after async in case the template was deleted while the write was in-flight.
      if (templatesRef.current.some(t => t.id === id)) {
        applyTemplates(
          templatesRef.current.map(t => t.id === id ? { ...t, exercises: routine } : t)
        );
      }
    }, 800);
  }

  // Commits any pending debounced save immediately (synchronously cancels the timer,
  // then awaits the Appwrite write). Call this before switching away from a template
  // so in-progress edits are never silently discarded.
  async function flushPendingTemplateSave() {
    if (!templateSaveTimer.current) return;          // nothing pending
    clearTimeout(templateSaveTimer.current);
    templateSaveTimer.current = null;
    const routine = pendingRoutineRef.current;
    pendingRoutineRef.current = null;
    const id = activeTemplateIdRef.current;
    if (!routine || !id) return;
    if (!templatesRef.current.some(t => t.id === id)) return; // template was deleted
    const name = templatesRef.current.find(t => t.id === id)?.name ?? 'My Workout';
    await saveTemplate(user.$id, routine, name, id);
    if (templatesRef.current.some(t => t.id === id)) {
      applyTemplates(
        templatesRef.current.map(t => t.id === id ? { ...t, exercises: routine } : t)
      );
    }
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
    setSessionId(null);
    sessionCreateRef.current = null;
    sessionSetsRef.current = [];
    clearPersistedProgress();
    setProgressionSuggestions([]);
    clearStoredProgression();
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  const applyProgression = useCallback((accepted: ProgressionSuggestion[]) => {
    setProgressionSuggestions([]);
    clearStoredProgression();
    if (accepted.length === 0) return;
    const weightMap: Record<string, number> = {};
    for (const s of accepted) weightMap[s.exerciseName] = s.suggestedWeight;
    const updated = state.routine.map(e =>
      weightMap[e.name] !== undefined ? { ...e, weight: weightMap[e.name] } : e
    );
    dispatch({ type: 'SET_ROUTINE', routine: updated });
    scheduleSaveTemplate(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.routine, user.$id]);

  // ─── TEMPLATE ACTIONS ──────────────────────────────────────────────
  const selectTemplate = useCallback(async (id: string) => {
    const t = templatesRef.current.find(t => t.id === id);
    if (!t) return;
    // Flush any pending save for the current template BEFORE switching so edits
    // the user just made are not silently discarded.  (If the current template is
    // being deleted the caller is responsible for cancelling the timer first.)
    await flushPendingTemplateSave();
    applyActiveId(id);
    // Deep-copy each exercise object so state.routine is never aliased to the
    // template's stored array — future mutations produce fresh objects only.
    const exercises = t.exercises.map(e => ({ ...e }));
    dispatch({ type: 'INIT', routine: exercises });
    saveRoutine(exercises);
    sessionIdRef.current = null;
    setSessionId(null);
    sessionCreateRef.current = null;
    sessionSetsRef.current = [];
    clearPersistedProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.$id]);

  const saveAsNewTemplate = useCallback(async (name: string) => {
    // Snapshot the current routine with a deep copy so the new template's exercise
    // array is independent of anything the caller or a stale timer might mutate.
    const routine = state.routine.map(e => ({ ...e }));
    // Cancel any pending save for the old active template.  "Save as new" means
    // the user intends these exercises to live in the new template only; the old
    // template should stay at whatever it last committed to Appwrite.
    if (templateSaveTimer.current) { clearTimeout(templateSaveTimer.current); templateSaveTimer.current = null; }
    pendingRoutineRef.current = null;
    const newId = await saveTemplate(user.$id, routine, name);
    const t: WorkoutTemplate = { id: newId, name, exercises: routine };
    applyTemplates([...templatesRef.current, t]);
    applyActiveId(newId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.routine, user.$id]);

  const renameTemplate = useCallback(async (id: string, name: string) => {
    const t = templatesRef.current.find(t => t.id === id);
    if (!t) return;
    await saveTemplate(user.$id, t.exercises, name, id);
    applyTemplates(templatesRef.current.map(t => t.id === id ? { ...t, name } : t));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.$id]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (id === activeTemplateIdRef.current) {
      // Deleting the active template: discard any pending save — there is no point
      // persisting changes to a template that is about to be removed.
      if (templateSaveTimer.current) { clearTimeout(templateSaveTimer.current); templateSaveTimer.current = null; }
      pendingRoutineRef.current = null;
    }
    // For a non-active template: the timer only ever tracks the ACTIVE template,
    // so there is nothing to cancel — just delete straight away.
    await deleteTemplateDoc(id);
    const remaining = templatesRef.current.filter(t => t.id !== id);
    applyTemplates(remaining);

    if (activeTemplateIdRef.current === id) {
      if (remaining.length > 0) {
        // selectTemplate will flush nothing (timer was cleared above) and load remaining[0].
        await selectTemplate(remaining[0].id);
      } else {
        // No templates left — seed a blank one.
        const seed = DEFAULT_EXERCISES.map(e => ({ ...e }));
        const newId = await saveTemplate(user.$id, seed, 'My Workout');
        const t: WorkoutTemplate = { id: newId, name: 'My Workout', exercises: seed };
        applyTemplates([t]);
        applyActiveId(newId);
        dispatch({ type: 'INIT', routine: seed });
        saveRoutine(seed);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectTemplate, user.$id]);

  return (
    <WorkoutContext.Provider value={{
      state, dispatch,
      handleDone, handleSkip, handleSetFeel, handleAdjustWeight,
      updateRoutineExercise, addExercise, removeExercise, reorderRoutine,
      resetSession,
      isWorkoutComplete,
      isLastSetOfExercise,
      sessionCompletedToday,
      progressionSuggestions,
      applyProgression,
      templates,
      activeTemplateId,
      activeTemplateName,
      selectTemplate,
      saveAsNewTemplate,
      deleteTemplate,
      renameTemplate,
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
