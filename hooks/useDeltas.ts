'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { loadLatestSessionId, loadRecentSets } from '@/lib/appwrite';
import { computeDeltas } from '@/lib/deltas';
import { loadDeltaCache, saveDeltaCache } from '@/lib/deltaCache';
import type { DeltaMap } from '@/types';

export function useDeltas(): { deltas: DeltaMap | null; loading: boolean } {
  const { user } = useAuth();
  const [deltas, setDeltas]   = useState<DeltaMap | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // 1. Cheap check: what is the latest session ID right now?
      const latestId = await loadLatestSessionId(user.$id);

      // 2. If we have a cached result for that session, serve it instantly.
      const cached = loadDeltaCache(user.$id);
      if (cached && cached.lastSessionId === latestId) {
        if (!cancelled) { setDeltas(cached.deltas); setLoading(false); }
        return;
      }

      // 3. Cache miss (new session completed, or first run) — fetch sets and compute.
      const sets    = await loadRecentSets(user.$id);
      const computed = computeDeltas(sets);
      saveDeltaCache(user.$id, latestId, computed);

      if (!cancelled) { setDeltas(computed); setLoading(false); }
    }

    load();
    return () => { cancelled = true; };
  }, [user.$id]);

  return { deltas, loading };
}
