'use client';

import type { HistoryDate } from '@/types';

interface CalendarStripProps {
  historyDates: HistoryDate[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const DAY_NAMES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export function CalendarStrip({ historyDates, selectedDate, onSelectDate }: CalendarStripProps) {
  const sessionDates = new Set(historyDates.map(h => h.date));
  const days: { date: string; dayName: string; dayNum: number; hasSession: boolean }[] = [];

  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      date: dateStr,
      dayName: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      hasSession: sessionDates.has(dateStr),
    });
  }

  return (
    <div style={{
      padding: '12px 24px',
      display: 'flex', gap: 8,
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch' as never,
      flexShrink: 0,
      msOverflowStyle: 'none',
      scrollbarWidth: 'none',
    }}>
      {days.map(d => (
        <div
          key={d.date}
          onClick={() => onSelectDate(d.date)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, flexShrink: 0,
            cursor: 'pointer', userSelect: 'none',
            padding: '8px 10px',
            borderRadius: 12,
            border: `1px solid ${
              d.date === selectedDate ? '#f5a623' :
              d.hasSession ? '#444' : 'transparent'
            }`,
            background: d.date === selectedDate ? 'rgba(245,166,35,0.08)' : 'transparent',
            minWidth: 44,
          }}
        >
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9, color: '#888',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {d.dayName}
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 20, fontWeight: 700,
            color: d.hasSession ? '#f5a623' : '#f0f0f0',
          }}>
            {d.dayNum}
          </div>
          <div style={{
            width: 4, height: 4,
            borderRadius: '50%',
            background: d.hasSession ? '#f5a623' : '#444',
          }} />
        </div>
      ))}
    </div>
  );
}
