'use client';

import { useEffect, useState } from 'react';

export default function Clock() {
  const [time,     setTime]     = useState<Date | null>(null);
  const [timezone, setTimezone] = useState<string | undefined>(undefined);

  useEffect(() => {
    const load = () => {
      fetch('/api/settings', { cache: 'no-store' })
        .then(r => r.json())
        .then(s => {
          console.log('settings:', s);
          setTimezone(s.timeZone || undefined); // ← capital Z to match settings.json
        });
    };
    load();
    window.addEventListener('settings-changed', load);
    return () => window.removeEventListener('settings-changed', load);
  }, []);

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  const timeOptions = {
    hour:   '2-digit' as const,
    minute: '2-digit' as const,
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {}),
  };

  const timeStr = time.toLocaleTimeString('en-AU', timeOptions);
  const dateStr = time.toLocaleDateString('en-AU', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    ...(timezone ? { timeZone: timezone } : {}),
  });

  return (
    <div style={{ textAlign: 'center' }}>
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