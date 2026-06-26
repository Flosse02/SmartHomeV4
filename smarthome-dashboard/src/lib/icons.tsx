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
  MdCloud,
  MdLogout,
  MdClose,
  MdAdd,
  MdCamera,
  MdRemove,
  MdLibraryMusic,
  MdSave,
  MdFolder,
  MdArrowUpward,
  MdArrowForward,
  MdArrowBack,
  MdChevronLeft,
  MdChevronRight,
  MdAlarm,
  MdThermostat,
  MdWaterDrop,
  MdAir,
  MdMemory,
  MdStorage,
  MdSpeed,
  MdAccessTime,
  MdComputer,
  MdLightbulb,
  MdBedtime,
  MdCameraAlt,
  MdSearch,
  MdMusicNote,
} from 'react-icons/md';

import { TbCpu, TbHome, TbLeaf } from 'react-icons/tb';
import { FcGoogle } from 'react-icons/fc';
import {
  WiDaySunny, 
  WiDayCloudy, 
  WiFog, 
  WiSprinkle,
  WiRain, 
  WiSnow, 
  WiSnowWind, 
  WiSleet,
  WiShowers, 
  WiStormShowers, 
  WiThunderstorm, 
  WiHail,
  WiDaySunnyOvercast,
  WiSunrise,
  WiSunset,
  WiWindDeg,
  WiBarometer,
} from 'react-icons/wi';
import { SiJellyfin, SiRaspberrypi } from 'react-icons/si';

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

export function CameraIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdCameraAlt size={size} color={color} />;
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

export function LogoutIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdLogout size={size} color={color} />;
}

export function CloseIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdClose size={size} color={color} />;
}

export function AddIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdAdd size={size} color={color} />;
}

export function MinusIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdRemove size={size} color={color} />;
}

export function MusicIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdLibraryMusic size={size} color={color} />;
}

export function SaveIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdSave size={size} color={color} />;
}

export function GoogleIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <FcGoogle size={size} color={color} />;
}

export function FolderIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdFolder size={size} color={color} />;
}

export function UpArrowIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdArrowUpward size={size} color={color} />;
}

export function RightArrowIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdArrowForward size={size} color={color} />;
}

export function LeftArrowIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdArrowBack size={size} color={color} />;
}

export function LeftCalendarArrowIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdChevronLeft size={size} color={color} />;
}

export function RightCalendarArrowIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdChevronRight size={size} color={color} />;
}

export function AlarmIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdAlarm size={size} color={color} />;
}

export function ThermometerIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdThermostat size={size} color={color} />;
}

export function RaindropIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdWaterDrop size={size} color={color} />;
}

export function WindIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdAir size={size} color={color} />;
}

export function SunriseIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <WiSunrise size={size} color={color} />;
}

export function SunsetIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <WiSunset size={size} color={color} />;
}

export function WindDirectionIcon({ size = 14, color = 'currentColor', degrees = 0 }: { size?: number; color?: string; degrees?: number }) {
  return <WiWindDeg size={size} color={color} style={{ transform: `rotate(${degrees}deg)` }} />;
}

export function UVIndexIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <WiBarometer size={size} color={color} />;
}

export function AQIIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <TbLeaf size={size} color={color} />;
}

export function MemoryIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdMemory size={size} color={color} />;
}

export function StorageIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdStorage size={size} color={color} />;
}

export function SearchIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdSearch size={size} color={color} />;
}

export function AccessTimeIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdAccessTime size={size} color={color} />;
}

export function SpeedIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdSpeed size={size} color={color} />;
}

export function ComputerIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdComputer size={size} color={color} />;
}

export function JellyfinIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <SiJellyfin size={size} color={color} />;
}

export function RaspberryPiIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <SiRaspberrypi size={size} color={color} />;
}

export function CPUIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <TbCpu size={size} color={color} />;
}

export function HouseIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <TbHome size={size} color={color} />;
}

export function LightIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdLightbulb size={size} color={color} />;
}

export function NightModeIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdBedtime size={size} color={color} />;
}

