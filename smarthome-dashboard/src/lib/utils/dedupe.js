// dedupe.js — run once with: node dedupe.js
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname.parent().parent().parent(), 'data', 'recipes.json');
const recipes = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const seen = new Map(); // key: title -> earliest recipe

for (const r of recipes) {
  const key = r.title.trim().toLowerCase();
  const existing = seen.get(key);
  if (!existing || new Date(r.createdAt) < new Date(existing.createdAt)) {
    seen.set(key, r);
  }
}

const deduped = Array.from(seen.values());
console.log(`Before: ${recipes.length} recipes`);
console.log(`After:  ${deduped.length} recipes`);

fs.writeFileSync(DB_PATH, JSON.stringify(deduped, null, 2));
console.log('Done — backup the old file first if you want a rollback option.');