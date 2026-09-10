# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js dashboard designed to run on a Raspberry Pi driving a touchscreen in portrait orientation (9:16 split screen). The actual app lives entirely in `smarthome-dashboard/`; the repo root just holds thin wrapper scripts.

## Commands

All commands run from `smarthome-dashboard/` (the root `npm run dev`/`npm run prod` via `runDev.sh`/`runProd.sh` just `cd` in, `npm i`, open the browser, then delegate to these):

- `npm run dev` — start the dev server (`node server.js`, not `next dev` — see below)
- `npm run build` — `next build`
- `npm start` — production server (`NODE_ENV=production node server.js`)
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

There is no test suite in this repo and no documented verification process — treat the following as a recommended manual checklist, not an established convention: run `npm run dev` and exercise the changed feature in the browser at `http://localhost:3000`; for API route changes (recipes CRUD, settings) hit the route with `curl` directly; since there's no device-emulation preset checked into the repo, approximate the 9:16 portrait kiosk layout by narrowing the devtools viewport rather than relying on a documented tool.

Local config required before running: copy `example.env.local` to `.env.local` (Google OAuth client id/secret for calendar, Jellyfin URL/API key, Home Assistant URL/token — see README for the Google Cloud Console OAuth setup steps). Runtime settings (music/photo location, theme, units, timezone) live in `smarthome-dashboard/settings.json`, edited through the Settings tab or `src/lib/settings.ts`, not env vars.

`package.json` has no `engines` field pinning a Node/npm version — nothing in the repo enforces or documents a minimum. The server always binds to `0.0.0.0:3000`, hardcoded in `server.js` (not env-configurable); that fixed address is what the SmartPan phone app and other LAN devices need to target.

## Architecture

### Custom server, not plain Next.js

`server.js` wraps Next in a raw `http` server so it can also run a `ws` `WebSocketServer` on the same port, upgrading connections at `/api/recipes/ws`. This is the live-sync channel for recipes (see below) — any change to how the server boots needs to preserve both the Next request handler and the WS upgrade path.

There's no explicit guard against duplicate `WebSocketServer` instances, but none is needed: `server.js` is the process entry point (`node server.js`), not a module Next compiles. Next's dev-mode Fast Refresh only hot-swaps compiled page/component modules through webpack — it never re-executes the top-level custom server script. `wss` and `global.wss` are created exactly once per process lifetime; a duplicate instance would only appear if the process itself were restarted, which is expected server-restart behavior, not a hot-reload bug.

### Page shell

`src/app/page.tsx` renders a fixed two-pane layout: `SmartArea` (top half) is a tab switcher between the feature pages in `src/pages/` (Pictures/Slideshow, Music, Home, Notes, Camera, Weather, Clock, Monitor, Jellyfin, Recipes, Settings — tab list in `src/components/SmartArea.tsx`), and `CalendarPanel` (bottom half) shows/edits Google Calendar events. Wrapping both is `KioskSleepMode` (`src/components/kiosk/`), which blanks the screen after an idle timeout and shows a clock/now-playing/calendar overlay instead — this is the kiosk behavior for the always-on touchscreen deployment.

The layout is fixed, not responsive: `.dashboard-root` locks to `height: 100vh` with no page-level scroll, and `.top-half`/`.bottom-half` split it 50/50 via `flex: 1`. New feature pages should assume this fixed viewport rather than a normal scrolling desktop layout — individual panels that can overflow (queues, lists, recipe detail body, etc.) use `overflow-y: auto` locally instead of letting the page scroll. Touch target sizing in `globals.css` is inconsistent — some interactive elements use `min-width`/`min-height: 44px` (the common accessible-touch-target minimum), others `36px` or `48px` — there's no single enforced minimum; new components should default to 44px unless there's a specific reason not to.

### Storage: flat files, no database

