'use client';

// import DeviceGrid from '@/components/top/DeviceGrid';
// import CalendarPanel from '@/components/bottom/CalendarPanel';
import Clock from '@/components/Clock';
import SmartArea from '@/components/SmartArea';

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
        {/* <CalendarPanel /> */}
      </section>
    </main>
  );
}