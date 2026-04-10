'use client';

interface ToastProps {
  message: string;
  visible: boolean;
}

export function Toast({ message, visible }: ToastProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 90,
        left: '50%',
        transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
        background: '#1e1e1e',
        border: '1px solid #444',
        color: '#888',
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '8px 16px',
        borderRadius: 100,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s, transform 0.25s',
        pointerEvents: 'none',
        zIndex: 100,
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  );
}
