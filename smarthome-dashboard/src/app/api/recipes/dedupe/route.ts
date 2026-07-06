import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Recipe } from '@/app/types/recipe';

const DB_PATH = path.join(process.cwd(), 'data', 'recipes.json');

function broadcast(type: string, payload: any) {
  const wss = (global as any).wss;
  if (!wss) return;
  const message = JSON.stringify({ type, ...payload });
  wss.clients.forEach((client: any) => {
    if (client.readyState === 1) client.send(message); // 1 = OPEN
  });
}

async function readDb(): Promise<Recipe[]> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeDb(recipes: Recipe[]) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(recipes, null, 2));
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&ldquo;/g, '\u201c')
    .replace(/&rdquo;/g, '\u201d')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalize(title: string): string {
  return decodeEntities(title || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export async function POST() {
  const recipes = await readDb();

  const groups = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const key = normalize(r.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const toDelete: string[] = [];
  const keep: Recipe[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      keep.push(group[0]);
      continue;
    }
    group.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    keep.push(group[0]); // oldest survives
    for (let i = 1; i < group.length; i++) {
      toDelete.push(group[i].id);
    }
  }

  await writeDb(keep);

  // Let every connected client (phone + other dashboard tabs) drop the
  // removed entries live, instead of requiring a manual reload.
  for (const id of toDelete) {
    broadcast('recipe_deleted', { id });
  }

  return NextResponse.json({ removed: toDelete.length, remaining: keep.length });
}