'use client';

import useSWR from 'swr';
import { AccessTimeIcon, ComputerIcon, CPUIcon, JellyfinIcon, MemoryIcon, PauseIcon, PlayIcon, RaspberryPiIcon, SpeedIcon, StorageIcon, ThermometerIcon } from '@/lib/icons';
import { StatCard } from '@/components/cards/StatCard';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Monitor() {
  const { data: sys, error: sysError } = useSWR('/api/system', fetcher, { refreshInterval: 3000 });
  const { data: piStats, error: piError } = useSWR('/api/jellyfin-pi', fetcher, { refreshInterval: 3000 });
  
  const uptimeStr = sys ? [
    sys.uptime?.days  > 0 ? `${sys.uptime.days}d`  : '',
    sys.uptime?.hours > 0 ? `${sys.uptime.hours}h` : '',
    `${sys.uptime?.minutes || 0}m`,
  ].filter(Boolean).join(' ') : '—';

  const piUptimeStr = piStats ? [
    piStats.uptime?.days  > 0 ? `${piStats.uptime.days}d`  : '',
    piStats.uptime?.hours > 0 ? `${piStats.uptime.hours}h` : '',
    `${piStats.uptime?.minutes || 0}m`,
  ].filter(Boolean).join(' ') : '—';

  return (
    <div className="monitor-tab">

      {/* ── Local Machine (Main PC) ── */}
      <div className="monitor-section-label">
        <ComputerIcon size={14} />
        {sys?.hostname ?? 'System'} · {sys?.platform} {sys?.arch}
      </div>

      <div className="monitor-grid">
        <StatCard
          icon={<CPUIcon size={20} />}
          label="CPU"
          value={`${sys?.cpu?.usage ?? '—'}%`}
          sub={`${sys?.cpu?.cores || '?'} cores · ${sys?.cpu?.model?.split(' ').slice(-2).join(' ') || 'Unknown'}`}
          pct={sys?.cpu?.usage}
        />
        {sys?.cpu?.temp != null && sys.cpu.temp > 0 && (
          <StatCard
            icon={<ThermometerIcon size={20} />}
            label="CPU Temp"
            value={`${sys.cpu.temp}°C`}
            sub={sys.cpu.temp > 80 ? 'Hot' : sys.cpu.temp > 60 ? 'Warm' : 'Normal'}
            pct={Math.min(100, sys.cpu.temp)}
          />
        )}
        <StatCard
          icon={<MemoryIcon size={20} />}
          label="Memory"
          value={`${sys?.mem?.used ?? '—'} / ${sys?.mem?.total ?? '—'} GB`}
          sub={`${sys?.mem?.free ?? '—'} GB free`}
          pct={sys?.mem?.pct}
        />
        {sys?.disk && (
          <StatCard
            icon={<StorageIcon size={20} />}
            label="Disk"
            value={`${sys.disk.used} / ${sys.disk.total} GB`}
            sub={`${sys.disk.free} GB free`}
            pct={sys.disk.pct}
          />
        )}
        <StatCard
          icon={<AccessTimeIcon size={20} />}
          label="Uptime"
          value={uptimeStr}
          sub={`Load: ${sys?.loadAvg?.join(' / ') ?? '—'}`}
        />
        <StatCard
          icon={<SpeedIcon size={20} />}
          label="Load avg"
          value={String(sys?.loadAvg?.[0] ?? '—')}
          sub="1 / 5 / 15 min"
          pct={sys ? Math.min(100, Math.round((sys.loadAvg[0] / sys.cpu.cores) * 100)) : undefined}
        />
      </div>

      {/* ── Raspberry Pi ── */}
      {piStats && !piError && (
        <>
          <div className="monitor-section-label" style={{ marginTop: 24 }}>
            <RaspberryPiIcon size={14} />
            {piStats.hostname} · {piStats.platform} {piStats.arch}
          </div>

          <div className="monitor-grid">
            <StatCard
              icon={<CPUIcon size={20} />}
              label="Pi CPU"
              value={`${Math.round(piStats.cpu?.usage || 0)}%`}
              sub={`${piStats.cpu?.cores || 4} cores · ${piStats.cpu?.model || 'Raspberry Pi'}`}
              pct={Math.round(piStats.cpu?.usage || 0)}
            />
            {piStats.cpu?.temp != null && piStats.cpu.temp > 0 && (
              <StatCard
                icon={<ThermometerIcon size={20} />}
                label="Pi CPU Temp"
                value={`${piStats.cpu.temp}°C`}
                sub={piStats.cpu.temp > 80 ? 'Hot' : piStats.cpu.temp > 60 ? 'Warm' : 'Normal'}
                pct={Math.min(100, piStats.cpu.temp)}
              />
            )}
            <StatCard
              icon={<MemoryIcon size={20} />}
              label="Pi Memory"
              value={`${piStats.mem?.used || 0} / ${piStats.mem?.total || 0} GB`}
              sub={`${piStats.mem?.free || 0} GB free`}
              pct={piStats.mem?.pct || 0}
            />
            {piStats.disk && piStats.disk.total > 0 && (
              <StatCard
                icon={<StorageIcon size={20} />}
                label="Pi Disk"
                value={`${piStats.disk.used} / ${piStats.disk.total} GB`}
                sub={`${piStats.disk.free} GB free`}
                pct={piStats.disk.pct}
              />
            )}
            <StatCard
              icon={<AccessTimeIcon size={20} />}
              label="Pi Uptime"
              value={piUptimeStr}
              sub={`Load: ${piStats.cpu?.loadAvg?.join(' / ') || '—'}`}
            />
            <StatCard
              icon={<SpeedIcon size={20} />}
              label="Pi Load avg"
              value={String(piStats.cpu?.loadAvg?.[0]?.toFixed(2) || '—')}
              sub="1 / 5 / 15 min"
              pct={piStats.cpu?.loadAvg ? Math.min(100, Math.round((piStats.cpu.loadAvg[0] / piStats.cpu.cores) * 100)) : undefined}
            />
          </div>
        </>
      )}

      {piError && (
        <div className="monitor-empty" style={{ marginTop: 24 }}>
          ⚠️ Raspberry Pi unavailable — {piError.message || 'Connection failed'}
        </div>
      )}
    </div>
  );
}