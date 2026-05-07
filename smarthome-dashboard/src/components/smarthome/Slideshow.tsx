'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const INTERVAL_MS = 8000;

const GRADIENTS = [
  'linear-gradient(135deg, #1a2a3a 0%, #0d1f2d 50%, #162030 100%)',
  'linear-gradient(135deg, #1a1f2e 0%, #0f1a28 50%, #1e1530 100%)',
  'linear-gradient(135deg, #1f1a1a 0%, #2a1520 50%, #1a0f1a 100%)',
];

export default function Slideshow() {
  const [photos, setPhotos] = useState<{ src: string; caption?: string }[]>([]);
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    fetch('/api/photos')
      .then(r => r.json())
      .then(setPhotos);
  }, []);

  const hasPhotos = photos.length > 0;
  const total = hasPhotos ? photos.length : GRADIENTS.length;

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % total);
        setFading(false);
      }, 600);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [total]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0d0f14' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: hasPhotos ? '#000' : GRADIENTS[current % GRADIENTS.length],
        transition: 'opacity 0.6s ease',
        opacity: fading ? 0 : 1,
      }}>
        {hasPhotos && photos[current]?.src && (
          <Image
            src={photos[current].src}
            alt={photos[current].caption ?? ''}
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        )}

        {!hasPhotos && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '12px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.7 }}>
              No photos
            </div>
          </div>
        )}
      </div>

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
        background: 'linear-gradient(to top, rgba(13,15,20,0.9) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Dot indicators */}
      <div style={{ position: 'absolute', bottom: '14px', right: '16px', display: 'flex', gap: '5px', zIndex: 5 }}>
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? '16px' : '5px', height: '5px',
              borderRadius: '3px',
              background: i === current ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.3s ease',
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Caption */}
      {hasPhotos && photos[current]?.caption && (
        <div style={{
          position: 'absolute', bottom: '14px', left: '16px',
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: 'var(--text-secondary)', letterSpacing: '1px', zIndex: 5,
        }}>
          {photos[current].caption}
        </div>
      )}
    </div>
  );
}