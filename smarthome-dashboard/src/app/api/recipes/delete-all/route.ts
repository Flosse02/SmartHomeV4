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

export async function POST() {
  const recipes = await readDb();
  const ids = recipes.map(r => r.id);

  await writeDb([]);

  // Reuse the existing recipe_deleted handler already wired up on every
  // connected client (phone + dashboard) rather than introducing a new
  // message type — each client just drops the ids one by one.
  for (const id of ids) {
    broadcast('recipe_deleted', { id });
  }

  return NextResponse.json({ removed: ids.length });
}