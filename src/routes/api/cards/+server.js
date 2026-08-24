import { json, error } from '@sveltejs/kit';
import { addCard } from '$lib/server/db.js';

export async function POST({ request, platform }) {
  const { columnId, text } = await request.json();
  if (!columnId) throw error(400, 'columnId required');
  if (!text?.trim()) throw error(400, 'text required');
  return json(await addCard(platform.env.DB, Number(columnId), text.trim()));
}
