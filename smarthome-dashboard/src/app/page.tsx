'use client';

import { useState, useEffect } from 'react';
import CalendarPanel from '@/components/CalendarPanel';
import SmartArea, { type SmartAreaTab } from '@/components/SmartArea';
import { KioskSleepMode } from '@/components/kiosk';
import type { CalendarEvent, NowPlaying } from '@/components/kiosk/types';
import { useDevices } from '@/hooks/useDevices';

export default function Home() {
  const [activeTab, setActiveTab] = useState<SmartAreaTab>('Pictures');

  const { nowPlaying: deviceNowPlaying } = useDevices();

  // Wire these up to your Google Calendar + Jellyfin integrations when ready.
  // The sleep overlay handles empty/null gracefully in the meantime.
  const browserPlayback = deviceNowPlaying;

  const nowPlaying: NowPlaying | null = browserPlayback
  ? {
      title: browserPlayback.title ?? 'Unknown Track',
      artist: browserPlayback.artist ?? 'Unknown Artist',
      playing: browserPlayback.playing,
      position: browserPlayback.position,
      duration: browserPlayback.duration,
    }
  : null;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/calendar'); // 👈 your route
        const data = await res.json();
        setEvents(data);
      } catch (e) {
        console.error('Failed to load calendar', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // console.log('Calendar events:', events);

  return (
    <KioskSleepMode
      events={events}
      nowPlaying={nowPlaying}
      onWake={() => console.log('Woke up from sleep')}
    >
      <main className="dashboard-root">
        {/* TOP HALF */}
        <section className="top-half">
          <SmartArea activeTab={activeTab} onTabChange={setActiveTab} />
        </section>

        {/* DIVIDER */}
        <div className="panel-divider" />

        {/* BOTTOM HALF */}
        <section className="bottom-half">
          <CalendarPanel />
        </section>
      </main>
    </KioskSleepMode>
  );
}