export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  color: string // hex, pulled from Google Calendar colorId
}

export interface NowPlaying {
  title: string
  artist: string
  playing: boolean;
  position: number;
  duration: number;
  album?: string
  source?: string // e.g. "Jellyfin"
}

export interface KioskSleepModeProps {
  children: React.ReactNode
  events?: CalendarEvent[]
  nowPlaying?: NowPlaying | null
  onPause?: () => void
  onPrev?: () => void
  onNext?: () => void
  onWake?: () => void
}
