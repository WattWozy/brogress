import type { Exercise } from '@/types';

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'ex_squat',  name: 'Squat',          sets: 4, reps: 5,  weight: 60 },
  { id: 'ex_bench',  name: 'Bench Press',     sets: 4, reps: 8,  weight: 50 },
  { id: 'ex_row',    name: 'Barbell Row',     sets: 4, reps: 8,  weight: 50 },
  { id: 'ex_ohp',    name: 'Overhead Press',  sets: 3, reps: 8,  weight: 35 },
];

export const EXERCISE_LIBRARY: string[] = [
  'Squat', 'Front Squat', 'Leg Press', 'Leg Curl', 'Leg Extension',
  'Bench Press', 'Incline Bench', 'Decline Bench', 'Dumbbell Fly',
  'Overhead Press', 'Arnold Press', 'Lateral Raise',
  'Barbell Row', 'Pendlay Row', 'Cable Row', 'Lat Pulldown', 'Pull-Up', 'Chin-Up',
  'Deadlift', 'Romanian Deadlift', 'Sumo Deadlift',
  'Bicep Curl', 'Hammer Curl', 'Preacher Curl',
  'Tricep Pushdown', 'Skull Crusher', 'Dips',
  'Calf Raise', 'Hip Thrust', 'Glute Kickback',
  'Face Pull', 'Upright Row', 'Shrug',
  'Plank', 'Crunch', 'Leg Raise', 'Ab Wheel',
];
