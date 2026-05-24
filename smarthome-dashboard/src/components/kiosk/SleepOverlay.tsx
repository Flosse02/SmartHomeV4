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
      className="w-full text-center pt-7 pb-3 bg-transparent border-0 cursor-default focus:outline-none"
      aria-label="Clock — tap 5 times quickly to exit kiosk"
    >
      <p className="text-7xl font-light text-white tracking-tight leading-none tabular-nums">
        {time}
      </p>
      <p className="mt-2 text-sm text-white/40">{date}</p>
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
    <div className="flex-1 px-4 pb-2 overflow-hidden flex flex-col min-h-0">
      <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">
        Upcoming
      </p>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {entries.length === 0 ? (
          <p className="text-sm text-white/30 py-3">Nothing in the next 2 weeks</p>
        ) : (
          entries.map(([day, evs]) => (
            <div key={day}>
              <p className="text-[10px] text-white/20 pt-3 pb-1 tracking-wide">{day}</p>
              {evs.map(ev => (
                <div key={ev.id} className="flex items-start gap-2.5 px-1 py-1.5 rounded-md">
                  <span
                    className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: ev.color }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white/85 truncate">{ev.title}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">{formatEventTime(ev)}</p>
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
    <div className="px-4 pb-6 pt-2 border-t border-white/8">
      <div className="flex items-center gap-3 bg-white/7 rounded-xl px-3 py-2.5">
        <MusicIcon />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-white/85 truncate">{nowPlaying.title}</p>
          <p className="text-[11px] text-white/35">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={stop(onPrev)}
            className="text-white/40 hover:text-white/80 transition-colors bg-transparent border-0 cursor-pointer p-0 text-base leading-none"
            aria-label="Previous"
          >
            <FastRewindIcon/>
          </button>
          <button
            onClick={stop(onPause)}
            className="text-white/40 hover:text-white/80 transition-colors bg-transparent border-0 cursor-pointer p-0 text-base leading-none"
            aria-label="Pause"
          >
            <PauseIcon/>
          </button>
          <button
            onClick={stop(onNext)}
            className="text-white/40 hover:text-white/80 transition-colors bg-transparent border-0 cursor-pointer p-0 text-base leading-none"
            aria-label="Next"
          >
            <FastForwardIcon/>
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
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: 'rgba(0, 0, 0, 0.99)' }}
      onClick={onWake}
      onTouchEnd={onWake}
      role="button"
      tabIndex={0}
      aria-label="Tap to wake"
    >
      <Clock onTap={onClockTap} />

      <div className="mx-5 h-px bg-white/10" />

      <CalendarStrip events={events} />

      <p className="text-center text-[9px] text-white/15 tracking-widest pb-1">
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
