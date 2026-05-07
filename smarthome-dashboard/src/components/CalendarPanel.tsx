'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPanel() {
  const { data: session } = useSession();
  const today = new Date();
  const [events, setEvents] = useState<any[]>([]);
  const [viewed, setViewed] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // ✅ all hooks before any early return
  useEffect(() => {
    if (session) {
      fetch('/api/calendar')
        .then(r => r.json())
        .then(setEvents);
    }
  }, [session]);

  if (!session) return (
    <div className="calendar-login">
      <button onClick={() => signIn('google')}>Sign in with Google</button>
    </div>
  );

  const year = viewed.getFullYear();
  const month = viewed.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; type: 'prev' | 'current' | 'next' }[] = [];

  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, type: 'prev' });
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ day: i, type: 'current' });
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - daysInMonth - firstDay + 1, type: 'next' });

  const isToday = (day: number, type: string) =>
    type === 'current' &&
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const prevMonth = () => setViewed(new Date(year, month - 1, 1));
  const nextMonth = () => setViewed(new Date(year, month + 1, 1));

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="cal-nav" onClick={prevMonth}>‹</button>
        <span className="cal-title">{MONTHS[month]} {year}</span>
        <button className="cal-nav" onClick={nextMonth}>›</button>
      </div>

      <div className="calendar-grid">
        {DAYS.map(d => (
          <div key={d} className="cal-day-label">{d}</div>
        ))}

        {cells.map((cell, i) => {
          const cellEvents = events.filter(e => {
            const d = new Date(e.start?.dateTime ?? e.start?.date);
            return cell.type === 'current' &&
              d.getDate() === cell.day &&
              d.getMonth() === month &&
              d.getFullYear() === year;
          });

          return (
            <div
              key={i}
              className={`cal-cell ${cell.type !== 'current' ? 'cal-cell--faded' : ''} ${isToday(cell.day, cell.type) ? 'cal-cell--today' : ''}`}
            >
              {cellEvents.map((e, j) => (
                <div key={j} className="cal-event">{e.summary}</div>
              ))}
              <span>{cell.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}