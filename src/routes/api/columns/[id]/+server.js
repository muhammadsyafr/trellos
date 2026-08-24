import { json, error } from '@sveltejs/kit';
import { renameColumn, deleteColumn } from '$lib/server/db.js';

export async function PATCH({ params, request, platform }) {
  const { title } = await request.json();
  if (!title?.trim()) throw error(400, 'title required');
  await renameColumn(platform.env.DB, Number(params.id), title.trim());
  return json({ ok: true });
}

export async function DELETE({ params, platform }) {
  await deleteColumn(platform.env.DB, Number(params.id));
  return json({ ok: true });
}
