import { PauseIcon, PlayIcon } from "@/lib/icons";
import { GaugeBar } from "./GaugeBar";

export function SessionCard({ session }: { session: any }) {
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
            {session.isPaused ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
            {session.isPaused ? 'Paused' : 'Playing'}
          </span>
          <GaugeBar pct={session.progress} color="#5b8dee" />
          <span className="monitor-session-pct">{session.progress}%</span>
        </div>
      </div>
    </div>
  );
}
