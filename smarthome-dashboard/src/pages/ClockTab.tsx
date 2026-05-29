'use client';

import { InputBar } from '@/components/form/inputBar';
import { ToggleSwitch } from '@/components/form/ToggleSwitch';
import { AddIcon, AlarmIcon, CloseIcon } from '@/lib/icons';
import { useEffect, useState, useRef, useCallback } from 'react';
import * as Tone from 'tone';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Alarm {
  id: string;
  hour: number;
  minute: number;
  label: string;
  enabled: boolean;
  days: number[];
}

interface TimerEntry {
  id: string;
  label: string;
  totalSeconds: number;
  remaining: number;
  running: boolean;
  done: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }

function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function fmtStopwatch(ms: number) {
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  const s  = Math.floor((ms % 60_000) / 1_000);
  const cs = Math.floor((ms % 1_000) / 10);
  return h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`
    : `${pad(m)}:${pad(s)}.${pad(cs)}`;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_FULL   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div className="settings-section-label" style={{ margin: 0, padding: 0, border: 'none', fontSize: 11 }}>
        {children}
      </div>
      {action}
    </div>
  );
}

// ── Beeping ───────────────────────────────────────────────────────────────────

async function playBeep() {
  await Tone.start();
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 },
  }).toDestination();
  synth.triggerAttackRelease('A5', '0.3');
}

async function startAlarmLoop(): Promise<() => void> {
  await Tone.start();
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
  }).toDestination();

  const loop = new Tone.Loop(time => {
    synth.triggerAttackRelease('A5', '0.2', time);
  }, '0.8'); // every 0.8 seconds

  Tone.getTransport().start();
  loop.start(0);

  return () => {
    loop.stop();
    loop.dispose();
    synth.dispose();
    Tone.getTransport().stop();
  };
}

function useBeeping() {
  const stopRef = useRef<(() => void) | null>(null);

  const start = useCallback(async () => {
    stopRef.current?.(); // stop any existing
    stopRef.current = await startAlarmLoop();
  }, []);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  useEffect(() => () => stop(), []);

  return { startBeeping: start, stopBeeping: stop };
}

function AlarmNotification({ hour, min, sec, label, onDismiss }: {
  hour: number;
  min: number;
  sec?: number
  label: string;
  onDismiss: () => void;
}) {
  return (
    <div className='alarm-background'>
      <div className='alarm-wrapper'>
        <div><AlarmIcon size={72} /></div>
        {sec ? (
          <div className='alarm-time'>{pad(hour)}:{pad(min)}:{pad(sec)}</div>
        ) : (
          <div className='alarm-time'>
            {pad(hour)}:{pad(min)}
          </div>
        )}
        {label && (
          <div className='alarm-label'>
            {label}
          </div>
        )}
        <button className="edit-save" style={{ fontSize: 16, padding: '12px 40px', marginTop: 8 }} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ── Alarms ────────────────────────────────────────────────────────────────────

function AlarmsSection({ timezone }: { timezone?: string }) {
  const [firingAlarm, setFiringAlarm] = useState<Alarm | null>(null);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    try { return JSON.parse(localStorage.getItem('kiosk-alarms') ?? '[]'); } catch { return []; }
  });
  const [adding,  setAdding]  = useState(false);
  const [draft,   setDraft]   = useState<Omit<Alarm, 'id'>>({ hour: 7, minute: 0, label: '', enabled: true, days: [] });
  const firingRef = useRef<Set<string>>(new Set());
  const { startBeeping, stopBeeping } = useBeeping();

  const dismissAlarm = () => {
    stopBeeping();
    setFiringAlarm(null);
  };


  useEffect(() => { localStorage.setItem('kiosk-alarms', JSON.stringify(alarms)); }, [alarms]);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const tz  = timezone ? { timeZone: timezone } : {};
      const h   = parseInt(now.toLocaleString('en-AU', { hour: 'numeric', hour12: false, ...tz }));
      const m   = parseInt(now.toLocaleString('en-AU', { minute: 'numeric', ...tz }));
      const s   = parseInt(now.toLocaleString('en-AU', { second: 'numeric', ...tz }));
      const d   = now.toLocaleDateString('en-AU', { weekday: 'short', ...tz });
      const day = DAY_FULL.findIndex(x => d.startsWith(x));

      alarms.forEach(alarm => {
        if (!alarm.enabled) return;
        if (alarm.hour !== h || alarm.minute !== m || s !== 0) return;
        if (alarm.days.length > 0 && !alarm.days.includes(day)) return;
        if (firingRef.current.has(alarm.id)) return;
        firingRef.current.add(alarm.id);
        setFiringAlarm(alarm);
        startBeeping();
        if ('Notification' in window && Notification.permission === 'granted')
          new Notification(`⏰ ${alarm.label || 'Alarm'}`, { body: `${pad(alarm.hour)}:${pad(alarm.minute)}` });
        setTimeout(() => firingRef.current.delete(alarm.id), 60_000);
        if (alarm.days.length === 0)
          setAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, enabled: false } : a));
      });
    };
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [alarms, timezone, startBeeping]);

  const save = () => {
    setAlarms(prev => [...prev, { ...draft, id: crypto.randomUUID() }]);
    setAdding(false);
    setDraft({ hour: 7, minute: 0, label: '', enabled: true, days: [] });
  };

  return (
    <div>
      <SectionHeader action={
        <button className="button" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setAdding(v => !v)}>
          <div style={{display: 'flex', alignItems: 'center'}}><AddIcon/> Add</div>
        </button>
      }>Alarms</SectionHeader>

      {adding && (
        <div className="clock-card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="input-wrapper-muti" style={{ padding: '6px 8px', width: 'auto' }}>
              <InputBar
                type="number"
                min={0}
                max={23}
                value={draft.hour}
                onChange={v => setDraft(p => ({ ...p, hour: Math.min(23, Math.max(0, +v)) }))}
                style={{ width: 50, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 16 }}
              />
              <span style={{ color: 'var(--text-muted)', padding: '0 2px' }}>:</span>
              <InputBar
                type="number"
                min={0}
                max={59}
                value={draft.minute}
                onChange={v => setDraft(p => ({ ...p, minute: Math.min(59, Math.max(0, +v)) }))}
                style={{ width: 50, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 16 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <InputBar placeholder="Label (optional)" value={draft.label}
                onChange={v => setDraft(p => ({ ...p, label: v }))} 
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
            {DAY_LABELS.map((d, i) => (
              <button key={i} onClick={() => setDraft(p => ({ ...p, days: p.days.includes(i) ? p.days.filter(x => x !== i) : [...p.days, i] }))}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  background: draft.days.includes(i) ? 'var(--accent)' : 'var(--border-subtle)',
                  color: draft.days.includes(i) ? '#fff' : 'var(--text-muted)',
                }}>{d}</button>
            ))}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
              {draft.days.length === 0 ? 'Once' : draft.days.map(d => DAY_FULL[d]).join(', ')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="edit-save" onClick={save}>Save</button>
            <button className="edit-cancel" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {alarms.length === 0 && !adding && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>No alarms set</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {alarms.map(alarm => (
          <div key={alarm.id} className="clock-card clock-card--row">
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: alarm.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {pad(alarm.hour)}:{pad(alarm.minute)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
                {alarm.label && <span style={{ marginRight: 8 }}>{alarm.label}</span>}
                {alarm.days.length === 0 ? 'Once' : alarm.days.map(d => DAY_FULL[d]).join(', ')}
              </div>
            </div>
            <ToggleSwitch 
              value={alarm.enabled}
              onChange={() => setAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, enabled: !a.enabled } : a))}
            />
            <button onClick={() => setAlarms(prev => prev.filter(a => a.id !== alarm.id))}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, padding: '0 4px' }}><CloseIcon /></button>
          </div>
        ))}
      </div>
      {firingAlarm && (
        <AlarmNotification
          hour={firingAlarm.hour}
          min={firingAlarm.minute}
          label={firingAlarm.label}
          onDismiss={dismissAlarm}
        />
      )}
    </div>
  );
}

// ── Timers ────────────────────────────────────────────────────────────────────

function TimersSection() {
  const [firingTimer, setFiringTimer] = useState<TimerEntry | null>(null);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [timers, setTimers] = useState<TimerEntry[]>([]);
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);
  const [s, setS] = useState(5);
  const [label, setLabel] = useState('');
  const { startBeeping, stopBeeping } = useBeeping();

  const dismissTimer = () => {
    stopBeeping();
    setFiringTimer(null);
  };

  useEffect(() => {
    const id = setInterval(() => {
      setTimers(prev => prev.map(t => {
        if (!t.running || t.done) return t;
        const next = t.remaining - 1;
        if (next <= 0) {
          setFiringTimer(t);
          startBeeping();
          return { ...t, remaining: 0, running: false, done: true };
        }
        return { ...t, remaining: next };
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [startBeeping]);

  const add = () => {
    const total = h * 3600 + m * 60 + s;
    if (total <= 0) return;
    setTimers(prev => [...prev, { id: crypto.randomUUID(), label, totalSeconds: total, remaining: total, running: false, done: false }]);
    setLabel('');
  };

  const patch = (id: string, p: Partial<TimerEntry>) =>
    setTimers(prev => prev.map(t => t.id === id ? { ...t, ...p } : t));

  return (
    <div>
      <SectionHeader>Timers</SectionHeader>

      {/* Add row */}
      <div className="clock-card" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {([['h', h, setH, 23], ['m', m, setM, 59], ['s', s, setS, 59]] as const).map(([lbl, val, setter, max]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 'auto' }}>
                <InputBar
                  type="number"
                  min={0}
                  max={max}
                  value={val}
                  onChange={v => setter(Math.min(max, Math.max(0, +v)))}
                  style={{ width: 40, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 15 }}
                />
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{lbl}</span>
            </div>
          ))}
          <div style={{ flex: 1 }}>
            <InputBar placeholder="Label" value={label}
              onChange={v => setLabel(v)}
            />
          </div>
          <button className="edit-save" onClick={add}>Add</button>
        </div>
      </div>

      {timers.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>No timers running</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {timers.map(t => {
          const pct = t.totalSeconds > 0 ? t.remaining / t.totalSeconds : 0;
          return (
            <div key={t.id} className="clock-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  {t.label && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>{t.label}</div>}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: t.done ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {t.done ? 'Done!' : fmtDuration(t.remaining)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!t.done && (
                    <button className={t.running ? 'edit-save' : 'button'} onClick={() => patch(t.id, { running: !t.running })}>
                      {t.running ? 'Pause' : 'Start'}
                    </button>
                  )}
                  <button className="edit-cancel" onClick={() => patch(t.id, { remaining: t.totalSeconds, running: false, done: false })}>Reset</button>
                  <button onClick={() => setTimers(prev => prev.filter(x => x.id !== t.id))}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15 }}><CloseIcon /></button>
                </div>
              </div>
              <div style={{ height: 2, background: 'var(--border-subtle)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${pct * 100}%`, background: t.done ? 'var(--accent)' : 'var(--accent)', borderRadius: 2, transition: 'width 1s linear', opacity: t.done ? 1 : 0.6 }} />
              </div>
            </div>
          );
        })}
      </div>

      {firingTimer && (
        <AlarmNotification
          hour={h}
          min={m}
          sec={s}
          label={firingTimer.label || 'Timer done!'}
          onDismiss={dismissTimer}
        />
      )}
    </div>
  );
}
// ── Stopwatch ─────────────────────────────────────────────────────────────────

