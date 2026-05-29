import { NextResponse } from 'next/server';
import os from 'os';
import { execSync } from 'child_process';
import { statfsSync } from 'fs';

function cpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  cpus.forEach(cpu => {
    for (const type in cpu.times) totalTick += cpu.times[type as keyof typeof cpu.times];
    totalIdle += cpu.times.idle;
  });
  return Math.round(100 - (100 * totalIdle / totalTick));
}

function cpuTemp(): number | null {
  try {
    const out = execSync('cat /sys/class/thermal/thermal_zone0/temp', { timeout: 1000 }).toString();
    return Math.round(parseInt(out.trim()) / 1000);
  } catch {
    try {
      const out = execSync('sensors -j 2>/dev/null', { timeout: 1000 }).toString();
      const json = JSON.parse(out);
      const first = Object.values(json)[0] as any;
      const adapter = Object.values(first)[0] as any;
      const temp = Object.values(adapter)[0] as any;
      return Math.round(Object.values(temp)[0] as number);
    } catch { return null; }
  }
}

function diskStats() {
  try {
    const stats = statfsSync('/');
    const total = stats.blocks * stats.bsize;
    const free  = stats.bfree  * stats.bsize;
    const used  = total - free;
    return {
      total: Math.round(total / 1073741824), // GB
      used:  Math.round(used  / 1073741824),
      free:  Math.round(free  / 1073741824),
      pct:   Math.round((used / total) * 100),
    };
  } catch { return null; }
}

function uptime() {
  const secs = os.uptime();
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return { days: d, hours: h, minutes: m, raw: secs };
}

export async function GET() {
  const mem = {
    total: Math.round(os.totalmem() / 1073741824),
    free:  Math.round(os.freemem()  / 1073741824),
    used:  Math.round((os.totalmem() - os.freemem()) / 1073741824),
    pct:   Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
  };

  return NextResponse.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch:     os.arch(),
    cpu: {
      model:   os.cpus()[0]?.model ?? 'Unknown',
      cores:   os.cpus().length,
      usage:   cpuUsage(),
      temp:    cpuTemp(),
    },
    mem,
    disk:   diskStats(),
    uptime: uptime(),
    loadAvg: os.loadavg().map(n => Math.round(n * 100) / 100),
  });
}