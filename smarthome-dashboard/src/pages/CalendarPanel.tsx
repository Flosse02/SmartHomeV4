'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { LogoutIcon } from '@/lib/icons';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  htmlLink?: string;
  organizer?: { email: string; displayName?: string };
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

// ─── Add Event Modal ────────────────────────────────────────────────────────

interface AddEventModalProps {
  initialDate?: Date;
  onClose: () => void;
  onCreated: (event: CalendarEvent) => void;
}

function AddEventModal({ initialDate, onClose, onCreated }: AddEventModalProps) {
  const base = initialDate ?? new Date();
  const baseStr = toDateInput(base);
  const startDefault = `${baseStr}T09:00`;
  const endDefault   = `${baseStr}T10:00`;

  const [saving, setSaving] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [form, setForm] = useState({
    summary: '',
    location: '',
    description: '',
    startDateTime: startDefault,
    endDateTime: endDefault,
    startDate: baseStr,
    endDate: baseStr,
    attendees: '',
  });

  const set = (field: string, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleCreate = async () => {
    if (!form.summary.trim()) { alert('Please enter a title.'); return; }
    setSaving(true);

    const body = {
      summary: form.summary,
      location: form.location,
      description: form.description,
      start: allDay ? { date: form.startDate } : { dateTime: new Date(form.startDateTime).toISOString() },
      end:   allDay ? { date: form.endDate }   : { dateTime: new Date(form.endDateTime).toISOString() },
      attendees: form.attendees
        .split(',').map(e => e.trim()).filter(Boolean).map(email => ({ email })),
    };

    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const created = await res.json();
      onCreated(created);
      onClose();
    } else {
      const err = await res.json();
      alert(`Failed to create event: ${err?.error?.message ?? 'Unknown error'}`);
    }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">New Event</h2>

        <div className="edit-field">
          <label>Title *</label>
          <input
            autoFocus
            placeholder="Event title"
            value={form.summary}
            onChange={e => set('summary', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
        </div>

        <div className="edit-field">
          <label className="edit-allday-label">
            <input
              type="checkbox"
              checked={allDay}
              onChange={e => setAllDay(e.target.checked)}
            />
            All day
          </label>
        </div>

        {allDay ? (
          <>
            <div className="edit-field">
              <label>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div className="edit-field">
              <label>End Date</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <div className="edit-field">
              <label>Start</label>
              <input type="datetime-local" value={form.startDateTime} onChange={e => set('startDateTime', e.target.value)} />
            </div>
            <div className="edit-field">
              <label>End</label>
              <input type="datetime-local" value={form.endDateTime} onChange={e => set('endDateTime', e.target.value)} />
            </div>
          </>
        )}

        <div className="edit-field">
          <label>Location</label>
          <input placeholder="Add location" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>

        <div className="edit-field">
          <label>Description</label>
          <textarea rows={3} placeholder="Add description" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div className="edit-field">
          <label>Attendees <span className="edit-hint">(comma-separated emails)</span></label>
          <input placeholder="email@example.com, ..." value={form.attendees} onChange={e => set('attendees', e.target.value)} />
        </div>

        <div className="edit-actions">
          <button className="edit-cancel" onClick={onClose}>Cancel</button>
          <button className="edit-save" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Modal ────────────────────────────────────────────────────────────

function EventModal({ event, onClose, onEdit, onDelete }: {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: (updated: CalendarEvent) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    summary: event.summary ?? '',
    location: event.location ?? '',
    description: event.description ?? '',
    startDateTime: event.start.dateTime ? toLocalInput(event.start.dateTime) : '',
    endDateTime: event.end.dateTime ? toLocalInput(event.end.dateTime) : '',
    startDate: event.start.date ?? '',
    endDate: event.end.date ?? '',
    attendees: event.attendees?.map(a => a.email).join(', ') ?? '',
  });

  const isAllDay = !event.start.dateTime;

  const fmt = (dt?: string, d?: string) => {
    if (dt) return new Date(dt).toLocaleString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
    if (d) return new Date(d).toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    return 'Unknown';
  };

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    const body = {
      summary: form.summary,
      location: form.location,
      description: form.description,
      start: isAllDay ? { date: form.startDate } : { dateTime: new Date(form.startDateTime).toISOString() },
      end:   isAllDay ? { date: form.endDate }   : { dateTime: new Date(form.endDateTime).toISOString() },
      attendees: form.attendees.split(',').map(e => e.trim()).filter(Boolean).map(email => ({ email })),
    };

    const res = await fetch(`/api/calendar/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      onEdit(updated);
      setEditing(false);
    } else {
      alert('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/calendar/${event.id}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      onDelete(event.id);
      onClose();
    } else {
      alert('Failed to delete. Please try again.');
      setDeleting(false);
      setConfirming(false);
    }
  };

  // ── Confirm dialog overlay ──────────────────────────────────────────────
  if (confirming) {
    return (
      <div className="modal-backdrop" onClick={() => setConfirming(false)}>
        <div className="modal modal--confirm" onClick={e => e.stopPropagation()}>
          <h2 className="modal-title">Delete Event?</h2>
          <p className="confirm-message">
            "<strong>{event.summary}</strong>" will be permanently deleted from your Google Calendar.
          </p>
          <div className="edit-actions">
            <button className="edit-cancel" onClick={() => setConfirming(false)}>Cancel</button>
            <button className="delete-confirm-btn" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {!editing ? (
          <>
            <h2 className="modal-title">{event.summary ?? 'Untitled Event'}</h2>
            <div className="modal-section">
              <span className="modal-label">📅 Start</span>
              <span>{fmt(event.start.dateTime, event.start.date)}</span>
            </div>
            <div className="modal-section">
              <span className="modal-label">⏱ End</span>
              <span>{fmt(event.end.dateTime, event.end.date)}</span>
            </div>
            {event.location && (
              <div className="modal-section">
                <span className="modal-label">📍 Location</span>
                <span>{event.location}</span>
              </div>
            )}
            {event.organizer && (
              <div className="modal-section">
                <span className="modal-label">👤 Organizer</span>
                <span>{event.organizer.displayName ?? event.organizer.email}</span>
              </div>
            )}
            {event.description && (
              <div className="modal-section modal-section--block">
                <span className="modal-label">📝 Description</span>
                <p className="modal-description" dangerouslySetInnerHTML={{ __html: event.description }} />
              </div>
            )}
            {event.attendees && event.attendees.length > 0 && (
              <div className="modal-section modal-section--block">
                <span className="modal-label">👥 Attendees</span>
                <ul className="modal-attendees">
                  {event.attendees.map((a, i) => (
                    <li key={i} className={`modal-attendee modal-attendee--${a.responseStatus}`}>
                      {a.displayName ?? a.email}
                      <span className="modal-attendee-status">
                        {a.responseStatus === 'accepted' ? '✓' :
                         a.responseStatus === 'declined' ? '✗' :
                         a.responseStatus === 'tentative' ? '?' : '–'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {event.htmlLink && (
              <a className="modal-link" href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                Open in Google Calendar ↗
              </a>
            )}
            <div className="modal-actions">
              <button className="modal-delete" onClick={() => setConfirming(true)}>🗑 Delete</button>
              <button className="modal-edit" onClick={() => setEditing(true)}>✏️ Edit</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="modal-title">Edit Event</h2>
            <div className="edit-field">
              <label>Title</label>
              <input value={form.summary} onChange={e => set('summary', e.target.value)} />
            </div>
            {isAllDay ? (
              <>
                <div className="edit-field">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                </div>
                <div className="edit-field">
                  <label>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="edit-field">
                  <label>Start</label>
                  <input type="datetime-local" value={form.startDateTime} onChange={e => set('startDateTime', e.target.value)} />
                </div>
                <div className="edit-field">
                  <label>End</label>
                  <input type="datetime-local" value={form.endDateTime} onChange={e => set('endDateTime', e.target.value)} />
                </div>
              </>
            )}
            <div className="edit-field">
              <label>Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div className="edit-field">
              <label>Description</label>
              <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="edit-field">
              <label>Attendees <span className="edit-hint">(comma-separated emails)</span></label>
              <input value={form.attendees} onChange={e => set('attendees', e.target.value)} />
            </div>
            <div className="edit-actions">
              <button className="delete-confirm-btn" onClick={() => setConfirming(true)}>🗑 Delete</button>
              <div style={{ flex: 1 }} />
              <button className="edit-cancel" onClick={() => setEditing(false)}>Cancel</button>
              <button className="edit-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


export default function CalendarPanel() {
  const { data: session } = useSession();
  const today = new Date();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewed, setViewed] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [addDate, setAddDate] = useState<Date | null>(null); // null = closed, Date = open with pre-filled date

  useEffect(() => {
    if (!session) return;
    const start = new Date(viewed.getFullYear(), viewed.getMonth(), 1).toISOString();
    const end   = new Date(viewed.getFullYear(), viewed.getMonth() + 1, 0, 23, 59, 59).toISOString();
    fetch(`/api/calendar?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(data => setEvents(Array.isArray(data) ? data : []));
  }, [session, viewed]);

  useEffect(() => {
    if ((session as any)?.error === 'RefreshAccessTokenError') signIn('google');
  }, [session]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelected(null); setAddDate(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!session) return (
    <div className="calendar-login">
      <button onClick={() => signIn('google')}>Sign in with Google</button>
    </div>
  );

  const year  = viewed.getFullYear();
  const month = viewed.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  const cells: { day: number; type: 'prev' | 'current' | 'next' }[] = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, type: 'prev' });
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ day: i, type: 'current' });
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - daysInMonth - firstDay + 1, type: 'next' });

  const isToday = (day: number, type: string) =>
    type === 'current' && day === today.getDate() &&
    month === today.getMonth() && year === today.getFullYear();

  const handleEventUpdated = (updated: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelected(updated);
  };

  const handleEventCreated = (created: CalendarEvent) => {
    setEvents(prev => [...prev, created]);
  };

  const handleEventDeleted = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setSelected(null);
  };


  return (
    <>
      {selected && (
        <EventModal
          event={selected}
          onClose={() => setSelected(null)}
          onEdit={handleEventUpdated}
          onDelete={handleEventDeleted}
        />
      )}

      {addDate !== null && (
        <AddEventModal
          initialDate={addDate}
          onClose={() => setAddDate(null)}
          onCreated={handleEventCreated}
        />
      )}

      <div className="calendar">
        <div className="calendar-header">
          <button className="cal-nav" onClick={() => setViewed(new Date(year, month - 1, 1))}>‹</button>
          <span className="cal-title">{MONTHS[month]} {year}</span>
          <button className="cal-nav" onClick={() => setViewed(new Date(year, month + 1, 1))}>›</button>
        </div>

        <div className="calendar-grid">
          {DAYS.map(d => <div key={d} className="cal-day-label">{d}</div>)}

          {cells.map((cell, i) => {
            const cellEvents = events.filter(e => {
              const d = new Date(e.start?.dateTime ?? e.start?.date ?? '');
              return cell.type === 'current' &&
                d.getDate() === cell.day &&
                d.getMonth() === month &&
                d.getFullYear() === year;
            });

            const handleCellClick = () => {
              if (cell.type === 'prev') {
                setAddDate(new Date(year, month - 1, cell.day));
              } else if (cell.type === 'next') {
                setAddDate(new Date(year, month + 1, cell.day));
              } else {
                setAddDate(new Date(year, month, cell.day));
              }
            };

            return (
              <div
                key={i}
                className={`cal-cell cal-cell--clickable ${cell.type !== 'current' ? 'cal-cell--faded' : ''} ${isToday(cell.day, cell.type) ? 'cal-cell--today' : ''}`}
                onClick={handleCellClick}
              >
                <span className="cal-day-number">{cell.day}</span>
                {cellEvents.map((e, j) => {
                  const timeStr = e.start?.dateTime
                    ? new Date(e.start.dateTime).toLocaleTimeString('en-AU', {
                        hour: '2-digit', minute: '2-digit', hour12: true,
                      })
                    : 'All day';

                  return (
                    <div
                      key={j}
                      className="cal-event"
                      onClick={ev => { ev.stopPropagation(); setSelected(e); }} // ← stop propagation so cell click doesn't fire
                      role="button"
                      tabIndex={0}
                      onKeyDown={ev => ev.key === 'Enter' && setSelected(e)}
                    >
                      <span className="cal-event-time">{timeStr}</span>
                      <span className="cal-event-title">{e.summary}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating add button */}
      <button
        className="cal-fab"
        onClick={() => setAddDate(new Date())}
        aria-label="Add event"
      >
        +
      </button>

      <button
        onClick={() => signOut()}
        className="cal-logout"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LogoutIcon size={24}/>
      </button>
    </>
  );
}