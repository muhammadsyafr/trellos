// D1 (Cloudflare's serverless SQLite) query layer. Every function takes the D1 binding
// (event.platform.env.DB) as its first argument — D1 is only available per-request, not
// as a module-level singleton, so there's no persistent connection to hold onto here.
// Schema lives in migrations/ (applied via `wrangler d1 migrations apply`), not in this file.

const CARD_COLS = 'id, number, text, description, priority, tags, created_at AS createdAt, updated_at AS updatedAt';

// Parse the stored JSON tags column into a real array
function hydrate(card) {
  if (!card) return card;
  try { card.tags = JSON.parse(card.tags); } catch { card.tags = []; }
  return card;
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

export async function getBoards(d1, userId) {
  const { results } = await d1
    .prepare('SELECT id, key, title FROM boards WHERE owner_id = ? ORDER BY position')
    .bind(userId)
    .all();
  return results;
}

// Board keys stay globally unique, not per-user: the /:code deep link (/MB-1) resolves a
// key with no user in the URL, so two owners sharing a key would make those links ambiguous.
export async function addBoard(d1, userId, title) {
  const { results: existing } = await d1.prepare('SELECT key FROM boards').all();
  const taken = new Set(existing.map((r) => r.key));
  const key = deriveBoardKey(title, taken);
  const { p } = await d1
    .prepare('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM boards WHERE owner_id = ?')
    .bind(userId)
    .first();
  const { meta } = await d1
    .prepare('INSERT INTO boards (key, title, position, owner_id) VALUES (?, ?, ?, ?)')
    .bind(key, title, p, userId)
    .run();
  return { id: meta.last_row_id, key, title };
}

export async function renameBoard(d1, id, title) {
  await d1.prepare('UPDATE boards SET title = ? WHERE id = ?').bind(title, id).run();
}

// Throws (D1_ERROR, UNIQUE constraint) if the key is already taken by another board
export async function setBoardKey(d1, id, key) {
  await d1.prepare('UPDATE boards SET key = ? WHERE id = ?').bind(key, id).run();
}

export async function deleteBoard(d1, id) {
  await d1.prepare('DELETE FROM boards WHERE id = ?').bind(id).run();
}

// Columns + cards for one board (the switchable "workspace")
export async function getBoardData(d1, boardId) {
  const board = await d1.prepare('SELECT key FROM boards WHERE id = ?').bind(boardId).first();
  const { results: columns } = await d1
    .prepare('SELECT id, title FROM columns WHERE board_id = ? ORDER BY position')
    .bind(boardId)
    .all();
  const out = [];
  for (const col of columns) {
    const { results: cards } = await d1
      .prepare(`SELECT ${CARD_COLS} FROM cards WHERE column_id = ? ORDER BY position`)
      .bind(col.id)
      .all();
    out.push({ ...col, cards: cards.map(hydrate).map((card) => ({ ...card, code: `${board.key}-${card.number}` })) });
  }
  return out;
}

export async function getCard(d1, id) {
  const row = await d1.prepare(`SELECT ${CARD_COLS}, column_id AS columnId FROM cards WHERE id = ?`).bind(id).first();
  if (!row) return null;
  const card = hydrate(row);
  const board = await d1
    .prepare(`SELECT b.id AS boardId, b.key AS boardKey FROM boards b JOIN columns c ON c.board_id = b.id WHERE c.id = ?`)
    .bind(card.columnId)
    .first();
  card.boardId = board?.boardId ?? null;
  card.code = board ? `${board.boardKey}-${card.number}` : null;
  card.history = await getCardHistory(d1, id);
  return card;
}

// Resolve a JIRA-style code like "MB-1" to its card id + board id, or null if unknown.
// The hyphen is a hard separator, not cosmetic: a board key that ends in a digit (e.g.
// "Board 2" -> "B2") makes key+number ambiguous to re-split without one ("B21" could be
// key "B" number 21, or key "B2" number 1) — the hyphen removes that ambiguity entirely.
export async function getCardByCode(d1, rawCode, userId) {
  const m = /^([A-Za-z0-9]+)-(\d+)$/.exec((rawCode || '').trim());
  if (!m) return null;
  const [, key, number] = m;
  const row = await d1
    .prepare(
      `SELECT c.id AS id, b.id AS boardId FROM cards c
       JOIN columns col ON col.id = c.column_id
       JOIN boards b ON b.id = col.board_id
       WHERE b.key = ? AND c.number = ? AND b.owner_id = ?`
    )
    .bind(key.toUpperCase(), Number(number), userId)
    .first();
  return row || null;
}

// Column-move log for a card, most recent first
export async function getCardHistory(d1, cardId) {
  const { results } = await d1
    .prepare(
      `SELECT h.id, h.moved_at AS movedAt, fc.title AS fromTitle, tc.title AS toTitle
       FROM card_history h
       LEFT JOIN columns fc ON fc.id = h.from_column_id
       JOIN columns tc ON tc.id = h.to_column_id
       WHERE h.card_id = ?
       ORDER BY h.moved_at DESC, h.id DESC`
    )
    .bind(cardId)
    .all();
  return results;
}

export async function addColumn(d1, boardId, title) {
  const { p } = await d1.prepare('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM columns WHERE board_id = ?').bind(boardId).first();
  const { meta } = await d1
    .prepare('INSERT INTO columns (board_id, title, position) VALUES (?, ?, ?)')
    .bind(boardId, title, p)
    .run();
  return { id: meta.last_row_id, title, cards: [] };
}

export async function renameColumn(d1, id, title) {
  await d1.prepare('UPDATE columns SET title = ? WHERE id = ?').bind(title, id).run();
}

export async function deleteColumn(d1, id) {
  await d1.prepare('DELETE FROM columns WHERE id = ?').bind(id).run();
}

export async function addCard(d1, columnId, text) {
  const { p } = await d1.prepare('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM cards WHERE column_id = ?').bind(columnId).first();
  const { board_id: boardId } = await d1.prepare('SELECT board_id FROM columns WHERE id = ?').bind(columnId).first();
  const { n } = await d1
    .prepare(
      `SELECT COALESCE(MAX(c.number), 0) + 1 AS n FROM cards c
       JOIN columns col ON col.id = c.column_id WHERE col.board_id = ?`
    )
    .bind(boardId)
    .first();
  const { meta } = await d1
    .prepare(`INSERT INTO cards (column_id, number, text, position, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`)
    .bind(columnId, n, text, p)
    .run();
  return getCard(d1, meta.last_row_id);
}

// Partial update: any of { text, description, priority, tags }
export async function updateCard(d1, id, fields) {
  const allowed = ['text', 'description', 'priority', 'tags'];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return getCard(d1, id);
  const vals = { ...fields };
  if (Array.isArray(vals.tags)) vals.tags = JSON.stringify(vals.tags);
  const set = keys.map((k) => `${k} = ?`).join(', ');
  await d1.prepare(`UPDATE cards SET ${set} WHERE id = ?`).bind(...keys.map((k) => vals[k]), id).run();
  return getCard(d1, id);
}

// Move card to the end of another column (status change)
export async function moveCard(d1, id, columnId) {
  const current = await d1.prepare('SELECT column_id FROM cards WHERE id = ?').bind(id).first();
  if (!current) return getCard(d1, id);
  const fromColumnId = current.column_id;
  if (fromColumnId === columnId) return getCard(d1, id);
  const { p } = await d1.prepare('SELECT COALESCE(MAX(position) + 1, 0) AS p FROM cards WHERE column_id = ?').bind(columnId).first();
  await d1.batch([
    d1.prepare(`UPDATE cards SET column_id = ?, position = ?, updated_at = datetime('now') WHERE id = ?`).bind(columnId, p, id),
    d1.prepare('INSERT INTO card_history (card_id, from_column_id, to_column_id) VALUES (?, ?, ?)').bind(id, fromColumnId, columnId)
  ]);
  return getCard(d1, id);
}

export async function deleteCard(d1, id) {
  await d1.prepare('DELETE FROM cards WHERE id = ?').bind(id).run();
}

// Persist full ordering after a drag. payload: [{ id, cardIds: [...] }, ...]
// D1 has no imperative-transaction API (no read-then-branch inside one atomic unit like
// better-sqlite3's db.transaction) — so reads happen first (sequential awaits), then every
// write goes into one d1.batch() call, which D1 runs atomically.
export async function reorder(d1, columns) {
  const moves = [];
  for (const col of columns) {
    for (let i = 0; i < col.cardIds.length; i++) {
      const cardId = col.cardIds[i];
      const prev = await d1.prepare('SELECT column_id FROM cards WHERE id = ?').bind(cardId).first();
      moves.push({ cardId, colId: col.id, pos: i, prevColumnId: prev?.column_id ?? null });
    }
  }

  const stmts = columns.map((col, colPos) =>
    d1.prepare('UPDATE columns SET position = ? WHERE id = ?').bind(colPos, col.id)
  );
  for (const m of moves) {
    if (m.prevColumnId !== null && m.prevColumnId !== m.colId) {
      stmts.push(
        d1.prepare(`UPDATE cards SET column_id = ?, position = ?, updated_at = datetime('now') WHERE id = ?`).bind(m.colId, m.pos, m.cardId)
      );
      stmts.push(
        d1.prepare('INSERT INTO card_history (card_id, from_column_id, to_column_id) VALUES (?, ?, ?)').bind(m.cardId, m.prevColumnId, m.colId)
      );
    } else {
      stmts.push(d1.prepare('UPDATE cards SET position = ? WHERE id = ?').bind(m.pos, m.cardId));
    }
  }
  await d1.batch(stmts);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUserByEmail(d1, email) {
  return d1
    .prepare('SELECT id, email, name, password_hash AS passwordHash FROM users WHERE email = ?')
    .bind(email)
    .first();
}

// Throws (D1_ERROR, UNIQUE constraint) if the email is already registered
export async function createUser(d1, { email, name, passwordHash }) {
  const { meta } = await d1
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
    .bind(email, name, passwordHash)
    .run();
  return { id: meta.last_row_id, email, name };
}

// ---------------------------------------------------------------------------
// Ownership guards
//
// Boards carry the owner; columns and cards inherit it through their parent. Every
// mutating endpoint resolves ownership before touching a row, so a signed-in user
// cannot reach another user's board by guessing an id.
// ---------------------------------------------------------------------------

export async function ownsBoard(d1, userId, boardId) {
  const row = await d1.prepare('SELECT 1 AS ok FROM boards WHERE id = ? AND owner_id = ?').bind(boardId, userId).first();
  return !!row;
}

export async function ownsColumn(d1, userId, columnId) {
  const row = await d1
    .prepare(
      `SELECT 1 AS ok FROM columns c JOIN boards b ON b.id = c.board_id
       WHERE c.id = ? AND b.owner_id = ?`
    )
    .bind(columnId, userId)
    .first();
  return !!row;
}

export async function ownsCard(d1, userId, cardId) {
  const row = await d1
    .prepare(
      `SELECT 1 AS ok FROM cards ca
       JOIN columns c ON c.id = ca.column_id
       JOIN boards b ON b.id = c.board_id
       WHERE ca.id = ? AND b.owner_id = ?`
    )
    .bind(cardId, userId)
    .first();
  return !!row;
}

// A fresh account with zero boards would render a header bound to an undefined board,
// so every new user starts with one board and the three default lists.
export async function seedWorkspace(d1, userId) {
  const board = await addBoard(d1, userId, 'My Board');
  for (const title of ['To Do', 'In Progress', 'Done']) await addColumn(d1, board.id, title);
  return board;
}
