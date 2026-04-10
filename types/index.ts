export type Feel = 'easy' | 'right' | 'hard';

export interface Exercise {
  id: string;      // local only — derived from name, never sent to Appwrite
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface QueuedExercise extends Exercise {
  originalIdx?: number;
}

export interface SessionSet {
  $id: string;
  sessionId: string;
  userId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  feel?: Feel | '';
}

export interface HistoryDate {
  date: string;
  sessionId: string;
}

export interface HistoryEntry {
  name: string;
  sets: SessionSet[];
  feel: Feel | '';
}
