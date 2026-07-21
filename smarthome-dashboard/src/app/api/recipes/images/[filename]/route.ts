import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'data', 'recipe-images');

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png',  webp: 'image/webp',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename: rawFilename } = await params;

  const filename = path.basename(rawFilename);
  const filepath = path.join(IMAGES_DIR, filename);

  if (!filepath.startsWith(path.resolve(IMAGES_DIR))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const ext = path.extname(filename).toLowerCase().slice(1);

  try {
    const buffer = await fs.readFile(filepath);
    return new NextResponse(buffer, {
      headers: { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
