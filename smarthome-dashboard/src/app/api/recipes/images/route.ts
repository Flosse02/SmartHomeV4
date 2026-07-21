import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'data', 'recipe-images');

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB — plenty for a phone photo, caps disk abuse

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, mimeType } = body as { data?: string; mimeType?: string };

  const ext = MIME_EXTENSIONS[mimeType ?? ''];
  if (!data || !ext) {
    return NextResponse.json({ error: 'Expected { data: base64, mimeType: image/jpeg|png|webp }' }, { status: 400 });
  }

  // Cheap pre-check on the base64 string before paying for a full decode
  if (data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
    return NextResponse.json({ error: 'Image too large' }, { status: 413 });
  }

  const buffer = Buffer.from(data, 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image too large' }, { status: 413 });
  }

  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(IMAGES_DIR, filename), buffer);

  return NextResponse.json({ url: `/api/recipes/images/${filename}` });
}
