import type { CalendarEvent } from './types'

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000)
}

export function getDayLabel(eventDate: Date, today: Date): string {
  const diff = dayDiff(eventDate, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  const dayName = eventDate.toLocaleDateString('en-AU', { weekday: 'long' })
  const dateStr = eventDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  return `${dayName} · ${dateStr}`
}

export function formatEventTime(ev: CalendarEvent): string {
  if (ev.allDay) return 'All day'
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }
  const s = ev.start.toLocaleTimeString('en-AU', opts)
  const e = ev.end.toLocaleTimeString('en-AU', opts)
  return `${s} – ${e}`
}

const normalizeEvent = (ev: any): CalendarEvent => {
  const startRaw = ev.start?.dateTime ?? ev.start?.date;
  const endRaw = ev.end?.dateTime ?? ev.end?.date;

  const start = new Date(startRaw);
  const end = new Date(endRaw);

  return {
    ...ev,

    // ✅ standardised fields your UI should use
    title: ev.summary ?? 'No title',
    description: ev.description ?? '',
    location: ev.location ?? '',

    start,
    end,

    allDay: !!ev.start?.date, // Google uses `date` for all-day events
  };
};

export type EventGroups = Record<string, CalendarEvent[]>

export function groupUpcomingEvents(events: CalendarEvent[]): EventGroups {
  const now = new Date();

  const cutoff = new Date(now.getTime() + FOURTEEN_DAYS_MS);
  cutoff.setHours(23, 59, 59, 999);

  // ─────────────────────────────────────────────
  // ✅ Convert Google Calendar event → clean model
  // ─────────────────────────────────────────────
  const normalizeEvent = (ev: any): CalendarEvent => {
    const startRaw = ev.start?.dateTime ?? ev.start?.date;
    const endRaw = ev.end?.dateTime ?? ev.end?.date;

    const start = new Date(startRaw);
    const end = new Date(endRaw);

    // fallback safety (prevents invalid dates breaking UI)
    const safeStart = isNaN(start.getTime()) ? new Date(0) : start;
    const safeEnd = isNaN(end.getTime()) ? new Date(0) : end;

    return {
      ...ev,

      // ✅ UI-friendly fields
      title: ev.summary ?? 'Untitled event',
      description: ev.description ?? '',
      location: ev.location ?? '',

      // ✅ normalized dates
      start: safeStart,
      end: safeEnd,

      // ✅ all-day detection (Google uses `date`)
      allDay: !!ev.start?.date,
    };
  };

  // ─────────────────────────────────────────────
  // Normalize all events first
  // ─────────────────────────────────────────────
  const normalized = events.map(normalizeEvent);

  // ─────────────────────────────────────────────
  // Filter to upcoming window
  // ─────────────────────────────────────────────
  const upcoming = normalized
    .filter(ev => ev.end >= now && ev.start <= cutoff)
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return a.start.getTime() - b.start.getTime();
    });

  // ─────────────────────────────────────────────
  // Group by day label
  // ─────────────────────────────────────────────
  const groups: EventGroups = {};

  for (const ev of upcoming) {
    const key = getDayLabel(ev.start, now);

    if (!groups[key]) groups[key] = [];

    groups[key].push(ev);
  }

  return groups;
}