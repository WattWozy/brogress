'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarStrip } from './CalendarStrip';
import { SessionView } from './SessionView';
import { loadSessionDates, loadSessionSets } from '@/lib/appwrite';
import { useDeltas } from '@/hooks/useDeltas';
import type { HistoryDate, HistoryEntry, SessionSet } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function HistoryPanel() {
  const { user } = useAuth();
  const [historyDates, setHistoryDates] = useState<HistoryDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { deltas } = useDeltas();

  useEffect(() => {
    loadSessionDates(user.$id).then(setHistoryDates);
  }, []);

  const handleSelectDate = useCallback(async (date: string) => {
    setSelectedDate(date);
    setLoading(true);
    setEntries(null);

    const match = historyDates.find(d => d.date === date);

    if (!match) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const sets = await loadSessionSets(match.sessionId);

    if (sets.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Group by exercise name
    const byEx: Record<string, HistoryEntry> = {};
    sets.forEach(s => {
      if (!byEx[s.exerciseName]) byEx[s.exerciseName] = { name: s.exerciseName, sets: [], feel: '' };
      byEx[s.exerciseName].sets.push(s);
      if (s.feel) byEx[s.exerciseName].feel = s.feel;
    });

    setEntries(Object.values(byEx));
    setLoading(false);
  }, [historyDates]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '52px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize: 32, fontWeight: 900,
          textTransform: 'uppercase', color: '#f0f0f0',
        }}>
          History
        </div>
        <div style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 10, color: '#888',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          swipe to today →
        </div>
      </div>

      <CalendarStrip
        historyDates={historyDates}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
        <SessionView date={selectedDate} entries={entries} loading={loading} deltas={deltas} />
      </div>
    </div>
  );
}
