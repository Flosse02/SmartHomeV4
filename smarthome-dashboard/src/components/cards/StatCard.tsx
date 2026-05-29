import { GaugeBar } from "./GaugeBar";


export function StatCard({ icon, label, value, sub, pct }: {
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
