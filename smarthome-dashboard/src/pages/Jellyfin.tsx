'use client';

import { SessionCard } from "@/components/cards/SessionCard";
import { StatCard } from "@/components/cards/StatCard";
import { JellyfinIcon, StorageIcon, SearchIcon } from "@/lib/icons";
import { useState, useRef } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

type SearchType = 'movie' | 'tv';

interface SearchResult {
  id: number;
  title: string;
  year: number;
  overview: string;
  poster: string | null;
  added: boolean;
  titleSlug: string;
  images: any[];
  seasons?: any[];
  radarrId?: number | null;
  sonarrId?: number | null;
}

function DownloadQueue({ items }: { items: any[] }) {
  if (items.length === 0) return (
    <div className="monitor-empty">No active downloads</div>
  );

  return (
    <div className="jellyfin-queue">
      {items.map((item: any) => {
        const isFailed      = item.status === 'failed' || item.trackedStatus === 'error';
        const isCompleted   = item.status === 'completed';
        const isDownloading = item.status === 'downloading';

        return (
          <div key={`${item.type}-${item.id}`} className={`jellyfin-queue-item ${isFailed ? 'jellyfin-queue-item--failed' : isCompleted ? 'jellyfin-queue-item--completed' : ''}`}>
            <div className="jellyfin-queue-header">
              <span className="jellyfin-queue-title">{item.title}</span>
              <div className="jellyfin-queue-meta">
                {item.quality && <span className="jellyfin-queue-badge">{item.quality}</span>}
                <span className={`jellyfin-queue-badge jellyfin-queue-badge--${isFailed ? 'failed' : isCompleted ? 'done' : 'active'}`}>
                  {isFailed ? 'failed' : isCompleted ? 'done' : item.status}
                </span>
                <span className="jellyfin-queue-type">{item.type === 'movie' ? 'movie' : 'tv'}</span>
              </div>
            </div>

            {isDownloading && (
              <div className="jellyfin-queue-progress-row">
                <div className="jellyfin-queue-track">
                  <div className="jellyfin-queue-fill" style={{ width: `${item.progress}%` }} />
                </div>
                <span className="jellyfin-queue-pct">{item.progress}%</span>
                {item.sizeleft && <span className="jellyfin-queue-size">{item.sizeleft} left</span>}
              </div>
            )}

            {isFailed && item.errorMsg && (
              <div className="jellyfin-queue-error">{item.errorMsg}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface SearchResult {
  id: number;
  title: string;
  year: number;
  overview: string;
  poster: string | null;
  added: boolean;
  titleSlug: string;
  images: any[];
  seasons?: any[];
  radarrId?: number | null;
  sonarrId?: number | null;
}

function MediaRow({ title, items, emptyText }: {
  title: string;
  items: any[];
  emptyText: string;
}) {
  if (items.length === 0) return (
    <div>
      <div className="monitor-subsection-label">{title}</div>
      <div className="monitor-empty">{emptyText}</div>
    </div>
  );

  return (
    <div>
      <div className="monitor-subsection-label">{title}</div>
      <div className="jellyfin-poster-row">
        {items.map((item: any) => (
          <div key={item.id} className="jellyfin-poster-card">
            {item.poster
              ? <img src={item.poster} className="jellyfin-poster-img" loading="lazy" />
              : <div className="jellyfin-poster-placeholder" />
            }
            {item.progress !== null && item.progress > 0 && (
              <div className="jellyfin-poster-progress">
                <div className="jellyfin-poster-progress-fill" style={{ width: `${item.progress}%` }} />
              </div>
            )}
            <div className="jellyfin-poster-title">
              {item.seriesName ? `${item.seriesName}` : item.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchPanel() {
  const [type, setType]         = useState<SearchType>('movie');
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [adding, setAdding]     = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [error, setError]       = useState<string | null>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const endpoint = type === 'movie' ? '/api/radarr' : '/api/sonarr';
      const res      = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
      const data     = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const add = async (result: SearchResult) => {
    setAdding(result.id);
    setError(null);
    try {
      const endpoint = type === 'movie' ? '/api/radarr' : '/api/sonarr';
      const body     = type === 'movie'
        ? { tmdbId: result.id, title: result.title, year: result.year, titleSlug: result.titleSlug, images: result.images }
        : { tvdbId: result.id, title: result.title, year: result.year, titleSlug: result.titleSlug, images: result.images, seasons: result.seasons };

      const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAddedIds(prev => new Set([...prev, result.id]));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="jellyfin-search-panel">
      <div className="monitor-subsection-label">Search & Download</div>

      {/* Type toggle */}
      <div className="jellyfin-search-type-row">
        <button
          className={`jellyfin-type-btn ${type === 'movie' ? 'jellyfin-type-btn--active' : ''}`}
          onClick={() => { setType('movie'); setResults([]); }}
        >
          Movies
        </button>
        <button
          className={`jellyfin-type-btn ${type === 'tv' ? 'jellyfin-type-btn--active' : ''}`}
          onClick={() => { setType('tv'); setResults([]); }}
        >
          TV / Anime
        </button>
      </div>

      {/* Search input */}
      <div className="jellyfin-search-row">
        <input
          ref={inputRef}
          className="jellyfin-search-input"
          placeholder={type === 'movie' ? 'Search movies…' : 'Search TV shows & anime…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button className="jellyfin-search-btn" onClick={search} disabled={loading}>
          {loading ? '…' : <SearchIcon />}
        </button>
      </div>

      {error && <div className="jellyfin-search-error">{error}</div>}

      {/* Results */}
      {results.length > 0 && (
        <div className="jellyfin-search-results">
          {results.map(r => {
            const isAdded = r.added || addedIds.has(r.id);
            return (
              <div key={r.id} className="jellyfin-search-result">
                {r.poster
                  ? <img src={r.poster} className="jellyfin-result-poster" loading="lazy" />
                  : <div className="jellyfin-result-poster jellyfin-result-poster--empty" />
                }
                <div className="jellyfin-result-info">
                  <div className="jellyfin-result-title">{r.title} {r.year ? <span className="jellyfin-result-year">({r.year})</span> : null}</div>
                  {r.overview && <div className="jellyfin-result-overview">{r.overview}</div>}
                </div>
                <button
                  className={`jellyfin-add-btn ${isAdded ? 'jellyfin-add-btn--added' : ''}`}
                  onClick={() => !isAdded && add(r)}
                  disabled={isAdded || adding === r.id}
                >
                  {adding === r.id ? '…' : isAdded ? '✓' : '+'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Jellyfin() {
  const { data: jf, error: jfError } = useSWR('/api/jellyfin', fetcher, { refreshInterval: 10000 });
  const { data: queueData }          = useSWR('/api/queue',    fetcher, { refreshInterval: 5000 });

  const hasJellyfinData    = jf && !jf.error;
  const activeSessions     = jf?.activeSessions     || [];
  const libraries          = jf?.libraries          || [];
  const storage            = jf?.storage            || [];
  const recentlyAdded      = jf?.recentlyAdded      || [];
  const continueWatching   = jf?.continueWatching   || [];
  const queue              = queueData?.queue        || [];

  return hasJellyfinData ? (
    <div className="jellyfin-tab">
      <div className="monitor-section-label">
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
          : `${activeSessions.length} active stream${activeSessions.length > 1 ? 's' : ''}`}
      </div>
      {activeSessions.length > 0 && (
        <div className="monitor-sessions">
          {activeSessions.map((s: any, i: number) => (
            <SessionCard key={i} session={s} />
          ))}
        </div>
      )}

      {/* Continue watching */}
      <MediaRow
        title="Continue Watching"
        items={continueWatching}
        emptyText="Nothing in progress"
      />

      {/* Recently added */}
      <MediaRow
        title="Recently Added"
        items={recentlyAdded}
        emptyText="No recent items"
      />

      {/* Download queue */}
      <div className="monitor-subsection-label">
        Downloads {queue.length > 0 && `· ${queue.length}`}
      </div>
      <DownloadQueue items={queue} />

      {/* Search & Download */}
      <SearchPanel />

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