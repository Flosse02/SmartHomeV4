'use client';

import useSWR from 'swr';
import {
  MdComputer, MdMemory, MdStorage, MdThermostat,
  MdAccessTime, MdSpeed, MdPlayArrow, MdPause,
} from 'react-icons/md';
import { TbCpu } from 'react-icons/tb';
import { SiJellyfin } from 'react-icons/si';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function GaugeBar({ pct, color }: { pct: number; color?: string }) {
  const c = color ?? (pct > 85 ? '#e02424' : pct > 60 ? '#f39c12' : '#5b8dee');
  return (
    <div style={{ width: '100%', height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 2, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function StatCard({ icon, label, value, sub, pct }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; pct?: number;
}) {
  return (
    <div className="monitor-card">
      <div className="monitor-card-header">
        <span className="monitor-card-icon">{icon}</span>
        <span className="monitor-card-label">{label}</span>
      </div>
      <div className="monitor-card-value">{value}</div>
      {sub   && <div className="monitor-card-sub">{sub}</div>}
      {pct != null && <GaugeBar pct={pct} />}
    </div>
  );
}

function SessionCard({ session }: { session: any }) {
  return (
    <div className="monitor-session">
      {session.thumbUrl && (
        <div className="monitor-session-thumb"
          style={{ backgroundImage: `url(${session.thumbUrl})` }} />
      )}
      <div className="monitor-session-info">
        <div className="monitor-session-title">
          {session.seriesName ? `${session.seriesName} — ` : ''}{session.title}
        </div>
        <div className="monitor-session-meta">
          {session.user} · {session.client} · {session.device}
        </div>
        <div className="monitor-session-progress">
          <span className="monitor-session-status">
            {session.isPaused ? <MdPause size={12} /> : <MdPlayArrow size={12} />}
            {session.isPaused ? 'Paused' : 'Playing'}
          </span>
          <GaugeBar pct={session.progress} color="#5b8dee" />
          <span className="monitor-session-pct">{session.progress}%</span>
        </div>
      </div>
    </div>
  );
}

export default function Monitor() {
  const { data: sys } = useSWR('/api/system',   fetcher, { refreshInterval: 3000  });
  const { data: jf  } = useSWR('/api/jellyfin', fetcher, { refreshInterval: 10000 });
    console.log("JEllyfin: " + JSON.stringify(jf))
  const uptimeStr = sys ? [
    sys.uptime.days  > 0 ? `${sys.uptime.days}d`  : '',
    sys.uptime.hours > 0 ? `${sys.uptime.hours}h` : '',
    `${sys.uptime.minutes}m`,
  ].filter(Boolean).join(' ') : '—';

  return (
    <div className="monitor-page">

      {/* ── Local machine ── */}
      <div className="monitor-section-label">
        <MdComputer size={14} />
        {sys?.hostname ?? 'System'} · {sys?.platform} {sys?.arch}
      </div>

      <div className="monitor-grid">
        <StatCard
          icon={<TbCpu size={20} />}
          label="CPU"
          value={`${sys?.cpu.usage ?? '—'}%`}
          sub={`${sys?.cpu.cores} cores · ${sys?.cpu.model?.split(' ').slice(-2).join(' ')}`}
          pct={sys?.cpu.usage}
        />
        {sys?.cpu.temp != null && (
          <StatCard
            icon={<MdThermostat size={20} />}
            label="CPU Temp"
            value={`${sys.cpu.temp}°C`}
            sub={sys.cpu.temp > 80 ? 'Hot' : sys.cpu.temp > 60 ? 'Warm' : 'Normal'}
            pct={Math.min(100, sys.cpu.temp)}
          />
        )}
        <StatCard
          icon={<MdMemory size={20} />}
          label="Memory"
          value={`${sys?.mem.used ?? '—'} / ${sys?.mem.total ?? '—'} GB`}
          sub={`${sys?.mem.free ?? '—'} GB free`}
          pct={sys?.mem.pct}
        />
        {sys?.disk && (
          <StatCard
            icon={<MdStorage size={20} />}
            label="Disk"
            value={`${sys.disk.used} / ${sys.disk.total} GB`}
            sub={`${sys.disk.free} GB free`}
            pct={sys.disk.pct}
          />
        )}
        <StatCard
          icon={<MdAccessTime size={20} />}
          label="Uptime"
          value={uptimeStr}
          sub={`Load: ${sys?.loadAvg?.join(' / ') ?? '—'}`}
        />
        <StatCard
          icon={<MdSpeed size={20} />}
          label="Load avg"
          value={String(sys?.loadAvg?.[0] ?? '—')}
          sub="1 / 5 / 15 min"
          pct={sys ? Math.min(100, Math.round((sys.loadAvg[0] / sys.cpu.cores) * 100)) : undefined}
        />
      </div>

      {/* ── Jellyfin ── */}
      {jf && !jf.error && (
        <>
          <div className="monitor-section-label" style={{ marginTop: 24 }}>
            <SiJellyfin size={14} />
            {jf.serverName} · v{jf.version} · {jf.operatingSystem} {jf.systemArch}
          </div>

          {/* Jellyfin storage drives */}
          {jf.storage?.length > 0 && (
            <div className="monitor-grid">
              {jf.storage.map((d: any) => (
                <StatCard
                  key={d.path}
                  icon={<MdStorage size={20} />}
                  label={d.name ?? d.path}
                  value={`${d.used} / ${d.total} GB`}
                  sub={`${d.free} GB free`}
                  pct={d.pct}
                />
              ))}
            </div>
          )}

          {/* Active streams */}
          <div className="monitor-subsection-label">
            {jf.activeSessions.length === 0
              ? 'No active streams'
              : `${jf.activeSessions.length} active stream${jf.activeSessions.length > 1 ? 's' : ''}`}
          </div>

          {jf.activeSessions.length > 0 && (
            <div className="monitor-sessions">
              {jf.activeSessions.map((s: any, i: number) => (
                <SessionCard key={i} session={s} />
              ))}
            </div>
          )}

          {/* Libraries */}
          {jf.libraries?.length > 0 && (
            <>
              <div className="monitor-subsection-label">Libraries</div>
              <div className="monitor-libraries">
                {jf.libraries.map((l: any) => (
                  <div key={l.name} className="monitor-library">
                    <span className="monitor-library-name">{l.name}</span>
                    <span className="monitor-library-type">{l.type}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {jf?.error && (
        <div className="monitor-empty">Jellyfin unavailable — {jf.error}</div>
      )}
    </div>
  );
}