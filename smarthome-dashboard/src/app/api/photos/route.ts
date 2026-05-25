import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readSettings } from '@/lib/settings';

export async function GET() {
  const { photoLocation } = readSettings();
  if (!photoLocation) console.warn('Photo location not set, using default');
  const dir = photoLocation || path.join(process.cwd(), 'public/photos');

  try {
    const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    return NextResponse.json(files.map(f => ({ src: `/photos/${f}` })));
  } catch {
    console.error('Cannot read photos directory:', dir);
    return NextResponse.json([]);
  }
}