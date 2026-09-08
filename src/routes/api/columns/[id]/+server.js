import { json, error } from '@sveltejs/kit';
import { renameColumn, deleteColumn, ownsColumn } from '$lib/server/db.js';

async function requireColumn(d1, userId, id) {
  if (!Number.isInteger(id) || !(await ownsColumn(d1, userId, id))) throw error(404, 'list not found');
  return id;
}

export async function PATCH({ params, request, platform, locals }) {
  const d1 = platform.env.DB;
  const id = await requireColumn(d1, locals.user.id, Number(params.id));
  const { title } = await request.json();
  if (!title?.trim()) throw error(400, 'title required');
  await renameColumn(d1, id, title.trim());
  return json({ ok: true });
}

export async function DELETE({ params, platform, locals }) {
  const d1 = platform.env.DB;
  const id = await requireColumn(d1, locals.user.id, Number(params.id));
  await deleteColumn(d1, id);
  return json({ ok: true });
}
