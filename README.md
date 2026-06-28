# Trellos

Simple, self-hosted Trello/JIRA-style board. No external integrations. Data lives in a local **SQLite** file.

Stack: **SvelteKit (Svelte 5)** · **better-sqlite3** · **svelte-dnd-action** · **adapter-node**.

## Features

- Lists + cards, drag to reorder and move between lists (persisted)
- Card detail modal (JIRA-style): title, description, **priority**, **status**, created date
- Add / rename / delete lists and cards
- Everything saved server-side in SQLite — survives restarts, ready for multi-device later

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
```

## Production

```bash
npm run build
npm start          # serves ./build on PORT (default 3000)
```

DB path is set by `DATABASE_PATH` (default `data/trellos.db`). See `.env.example`.

## Docker

```bash
docker build -t trellos .
docker run -p 3000:3000 -v trellos-data:/data trellos
```

The `-v trellos-data:/data` volume keeps the SQLite database across container rebuilds.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — tech stack, request flow, data model, full API reference
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — setup, commands, how to extend, reset/inspect the DB
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Docker, bare Node + systemd, reverse proxy, backups, platform notes
