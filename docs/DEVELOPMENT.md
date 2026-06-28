# Development

## Prerequisites

- **Node.js 20+** (developed on Node 26). `node -v`
- npm (ships with Node)
- A C toolchain is **not** usually needed — `better-sqlite3` ships prebuilt binaries. If your platform has none, install build tools (`xcode-select --install` on macOS, `build-essential` + `python3` on Debian/Ubuntu).

## Setup

```bash
npm install
```

> If install prints `packages have install scripts not yet covered by allowScripts`,
> approve the native builds once:
> ```bash
> npm approve-scripts better-sqlite3
> npm approve-scripts esbuild
> ```
> This records them under `allowScripts` in `package.json`.

## Run the dev server

```bash
npm run dev          # http://localhost:5173, hot reload
```

The SQLite file is created automatically at `data/trellos.db` on first run and seeded with a default board (To Do / In Progress / Done).

## Useful commands

| Command            | What it does                                        |
|--------------------|-----------------------------------------------------|
| `npm run dev`      | Vite dev server with HMR                             |
| `npm run build`    | Production build into `./build` (adapter-node)       |
| `npm run preview`  | Serve the production build locally to sanity-check   |
| `npm start`        | `node build` — run the built server                  |
| `npx svelte-kit sync` | Regenerate `.svelte-kit` types (run after config changes) |

## Where to make changes

- **UI / interactions** → `src/routes/+page.svelte` (board, drag/drop, detail modal, styles).
- **Data + queries** → `src/lib/server/db.js` (schema, seed, all SQL).
- **Endpoints** → `src/routes/api/**/+server.js`.
- **Initial page data** → `src/routes/+page.server.js`.

### Adding a card field (example workflow)

1. Add the column in `db.js` schema **and** an `ALTER TABLE ... ADD COLUMN` line in the migration block.
2. Include it in `CARD_COLS` and in `updateCard`'s `allowed` list.
3. Accept it in `src/routes/api/cards/[id]/+server.js` PATCH.
4. Render/edit it in the detail modal in `+page.svelte`.

## Reset / inspect the database

```bash
# wipe and reseed (stop the dev server first)
rm -f data/trellos.db data/trellos.db-*

# peek at contents
node -e "const D=require('better-sqlite3');const d=new D('data/trellos.db');console.log(d.prepare('select * from cards').all())"
```

Any SQLite client works too (`sqlite3 data/trellos.db`, DB Browser for SQLite, etc.).

## Notes

- The DB connection is synchronous (better-sqlite3) — fine for a single-process self-hosted app. Don't run multiple writer processes against the same file.
- Times are stored UTC; the UI converts to local time in the detail modal.
