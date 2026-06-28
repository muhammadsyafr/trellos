import { json } from '@sveltejs/kit';
import { reorder } from '$lib/server/db.js';

export async function POST({ request }) {
  const { columns } = await request.json();
  reorder(columns);
  return json({ ok: true });
}
