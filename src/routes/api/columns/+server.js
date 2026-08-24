import { json, error } from '@sveltejs/kit';
import { addColumn } from '$lib/server/db.js';

export async function POST({ request, platform }) {
  const { boardId, title } = await request.json();
  if (!boardId) throw error(400, 'boardId required');
  if (!title?.trim()) throw error(400, 'title required');
  return json(await addColumn(platform.env.DB, Number(boardId), title.trim()));
}
