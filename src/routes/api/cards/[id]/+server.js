import { json, error } from '@sveltejs/kit';
import { updateCard, moveCard, deleteCard, getCard } from '$lib/server/db.js';

export async function GET({ params, platform }) {
  const card = await getCard(platform.env.DB, Number(params.id));
  if (!card) throw error(404, 'not found');
  return json(card);
}

export async function PATCH({ params, request, platform }) {
  const d1 = platform.env.DB;
  const id = Number(params.id);
  const body = await request.json();
  let card;
  if (body.columnId != null) card = await moveCard(d1, id, Number(body.columnId));
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

export async function DELETE({ params, platform }) {
  await deleteCard(platform.env.DB, Number(params.id));
  return json({ ok: true });
}
