import { json, error } from '@sveltejs/kit';
import { getBoards, addBoard } from '$lib/server/db.js';

export async function GET() {
  return json(getBoards());
}

export async function POST({ request }) {
  const { title } = await request.json();
  if (!title?.trim()) throw error(400, 'title required');
  return json(addBoard(title.trim()));
}
