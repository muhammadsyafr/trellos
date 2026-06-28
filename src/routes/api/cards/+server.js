import { json, error } from '@sveltejs/kit';
import { addCard } from '$lib/server/db.js';

export async function POST({ request }) {
  const { columnId, text } = await request.json();
  if (!columnId) throw error(400, 'columnId required');
  if (!text?.trim()) throw error(400, 'text required');
  return json(addCard(Number(columnId), text.trim()));
}
