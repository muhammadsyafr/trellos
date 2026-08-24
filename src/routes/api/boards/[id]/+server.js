import { json, error } from '@sveltejs/kit';
import { getBoardData, renameBoard, setBoardKey, deleteBoard, getBoards } from '$lib/server/db.js';

export async function GET({ params, platform }) {
  return json(await getBoardData(platform.env.DB, Number(params.id)));
}

export async function PATCH({ params, request, platform }) {
  const d1 = platform.env.DB;
  const { title, key } = await request.json();
  if (title !== undefined) {
    if (!title.trim()) throw error(400, 'title required');
    await renameBoard(d1, Number(params.id), title.trim());
  }
  if (key !== undefined) {
    const clean = key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) throw error(400, 'key required');
    try {
      await setBoardKey(d1, Number(params.id), clean);
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw error(400, 'key already in use');
      throw e;
    }
  }
  return json({ ok: true });
}

export async function DELETE({ params, platform }) {
  const d1 = platform.env.DB;
  if ((await getBoards(d1)).length <= 1) throw error(400, 'cannot delete the only board');
  await deleteBoard(d1, Number(params.id));
  return json({ ok: true });
}
