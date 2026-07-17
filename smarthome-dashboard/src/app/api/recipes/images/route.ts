import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'data', 'recipe-images');

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, mimeType } = body as { data?: string; mimeType?: string };

  const ext = MIME_EXTENSIONS[mimeType ?? ''];
  if (!data || !ext) {
    return NextResponse.json({ error: 'Expected { data: base64, mimeType: image/jpeg|png|webp }' }, { status: 400 });
  }

  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(IMAGES_DIR, filename), Buffer.from(data, 'base64'));

  return NextResponse.json({ url: `/api/recipes/images/${filename}` });
}
