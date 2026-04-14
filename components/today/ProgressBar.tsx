'use client';

interface ProgressBarProps {
  completed: number;
  total: number;
}

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div style={{ height: 3, background: '#1e1e1e', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
      <div
        style={{
          height: '100%',
          background: '#f472b6',
          width: `${pct}%`,
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  );
}
