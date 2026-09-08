-- Migration number: 0002 	 2026-09-08T00:00:00.000Z
-- Adds authentication (users + server-side sessions) and scopes boards to an owner.

CREATE TABLE users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT NOT NULL,
  name           TEXT NOT NULL,
  -- Encoded PBKDF2 verifier: pbkdf2$sha256$<iterations>$<salt_b64>$<derived_b64>.
  -- The iteration count travels with the hash so it can be raised without a migration.
  password_hash  TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Emails are stored already lowercased, so a plain unique index is enough
CREATE UNIQUE INDEX idx_users_email ON users(email);

CREATE TABLE sessions (
  -- SHA-256 of the cookie token, never the token itself: a dump of this table
  -- cannot be replayed as a login.
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

-- Nullable so the ALTER is legal on an existing table. Boards left with a NULL
-- owner are invisible to every user; see scripts/create-user.mjs --claim-orphans
-- to hand pre-auth boards to a real account.
ALTER TABLE boards ADD COLUMN owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_boards_owner ON boards(owner_id);
