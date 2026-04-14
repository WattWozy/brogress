'use client';

import { useState, useEffect } from 'react';

interface ClassDoneModalProps {
  visible: boolean;
  exerciseName: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function ClassDoneModal({ visible, exerciseName, onConfirm, onDismiss }: ClassDoneModalProps) {
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (visible) setCelebrating(false);
  }, [visible]);

  function handleConfirm() {
    onConfirm();
    setCelebrating(true);
    setTimeout(onDismiss, 2000);
  }

  return (
    <div
      onClick={celebrating ? onDismiss : undefined}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(14,14,14,0.97)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        gap: 20, zIndex: 70,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
        transition: 'opacity 0.22s',
        cursor: celebrating ? 'pointer' : 'default',
        userSelect: 'none',
        padding: '0 32px',
      }}
    >
      {!celebrating ? (
        <>
          <div style={{ fontSize: 44, lineHeight: 1 }}>🏋️‍♀️</div>
          <div style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: 'clamp(28px, 8vw, 44px)',
            fontWeight: 800,
            color: '#f472b6',
            textAlign: 'center',
            lineHeight: 1.1,
          }}>
            {exerciseName}
          </div>
          <div style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 12,
            color: '#888',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            Did you crush it?
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={onDismiss}
              style={{
                background: 'transparent',
                border: '1px solid #333',
                color: '#555',
                borderRadius: 100,
                fontFamily: "'Nunito', sans-serif",
                fontSize: 13, fontWeight: 600,
                padding: '14px 26px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              Not yet
            </button>
            <button
              onClick={handleConfirm}
              style={{
                background: '#f472b6',
                border: 'none',
                color: '#000',
                borderRadius: 100,
                fontFamily: "'Raleway', sans-serif",
                fontSize: 17, fontWeight: 800,
                padding: '14px 32px',
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              Crushed it 💪
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: 'clamp(72px, 20vw, 110px)',
            fontWeight: 900,
            color: '#f472b6',
            lineHeight: 0.88,
            textAlign: 'center',
            letterSpacing: '-0.02em',
          }}>
            QUEEN
          </div>
          <div style={{ fontSize: 44, lineHeight: 1 }}>👑</div>
          <div style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 11,
            color: '#888',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            Progress logged
          </div>
        </>
      )}
    </div>
  );
}
