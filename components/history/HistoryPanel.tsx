'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarStrip } from './CalendarStrip';
import { SessionView } from './SessionView';
import { awRead } from '@/lib/appwrite';
import { COL_SESSIONS, COL_SETS } from '@/lib/config';
import { getDeviceId } from '@/lib/storage';
import { Query } from 'appwrite';
import type { HistoryDate, HistoryEntry, SessionSet } from '@/types';

export function HistoryPanel() {
  const [historyDates, setHistoryDates] = useState<HistoryDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDates() {
      const deviceId = getDeviceId();
      const sessions = await awRead<{ $id: string; date: string }>(COL_SESSIONS, [
        Query.equal('deviceId', deviceId),
        Query.orderDesc('date'),
        Query.limit(60),
      ]);
      if (sessions) {
        setHistoryDates(sessions.map(s => ({ date: s.date, sessionId: s.$id })));
      }
    }
    fetchDates();
  }, []);

  const handleSelectDate = useCallback(async (date: string) => {
    setSelectedDate(date);
    setLoading(true);
    setEntries(null);

    const deviceId = getDeviceId();
    const sessions = await awRead<{ $id: string; date: string }>(COL_SESSIONS, [
      Query.equal('deviceId', deviceId),
      Query.equal('date', date),
    ]);

    if (!sessions || sessions.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const session = sessions[0];
    const sets = await awRead<SessionSet>(COL_SETS, [
      Query.equal('sessionId', session.$id),
      Query.orderAsc('setNumber'),
    ]);

    if (!sets || sets.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Group by exercise
    const byEx: Record<string, HistoryEntry> = {};
    sets.forEach(s => {
      if (!byEx[s.exerciseId]) byEx[s.exerciseId] = { name: s.exerciseName, sets: [], feel: '' };
      byEx[s.exerciseId].sets.push(s);
      if (s.feel) byEx[s.exerciseId].feel = s.feel;
    });

    setEntries(Object.values(byEx));
    setLoading(false);
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '52px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 32, fontWeight: 900,
          textTransform: 'uppercase', color: '#f0f0f0',
        }}>
          History
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
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
        <SessionView date={selectedDate} entries={entries} loading={loading} />
      </div>
    </div>
  );
}
