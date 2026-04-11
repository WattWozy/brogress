export type Feel = 'easy' | 'right' | 'hard';

export interface WorkoutTemplate {
  id: string;      // Appwrite $id
  name: string;
  exercises: Exercise[];
}

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
  $createdAt?: string;
  sessionId: string;
  userId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  feel?: Feel | '';
}

export interface ExerciseDelta {
  currentWeight: number;  // max weight across sets in the most recent session
  prevWeight: number;     // max weight across sets in the prior session
  delta: number;          // currentWeight - prevWeight
}

export type DeltaMap = Record<string, ExerciseDelta>; // keyed by exerciseName

export interface HistoryDate {
  date: string;
  sessionId: string;
}

export interface HistoryEntry {
  name: string;
  sets: SessionSet[];
  feel: Feel | '';
}
