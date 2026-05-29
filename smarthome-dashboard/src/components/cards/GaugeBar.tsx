export function GaugeBar({ pct, color }: { pct: number; color?: string }) {
  const c = color ?? (pct > 85 ? '#e02424' : pct > 60 ? '#f39c12' : '#5b8dee');
  return (
    <div style={{ width: '100%', height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 2, transition: 'width 0.5s ease' }} />
    </div>
  );
}