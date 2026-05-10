import { NextResponse } from 'next/server';

const BASE     = process.env.NEXT_PUBLIC_JELLYFIN_URL ?? '';
const API_KEY  = process.env.NEXT_PUBLIC_JELLYFIN_API_KEY ?? '';

// Build the direct stream URL for a Jellyfin track
function jellyfinStreamUrl(itemId: string) {
  return `${BASE}/Audio/${itemId}/universal?api_key=${API_KEY}&audioCodec=mp3&Container=mp3`;
}

// Send a UPnP AVTransport command to the device
async function upnpCommand(controlUrl: string, action: string, body: string) {
  const res = await fetch(controlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset="utf-8"',
      'SOAPAction': `"urn:schemas-upnp-org:service:AVTransport:1#${action}"`,
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
                  s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
        <s:Body>${body}</s:Body>
      </s:Envelope>`,
  });
  if (!res.ok) throw new Error(`UPnP ${action} failed: ${res.status}`);
}

// Get the AVTransport control URL from the device description
async function getControlUrl(location: string): Promise<string> {
  const res = await fetch(location, { signal: AbortSignal.timeout(3000) });
  const xml = await res.text();

  // Find AVTransport service control URL
  const avSection = xml.match(
    /<serviceType>urn:schemas-upnp-org:service:AVTransport:1<\/serviceType>[\s\S]*?<controlURL>([^<]+)<\/controlURL>/
  );
  if (!avSection) throw new Error('No AVTransport service found on device');

  const controlPath = avSection[1];
  const base = new URL(location);
  return controlPath.startsWith('http') ? controlPath : `${base.origin}${controlPath}`;
}

export async function POST(req: Request) {
  try {
    const { deviceLocation, itemId, title } = await req.json();
    if (!deviceLocation || !itemId) {
      return NextResponse.json({ error: 'deviceLocation and itemId required' }, { status: 400 });
    }

    const streamUrl   = jellyfinStreamUrl(itemId);
    const controlUrl  = await getControlUrl(deviceLocation);

    // 1. Set the track URI
    await upnpCommand(controlUrl, 'SetAVTransportURI', `
      <u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
        <InstanceID>0</InstanceID>
        <CurrentURI>${streamUrl}</CurrentURI>
        <CurrentURIMetaData>&lt;DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"
          xmlns:dc="http://purl.org/dc/elements/1.1/"
          xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"&gt;
          &lt;item id="1" parentID="0" restricted="1"&gt;
            &lt;dc:title&gt;${title ?? 'Music'}&lt;/dc:title&gt;
            &lt;upnp:class&gt;object.item.audioItem.musicTrack&lt;/upnp:class&gt;
            &lt;res protocolInfo="http-get:*:audio/mpeg:*"&gt;${streamUrl}&lt;/res&gt;
          &lt;/item&gt;
        &lt;/DIDL-Lite&gt;</CurrentURIMetaData>
      </u:SetAVTransportURI>
    `);

    // 2. Press play
    await upnpCommand(controlUrl, 'Play', `
      <u:Play xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
        <InstanceID>0</InstanceID>
        <Speed>1</Speed>
      </u:Play>
    `);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}