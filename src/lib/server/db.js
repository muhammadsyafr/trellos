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
  CREATE TABLE IF NOT EXISTS boards (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    key       TEXT NOT NULL,
    title     TEXT NOT NULL,
    position  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS columns (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id  INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title     TEXT NOT NULL,
    position  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cards (
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
  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
  CREATE TABLE IF NOT EXISTS card_history (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id          INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    from_column_id   INTEGER REFERENCES columns(id) ON DELETE SET NULL,
    to_column_id     INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    moved_at         TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_card_history_card ON card_history(card_id);
`);

// Lightweight migrations for older DBs (ignore if column already exists).
// SQLite forbids a non-constant default (e.g. datetime('now')) in ALTER TABLE ADD COLUMN,
// so updated_at is added bare and backfilled from created_at below.
for (const stmt of [
  `ALTER TABLE cards ADD COLUMN description TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE cards ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium'`,
  `ALTER TABLE cards ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE cards ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))`,
  `ALTER TABLE cards ADD COLUMN updated_at TEXT`,
  `ALTER TABLE columns ADD COLUMN board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE`,
  `ALTER TABLE boards ADD COLUMN key TEXT`,
  `ALTER TABLE cards ADD COLUMN number INTEGER`
]) {
  try { db.exec(stmt); } catch { /* column exists */ }
}
db.exec(`UPDATE cards SET updated_at = created_at WHERE updated_at IS NULL`);
// board_id may have just been added by the migration above (legacy DBs), so the index
// on it can only be created now — creating it in the initial db.exec would fail on those DBs.
db.exec(`CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id)`);

// Legacy DBs from before multi-board support: any column missing a board_id
// (i.e. it predates the boards table) gets bucketed into one board so nothing is orphaned.
const orphanColumns = db.prepare('SELECT COUNT(*) AS n FROM columns WHERE board_id IS NULL').get().n;
if (orphanColumns > 0) {
  const legacyBoardId = db.prepare('INSERT INTO boards (title, position) VALUES (?, 0)').run('My Board').lastInsertRowid;
  db.prepare('UPDATE columns SET board_id = ? WHERE board_id IS NULL').run(legacyBoardId);
}

// Derive a short JIRA-style key from a title (multi-word -> initials, single word -> first
// 2 letters), disambiguated against a set of keys already taken.
function deriveBoardKey(title, taken) {
  const words = title.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  let base = words.length >= 2 ? words.map((w) => w[0]).join('').slice(0, 4) : (words[0] || 'BRD').slice(0, 2);
  if (!base) base = 'BRD';
  let key = base;
  let n = 2;
  while (taken.has(key)) key = `${base}${n++}`;
  taken.add(key);
  return key;
}

// Legacy boards from before board keys existed: assign each one a unique key.
const keylessBoards = db.prepare('SELECT id, title FROM boards WHERE key IS NULL ORDER BY id').all();
if (keylessBoards.length) {
  const taken = new Set(db.prepare('SELECT key FROM boards WHERE key IS NOT NULL').all().map((r) => r.key));
  const setKey = db.prepare('UPDATE boards SET key = ? WHERE id = ?');
  for (const b of keylessBoards) setKey.run(deriveBoardKey(b.title, taken), b.id);
}
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_boards_key ON boards(key)`);

// Legacy cards from before per-board card numbers existed: number them per board,
// in creation order, so JIRA-style links (KEY + number) are stable from here on.
const numberlessBoardIds = db
  .prepare(
    `SELECT DISTINCT col.board_id AS boardId FROM cards c
     JOIN columns col ON col.id = c.column_id WHERE c.number IS NULL`
  )
  .all()
  .map((r) => r.boardId);
if (numberlessBoardIds.length) {
  const cardsOf = db.prepare(
    `SELECT c.id FROM cards c JOIN columns col ON col.id = c.column_id
     WHERE col.board_id = ? ORDER BY c.id`
  );
  const setNumber = db.prepare('UPDATE cards SET number = ? WHERE id = ?');
  for (const boardId of numberlessBoardIds) {
    cardsOf.all(boardId).forEach((c, i) => setNumber.run(i + 1, c.id));
  }
}

// Seed a default board on a genuinely fresh DB
const empty = db.prepare('SELECT COUNT(*) AS n FROM boards').get().n === 0;
if (empty) {
  const boardId = db.prepare('INSERT INTO boards (key, title, position) VALUES (?, ?, ?)').run('MB', 'My Board', 0).lastInsertRowid;
  const insCol = db.prepare('INSERT INTO columns (board_id, title, position) VALUES (?, ?, ?)');
  const insCard = db.prepare(
    'INSERT INTO cards (column_id, number, text, description, priority, tags, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const todo = insCol.run(boardId, 'To Do', 0).lastInsertRowid;
  insCol.run(boardId, 'In Progress', 1);
  insCol.run(boardId, 'Done', 2);
  insCard.run(todo, 1, 'Click a card to open details', 'Set a description, priority, tags, and status here — JIRA style.', 'High', '["feature","docs"]', 0);
  insCard.run(todo, 2, 'Drag cards between lists', '', 'Medium', '["ui"]', 1);
}

export default db;

// ---- queries ----

const CARD_COLS = 'id, number, text, description, priority, tags, created_at AS createdAt, updated_at AS updatedAt';

// Parse the stored JSON tags column into a real array
function hydrate(card) {
  if (!card) return card;
  try { card.tags = JSON.parse(card.tags); } catch { card.tags = []; }
  return card;
}

export function getBoards() {
  return db.prepare('SELECT id, key, title FROM boards ORDER BY position').all();
}

export function addBoard(title) {
  const taken = new Set(db.prepare('SELECT key FROM boards').all().map((r) => r.key));
  const key = deriveBoardKey(title, taken);
  const pos = db.prepare('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM boards').get().p;
  const id = db.prepare('INSERT INTO boards (key, title, position) VALUES (?, ?, ?)').run(key, title, pos).lastInsertRowid;
  return { id, key, title };
}

export function renameBoard(id, title) {
  db.prepare('UPDATE boards SET title = ? WHERE id = ?').run(title, id);
}

// Throws (SqliteError, UNIQUE constraint) if the key is already taken by another board
export function setBoardKey(id, key) {
  db.prepare('UPDATE boards SET key = ? WHERE id = ?').run(key, id);
}

export function deleteBoard(id) {
  db.prepare('DELETE FROM boards WHERE id = ?').run(id);
}

// Columns + cards for one board (the switchable "workspace")
export function getBoardData(boardId) {
  const board = db.prepare('SELECT key FROM boards WHERE id = ?').get(boardId);
  const columns = db.prepare('SELECT id, title FROM columns WHERE board_id = ? ORDER BY position').all(boardId);
  const cardStmt = db.prepare(`SELECT ${CARD_COLS} FROM cards WHERE column_id = ? ORDER BY position`);
  return columns.map((c) => ({
    ...c,
    cards: cardStmt.all(c.id).map(hydrate).map((card) => ({ ...card, code: `${board.key}-${card.number}` }))
  }));
}

export function getCard(id) {
  const card = hydrate(db.prepare(`SELECT ${CARD_COLS}, column_id AS columnId FROM cards WHERE id = ?`).get(id));
  if (!card) return card;
  const board = db
    .prepare(`SELECT b.id AS boardId, b.key AS boardKey FROM boards b JOIN columns c ON c.board_id = b.id WHERE c.id = ?`)
    .get(card.columnId);
  card.boardId = board?.boardId ?? null;
  card.code = board ? `${board.boardKey}-${card.number}` : null;
  card.history = getCardHistory(id);
  return card;
}

// Resolve a JIRA-style code like "MB-1" to its card id + board id, or null if unknown.
// The hyphen is a hard separator, not cosmetic: a board key that ends in a digit (e.g.
// "Board 2" -> "B2") makes key+number ambiguous to re-split without one ("B21" could be
// key "B" number 21, or key "B2" number 1) — the hyphen removes that ambiguity entirely.
export function getCardByCode(rawCode) {
  const m = /^([A-Za-z0-9]+)-(\d+)$/.exec((rawCode || '').trim());
  if (!m) return null;
  const [, key, number] = m;
  const row = db
    .prepare(
      `SELECT c.id AS id, b.id AS boardId FROM cards c
       JOIN columns col ON col.id = c.column_id
       JOIN boards b ON b.id = col.board_id
       WHERE b.key = ? AND c.number = ?`
    )
    .get(key.toUpperCase(), Number(number));
  return row || null;
}

// Column-move log for a card, most recent first
export function getCardHistory(cardId) {
  return db
    .prepare(
      `SELECT h.id, h.moved_at AS movedAt, fc.title AS fromTitle, tc.title AS toTitle
       FROM card_history h
       LEFT JOIN columns fc ON fc.id = h.from_column_id
       JOIN columns tc ON tc.id = h.to_column_id
       WHERE h.card_id = ?
       ORDER BY h.moved_at DESC, h.id DESC`
    )
    .all(cardId);
}

export function addColumn(boardId, title) {
  const pos = db.prepare('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM columns WHERE board_id = ?').get(boardId).p;
  const id = db
    .prepare('INSERT INTO columns (board_id, title, position) VALUES (?, ?, ?)')
    .run(boardId, title, pos).lastInsertRowid;
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
  const { board_id: boardId } = db.prepare('SELECT board_id FROM columns WHERE id = ?').get(columnId);
  const number = db
    .prepare(
      `SELECT COALESCE(MAX(c.number), 0) + 1 AS n FROM cards c
       JOIN columns col ON col.id = c.column_id WHERE col.board_id = ?`
    )
    .get(boardId).n;
  const id = db
    .prepare(`INSERT INTO cards (column_id, number, text, position, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`)
    .run(columnId, number, text, pos).lastInsertRowid;
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
  const current = db.prepare('SELECT column_id FROM cards WHERE id = ?').get(id);
  if (!current) return getCard(id);
  const fromColumnId = current.column_id;
  if (fromColumnId === columnId) return getCard(id);
  const pos = db
    .prepare('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM cards WHERE column_id = ?')
    .get(columnId).p;
  db.prepare(`UPDATE cards SET column_id = ?, position = ?, updated_at = datetime('now') WHERE id = ?`).run(columnId, pos, id);
  db.prepare('INSERT INTO card_history (card_id, from_column_id, to_column_id) VALUES (?, ?, ?)').run(id, fromColumnId, columnId);
  return getCard(id);
}

export function deleteCard(id) {
  db.prepare('DELETE FROM cards WHERE id = ?').run(id);
}

// Persist full ordering after a drag. payload: [{ id, cardIds: [...] }, ...]
export const reorder = db.transaction((columns) => {
  const getColOf = db.prepare('SELECT column_id FROM cards WHERE id = ?');
  const moveSameCol = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
  const moveNewCol = db.prepare(`UPDATE cards SET column_id = ?, position = ?, updated_at = datetime('now') WHERE id = ?`);
  const moveCol = db.prepare('UPDATE columns SET position = ? WHERE id = ?');
  const logMove = db.prepare('INSERT INTO card_history (card_id, from_column_id, to_column_id) VALUES (?, ?, ?)');
  columns.forEach((col, colPos) => {
    moveCol.run(colPos, col.id);
    col.cardIds.forEach((cardId, i) => {
      const prev = getColOf.get(cardId);
      if (prev && prev.column_id !== col.id) {
        moveNewCol.run(col.id, i, cardId);
        logMove.run(cardId, prev.column_id, col.id);
      } else {
        moveSameCol.run(i, cardId);
      }
    });
  });
});
