import { promises as fs } from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'data', 'recipe-images');
const LOCAL_PREFIX = '/api/recipes/images/';

export async function deleteRecipeImageFile(url?: string | null): Promise<void> {
  if (!url || !url.startsWith(LOCAL_PREFIX)) return;
  const filename = path.basename(url.slice(LOCAL_PREFIX.length));
  const filepath = path.join(IMAGES_DIR, filename);
  if (!filepath.startsWith(path.resolve(IMAGES_DIR))) return;
  try {
    await fs.unlink(filepath);
  } catch {
    // already gone / never existed — nothing to clean up
  }
}