function StopwatchSection() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps,    setLaps]    = useState<number[]>([]);
  const startRef = useRef(0);
  const baseRef  = useRef(0);
  const rafRef   = useRef(0);


  const tick = useCallback(() => {
    setElapsed(baseRef.current + (Date.now() - startRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = () => { startRef.current = Date.now(); setRunning(true); rafRef.current = requestAnimationFrame(tick); };
  const pause = () => { cancelAnimationFrame(rafRef.current); baseRef.current += Date.now() - startRef.current; setRunning(false); };
  const reset = () => { cancelAnimationFrame(rafRef.current); baseRef.current = 0; setElapsed(0); setRunning(false); setLaps([]); };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const lastLap   = laps.length > 0 ? laps[laps.length - 1] : 0;
  const lapSplit  = elapsed - lastLap;

  return (
    <div>
      <SectionHeader>Stopwatch</SectionHeader>

      <div className="clock-card" style={{ textAlign: 'center', padding: '20px 16px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1 }}>
          {fmtStopwatch(elapsed)}
        </div>
        {laps.length > 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Lap {laps.length + 1} — {fmtStopwatch(lapSplit)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button className="edit-cancel" onClick={reset}>Reset</button>
          <button className={running ? 'edit-save' : 'button'} onClick={running ? pause : start}>
            {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
          </button>
          <button className="button" onClick={() => setLaps(prev => [...prev, elapsed])} disabled={!running}>Lap</button>
        </div>
      </div>

      {laps.length > 0 && (
        <div className="clock-card" style={{ marginTop: 6, padding: 0, overflow: 'hidden' }}>
          {[...laps].reverse().map((lapMs, ri) => {
            const i     = laps.length - 1 - ri;
            const prev  = i > 0 ? laps[i - 1] : 0;
            const split = lapMs - prev;
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '7px 14px',
                borderBottom: ri < laps.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Lap {i + 1}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{fmtStopwatch(split)}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>{fmtStopwatch(lapMs)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface ClockPageProps {}

export default function ClockTab({}: ClockPageProps) {
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
  const [hour24,   setHour24]   = useState(false);
  const [time,     setTime]     = useState<Date | null>(null);

  useEffect(() => {
    const load = () => {
      fetch('/api/settings', { cache: 'no-store' })
        .then(r => r.json())
        .then(s => { setTimezone(s.timeZone || undefined); setHour24(s.hour24 ?? false); })
        .catch(() => {});
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

  const tz      = timezone ? { timeZone: timezone } : {};
  const timeStr = time?.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !hour24, ...tz }) ?? '';
  const dateStr = time?.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', ...tz }) ?? '';

  return (
    <div className="clock-page">
      {/* Big clock */}
      <div className="clock-hero">
        <div className="clock-hero-time">{timeStr}</div>
        <div className="clock-hero-date">{dateStr}</div>
      </div>

      {/* Divider */}
      <div className="divider" style={{ margin: '0 24px' }} />

      {/* Three-column grid: Alarms | Timers | Stopwatch */}
      <div className="clock-grid">
        <AlarmsSection timezone={timezone} />
        <TimersSection />
        <StopwatchSection />
      </div>
    </div>
  );
}