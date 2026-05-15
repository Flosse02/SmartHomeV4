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