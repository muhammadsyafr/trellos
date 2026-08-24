import { json, error } from '@sveltejs/kit';
import { getBoards, addBoard } from '$lib/server/db.js';

export async function GET({ platform }) {
  return json(await getBoards(platform.env.DB));
}

export async function POST({ request, platform }) {
  const { title } = await request.json();
  if (!title?.trim()) throw error(400, 'title required');
  return json(await addBoard(platform.env.DB, title.trim()));
}
