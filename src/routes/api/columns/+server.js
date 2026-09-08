import { json, error } from '@sveltejs/kit';
import { addColumn, ownsBoard } from '$lib/server/db.js';

export async function POST({ request, platform, locals }) {
  const d1 = platform.env.DB;
  const { boardId, title } = await request.json();
  if (!boardId) throw error(400, 'boardId required');
  if (!title?.trim()) throw error(400, 'title required');
  if (!(await ownsBoard(d1, locals.user.id, Number(boardId)))) throw error(404, 'board not found');
  return json(await addColumn(d1, Number(boardId), title.trim()));
}
