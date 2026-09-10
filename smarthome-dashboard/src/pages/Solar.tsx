'use client';

import { useSolar } from '@/hooks/useSolar';
import { SpeedIcon, PowerIcon, StorageIcon } from '@/lib/icons';
import { StatCard } from '@/components/cards/StatCard';

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
    return (
      <div className="monitor-tab">
        <div className="monitor-empty">⚠️ Solar unavailable — {solar.error}</div>
      </div>
    );
  }

  if (solar.loading) {
    return (
      <div className="monitor-tab">
        <div className="monitor-empty">Loading solar data…</div>
      </div>
    );
  }

  return (
    <div className="monitor-tab">
      <div className="monitor-section-label">
        <SpeedIcon size={14} />
        Solar system
      </div>

      <div className="monitor-grid">
        <StatCard icon={<SpeedIcon size={20} />} label="Production" value={`${solar.pvPower} W`} />
        <StatCard icon={<PowerIcon size={20} />} label="Consumption" value={`${solar.consumedPower} W`} />
        <StatCard
          icon={<StorageIcon size={20} />}
          label="Battery"
          value={`${solar.batterySoc}%`}
          sub={solar.batteryCharging ? 'Charging' : solar.batteryDischarging ? 'Discharging' : 'Idle'}
          pct={solar.batterySoc ?? undefined}
        />
        <StatCard
          icon={<PowerIcon size={20} />}
          label="Grid"
          value={`${solar.gridImport! > 0 ? solar.gridImport : solar.gridExport} W`}
          sub={solar.gridImport! > 0 ? 'Importing' : solar.gridExport! > 0 ? 'Exporting' : 'Balanced'}
        />
      </div>
    </div>
  );
}