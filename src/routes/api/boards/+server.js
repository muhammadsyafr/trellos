import { json, error } from '@sveltejs/kit';
import { getBoards, addBoard } from '$lib/server/db.js';

export async function GET({ platform, locals }) {
  return json(await getBoards(platform.env.DB, locals.user.id));
}

export async function POST({ request, platform, locals }) {
  const { title } = await request.json();
  if (!title?.trim()) throw error(400, 'title required');
  return json(await addBoard(platform.env.DB, locals.user.id, title.trim()));
}
