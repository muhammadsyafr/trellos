import { json } from '@sveltejs/kit';
import { reorder } from '$lib/server/db.js';

export async function POST({ request, platform }) {
  const { columns } = await request.json();
  await reorder(platform.env.DB, columns);
  return json({ ok: true });
}
