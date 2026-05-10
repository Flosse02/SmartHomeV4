import { NextResponse } from 'next/server';
import { Client } from 'node-ssdp';
import os from 'os';

const MOCK_DEVICES = [
  { id: 'mock-1', name: 'Living Room Speaker', type: 'renderer', location: 'http://192.168.1.100:1234/desc.xml', ip: '192.168.1.100' },
  { id: 'mock-2', name: 'Kitchen Display',     type: 'renderer', location: 'http://192.168.1.101:1234/desc.xml', ip: '192.168.1.101' },
  { id: 'mock-3', name: 'Bedroom Speaker',     type: 'renderer', location: 'http://192.168.1.102:1234/desc.xml', ip: '192.168.1.102' },
];

function getLanIp(): string | undefined {
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (name === 'lo' || name.startsWith('docker') || name.startsWith('br-') || name.startsWith('virbr')) continue;
    const ipv4 = addrs?.find(a => a.family === 'IPv4' && !a.internal);
    if (ipv4) return ipv4.address;
  }
}

export async function GET() {
  if (process.env.MOCK_DEVICES === 'true') {
    return NextResponse.json(MOCK_DEVICES);
  }

  return new Promise((resolve) => {
    const lanIp = getLanIp();
    const client = new Client({ explicitSocketBind: true, ...(lanIp ? { bindAddress: lanIp } : {}) });
    const found: Record<string, any> = {};
    let responseCount = 0;

    client.on('response', async (headers: any, _status: any, rinfo: any) => {
      responseCount++;
      console.log(`[SSDP] Raw response #${responseCount} from ${rinfo.address}:`, headers.LOCATION, headers.ST);

      const location = headers.LOCATION;
      if (!location || found[location]) return;

      // Mark as seen immediately to avoid duplicate fetches
      found[location] = null;

      try {
        console.log(`[SSDP] Fetching description from ${location}`);
        const res = await fetch(location, { signal: AbortSignal.timeout(2000) });
        const xml = await res.text();

        const friendlyName = xml.match(/<friendlyName>([^<]+)<\/friendlyName>/)?.[1] ?? 'Unknown';
        const deviceType   = xml.match(/<deviceType>([^<]+)<\/deviceType>/)?.[1] ?? '';
        const udn          = xml.match(/<UDN>([^<]+)<\/UDN>/)?.[1] ?? location;

        console.log(`[SSDP] Device at ${rinfo.address}: "${friendlyName}" type: "${deviceType}"`);

        if (!deviceType.includes('MediaRenderer') && !deviceType.includes('MediaServer')) {
          console.log(`[SSDP] Skipping ${friendlyName} — not a media device`);
          delete found[location]; // remove placeholder so it's not returned
          return;
        }

        found[location] = {
          id: udn,
          name: friendlyName,
          type: deviceType.includes('MediaRenderer') ? 'renderer' : 'server',
          location,
          ip: rinfo.address,
        };
      } catch (e) {
        console.log(`[SSDP] Failed to fetch ${location}:`, e);
        delete found[location];
      }
    });

    client.search('ssdp:all');

    setTimeout(() => {
      client.stop();
      console.log(`[SSDP] Done. Total raw responses: ${responseCount}, kept: ${Object.keys(found).length}`);
      // Filter out any null placeholders in case a fetch was still in flight
      resolve(NextResponse.json(Object.values(found).filter(Boolean)));
    }, 4000);
  });
}