// src/app/api/music/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MUSIC_DIR = process.env.MUSIC_LOCATION ?? '';
const AUDIO_EXTS = new Set(['.mp3', '.flac', '.ogg', '.wav', '.m4a', '.aac']);

function scan(dir: string, base: string): { name: string; path: string }[] {
  const results: { name: string; path: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scan(full, base));
    } else if (AUDIO_EXTS.has(path.extname(entry.name).toLowerCase())) {
      results.push({
        name: path.relative(base, full).replace(/\\/g, '/'),
        path: '/api/music/stream?file=' + encodeURIComponent(path.relative(base, full)),
      });
    }
  }
  return results;
}

export async function GET() {
  if (!MUSIC_DIR) return NextResponse.json({ files: [] });
  try {
    return NextResponse.json({ files: scan(MUSIC_DIR, MUSIC_DIR) });
  } catch {
    return NextResponse.json({ files: [], error: 'Cannot read music directory' });
  }
}