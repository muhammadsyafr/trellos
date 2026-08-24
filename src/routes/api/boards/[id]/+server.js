import { json, error } from '@sveltejs/kit';
import { getBoardData, renameBoard, setBoardKey, deleteBoard, getBoards } from '$lib/server/db.js';

export async function GET({ params }) {
  return json(getBoardData(Number(params.id)));
}

export async function PATCH({ params, request }) {
  const { title, key } = await request.json();
  if (title !== undefined) {
    if (!title.trim()) throw error(400, 'title required');
    renameBoard(Number(params.id), title.trim());
  }
  if (key !== undefined) {
    const clean = key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) throw error(400, 'key required');
    try {
      setBoardKey(Number(params.id), clean);
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw error(400, 'key already in use');
      throw e;
    }
  }
  return json({ ok: true });
}

export async function DELETE({ params }) {
  if (getBoards().length <= 1) throw error(400, 'cannot delete the only board');
  deleteBoard(Number(params.id));
  return json({ ok: true });
}
