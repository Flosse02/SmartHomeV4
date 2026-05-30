import { SessionCard } from "@/components/cards/SessionCard";
import { StatCard } from "@/components/cards/StatCard";
import { JellyfinIcon, PauseIcon, PlayIcon, StorageIcon } from "@/lib/icons";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Jellyfin() {
  const { data: jf, error: jfError } = useSWR('/api/jellyfin', fetcher, {
    refreshInterval: 10000,
  });

  const hasJellyfinData = jf && !jf.error;
  const activeSessions = jf?.activeSessions || [];
  const libraries = jf?.libraries || [];
  const storage = jf?.storage || [];

  return hasJellyfinData ? (
    <div className="jellyfin-tab">
        <div className="monitor-section-label" style={{ marginTop: 24 }}>
            <JellyfinIcon size={14} />
            {jf.serverName} · v{jf.version} · {jf.operatingSystem} {jf.systemArch}
        </div>

        {/* Storage */}
        {storage.length > 0 && (
            <div className="monitor-grid">
                {storage.map((d: any) => (
                    <StatCard
                    key={d.path}
                    icon={<StorageIcon size={20} />}
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
            {activeSessions.length === 0
            ? 'No active streams'
            : `${activeSessions.length} active stream${
                activeSessions.length > 1 ? 's' : ''
                }`}
        </div>

        {activeSessions.length > 0 && (
            <div className="monitor-sessions">
                {activeSessions.map((s: any, i: number) => (
                    <SessionCard key={i} session={s} />
                ))}
            </div>
        )}

        {/* Libraries */}
        {libraries.length > 0 && (
            <>
            <div className="monitor-subsection-label">Libraries</div>
            <div className="monitor-libraries">
                {libraries.map((l: any) => (
                <div key={l.name} className="monitor-library">
                    <span className="monitor-library-name">{l.name}</span>
                    <span className="monitor-library-type">{l.type}</span>
                </div>
                ))}
            </div>
            </>
        )}
    </div>
  ) : (
    <div className="monitor-empty" style={{ marginTop: 24 }}>
      {jfError
        ? `Jellyfin connection error: ${jfError.message || 'Unknown error'}`
        : jf?.error
        ? `Jellyfin unavailable: ${jf.error}`
        : 'Jellyfin not configured — add API keys to .env.local'}
    </div>
  );
}