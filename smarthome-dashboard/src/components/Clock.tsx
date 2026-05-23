'use client';

import { useEffect, useState } from 'react';

export default function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  const timeStr = time.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const dateStr = time.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div style={{ textAlign: 'center'}}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '28px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1,
        textShadow: '0 2px 12px rgba(0,0,0,0.6)',
      }}>
        {timeStr}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--accent)',
        marginTop: '4px',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        textShadow: '0 1px 8px rgba(0,0,0,0.6)',
      }}>
        {dateStr}
      </div>
    </div>
  );
}