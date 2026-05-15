// src/lib/icons.tsx
import { 
  MdTv, 
  MdSpeaker, 
  MdSpeakerGroup,
  MdCast, 
  MdPause, 
  MdPlayArrow,
  MdFastForward,
  MdFastRewind, 
  MdShuffle,
  MdStop,
  MdRefresh,
  MdOutlineVolumeUp,
  MdOutlineVolumeDown,
  MdOutlineVolumeOff,
  MdOutlineVolumeMute,
  MdOutlineTv,
  MdTablet,
  MdOutlinePowerSettingsNew, 
  MdDeviceUnknown,
  MdSunny,
  MdCloud,
  MdFoggy,
  MdGrain,
  MdThunderstorm,
  MdAcUnit,
  MdNightsStay,
} from 'react-icons/md';




export function CastIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdCast size={size} color={color} />;
}

export function VolumeLowIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdOutlineVolumeDown size={size} color={color} />;
}

export function VolumeHighIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdOutlineVolumeUp size={size} color={color} />;
}

export function VolumeMuteIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdOutlineVolumeOff size={size} color={color} />;
}

export function VolumeVeryLowIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdOutlineVolumeMute size={size} color={color} />;
}

export function TVIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdTv size={size} color={color} />;
}

export function PlayIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdPlayArrow size={size} color={color} />;
}

export function PauseIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdPause size={size} color={color} />;
}

export function FastForwardIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdFastForward size={size} color={color} />;
}

export function FastRewindIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdFastRewind size={size} color={color} />;
}

export function ShuffleIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdShuffle size={size} color={color} />;
}

export function StopIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdStop size={size} color={color} />;
}

export function RefreshIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdRefresh size={size} color={color} />;
}

export function TvIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdOutlineTv size={size} color={color} />;
}

export function TabletIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdTablet size={size} color={color} />;
}

export function SpeakerIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdSpeaker size={size} color={color} />;
}

export function SpeakerGroupIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdSpeakerGroup size={size} color={color} />;
}

export function PowerIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdOutlinePowerSettingsNew size={size} color={color} />;
}

export function UnknownDeviceIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdDeviceUnknown size={size} color={color} />;
}

export function WeatherIcon({code, size = 18,color = 'currentColor'}: {code: number; size?: number; color?: string;}) {
  if (code === 0) return <MdSunny size={size} color={color} />;

  if (code >= 1 && code <= 3) return <MdCloud size={size} color={color} />;

  if (code === 45 || code === 48)
    return <MdFoggy size={size} color={color} />;

  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return <MdGrain size={size} color={color} />;

  if (code >= 71 && code <= 77)
    return <MdAcUnit size={size} color={color} />;

  if (code >= 95)
    return <MdThunderstorm size={size} color={color} />;

  return <MdCloud size={size} color={color} />;
}