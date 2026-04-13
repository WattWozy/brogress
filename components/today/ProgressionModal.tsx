'use client';

import { useState } from 'react';
import type { ProgressionSuggestion } from '@/lib/progression';

interface ProgressionModalProps {
  suggestions: ProgressionSuggestion[];          // only ready: true items
  onApply: (accepted: ProgressionSuggestion[]) => void;
}

export function ProgressionModal({ suggestions, onApply }: ProgressionModalProps) {
  // Tracks which exercises the user has opted out of
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const toggle = (name: string) =>
    setSkipped(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const accepted = suggestions.filter(s => !skipped.has(s.exerciseName));

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0e0e0e',
      display: 'flex', flexDirection: 'column',
      zIndex: 90,
      padding: '36px 24px 36px',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 'clamp(52px, 14vw, 80px)',
        fontWeight: 900,
        color: '#f5a623',
        lineHeight: 0.88,
        textTransform: 'uppercase',
        letterSpacing: '-0.01em',
      }}>
        Level<br />Up
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: '#555',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginTop: 10,
        marginBottom: 32,
      }}>
        Ready to add weight
      </div>

      {/* Exercise rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {suggestions.map(s => {
          const isSkipped = skipped.has(s.exerciseName);
          return (
            <div
              key={s.exerciseName}
              style={{
                background: isSkipped ? 'transparent' : '#1a1a1a',
                border: `1px solid ${isSkipped ? '#222' : '#333'}`,
                borderRadius: 16,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                opacity: isSkipped ? 0.35 : 1,
                transition: 'opacity 0.2s, background 0.2s, border-color 0.2s',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#eee',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {s.exerciseName}
                </div>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  color: '#666',
                  marginTop: 3,
                }}>
                  {s.currentWeight} kg{' '}
                  <span style={{ color: '#444' }}>→</span>{' '}
                  <span style={{ color: isSkipped ? '#555' : '#f5a623' }}>{s.suggestedWeight} kg</span>
                </div>
              </div>

              <button
                onClick={() => toggle(s.exerciseName)}
                style={{
                  flexShrink: 0,
                  background: isSkipped ? 'transparent' : '#f5a62322',
                  color: isSkipped ? '#444' : '#f5a623',
                  border: `1px solid ${isSkipped ? '#333' : '#f5a62366'}`,
                  borderRadius: 100,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSkipped ? 'add back' : 'skip'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Apply / Done button */}
      <button
        onClick={() => onApply(accepted)}
        style={{
          marginTop: 28,
          background: accepted.length > 0 ? '#f5a623' : '#1a1a1a',
          color: accepted.length > 0 ? '#000' : '#555',
          border: accepted.length > 0 ? 'none' : '1px solid #333',
          borderRadius: 100,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          padding: '20px 0',
          cursor: 'pointer',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {accepted.length > 0
          ? `Apply ${accepted.length} increase${accepted.length > 1 ? 's' : ''}`
          : 'Done'}
      </button>
    </div>
  );
}
