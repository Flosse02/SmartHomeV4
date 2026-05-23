'use client'

import { useEffect, useRef, useCallback } from 'react'

const IDLE_EVENTS: string[] = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll']

export function useIdleTimer(onIdle: () => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(onIdle, ms)
  }, [onIdle, ms])

  useEffect(() => {
    const handler = () => reset()
    IDLE_EVENTS.forEach(e => document.addEventListener(e, handler, { passive: true }))
    reset()
    return () => {
      IDLE_EVENTS.forEach(e => document.removeEventListener(e, handler))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [reset])

  return reset
}
