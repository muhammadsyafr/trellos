# Architecture

## Tech stack

| Layer        | Choice                  | Why                                                            |
|--------------|-------------------------|---------------------------------------------------------------|
| Framework    | SvelteKit 2 (Svelte 5)  | One codebase for UI + server routes; runes for reactive state |
| Language     | JavaScript (ESM)        | No build-config overhead; type hints via JSDoc                |
| Build/dev    | Vite 6                  | Fast HMR dev server, production bundling                       |
| Database     | SQLite via better-sqlite3 | Single file, zero-config, synchronous → simple server code   |
| Drag & drop  | svelte-dnd-action       | Accessible list dnd with reorder + cross-list move            |
| Deploy target| @sveltejs/adapter-node  | Builds a plain Node server → runs anywhere Node runs / Docker |

No external services. No auth. No network calls beyond the app's own API. All state is in one SQLite file.

## Request flow

```
Browser (+page.svelte, Svelte 5 runes)
   │  initial load: SSR
   ▼
+page.server.js  load()  ──►  src/lib/server/db.js  ──►  SQLite file
   │
   │  mutations: fetch() to /api/*
   ▼
src/routes/api/**/+server.js  ──►  db.js queries  ──►  SQLite file
```

- **Reads**: `+page.server.js` `load()` runs on the server, calls `getBoard()`, returns the full board to the page.
- **Writes**: the page calls JSON endpoints under `/api`. Each endpoint calls a query function in `db.js`. The UI updates its local `$state` optimistically, so the board feels instant; the server is the source of truth on reload.

## Project layout

```
src/
  app.html                      HTML shell
  lib/server/db.js              SQLite connection, schema, seed, all queries
  routes/
    +page.server.js             load() → board data (SSR)
    +page.svelte                board UI, drag/drop, card detail modal
    api/
      columns/+server.js        POST   create list
      columns/[id]/+server.js   PATCH rename · DELETE list
      cards/+server.js          POST   create card
      cards/[id]/+server.js     GET · PATCH (text/desc/priority/move) · DELETE
      reorder/+server.js        POST   persist drag ordering
svelte.config.js                adapter-node
vite.config.js                  sveltekit plugin
Dockerfile / .dockerignore      container build
data/trellos.db                 SQLite file (created at runtime, git-ignored)
```

## Data model

```sql
columns(
  id        INTEGER PK,
  title     TEXT,
  position  INTEGER          -- order on the board
)

cards(
  id          INTEGER PK,
  column_id   INTEGER FK → columns(id) ON DELETE CASCADE,
  text        TEXT,          -- card title
  description TEXT,          -- long detail (JIRA-style)
  priority    TEXT,          -- Low | Medium | High | Urgent
  created_at  TEXT,          -- datetime('now'), UTC
  position    INTEGER        -- order within its column
)
```

- `ON DELETE CASCADE` + `PRAGMA foreign_keys = ON` → deleting a list deletes its cards.
- `PRAGMA journal_mode = WAL` → better read/write concurrency.
- Ordering is stored as `position` integers, rewritten wholesale by the `reorder` transaction after each drag.
- Schema is created on first boot; the `ALTER TABLE` block in `db.js` migrates older DBs forward safely.

## API reference

| Method | Path                | Body                                            | Returns        |
|--------|---------------------|-------------------------------------------------|----------------|
| POST   | `/api/columns`      | `{ title }`                                      | new column     |
| PATCH  | `/api/columns/:id`  | `{ title }`                                      | `{ ok }`       |
| DELETE | `/api/columns/:id`  | —                                               | `{ ok }`       |
| POST   | `/api/cards`        | `{ columnId, text }`                             | new card       |
| GET    | `/api/cards/:id`    | —                                               | card           |
| PATCH  | `/api/cards/:id`    | any of `{ text, description, priority, columnId }` | updated card |
| DELETE | `/api/cards/:id`    | —                                               | `{ ok }`       |
| POST   | `/api/reorder`      | `{ columns: [{ id, cardIds: [...] }] }`          | `{ ok }`       |

`PATCH /api/cards/:id` with `columnId` moves the card to the end of that list (status change from the detail modal). Other fields update in place.
