import { json, error } from '@sveltejs/kit';
import { addColumn } from '$lib/server/db.js';

export async function POST({ request }) {
  const { title } = await request.json();
  if (!title?.trim()) throw error(400, 'title required');
  return json(addColumn(title.trim()));
}
