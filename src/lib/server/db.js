import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// DB path configurable for deployment (e.g. a mounted volume). Defaults to ./data/trellos.db
const DB_PATH = process.env.DATABASE_PATH || 'data/trellos.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS columns (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT NOT NULL,
    position  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cards (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id    INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    text         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    priority     TEXT NOT NULL DEFAULT 'Medium',
    tags         TEXT NOT NULL DEFAULT '[]',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    position     INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
`);

// Lightweight migrations for older DBs (ignore if column already exists)
for (const stmt of [
  `ALTER TABLE cards ADD COLUMN description TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE cards ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium'`,
  `ALTER TABLE cards ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE cards ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))`
]) {
  try { db.exec(stmt); } catch { /* column exists */ }
}

// Seed a default board on first run
const empty = db.prepare('SELECT COUNT(*) AS n FROM columns').get().n === 0;
if (empty) {
  const insCol = db.prepare('INSERT INTO columns (title, position) VALUES (?, ?)');
  const insCard = db.prepare(
    'INSERT INTO cards (column_id, text, description, priority, tags, position) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const todo = insCol.run('To Do', 0).lastInsertRowid;
  insCol.run('In Progress', 1);
  insCol.run('Done', 2);
  insCard.run(todo, 'Click a card to open details', 'Set a description, priority, tags, and status here — JIRA style.', 'High', '["feature","docs"]', 0);
  insCard.run(todo, 'Drag cards between lists', '', 'Medium', '["ui"]', 1);
}

export default db;

// ---- queries ----

const CARD_COLS = 'id, text, description, priority, tags, created_at AS createdAt';

// Parse the stored JSON tags column into a real array
function hydrate(card) {
  if (!card) return card;
  try { card.tags = JSON.parse(card.tags); } catch { card.tags = []; }
  return card;
}

export function getBoard() {
  const columns = db.prepare('SELECT id, title FROM columns ORDER BY position').all();
  const cardStmt = db.prepare(`SELECT ${CARD_COLS} FROM cards WHERE column_id = ? ORDER BY position`);
  return columns.map((c) => ({ ...c, cards: cardStmt.all(c.id).map(hydrate) }));
}

export function getCard(id) {
  return hydrate(db.prepare(`SELECT ${CARD_COLS}, column_id AS columnId FROM cards WHERE id = ?`).get(id));
}

export function addColumn(title) {
  const pos = db.prepare('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM columns').get().p;
  const id = db.prepare('INSERT INTO columns (title, position) VALUES (?, ?)').run(title, pos).lastInsertRowid;
  return { id, title, cards: [] };
}

export function renameColumn(id, title) {
  db.prepare('UPDATE columns SET title = ? WHERE id = ?').run(title, id);
}

export function deleteColumn(id) {
  db.prepare('DELETE FROM columns WHERE id = ?').run(id);
}

export function addCard(columnId, text) {
  const pos = db
    .prepare('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM cards WHERE column_id = ?')
    .get(columnId).p;
  const id = db
    .prepare('INSERT INTO cards (column_id, text, position) VALUES (?, ?, ?)')
    .run(columnId, text, pos).lastInsertRowid;
  return getCard(id);
}

// Partial update: any of { text, description, priority, tags }
export function updateCard(id, fields) {
  const allowed = ['text', 'description', 'priority', 'tags'];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return getCard(id);
  const vals = { ...fields };
  if (Array.isArray(vals.tags)) vals.tags = JSON.stringify(vals.tags);
  const set = keys.map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE cards SET ${set} WHERE id = @id`).run({ id, ...vals });
  return getCard(id);
}

// Move card to the end of another column (status change)
export function moveCard(id, columnId) {
  const pos = db
    .prepare('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM cards WHERE column_id = ?')
    .get(columnId).p;
  db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(columnId, pos, id);
  return getCard(id);
}

export function deleteCard(id) {
  db.prepare('DELETE FROM cards WHERE id = ?').run(id);
}

// Persist full ordering after a drag. payload: [{ id, cardIds: [...] }, ...]
export const reorder = db.transaction((columns) => {
  const moveC = db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?');
  const moveCol = db.prepare('UPDATE columns SET position = ? WHERE id = ?');
  columns.forEach((col, colPos) => {
    moveCol.run(colPos, col.id);
    col.cardIds.forEach((cardId, i) => moveC.run(col.id, i, cardId));
  });
});
