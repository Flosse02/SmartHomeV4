import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dir = (process.env.MUSIC_LOCATION ?? '').replace(/\\/g, path.sep);
  if (!dir) return NextResponse.json({ error: 'MUSIC_LOCATION not set' }, { status: 500 });

  const files = fs.readdirSync(dir)
    .filter(f => /\.(mp3|flac|wav|ogg|m4a|aac)$/i.test(f))
    .map(f => ({ name: f, path: f }));

  return NextResponse.json({ files });
}