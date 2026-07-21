import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { readSettings } from '@/lib/settings';

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.ogg', '.wav', '.m4a', '.aac']);

async function scan(dir: string, base: string): Promise<{ name: string; path: string }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: { name: string; path: string }[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await scan(full, base));
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
  const { musicLocation } = readSettings();
  if (!musicLocation) return NextResponse.json({ files: [] });
  try {
    return NextResponse.json({ files: await scan(musicLocation, musicLocation) });
  } catch {
    return NextResponse.json({ files: [], error: 'Cannot read music directory' });
  }
}