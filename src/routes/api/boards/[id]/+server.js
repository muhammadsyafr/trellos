import { json, error } from '@sveltejs/kit';
import { getBoardData, renameBoard, setBoardKey, deleteBoard, getBoards, ownsBoard } from '$lib/server/db.js';

// A board the caller doesn't own is reported as 404, not 403: 403 would confirm the id exists
async function requireBoard(d1, userId, id) {
  if (!Number.isInteger(id) || !(await ownsBoard(d1, userId, id))) throw error(404, 'board not found');
  return id;
}

export async function GET({ params, platform, locals }) {
  const d1 = platform.env.DB;
  const id = await requireBoard(d1, locals.user.id, Number(params.id));
  return json(await getBoardData(d1, id));
}

export async function PATCH({ params, request, platform, locals }) {
  const d1 = platform.env.DB;
  const id = await requireBoard(d1, locals.user.id, Number(params.id));
  const { title, key } = await request.json();
  if (title !== undefined) {
    if (!title.trim()) throw error(400, 'title required');
    await renameBoard(d1, id, title.trim());
  }
  if (key !== undefined) {
    const clean = key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) throw error(400, 'key required');
    try {
      await setBoardKey(d1, id, clean);
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw error(400, 'key already in use');
      throw e;
    }
  }
  return json({ ok: true });
}

export async function DELETE({ params, platform, locals }) {
  const d1 = platform.env.DB;
  const id = await requireBoard(d1, locals.user.id, Number(params.id));
  if ((await getBoards(d1, locals.user.id)).length <= 1) throw error(400, 'cannot delete the only board');
  await deleteBoard(d1, id);
  return json({ ok: true });
}
