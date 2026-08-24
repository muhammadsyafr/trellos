import { json, error } from '@sveltejs/kit';
import { addColumn } from '$lib/server/db.js';

export async function POST({ request }) {
  const { boardId, title } = await request.json();
  if (!boardId) throw error(400, 'boardId required');
  if (!title?.trim()) throw error(400, 'title required');
  return json(addColumn(Number(boardId), title.trim()));
}
