'use client'

interface KioskToastProps {
  onReenter: () => void
  onDismiss: () => void
}

export default function KioskToast({ onReenter, onDismiss }: KioskToastProps) {
  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: '#1a1a1a',
        border: '0.5px solid rgba(255,255,255,0.12)',
      }}
      role="alert"
    >
      <p className="text-sm text-white/60">Exited fullscreen</p>
      <button
        onClick={onReenter}
        className="text-xs text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg px-3 py-1.5 cursor-pointer transition-colors"
      >
        Return to kiosk
      </button>
      <button
        onClick={onDismiss}
        className="text-xs text-white/40 hover:text-white/60 bg-transparent border-0 cursor-pointer transition-colors"
      >
        Dismiss
      </button>
    </div>
  )
}