- `smarthome-dashboard/settings.json` — user settings, read/written via `src/lib/settings.ts` (`readSettings`/`writeSettings`, merged over `DEFAULTS`).
- `smarthome-dashboard/data/recipes.json` — recipe records, read/written directly with `fs.promises` inside the route handlers under `src/app/api/recipes/`.
- `smarthome-dashboard/data/shopping-note.json` — the single synced shopping note/checklist (see below), read/written directly with `fs.promises` inside `src/app/api/shopping-note/route.ts`.

Any new persisted feature should follow this same pattern unless there's a specific reason to deviate.

### Recipes: server-authoritative sync with the phone app

Recipes sync between this dashboard and the companion Android app ([SmartPan](https://github.com/Flosse02/SmartPan)). The Next server is the source of truth: every mutating route (`route.ts` POST/PUT/DELETE, plus `dedupe/` and `delete-all/`) writes `data/recipes.json` then calls a local `broadcast()` helper that pushes a typed message (`recipe_added`/`recipe_updated`/`recipe_deleted`) to every client on the `wss` WebSocket set on `global.wss` in `server.js`. Clients (the dashboard's `src/pages/Recipes.tsx` and the phone app) apply these messages live instead of polling. `Recipe.source` (`'local' | 'server'`) distinguishes device-local-only recipes from ones synced through the server — preserve this distinction when touching recipe code, since `dedupe` and `delete-all` intentionally only ever operate on server data and rely on `broadcast` to tell other clients what was removed rather than introducing new message types.

`local`-only recipes are excluded from `dedupe`/`delete-all` by construction, not by an explicit filter: both routes only ever read and write `data/recipes.json`, and `source: 'local'` recipes are never written to that file in the first place (they live only in the phone app's own local storage). The exclusion is permanent for as long as a recipe stays local — the only way one is reachable by `dedupe`/`delete-all` is if it's synced to the server first, at which point its `source` becomes `'server'`. There's no reconciliation path today, and the code comments in `dedupe/route.ts`/`delete-all/route.ts` confirm this is intentional.

WS message schema (undocumented anywhere else — this is the de facto contract with SmartPan, a separate repo, so any shape change here must be hand-coordinated with its WS client):
- `recipe_added`: `{ type: 'recipe_added', recipe: Recipe }`
- `recipe_updated`: `{ type: 'recipe_updated', recipe: Recipe }`
- `recipe_deleted`: `{ type: 'recipe_deleted', id: string }`

### Shopping note: same sync pattern, single object instead of a list

The Notes tab (`src/pages/Notes.tsx`) keeps its original sticky notes purely local (`localStorage`, untouched by sync) but also renders a permanent left-hand panel backed by `data/shopping-note.json` via `src/app/api/shopping-note/route.ts` (GET/PUT), broadcasting a `shopping_note_updated` message over the same `global.wss`/`/api/recipes/ws` socket used by Recipes — it's a generic app-wide channel despite the path name, not recipe-specific. The shopping panel is always a checklist (`ShoppingNote` in `src/app/types/shoppingNote.ts` is just `{ items: ShoppingItem[], updatedAt }`) — no note/text mode, unlike individual sticky notes (see below). Unlike recipes (a list of records with per-record add/update/delete), it's a single object; the whole object is replaced on every `PUT`, there's no per-item route.

`ShoppingItem` (`{ id, name, amount: number | null, unit, checked, recipeTitles: string[] }`) deliberately mirrors SmartPan's existing `ShoppingListItem` (`../shoppingList.ts` in that repo) field-for-field rather than using a simplified shape — that phone-side model is the mature one (it also feeds a home-screen widget and headless widget task), so the dashboard adapted to it instead of forcing a lossy flatten. `PUT` normalizes each item defensively (`normalizeItem` in the route) so a partial object still gets valid defaults, but a full round-trip from SmartPan should need no translation. This is the intended integration point for the phone app's shopping list, replacing whatever local-only implementation it has today.

Individual sticky notes, by contrast, each carry their own `mode: 'note' | 'checklist'` and can be freeform text or a per-note checklist (toggled via the small button in each note's header) — that per-note checklist uses a separate, simpler `NoteChecklistItem` (`{ id, text, checked }`, local to `Notes.tsx`) since a freeform note has no concept of amount/unit/recipe source. That per-note choice is local-only (`localStorage`), not synced.

WS message: `shopping_note_updated`: `{ type: 'shopping_note_updated', note: ShoppingNote }`

### External integrations

Each lives behind its own `src/app/api/<service>/route.ts` proxy and/or a `src/hooks/use*` hook, configured via env vars:
- **Google Calendar** — NextAuth (`src/app/api/auth/[...nextauth]/options.ts`, Google provider only) supplies the OAuth access token used by `api/calendar`.
- **Home Assistant** (`NEXT_PUBLIC_HA_URL`/`NEXT_PUBLIC_HA_TOKEN`) — `src/hooks/useSmartHome.ts` both REST-polls `/api/states` and holds open a raw Home Assistant WebSocket (`/api/websocket`) for live device state; it classifies entities into `speaker`/`speaker_group`/`tv`/`tablet`/`camera`/`light`/`person` using entity id prefix, device registry lookups (to find Google Cast groups) and heuristics on `friendly_name`/`icon`.
- **Jellyfin** — media library, playback and continue-watching data (`api/jellyfin`, `api/jellyfin-pi`).
- **Radarr/Sonarr** — movie/TV search & download requests from the Jellyfin tab (`api/radarr`, `api/sonarr`).
- **Weather** — `api/weather`.

**Known risk — Home Assistant token is exposed client-side.** `NEXT_PUBLIC_HA_URL`/`NEXT_PUBLIC_HA_TOKEN` use the `NEXT_PUBLIC_*` prefix, which Next.js bundles directly into client JS. This isn't just a theoretical risk from the prefix — the long-lived HA token is actually read with `process.env.NEXT_PUBLIC_HA_TOKEN` inside client code (`useSmartHome.ts`, `useDevices.ts`, `SmartHome.tsx`, `Camera.tsx`) and used to call the Home Assistant API straight from the browser. Anyone with access to the page (view-source, devtools network tab) can extract the token and call the HA API directly. This is also the one integration that doesn't follow this repo's own convention above — every other integration (Calendar, Jellyfin, Radarr/Sonarr, Weather) proxies through a server-side `api/<service>/route.ts` route that keeps credentials server-side; Home Assistant talks to the external API directly from the client instead. Acceptable only if this dashboard is guaranteed to never be reachable outside a trusted LAN — otherwise the fix is to route HA calls through a server-side proxy like the other integrations, not just to document the exposure.

### Conventions

- Import alias `@/*` → `smarthome-dashboard/src/*`.
- Feature UI goes in `src/pages/<Feature>.tsx` (despite the name, these are tab-content components, not Next.js routes — routing is entirely under `src/app/`); shared widgets go in `src/components/`.

There's no CI (no `.github/workflows` or other pipeline config) and no branch naming convention — commits go straight to `main`. Commit messages loosely follow a `<type>: <description>` shape (`feat:`, `doc:`, occasionally `Feat:`/`WIP:`) but it isn't enforced — capitalization and tense are inconsistent across history.

### Issues found and fixed during audit (2026-07-17)

- **`src/pages/Recipes.tsx` linked the wrong field.** The "View original ↗" link rendered `<a href={recipe.source}>`, but `recipe.source` is the sync-origin discriminator (`'local' | 'server'`), not a URL. Fixed to use `recipe.url`, the field actually captured on import.
- **`useSmartHome.ts` and `useDevices.ts` duplicated Home Assistant plumbing.** Both hooks independently redeclared `HA_URL`/`HA_TOKEN` from env and reimplemented the authenticated-fetch-to-HA pattern. Extracted the shared constants and a generic `haFetch()` helper into `src/lib/homeAssistant.ts`; both hooks now import from there. `useSmartHome.ts`'s `classifyDevice`/`toDevice` and `useDevices.ts`'s music-playback logic stayed put since they're genuinely different per-tab concerns, not duplication.