# Deployment

The app builds to a self-contained Node server (`@sveltejs/adapter-node`). It needs:
- a Node 20+ runtime, and
- a writable path for the SQLite file (`DATABASE_PATH`).

That's it — no database server, no external services.

## Configuration

| Env var         | Default            | Purpose                                  |
|-----------------|--------------------|------------------------------------------|
| `DATABASE_PATH` | `data/trellos.db`  | SQLite file location (use a persistent volume) |
| `PORT`          | `3000`             | Port the server listens on               |
| `HOST`          | `0.0.0.0`          | Bind address                             |
| `ORIGIN`        | —                  | Public URL, e.g. `https://board.example.com` (set this behind a proxy/HTTPS to avoid CSRF form errors) |

See `.env.example`.

## Option 1 — Docker (recommended)

```bash
docker build -t trellos .
docker run -d --name trellos \
  -p 3000:3000 \
  -v trellos-data:/data \
  -e ORIGIN=http://localhost:3000 \
  trellos
```

- The named volume `trellos-data` keeps the database across image rebuilds — the container sets `DATABASE_PATH=/data/trellos.db`.
- Upgrade: `docker build` a new image, `docker rm -f trellos`, `docker run` again with the same `-v`. Data persists.

### docker-compose

```yaml
services:
  trellos:
    build: .
    ports:
      - "3000:3000"
    environment:
      ORIGIN: http://localhost:3000
    volumes:
      - trellos-data:/data
    restart: unless-stopped
volumes:
  trellos-data:
```

## Option 2 — bare Node (VPS)

```bash
git clone <repo> && cd trellos
npm ci
npm run build
DATABASE_PATH=/var/lib/trellos/trellos.db PORT=3000 ORIGIN=https://board.example.com node build
```

### Keep it running with systemd

`/etc/systemd/system/trellos.service`:

```ini
[Unit]
Description=Trellos board
After=network.target

[Service]
WorkingDirectory=/opt/trellos
ExecStart=/usr/bin/node build
Environment=PORT=3000
Environment=DATABASE_PATH=/var/lib/trellos/trellos.db
Environment=ORIGIN=https://board.example.com
Restart=always
User=trellos

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now trellos
sudo systemctl status trellos
```

## Reverse proxy (HTTPS)

Put nginx/Caddy in front and set `ORIGIN` to the public HTTPS URL.

Caddy (auto-HTTPS):

```
board.example.com {
    reverse_proxy localhost:3000
}
```

nginx:

```nginx
server {
    server_name board.example.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Platform notes

- **VPS / homelab / Docker host** — fully supported, this is the target.
- **Fly.io / Render / Railway** — works; attach a persistent volume and point `DATABASE_PATH` at it. Without a volume the SQLite file is wiped on every redeploy.
- **Vercel / Netlify / Cloudflare (serverless)** — **not suitable.** SQLite needs a persistent local disk and a long-lived process; serverless gives neither. Use a VPS/container, or swap the storage layer (e.g. Turso/libSQL or Postgres) if you must go serverless.

## Backups

The whole app is one file. Back it up while running with SQLite's online backup:

```bash
sqlite3 /var/lib/trellos/trellos.db ".backup '/backups/trellos-$(date +%F).db'"
```

Or, with the app stopped, copy `trellos.db` (plus any `-wal`/`-shm` files). Restore by putting the file back at `DATABASE_PATH`.

## Health check

`GET /` returns 200 once the server is up — usable as a container/orchestrator health probe.
```bash
curl -fsS http://localhost:3000/ >/dev/null && echo healthy
```
