export type Feel = 'easy' | 'right' | 'hard';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface QueuedExercise extends Exercise {
  /** original routine index, for re-insertion */
  originalIdx?: number;
}

export interface SessionSet extends Record<string, unknown> {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  feel?: Feel | '';
}

export interface Session {
  $id: string;
  deviceId: string;
  date: string;
  startedAt: string;
}

export interface HistoryEntry {
  name: string;
  sets: SessionSet[];
  feel: Feel | '';
}

export interface HistoryDate {
  date: string;
  sessionId: string;
}
