import { NextResponse } from 'next/server';

const PI_NODE_EXPORTER_URL = process.env.PI_NODE_EXPORTER_URL || 'http://192.168.1.100:9100';

export async function GET() {
  try {
    const response = await fetch(`${PI_NODE_EXPORTER_URL}/metrics`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Node exporter returned ${response.status}`);
    }

    const metricsText = await response.text();
    const metrics = parsePrometheusMetrics(metricsText);
    const systemStats = transformToSystemStats(metrics);

    return NextResponse.json(systemStats);
  } catch (error: any) {
    console.error('Pi metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics from Raspberry Pi', details: error.message },
      { status: 500 }
    );
  }
}

function parsePrometheusMetrics(metricsText: string): Record<string, any> {
  const metrics: Record<string, any> = {};
  const lines = metricsText.split('\n');

  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '') continue;

    const [key, value] = line.split(' ');
    if (key && value) {
      metrics[key] = parseFloat(value);
    }
  }

  return metrics;
}

function transformToSystemStats(metrics: Record<string, any>) {
  // Get CPU temperature (from thermal_zone)
  let cpuTemp = null;
  for (const [key, value] of Object.entries(metrics)) {
    if (key.includes('thermal_zone') && key.includes('temp')) {
      cpuTemp = Math.round((value as number) / 1000); // Convert from millidegrees
      break;
    }
  }

  // Calculate uptime in days/hours/minutes
  const bootTime = metrics.node_boot_time_seconds || 0;
  const now = Math.floor(Date.now() / 1000);
  const uptimeSeconds = now - bootTime;
  const uptimeDays = Math.floor(uptimeSeconds / 86400);
  const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

  // Memory calculations
  const memTotal = metrics.node_memory_MemTotal_bytes || 0;
  const memAvailable = metrics.node_memory_MemAvailable_bytes || 
                       metrics.node_memory_MemFree_bytes || 0;
  const memUsed = memTotal - memAvailable;
  const memPercent = memTotal ? (memUsed / memTotal) * 100 : 0;

  // Root filesystem
  let diskTotal = 0, diskFree = 0, diskPercent = 0;
  for (const [key, value] of Object.entries(metrics)) {
    if (key.includes('node_filesystem_size_bytes') && 
        key.includes('mountpoint="/"')) {
      diskTotal = value as number;
    }
    if (key.includes('node_filesystem_free_bytes') && 
        key.includes('mountpoint="/"')) {
      diskFree = value as number;
    }
  }
  if (diskTotal > 0) {
    diskPercent = ((diskTotal - diskFree) / diskTotal) * 100;
  }

  // Load averages
  const load1 = metrics.node_load1 || 0;
  const load5 = metrics.node_load5 || 0;
  const load15 = metrics.node_load15 || 0;

  return {
    hostname: 'raspberry-pi',
    platform: 'Linux',
    arch: 'armv7l',
    uptime: {
      days: uptimeDays,
      hours: uptimeHours,
      minutes: uptimeMinutes,
    },
    cpu: {
      usage: calculateCPUUsage(metrics),
      cores: 4,
      model: 'Raspberry Pi 4B',
      temp: cpuTemp,
      loadAvg: [load1, load5, load15],
    },
    mem: {
      total: roundGB(memTotal),
      used: roundGB(memUsed),
      free: roundGB(memAvailable),
      pct: Math.round(memPercent),
    },
    disk: {
      total: roundGB(diskTotal),
      used: roundGB(diskTotal - diskFree),
      free: roundGB(diskFree),
      pct: Math.round(diskPercent),
    },
    timestamp: new Date().toISOString(),
  };
}

function calculateCPUUsage(metrics: Record<string, any>): number {
  // Sum all non-idle CPU times
  let total = 0;
  let idle = 0;

  for (const [key, value] of Object.entries(metrics)) {
    if (key.includes('node_cpu_seconds_total')) {
      total += value as number;
      if (key.includes('mode="idle"')) {
        idle += value as number;
      }
    }
  }

  if (total === 0) return 0;
  const nonIdle = total - idle;
  return Math.round((nonIdle / total) * 100);
}

function roundGB(bytes: number): number {
  return Math.round(bytes / 1024 / 1024 / 1024);
}