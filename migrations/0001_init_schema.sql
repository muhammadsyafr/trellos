-- Migration number: 0001 	 2026-08-24T10:30:05.661Z

CREATE TABLE boards (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  key       TEXT NOT NULL,
  title     TEXT NOT NULL,
  position  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_boards_key ON boards(key);

CREATE TABLE columns (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id  INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  position  INTEGER NOT NULL
);
CREATE INDEX idx_columns_board ON columns(board_id);

CREATE TABLE cards (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  column_id    INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  number       INTEGER NOT NULL,
  text         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  priority     TEXT NOT NULL DEFAULT 'Medium',
  tags         TEXT NOT NULL DEFAULT '[]',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  position     INTEGER NOT NULL
);
CREATE INDEX idx_cards_column ON cards(column_id);

CREATE TABLE card_history (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id          INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  from_column_id   INTEGER REFERENCES columns(id) ON DELETE SET NULL,
  to_column_id     INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  moved_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_card_history_card ON card_history(card_id);
