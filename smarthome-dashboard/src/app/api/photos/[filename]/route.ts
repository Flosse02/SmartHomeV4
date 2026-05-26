import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readSettings } from '@/lib/settings';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename: rawFilename } = await params;  // ← await here
  
  const { photoLocation } = readSettings();
  const dir = photoLocation || path.join(process.cwd(), 'public/photos');

  const filename = path.basename(rawFilename);
  const filepath = path.join(dir, filename);

  if (!filepath.startsWith(path.resolve(dir))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (!fs.existsSync(filepath)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase().slice(1);
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png',  webp: 'image/webp',
  };

  const buffer = fs.readFileSync(filepath);
  return new NextResponse(buffer, {
    headers: { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream' },
  });
}