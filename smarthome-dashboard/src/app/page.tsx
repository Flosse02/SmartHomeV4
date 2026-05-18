'use client';

// import DeviceGrid from '@/components/top/DeviceGrid';
import CalendarPanel from '@/pages/CalendarPanel';
import SmartArea from '@/pages/SmartArea';

export default function Home() {
  return (
    <main className="dashboard-root">
      {/* TOP HALF */}
      <section className="top-half">
        <SmartArea />
      </section>

      {/* DIVIDER */}
      <div className="panel-divider" />

      {/* BOTTOM HALF */}
      <section className="bottom-half">
        <CalendarPanel />
      </section>
    </main>
  );
}