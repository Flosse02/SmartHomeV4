'use client';

import { ToggleSwitch } from '@/components/form/ToggleSwitch';
import { SmartDevice, useDevices } from '@/hooks/useDevices';
import { useSmartHome, SmartHomeDevice } from '@/hooks/useSmartHome';
import {
  VolumeMuteIcon, VolumeHighIcon, TvIcon, TabletIcon, SpeakerIcon,
  SpeakerGroupIcon, PowerIcon, PauseIcon, PlayIcon, StopIcon,
  VolumeVeryLowIcon, VolumeLowIcon, UnknownDeviceIcon, RefreshIcon, CameraIcon,
  HouseIcon, LightIcon, NightModeIcon
} from '@/lib/icons';
import { useMemo, useState } from 'react';

interface SmartHomeProps {
  selectedDevice: SmartDevice | null;
  onSelectDevice: (device: SmartDevice | null) => void;
  devices: ReturnType<typeof useDevices>;
}

function VolumeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range" min={0} max={1} step={0.01}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="home-volume-slider"
    />
  );
}

function DeviceCard({ device, smarthome }: { device: SmartHomeDevice; smarthome: ReturnType<typeof useSmartHome> }) {
  const isPlaying = device.state === 'playing';
  const isPaused  = device.state === 'paused';
  const isOff     = device.state === 'off' || device.state === 'unavailable';
  const volume    = device.attributes.volume_level ?? 0;
  const isMuted   = device.attributes.is_volume_muted ?? false;
  const mediaTitle    = device.attributes.media_title;
  const mediaArtist   = device.attributes.media_artist;
  const entityPicture = device.attributes.entity_picture
    ? `${process.env.NEXT_PUBLIC_HA_URL}${device.attributes.entity_picture}`
    : null;

  const typeIcon = device.type === 'tv'           ? <TvIcon />
    : device.type === 'speaker_group'             ? <SpeakerGroupIcon />
    : device.type === 'tablet'                    ? <TabletIcon />
    : device.type === 'speaker'                   ? <SpeakerIcon />
    : device.type === 'camera'                    ? <CameraIcon />
    : <UnknownDeviceIcon />;

  const VolumeIcon = useMemo(() => {
    if (isMuted || volume === 0) return <VolumeMuteIcon />;
    if (volume <= 0.1)           return <VolumeVeryLowIcon />;
    if (volume < 0.5)            return <VolumeLowIcon />;
    return <VolumeHighIcon />;
  }, [isMuted, volume]);

  return (
    <div className="home-device-card">
      {/* Header */}
      <div className="home-device-header">
        <span className="home-device-type-icon">{typeIcon}</span>
        <div className="home-device-info">
          <div className="home-device-name">{device.name}</div>
          <div className={`home-device-state ${isPlaying ? 'home-device-state--playing' : ''}`}>
            {isOff ? 'Off' : device.state}
          </div>
        </div>
        <button
          className={`home-power-btn ${isOff ? 'home-power-btn--off' : 'home-power-btn--on'}`}
          onClick={() => isOff ? smarthome.turnOn(device.id) : smarthome.turnOff(device.id)}
        >
          <PowerIcon /> {isOff ? 'off' : 'on'}
        </button>
      </div>

      {/* Now playing */}
      {(mediaTitle || mediaArtist) && (
        <div className="home-now-playing">
          {entityPicture && (
            <img src={entityPicture} className="home-now-playing-art" />
          )}
          <div className="home-now-playing-text">
            {mediaTitle  && <div className="home-now-playing-title">{mediaTitle}</div>}
            {mediaArtist && <div className="home-now-playing-artist">{mediaArtist}</div>}
          </div>
        </div>
      )}

      {/* Playback controls */}
      {!isOff && (
        <div className="home-playback-controls">
          <button
            className="home-ctrl-btn home-ctrl-btn--primary"
            onClick={() => isPlaying ? smarthome.pause(device.id) : smarthome.play(device.id)}
            style={{ opacity: isPaused || isPlaying ? 1 : 0.4 }}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className="home-ctrl-btn" onClick={() => smarthome.stop(device.id)}>
            <StopIcon />
          </button>
          <button
            className={`home-ctrl-btn ${isMuted ? 'home-ctrl-btn--muted' : ''}`}
            onClick={() => smarthome.mute(device.id, !isMuted)}
          >
            {VolumeIcon}
          </button>
          <div className="home-volume-row">
            <VolumeSlider value={isMuted ? 0 : volume} onChange={v => smarthome.setVolume(device.id, v)} />
          </div>
          <span className="home-volume-pct">{Math.round(volume * 100)}%</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: 'green' | 'blue' | 'default' }) {
  return (
    <div className="home-stat-card">
      <div className="home-stat-label">{label}</div>
      <div className={`home-stat-value ${accent ? `home-stat-value--${accent}` : ''}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="home-section">
      <div className="home-section-title">{title}</div>
      <div className="home-section-body">{children}</div>
    </div>
  );
}

export default function SmartHome({ selectedDevice, onSelectDevice, devices }: SmartHomeProps) {
  const smarthome = useSmartHome();

  const devicesOn = smarthome.devices.filter(d => d.state !== 'off' && d.state !== 'unavailable').length;
  const running = smarthome.devices.filter(d => d.state === 'playing').length;
  const activeDevices = smarthome.devices.filter(d => d.state !== 'off' && d.state !== 'unavailable');
  const allMuted = activeDevices.length > 0 && activeDevices.every(d => d.attributes.is_volume_muted);
  const allLightsOn = smarthome.lights.length > 0 && smarthome.lights.every(d => d.state === 'on');
  const anyLightOn  = smarthome.lights.some(d => d.state === 'on');

  if (!process.env.NEXT_PUBLIC_HA_TOKEN) {
    return (
      <div className="home-unconfigured">
        <div className="home-unconfigured-title">Home Assistant not configured</div>
        <div className="home-unconfigured-body">Add to <code>.env.local</code>:</div>
        <pre className="home-unconfigured-pre">
          NEXT_PUBLIC_HA_URL=http://homeassistant.local:8123{'\n'}
          NEXT_PUBLIC_HA_TOKEN=your_long_lived_token
        </pre>
      </div>
    );
  }

  const handleMuteAll = () => {
    const shouldMute = !allMuted;
    activeDevices.forEach(d => smarthome.mute(d.id, shouldMute));
  };

  const handleLightsToggle = () => smarthome.toggleAllLights(!anyLightOn);
 
  const [nightMode, setNightMode] = useState(false);
  const [awayMode, setAwayMode]   = useState(false);
 
  const handleNightMode = () => {
    const next = !nightMode;
    setNightMode(next);
    smarthome.toggleAllLights(!next);
  };
 
  const handleAway = () => {
    const next = !awayMode;
    setAwayMode(next);
    smarthome.toggleAllLights(!next);
  };

  return (
    <div className="home-page">

      {/* Header */}
      <div className="home-header">
        <h1>Home</h1>
        <div className="home-header-status">
          <span className={`home-status-dot ${smarthome.connected ? 'home-status-dot--on' : 'home-status-dot--off'}`} />
          <span className="home-status-label">
            {smarthome.connected ? 'Connected' : smarthome.error ? 'Error' : 'Connecting…'}
          </span>
          <button className="home-refresh-btn" onClick={smarthome.fetchDevices}>
            {smarthome.loading ? '…' : <RefreshIcon />}
          </button>
        </div>
      </div>

      {smarthome.error && (
        <div className="home-error">{smarthome.error}</div>
      )}

      {/* Stat cards */}
      <div className="home-stats-grid">
        <StatCard label="Devices on"   value={devicesOn}  accent="green" />
        <StatCard label="Running"  value={running} accent="blue" />
        <StatCard label="Last motion"  value="—" />
      </div>

      {/* Main grid */}
      <div className="home-main-grid">
 
        {/* Left: media devices */}
        <div className="home-card">
          <div className="home-section-title">Media devices</div>
 
          {smarthome.loading && (
            <div className="home-empty">Loading devices…</div>
          )}
 
          {!smarthome.loading && smarthome.devices.length === 0 && smarthome.connected && (
            <div className="home-empty">No media devices found in Home Assistant</div>
          )}
 
          {smarthome.speakers.map(d      => <DeviceCard key={d.id} device={d} smarthome={smarthome} />)}
          {smarthome.tvs.map(d           => <DeviceCard key={d.id} device={d} smarthome={smarthome} />)}
          {smarthome.tablets.map(d       => <DeviceCard key={d.id} device={d} smarthome={smarthome} />)}
          {smarthome.speakerGroups.map(d => <DeviceCard key={d.id} device={d} smarthome={smarthome} />)}
 
          <div className="home-section-divider" />
          <div className="home-section-title">Lights</div>
          {smarthome.lights.map(d => <DeviceCard key={d.id} device={d} smarthome={smarthome} />)}
          {smarthome.lights.length === 0 && (
            <div className="home-empty">No lights configured yet</div>
          )}
        </div>
 
        {/* Right: quick controls + cameras + speaker groups */}
        <div className="home-right-col">
 
          <div className="home-card">
            <div className="home-section-title">Quick controls</div>
            <div className="home-quick-grid">
              <ToggleSwitch icon={<LightIcon />}      label="Lights"   active={allLightsOn} onToggle={handleLightsToggle} />
              <ToggleSwitch icon={<NightModeIcon />}  label="Night"    active={nightMode}   onToggle={handleNightMode} />
              <ToggleSwitch icon={<HouseIcon />}      label="Away"     active={awayMode}    onToggle={handleAway} />
              <ToggleSwitch icon={<VolumeMuteIcon />} label="Mute all" active={allMuted}    onToggle={handleMuteAll} />
            </div>
          </div>
 
          <div className="home-card">
            <div className="home-section-title">Cameras</div>
            {smarthome.cameras.map(d => <DeviceCard key={d.id} device={d} smarthome={smarthome} />)}
            {smarthome.cameras.length === 0 && (
               <div className="home-empty">No cameras configured yet</div>
            )}
          </div>
 
        </div>
      </div>
    </div>
  );
}