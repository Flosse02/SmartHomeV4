'use client';

import { useSolar } from '@/hooks/useSolar';
import { SunIcon, BoltIcon, BatteryIcon, HouseIcon } from '@/lib/icons';
import { StatCard } from '@/components/cards/StatCard';
import { installMockSolarFetch } from '@/mocks/mockSolarFetch';

if (process.env.NODE_ENV === 'development') {
  installMockSolarFetch();
}

// Diamond layout coordinates (viewBox 0 0 320 260)
const PV      = { x: 160, y: 30 };
const BATTERY = { x: 40,  y: 150 };
const GRID    = { x: 280, y: 150 };
const HOME    = { x: 160, y: 240 };

function pathD(a: typeof PV, b: typeof PV) {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

function FlowLine({
  from, to, active, colorClass, reverse,
}: { from: typeof PV; to: typeof PV; active: boolean; colorClass: string; reverse?: boolean }) {
  const d = pathD(from, to);
  return (
    <path
      d={d}
      className={`solar-flow-path ${active ? `solar-flow-path--active ${colorClass}` : ''} ${reverse ? 'solar-flow-path--reverse' : ''}`}
    />
  );
}

function GlowRing({ pos, active, colorVar }: { pos: typeof PV; active: boolean; colorVar: string }) {
  if (!active) return null;
  return (
    <circle
      cx={pos.x}
      cy={pos.y}
      r="28"
      fill="none"
      strokeWidth="6"
      className="solar-glow"
      style={{ stroke: `var(${colorVar})`, filter: 'blur(8px)' }}
    />
  );
}

function Node({
  pos, icon, label, value, sub, subClass, iconClass, borderClass, glow, glowColorVar,
}: {
  pos: typeof PV; icon: React.ReactNode; label: string; value: string;
  sub?: string; subClass?: string; iconClass: string; borderClass?: string;
  glow: boolean; glowColorVar: string;
}) {
  return (
    <g>
      <GlowRing pos={pos} active={glow} colorVar={glowColorVar} />
      <foreignObject x={pos.x - 26} y={pos.y - 26} width="52" height="52">
        <div className={`solar-node-icon ${iconClass} ${borderClass ?? ''}`} style={{ width: 52, height: 52 }}>
          {icon}
        </div>
      </foreignObject>
      <text x={pos.x} y={pos.y + 42} textAnchor="middle" className="solar-node-label">{label}</text>
      <text x={pos.x} y={pos.y + 58} textAnchor="middle" className="solar-node-value">{value}</text>
      {sub && (
        <text x={pos.x} y={pos.y + 72} textAnchor="middle" className={`solar-node-sub ${subClass ?? ''}`}>
          {sub}
        </text>
      )}
    </g>
  );
}

export default function Solar() {
  const solar = useSolar();

  if (!process.env.NEXT_PUBLIC_HA_TOKEN) {
    return (
      <div className="home-unconfigured">
        <div className="home-unconfigured-title">Home Assistant not configured</div>
      </div>
    );
  }
  if (solar.error) {
    return <div className="monitor-tab"><div className="monitor-empty">⚠️ Solar unavailable — {solar.error}</div></div>;
  }
  if (solar.loading) {
    return <div className="monitor-tab"><div className="monitor-empty">Loading solar data…</div></div>;
  }

  const pv = solar.pvPower ?? 0;
  const consumed = solar.consumedPower ?? 0;
  const gridImport = solar.gridImport ?? 0;
  const gridExport = solar.gridExport ?? 0;
  const importing = gridImport > 0;
  const exporting = gridExport > 0;
  const charging = solar.batteryCharging;
  const discharging = solar.batteryDischarging;

  return (
    <div className="monitor-tab" style={{ padding: 0 }}>
      <div className="solar-hero">
        <div className="solar-hero-icon">☀️</div>
        <div className="solar-hero-value">{pv.toLocaleString()} W</div>
        <div className="solar-hero-label">Producing now</div>
      </div>

      <div className="solar-diamond-wrap">
        <svg viewBox="0 0 320 280" width="100%" style={{ maxWidth: 420, overflow: 'visible' }}>
          <FlowLine from={PV} to={HOME} active={pv > 0} colorClass="solar-flow-path--pv" />
          <FlowLine from={PV} to={BATTERY} active={pv > 0 && charging} colorClass="solar-flow-path--pv" />
          <FlowLine from={PV} to={GRID} active={exporting} colorClass="solar-flow-path--grid-out" />
          <FlowLine from={BATTERY} to={HOME} active={discharging} colorClass="solar-flow-path--battery" />
          <FlowLine from={GRID} to={HOME} active={importing} colorClass="solar-flow-path--grid-in" />

          <Node
            pos={PV} icon={<SunIcon size={22} />} label="Solar" value={`${pv} W`}
            iconClass="solar-node-icon--pv"
            borderClass={pv > 0 ? 'solar-node-icon--border-pv' : undefined}
            glow={pv > 0} glowColorVar="--warning"
          />
          <Node
            pos={BATTERY} icon={<BatteryIcon size={22} />} label="Battery" value={`${solar.batterySoc}%`}
            sub={charging ? 'Charging' : discharging ? 'Discharging' : 'Idle'}
            subClass={charging ? 'solar-node-sub--charging' : discharging ? 'solar-node-sub--discharging' : ''}
            iconClass="solar-node-icon--battery"
            borderClass={charging || discharging ? 'solar-node-icon--border-battery' : undefined}
            glow={charging || discharging} glowColorVar="--accent"
          />
          <Node
            pos={GRID} icon={<BoltIcon size={22} />} label="Grid" value={`${importing ? gridImport : gridExport} W`}
            sub={importing ? 'Importing' : exporting ? 'Exporting' : 'Balanced'}
            iconClass="solar-node-icon--grid"
            borderClass={importing ? 'solar-node-icon--border-import' : exporting ? 'solar-node-icon--border-export' : undefined}
            glow={importing || exporting} glowColorVar={importing ? '--error' : '--success'}
          />
          <Node
            pos={HOME} icon={<HouseIcon size={22} />} label="Home" value={`${consumed} W`}
            iconClass="solar-node-icon--home"
            glow={false} glowColorVar="--success"
          />
        </svg>
      </div>

      <div className="solar-stats-row">
        <StatCard icon={<SunIcon size={18} />} label="Production" value={`${pv} W`} />
        <StatCard icon={<BatteryIcon size={18} />} label="Battery" value={`${solar.batterySoc}%`} pct={solar.batterySoc ?? undefined} />
      </div>
    </div>
  );
}