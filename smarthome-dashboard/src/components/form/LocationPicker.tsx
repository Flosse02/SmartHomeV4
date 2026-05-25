import { useState, useRef, useEffect } from 'react';

interface GeoResult {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export function LocationPicker({ value, placeHolder, onChange }: { 
  value: string; 
  placeHolder?: string;
  onChange: (v: string | null) => void; // null = invalid/unconfirmed
}) {
  const [query,    setQuery]    = useState(value);
  const [results,  setResults]  = useState<GeoResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const [valid,    setValid]    = useState(!!value);
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        // If user typed but didn't pick, revert to last valid value
        if (!valid) setQuery(value);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [valid, value]);

  const search = (q: string) => {
    setQuery(q);
    setValid(false);
    onChange(null); // mark as invalid until a result is picked
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const select = (r: GeoResult) => {
    const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
    setQuery(label);
    setValid(true);
    setOpen(false);
    setResults([]);
    onChange(r.name);
  };

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <div className="input-wrapper">
            <input
            className={`${!valid && query ? 'settings-input--invalid' : ''} ${valid ? 'settings-input--valid' : ''}`}
            placeholder={placeHolder || "Search city…"}
            value={query}
            onChange={e => search(e.target.value)}
            autoComplete="off"
            style={{ paddingRight: 24 }}
            onFocus={e => e.target.select()}
            />
            <span className="input-suffix">
            {loading ? (
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>…</span>
            ) : valid ? (
                <span style={{ color: 'var(--success)' }}>✓</span>
            ) : query ? (
                <span style={{ color: 'var(--error)' }}>✗</span>
            ) : null}
            </span>
        </div>

      {open && results.length > 0 && (
        <div className="location-dropdown">
          {results.map((r, i) => (
            <div key={i} className="location-dropdown-item" onClick={() => select(r)}>
              <span className="location-dropdown-city">{r.name}</span>
              <span className="location-dropdown-meta">
                {[r.admin1, r.country].filter(Boolean).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}