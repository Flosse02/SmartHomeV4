'use client';

import { SmartDevice, useDevices } from '@/hooks/useDevices';
import { useSmartHome, SmartHomeDevice } from '@/hooks/useSmartHome';

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
      style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
    />
  );
}

function DeviceCard({ device, smarthome }: { device: SmartHomeDevice; smarthome: ReturnType<typeof useSmartHome> }) {
  const isPlaying = device.state === 'playing';
  const isPaused  = device.state === 'paused';
  const isOff     = device.state === 'off' || device.state === 'unavailable';
  const volume    = device.attributes.volume_level ?? 0;
  const isMuted   = device.attributes.is_volume_muted ?? false;
  const mediaTitle   = device.attributes.media_title;
  const mediaArtist  = device.attributes.media_artist;
  const entityPicture = device.attributes.entity_picture
    ? `${process.env.NEXT_PUBLIC_HA_URL}${device.attributes.entity_picture}`
    : null;

  const typeIcon = device.type === 'tv' ? '📺'
    : device.type === 'speaker_group' ? '🔊'
    : '🔈';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{typeIcon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {device.name}
          </div>
          <div style={{ fontSize: 10, color: isPlaying ? 'var(--accent)' : 'var(--text-muted)', marginTop: 1 }}>
            {isOff ? 'Off' : device.state}
          </div>
        </div>

        {/* Power toggle */}
        <button
          onClick={() => isOff ? smarthome.turnOn(device.id) : smarthome.turnOff(device.id)}
          style={{
            background: isOff ? 'rgba(255,255,255,0.06)' : 'rgba(var(--accent-rgb,99,102,241),0.2)',
            border: 'none', borderRadius: 6, padding: '4px 8px',
            color: isOff ? 'var(--text-muted)' : 'var(--accent)',
            cursor: 'pointer', fontSize: 11,
          }}
        >
          {isOff ? '⏻ Off' : '⏻ On'}
        </button>
      </div>

      {/* Now playing */}
      {(mediaTitle || mediaArtist) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {entityPicture && (
            <img src={entityPicture} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            {mediaTitle && (
              <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {mediaTitle}
              </div>
            )}
            {mediaArtist && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {mediaArtist}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Playback controls */}
      {!isOff && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => isPlaying ? smarthome.pause(device.id) : smarthome.play(device.id)}
            style={{
              background: 'var(--accent)', border: 'none', borderRadius: 6,
              color: '#fff', cursor: 'pointer', fontSize: 13,
              padding: '4px 10px', opacity: isPaused || isPlaying ? 1 : 0.4,
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={() => smarthome.stop(device.id)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6,
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, padding: '4px 8px',
            }}
          >
            ⏹
          </button>

          <button
            onClick={() => smarthome.mute(device.id, !isMuted)}
            style={{
              background: isMuted ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
              border: 'none', borderRadius: 6,
              color: isMuted ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 13, padding: '4px 8px',
            }}
          >
            {isMuted ? '🔇' : '🔉'}
          </button>

          {/* Volume */}
          <div style={{ flex: 1 }}>
            <VolumeSlider
              value={isMuted ? 0 : volume}
              onChange={v => smarthome.setVolume(device.id, v)}
            />
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600,
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

export default function SmartHome({ selectedDevice, onSelectDevice, devices }: SmartHomeProps) {
  const smarthome = useSmartHome();

  if (!process.env.NEXT_PUBLIC_HA_TOKEN) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
        <div style={{ marginBottom: 8, color: 'var(--text-primary)', fontWeight: 500 }}>Home Assistant not configured</div>
        <div>Add to <code>.env.local</code>:</div>
        <pre style={{ marginTop: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
          NEXT_PUBLIC_HA_URL=http://homeassistant.local:8123{'\n'}
          NEXT_PUBLIC_HA_TOKEN=your_long_lived_token
        </pre>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          Smart Home
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: smarthome.connected ? '#4ade80' : '#f87171',
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {smarthome.connected ? 'Connected' : smarthome.error ? 'Error' : 'Connecting…'}
          </span>
          <button onClick={smarthome.fetchDevices} style={{
            fontSize: 11, background: 'rgba(255,255,255,0.06)', border: 'none',
            borderRadius: 6, padding: '3px 8px', color: 'var(--text-secondary)', cursor: 'pointer',
          }}>
            {smarthome.loading ? '…' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {smarthome.error && (
        <div style={{
          fontSize: 12, color: 'var(--color-text-danger)',
          background: 'rgba(248,113,113,0.1)', borderRadius: 6,
          padding: '8px 12px', marginBottom: 16,
        }}>
          {smarthome.error}
        </div>
      )}

      {smarthome.loading && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
          Loading devices…
        </div>
      )}

      {!smarthome.loading && smarthome.devices.length === 0 && smarthome.connected && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
          No media devices found in Home Assistant
        </div>
      )}

      {smarthome.speakerGroups.length > 0 && (
        <Section title="Speaker Groups">
          {smarthome.speakerGroups.map(d => <DeviceCard key={d.id} device={d} smarthome={smarthome} />)}
        </Section>
      )}

      {smarthome.speakers.length > 0 && (
        <Section title="Speakers">
          {smarthome.speakers.map(d => <DeviceCard key={d.id} device={d} smarthome={smarthome} />)}
        </Section>
      )}

      con
      {smarthome.tvs.length > 0 && (
        <Section title="TVs & Displays">
          {smarthome.tvs.map(d => <DeviceCard key={d.id} device={d} smarthome={smarthome} />)}
        </Section>
      )}
    </div>
  );
}