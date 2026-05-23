'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

const BLOCKED_KEYS = new Set(['F5', 'r', 'R', 'w', 'W'])
const EXIT_TAPS = 5
const EXIT_TAP_WINDOW_MS = 2000

export function useKiosk() {
  const [fullscreen, setFullscreen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const tapTimestamps = useRef<number[]>([])

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  const exitFullscreen = useCallback(() => {
    document.exitFullscreen?.().catch(() => {})
  }, [])

  // Track fullscreen state
  useEffect(() => {
    const handler = () => {
      const isFs = !!document.fullscreenElement
      setFullscreen(isFs)
      if (!isFs) setShowToast(true)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Disable right-click
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  // Intercept destructive key combos
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === 'F5' ||
        (e.ctrlKey && BLOCKED_KEYS.has(e.key)) ||
        (e.altKey && e.key === 'F4')
      ) {
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Secret exit: tap clock N times within window
  const handleClockTap = useCallback(() => {
    const now = Date.now()
    tapTimestamps.current = [
      ...tapTimestamps.current.filter(t => now - t < EXIT_TAP_WINDOW_MS),
      now,
    ]
    if (tapTimestamps.current.length >= EXIT_TAPS) {
      tapTimestamps.current = []
      exitFullscreen()
    }
  }, [exitFullscreen])

  const dismissToast = useCallback(() => setShowToast(false), [])

  const reenterFromToast = useCallback(() => {
    enterFullscreen()
    setShowToast(false)
  }, [enterFullscreen])

  return {
    fullscreen,
    showToast,
    enterFullscreen,
    handleClockTap,
    dismissToast,
    reenterFromToast,
  }
}