export function MusicNoteIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <MdMusicNote size={size} color={color} />;
}

export function WeatherIcon({ code, size = 18, color = 'currentColor' }: { code: number; size?: number; color?: string }) {
  if (code === 0)  return { icon: <WiDaySunny size={size} color={color} />,        label: 'Clear sky' };
  if (code === 1)  return { icon: <WiDaySunny size={size} color={color} />,        label: 'Mainly clear' };
  if (code === 2)  return { icon: <WiDayCloudy size={size} color={color} />,       label: 'Partly cloudy' };
  if (code === 3)  return { icon: <WiDaySunnyOvercast size={size} color={color} />,label: 'Overcast' };
  if (code === 45) return { icon: <WiFog size={size} color={color} />,             label: 'Fog' };
  if (code === 48) return { icon: <WiFog size={size} color={color} />,             label: 'Rime fog' };
  if (code === 51) return { icon: <WiSprinkle size={size} color={color} />,        label: 'Light drizzle' };
  if (code === 53) return { icon: <WiSprinkle size={size} color={color} />,        label: 'Moderate drizzle' };
  if (code === 55) return { icon: <WiSprinkle size={size} color={color} />,        label: 'Dense drizzle' };
  if (code === 56) return { icon: <WiSleet size={size} color={color} />,           label: 'Light freezing drizzle' };
  if (code === 57) return { icon: <WiSleet size={size} color={color} />,           label: 'Dense freezing drizzle' };
  if (code === 61) return { icon: <WiRain size={size} color={color} />,            label: 'Slight rain' };
  if (code === 63) return { icon: <WiRain size={size} color={color} />,            label: 'Moderate rain' };
  if (code === 65) return { icon: <WiRain size={size} color={color} />,            label: 'Heavy rain' };
  if (code === 66) return { icon: <WiRain size={size} color={color} />,            label: 'Light freezing rain' };
  if (code === 67) return { icon: <WiRain size={size} color={color} />,            label: 'Heavy freezing rain' };
  if (code === 71) return { icon: <WiSnow size={size} color={color} />,            label: 'Slight snowfall' };
  if (code === 73) return { icon: <WiSnow size={size} color={color} />,            label: 'Moderate snowfall' };
  if (code === 75) return { icon: <WiSnow size={size} color={color} />,            label: 'Heavy snowfall' };
  if (code === 77) return { icon: <WiSnowWind size={size} color={color} />,        label: 'Snow grains' };
  if (code === 80) return { icon: <WiShowers size={size} color={color} />,         label: 'Slight rain showers' };
  if (code === 81) return { icon: <WiShowers size={size} color={color} />,         label: 'Moderate rain showers' };
  if (code === 82) return { icon: <WiStormShowers size={size} color={color} />,    label: 'Violent rain showers' };
  if (code === 85) return { icon: <WiSnowWind size={size} color={color} />,        label: 'Slight snow showers' };
  if (code === 86) return { icon: <WiSnowWind size={size} color={color} />,        label: 'Heavy snow showers' };
  if (code === 95) return { icon: <WiThunderstorm size={size} color={color} />,    label: 'Thunderstorm' };
  if (code === 96) return { icon: <WiHail size={size} color={color} />,            label: 'Thunderstorm with slight hail' };
  if (code === 99) return { icon: <WiHail size={size} color={color} />,            label: 'Thunderstorm with heavy hail' };
  return { icon: <MdCloud size={size} color={color} />, label: 'Cloudy' };
}

export function windDirLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function aqiLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 50)  return { label: 'Good',             color: '#27ae60' };
  if (aqi <= 100) return { label: 'Moderate',         color: '#f39c12' };
  if (aqi <= 150) return { label: 'Unhealthy (sen)',  color: '#e67e22' };
  if (aqi <= 200) return { label: 'Unhealthy',        color: '#e02424' };
  if (aqi <= 300) return { label: 'Very unhealthy',   color: '#8e44ad' };
  return           { label: 'Hazardous',              color: '#7f1d1d' };
}