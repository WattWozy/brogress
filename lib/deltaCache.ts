import type { DeltaMap } from '@/types';

interface DeltaCacheEntry {
  lastSessionId: string | null;
  deltas: DeltaMap;
}

function key(userId: string) {
  return `brogress_deltas_${userId}`;
}

export function loadDeltaCache(userId: string): DeltaCacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as DeltaCacheEntry) : null;
  } catch {
    return null;
  }
}

export function saveDeltaCache(userId: string, lastSessionId: string | null, deltas: DeltaMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key(userId), JSON.stringify({ lastSessionId, deltas }));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}
