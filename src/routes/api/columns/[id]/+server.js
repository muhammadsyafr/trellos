import { json, error } from '@sveltejs/kit';
import { renameColumn, deleteColumn } from '$lib/server/db.js';

export async function PATCH({ params, request }) {
  const { title } = await request.json();
  if (!title?.trim()) throw error(400, 'title required');
  renameColumn(Number(params.id), title.trim());
  return json({ ok: true });
}

export async function DELETE({ params }) {
  deleteColumn(Number(params.id));
  return json({ ok: true });
}
