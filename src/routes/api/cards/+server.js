import { json, error } from '@sveltejs/kit';
import { addCard, ownsColumn } from '$lib/server/db.js';

export async function POST({ request, platform, locals }) {
  const d1 = platform.env.DB;
  const { columnId, text } = await request.json();
  if (!columnId) throw error(400, 'columnId required');
  if (!text?.trim()) throw error(400, 'text required');
  if (!(await ownsColumn(d1, locals.user.id, Number(columnId)))) throw error(404, 'list not found');
  return json(await addCard(d1, Number(columnId), text.trim()));
}
