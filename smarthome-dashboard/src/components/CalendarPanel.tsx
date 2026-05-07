'use client';

import { useState } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPanel() {
  const today = new Date();
  const [viewed, setViewed] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

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
      {/* Header */}
      <div className="calendar-header">
        <button className="cal-nav" onClick={prevMonth}>‹</button>
        <span className="cal-title">{MONTHS[month]} {year}</span>
        <button className="cal-nav" onClick={nextMonth}>›</button>
      </div>

      {/* Day labels */}
      <div className="calendar-grid">
        {DAYS.map(d => (
          <div key={d} className="cal-day-label">{d}</div>
        ))}

        {/* Day cells */}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`cal-cell ${cell.type !== 'current' ? 'cal-cell--faded' : ''} ${isToday(cell.day, cell.type) ? 'cal-cell--today' : ''}`}
          >
            {cell.day}
          </div>
        ))}
      </div>
    </div>
  );
}