'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CalendarEvent, NowPlaying } from './types'
import { groupUpcomingEvents, formatEventTime } from './calendarUtils'
import { FastForwardIcon, FastRewindIcon, MusicIcon, PauseIcon } from '@/lib/icons'

// ─── Clock ────────────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

interface ClockProps {
  onTap: () => void
}

function Clock({ onTap }: ClockProps) {
  const now = useClock()
  const time = now.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const date = now.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <button
      onClick={onTap}
      className="sleep-clock"
      aria-label="Clock — tap 5 times quickly to exit kiosk"
    >
      <p className="sleep-time">
        {time}
      </p>
      <p className="sleep-date">{date}</p>
    </button>
  )
}

// ─── Calendar strip ───────────────────────────────────────────────────────────

interface CalendarStripProps {
  events: CalendarEvent[]
}

function CalendarStrip({ events }: CalendarStripProps) {
  const groups = groupUpcomingEvents(events)
  const entries = Object.entries(groups)

  return (
    <div className="sleep-calendar">
      <p className="sleep-calendar-heading">Upcoming Events</p>
      <div className="sleep-calendar-events">
        {entries.length === 0 ? (
          <p className="sleep-calendar-empty">Nothing in the next 2 weeks</p>
        ) : (
          entries.map(([day, evs]) => (
            <div key={day}>
              <p className="sleep-calendar-day">{day}</p>
              {evs.map(ev => (
                <div
                  key={ev.id}
                  className="sleep-calendar-event"
                  style={{ borderLeftColor: ev.color }}
                >
                  <div className="sleep-calendar-event-info">
                    <p className="sleep-calendar-event-title">{ev.title}</p>
                    <p className="sleep-calendar-event-time">{formatEventTime(ev)}</p>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Music bar ────────────────────────────────────────────────────────────────

interface MusicBarProps {
  nowPlaying: NowPlaying
  onPause?: () => void
  onPrev?: () => void
  onNext?: () => void
}

function MusicBar({ nowPlaying, onPause, onPrev, onNext }: MusicBarProps) {
  const stop = (fn?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation() // don't wake screen
    fn?.()
  }

  
  const subtitle = [nowPlaying.artist, nowPlaying.source].filter(Boolean).join(' · ')

  return (
    <div className="music-bar-wrapper">
      <div className="music-bar">
        <MusicIcon />

        <div className="music-info">
          <p className="music-title">{nowPlaying.title}</p>
          <p className="music-subtitle">{subtitle}</p>
        </div>

        <div className="music-controls">
          <button
            onClick={stop(onPrev)}
            className="music-btn"
            aria-label="Previous"
          >
            <FastRewindIcon />
          </button>

          <button
            onClick={stop(onPause)}
            className="music-btn"
            aria-label="Pause"
          >
            <PauseIcon />
          </button>

          <button
            onClick={stop(onNext)}
            className="music-btn"
            aria-label="Next"
          >
            <FastForwardIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sleep overlay ────────────────────────────────────────────────────────────

interface SleepOverlayProps {
  events: CalendarEvent[]
  nowPlaying: NowPlaying | null
  onWake: (e: React.MouseEvent | React.TouchEvent) => void
  onClockTap: () => void
  onPause?: () => void
  onPrev?: () => void
  onNext?: () => void
}

export default function SleepOverlay({
  events,
  nowPlaying,
  onWake,
  onClockTap,
  onPause,
  onPrev,
  onNext,
}: SleepOverlayProps) {
  return (
    <div
      className="sleep-overlay"
      onClick={onWake}
      onTouchEnd={onWake}
      role="button"
      tabIndex={0}
      aria-label="Tap to wake"
    >
      <Clock onTap={onClockTap} />

      <div className="divider" />

      <CalendarStrip events={events} />

      <p className="tap-to-wake">
        tap anywhere to wake
      </p>

      {nowPlaying && (
        <MusicBar
          nowPlaying={nowPlaying}
          onPause={onPause}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </div>
  )
}
