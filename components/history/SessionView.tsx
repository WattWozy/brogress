'use client';

import type { HistoryEntry } from '@/types';

interface SessionViewProps {
  date: string | null;
  entries: HistoryEntry[] | null;
  loading: boolean;
}

function feelEmoji(feel: string) {
  if (feel === 'easy') return '😮‍💨';
  if (feel === 'hard') return '😤';
  if (feel === 'right') return '✅';
  return '';
}

export function SessionView({ date, entries, loading }: SessionViewProps) {
  if (!date) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Select a date
      </div>
    );
  }
  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Loading...
      </div>
    );
  }
  if (!entries || entries.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        No session on {date}
      </div>
    );
  }

  return (
    <div>
      {entries.map((entry, i) => {
        const maxWeight = Math.max(...entry.sets.map(s => s.weight));
        const reps = entry.sets[0]?.reps ?? 0;
        const setCount = entry.sets.length;

        return (
          <div
            key={i}
            style={{
              padding: '14px 0',
              borderBottom: '1px solid #2a2a2a',
              display: 'flex', alignItems: 'baseline', gap: 10,
            }}
          >
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 18, fontWeight: 700,
              textTransform: 'uppercase', color: '#f0f0f0',
              letterSpacing: '0.02em',
              flexShrink: 0,
            }}>
              {entry.name}
            </div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, color: '#888',
              letterSpacing: '0.06em',
              flex: 1,
            }}>
              {maxWeight}kg × {reps} × {setCount}
            </div>
            {entry.feel && (
              <div style={{ fontSize: 14, flexShrink: 0 }}>{feelEmoji(entry.feel)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
