import type { Exercise } from '@/types';

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'ex_squat',   name: 'Squat',          sets: 4, reps: 12, weight: 40 },
  { id: 'ex_thrust',  name: 'Hip Thrust',      sets: 4, reps: 15, weight: 40 },
  { id: 'ex_rdl',     name: 'Romanian Deadlift', sets: 3, reps: 12, weight: 35 },
  { id: 'ex_lunge',   name: 'Reverse Lunge',   sets: 3, reps: 12, weight: 20 },
];

export const EXERCISE_LIBRARY: string[] = [
  // Glutes
  'Hip Thrust', 'Barbell Hip Thrust', 'Single-Leg Hip Thrust', 'Glute Bridge',
  'Cable Kickback', 'Donkey Kick', 'Fire Hydrant', 'Frog Pump',
  'Resistance Band Squat', 'Sumo Squat', 'Squat Pulse',

  // Legs
  'Squat', 'Front Squat', 'Goblet Squat', 'Bulgarian Split Squat',
  'Reverse Lunge', 'Walking Lunge', 'Lateral Lunge', 'Curtsy Lunge',
  'Leg Press', 'Romanian Deadlift', 'Sumo Deadlift', 'Stiff-Leg Deadlift',
  'Leg Curl', 'Leg Extension', 'Calf Raise', 'Step-Up',

  // Cardio / HIIT
  'Treadmill', 'Stairmaster', 'Rowing Machine', 'Cycling',
  'Jump Rope', 'Box Jump', 'Burpee', 'Jump Squat',
  'Mountain Climber', 'High Knees', 'Lateral Shuffle',

  // Core
  'Plank', 'Side Plank', 'Dead Bug', 'Glute-Ham Raise',
  'Leg Raise', 'Bicycle Crunch', 'Russian Twist', 'Ab Wheel',

  // Upper (light)
  'Lateral Raise', 'Face Pull', 'Seated Row', 'Lat Pulldown', 'Pull-Up',
  'Dumbbell Curl', 'Tricep Pushdown',
];
