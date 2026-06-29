'use client'

import { useState, useCallback, useEffect } from 'react'
import type { KioskSleepModeProps } from './types'
import { useIdleTimer } from './useIdleTimer'
import { useKiosk } from './useKiosk'
import SleepOverlay from './SleepOverlay'
import KioskToast from './KioskToast'
import { useSleep } from '@/context/SleepContext';

const DEFAULT_IDLE_MS = 10 * 60 * 1000

export default function KioskSleepMode({
  children,
  events = [],
  nowPlaying = null,
  onPause,
  onPrev,
  onNext,
  onWake,
}: KioskSleepModeProps) {
  const [sleeping, setSleeping] = useState(false)
  const [idleMs, setIdleMs]     = useState(DEFAULT_IDLE_MS)
  const { sleepDisabled } = useSleep();

  // Load idle timeout from settings
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => {
        const mins = parseInt(s.idleTimeout ?? '10');
        if (!s.idleTimeout) console.warn('idleTimeout not set in settings, defaulting to 10 minutes');
        setIdleMs((isNaN(mins) ? 10 : mins) * 60 * 1000);
      });
  }, [])

  const goToSleep = useCallback(() => {
    if (sleepDisabled) return;
    setSleeping(true);
  }, [sleepDisabled]);
  const resetIdle = useIdleTimer(
    useCallback(() => {
      if (sleepDisabled) return;
      setSleeping(true);
    }, [sleepDisabled]),
    idleMs
  );

  const wake = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSleeping(false)
      onWake?.()
      resetIdle()
    },
    [onWake, resetIdle],
  )

  const {
    fullscreen,
    showToast,
    enterFullscreen,
    handleClockTap,
    dismissToast,
    reenterFromToast,
  } = useKiosk()

  return (
    <div className="relative w-full h-full">
      {!fullscreen && !sleeping && (
        <button
          onClick={enterFullscreen}
          className="fixed bottom-4 right-4 z-[9998] text-xs text-white/70 bg-black/60 hover:bg-black/80 border border-white/15 rounded-lg px-3 py-2 cursor-pointer transition-colors"
        >
          Enter kiosk mode
        </button>
      )}

      {children}

      {showToast && (
        <KioskToast onReenter={reenterFromToast} onDismiss={dismissToast} />
      )}

      {sleeping && (
        <SleepOverlay
          events={events}
          nowPlaying={nowPlaying}
          onWake={wake}
          onClockTap={handleClockTap}
          onPause={onPause}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </div>
  )
}