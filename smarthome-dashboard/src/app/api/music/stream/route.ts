// src/app/api/music/stream/route.ts
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const MUSIC_DIR = process.env.MUSIC_LOCATION ?? '';

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file');
  if (!file || !MUSIC_DIR) return new Response('Not found', { status: 404 });

  // Prevent path traversal
  const abs = path.resolve(MUSIC_DIR, file);
  if (!abs.startsWith(path.resolve(MUSIC_DIR))) return new Response('Forbidden', { status: 403 });

  try {
    const stat = fs.statSync(abs);
    const ext  = path.extname(abs).toLowerCase();
    const mime: Record<string, string> = {
      '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.ogg': 'audio/ogg',
      '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
    };

    // Support range requests so the browser seek bar works
    const range = req.headers.get('range');
    if (range) {
      const [startStr, endStr] = range.replace('bytes=', '').split('-');
      const start = parseInt(startStr, 10);
      const end   = endStr ? parseInt(endStr, 10) : stat.size - 1;
      const stream = fs.createReadStream(abs, { start, end });
      return new Response(stream as any, {
        status: 206,
        headers: {
          'Content-Type':  mime[ext] ?? 'audio/mpeg',
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
        },
      });
    }

    const stream = fs.createReadStream(abs);
    return new Response(stream as any, {
      headers: {
        'Content-Type':  mime[ext] ?? 'audio/mpeg',
        'Content-Length': String(stat.size),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}