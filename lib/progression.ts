import type { Exercise, StoredSet } from '@/types';

export interface ProgressionSuggestion {
  exerciseName: string;
  currentWeight: number;
  suggestedWeight: number;
  ready: boolean;
  reason: 'weight_increase' | 'not_enough_sets' | 'feel_not_easy';
}

const INCREMENT_KG = 2.5;

/**
 * Determines whether each exercise is ready for a weight increase
 * based on the just-completed session's set data.
 *
 * Rules (all must pass):
 *  1. Weight > 0          — skip bodyweight exercises
 *  2. All planned sets completed
 *  3. Majority feel === 'easy'  (blank/'right'/'hard' all block gains)
 *
 * → Suggest +2.5 kg. Everything else returns ready: false with a reason.
 */
export function computeProgressionSuggestions(
  exercises: Exercise[],
  sessionSets: StoredSet[],
): ProgressionSuggestion[] {
  const suggestions: ProgressionSuggestion[] = [];

  for (const ex of exercises) {
    // Bodyweight exercises have no kg to increment
    if (ex.weight === 0) continue;

    const exSets = sessionSets.filter(s => s.exerciseName === ex.name);

    // Skipped entirely — nothing to evaluate
    if (exSets.length === 0) continue;

    // Incomplete — didn't finish all sets
    if (exSets.length < ex.sets) {
      suggestions.push({
        exerciseName: ex.name,
        currentWeight: ex.weight,
        suggestedWeight: ex.weight,
        ready: false,
        reason: 'not_enough_sets',
      });
      continue;
    }

    // Gains only if majority feel === 'easy' — 'right', 'hard', and blank all block
    const easyCount = exSets.filter(s => s.feel === 'easy').length;
    if (easyCount <= exSets.length / 2) {
      suggestions.push({
        exerciseName: ex.name,
        currentWeight: ex.weight,
        suggestedWeight: ex.weight,
        ready: false,
        reason: 'feel_not_easy',
      });
      continue;
    }

    suggestions.push({
      exerciseName: ex.name,
      currentWeight: ex.weight,
      suggestedWeight: Math.round((ex.weight + INCREMENT_KG) * 10) / 10,
      ready: true,
      reason: 'weight_increase',
    });
  }

  return suggestions;
}
