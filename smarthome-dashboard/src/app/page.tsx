'use client';

import { useState, useEffect, useRef } from 'react';
import CalendarPanel from '@/components/CalendarPanel';
import SmartArea, { type SmartAreaTab } from '@/components/SmartArea';
import { KioskSleepMode } from '@/components/kiosk';
import type { CalendarEvent, NowPlaying } from '@/components/kiosk/types';
import { useDevices } from '@/hooks/useDevices';
import { SleepProvider } from '@/context/SleepContext';

export default function Home() {
  const [activeTab, setActiveTab] = useState<SmartAreaTab>('Pictures');
  const controlsRef = useRef<{ pause: () => void; prev: () => void; next: () => void } | null>(null);

  const devicesResult = useDevices();
  const { playback } = devicesResult;

  const nowPlaying: NowPlaying | null = (() => {
    const active = Object.values(playback).find(s => s.playing && s.title);
    if (!active) return null;
    return {
      title:    active.title    ?? 'Unknown Track',
      artist:   active.artist   ?? 'Unknown Artist',
      playing:  active.playing,
      position: active.position,
      duration: active.duration,
    };
  })();

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/calendar');
        const data = await res.json();
        setEvents(data);
      } catch (e) {
        console.error('Failed to load calendar', e);
      }
    };
    load();
  }, []);

return (
    <SleepProvider>
      <KioskSleepMode
        events={events}
        nowPlaying={nowPlaying}
        onWake={() => console.log('Waking up from sleep mode')}
        onPause={() => controlsRef.current?.pause()}
        onPrev={() => controlsRef.current?.prev()}
        onNext={() => controlsRef.current?.next()}
      >
        <main className="dashboard-root">
          <section className="top-half">
            <SmartArea
              activeTab={activeTab}
              onTabChange={setActiveTab}
              devicesResult={devicesResult}
              controlsRef={controlsRef}
            />
          </section>

          <div className="panel-divider" />

          <section className="bottom-half">
            <CalendarPanel />
          </section>
        </main>
      </KioskSleepMode>
    </SleepProvider>
  );
}