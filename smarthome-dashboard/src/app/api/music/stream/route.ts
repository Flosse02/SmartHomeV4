import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readSettings } from '@/lib/settings';

const AUDIO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',  '.m4a': 'audio/mp4',   '.aac': 'audio/aac',
};

export async function GET(req: NextRequest) {
  const { musicLocation } = readSettings();
  const file = req.nextUrl.searchParams.get('file');
  if (!file || !musicLocation) return new Response('Not found', { status: 404 });

  const abs = path.resolve(musicLocation, file);
  if (!abs.startsWith(path.resolve(musicLocation))) return new Response('Forbidden', { status: 403 });

  try {
    const stat = fs.statSync(abs);
    const mime = AUDIO_MIME[path.extname(abs).toLowerCase()] ?? 'audio/mpeg';
    const range = req.headers.get('range');

    if (range) {
      const [startStr, endStr] = range.replace('bytes=', '').split('-');
      const start  = parseInt(startStr, 10);
      const end    = endStr ? parseInt(endStr, 10) : stat.size - 1;
      const stream = fs.createReadStream(abs, { start, end });
      return new Response(stream as any, {
        status: 206,
        headers: {
          'Content-Type':   mime,
          'Content-Range':  `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges':  'bytes',
          'Content-Length': String(end - start + 1),
        },
      });
    }

    const stream = fs.createReadStream(abs);
    return new Response(stream as any, {
      headers: {
        'Content-Type':   mime,
        'Content-Length': String(stat.size),
        'Accept-Ranges':  'bytes',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}