'use client'

import { useState, useCallback } from 'react'
import type { KioskSleepModeProps } from './types'
import { useIdleTimer } from './useIdleTimer'
import { useKiosk } from './useKiosk'
import SleepOverlay from './SleepOverlay'
import KioskToast from './KioskToast'

// const IDLE_MS = 10 * 60 * 1000 // 10 minutes
const IDLE_MS = 10 * 60 // 10 minutes

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

  const goToSleep = useCallback(() => setSleeping(true), [])

  const resetIdle = useIdleTimer(goToSleep, IDLE_MS)

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

  console.log('Now playing:', nowPlaying)

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
