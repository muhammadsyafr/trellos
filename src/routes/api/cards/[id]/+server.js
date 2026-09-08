import { json, error } from '@sveltejs/kit';
import { updateCard, moveCard, deleteCard, getCard, ownsCard, ownsColumn } from '$lib/server/db.js';

async function requireCard(d1, userId, id) {
  if (!Number.isInteger(id) || !(await ownsCard(d1, userId, id))) throw error(404, 'not found');
  return id;
}

export async function GET({ params, platform, locals }) {
  const d1 = platform.env.DB;
  const id = await requireCard(d1, locals.user.id, Number(params.id));
  return json(await getCard(d1, id));
}

export async function PATCH({ params, request, platform, locals }) {
  const d1 = platform.env.DB;
  const id = await requireCard(d1, locals.user.id, Number(params.id));
  const body = await request.json();
  let card;
  if (body.columnId != null) {
    // The destination list needs its own check — otherwise an owned card could be
    // pushed into someone else's board
    if (!(await ownsColumn(d1, locals.user.id, Number(body.columnId)))) throw error(404, 'list not found');
    card = await moveCard(d1, id, Number(body.columnId));
  }
  const { text, description, priority, tags } = body;
  if (text !== undefined || description !== undefined || priority !== undefined || tags !== undefined) {
    if (text !== undefined && !text.trim()) throw error(400, 'text required');
    if (tags !== undefined && !Array.isArray(tags)) throw error(400, 'tags must be an array');
    card = await updateCard(d1, id, {
      ...(text !== undefined && { text: text.trim() }),
      ...(description !== undefined && { description }),
      ...(priority !== undefined && { priority }),
      ...(tags !== undefined && { tags })
    });
  }
  return json(card ?? (await getCard(d1, id)));
}

export async function DELETE({ params, platform, locals }) {
  const d1 = platform.env.DB;
  const id = await requireCard(d1, locals.user.id, Number(params.id));
  await deleteCard(d1, id);
  return json({ ok: true });
}
