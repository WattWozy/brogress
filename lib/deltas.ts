import type { SessionSet, DeltaMap, ExerciseDelta } from '@/types';

/**
 * Derives per-exercise deltas from a flat list of recent sets.
 *
 * Steps:
 *  1. Group sets by exerciseName
 *  2. Within each group, group by sessionId (preserving the order they appear,
 *     which is $createdAt DESC from the query — so first sessionId seen = most recent)
 *  3. For the two most-recent sessions, take the max weight in each
 *  4. delta = currentWeight - prevWeight
 *
 * Exercises that appear in only one session have no delta and are omitted.
 */
export function computeDeltas(sets: SessionSet[]): DeltaMap {
  // 1. Group by exercise
  const byExercise: Record<string, SessionSet[]> = {};
  for (const s of sets) {
    (byExercise[s.exerciseName] ??= []).push(s);
  }

  const result: DeltaMap = {};

  for (const [name, exSets] of Object.entries(byExercise)) {
    // 2. Collect distinct sessionIds in the order they first appear (DESC by date)
    const sessionOrder: string[] = [];
    const seenSessions = new Set<string>();
    for (const s of exSets) {
      if (!seenSessions.has(s.sessionId)) {
        sessionOrder.push(s.sessionId);
        seenSessions.add(s.sessionId);
      }
    }

    if (sessionOrder.length < 2) continue; // need at least two sessions for a delta

    const [currentId, prevId] = sessionOrder;

    // 3. Max weight per session
    const maxWeight = (sessionId: string) =>
      Math.max(...exSets.filter(s => s.sessionId === sessionId).map(s => s.weight));

    const current = maxWeight(currentId);
    const prev    = maxWeight(prevId);

    const entry: ExerciseDelta = {
      currentWeight: current,
      prevWeight:    prev,
      delta:         Math.round((current - prev) * 10) / 10,
    };

    result[name] = entry;
  }

  return result;
}
