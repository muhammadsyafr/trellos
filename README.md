# Trellos

Simple, self-hosted Trello/JIRA-style board. No external integrations. Data lives in a local **SQLite** file.

Stack: **SvelteKit (Svelte 5)** · **better-sqlite3** · **svelte-dnd-action** · **adapter-node**.

## Features

- Lists + cards, drag to reorder and move between lists (persisted)
- Card detail modal (JIRA-style): title, description, **priority**, **status**, created date
- Add / rename / delete lists and cards
- Everything saved server-side in SQLite — survives restarts, ready for multi-device later
- Email + password accounts; every board, list and card is private to its owner

## Accounts

Sign-up (`/signup`) and sign-in (`/signin`) are the only pages reachable without a session;
everything else redirects there, and `/api/*` answers `401`. Passwords are stored as
PBKDF2-HMAC-SHA256 verifiers and sessions are server-side rows keyed by a digest of the
cookie, so neither the database nor a stolen dump yields a usable credential.

Apply the auth migration before first run:

```bash
npx wrangler d1 migrations apply trellos-db --local    # drop --local for production
```

Boards created before this migration have no owner and are invisible to everyone. To create
the first account outside the sign-up form — and optionally hand it those pre-auth boards:

```bash
printf '%s' 'the-password' | node scripts/create-user.mjs you@example.com "Your Name" --claim-orphans > /tmp/seed.sql
npx wrangler d1 execute trellos-db --local --file=/tmp/seed.sql
rm /tmp/seed.sql
```

The password is read from stdin rather than argv so it stays out of shell history and the
process table; only the derived verifier reaches the generated SQL.

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
