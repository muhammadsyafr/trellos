import { json, error } from '@sveltejs/kit';
import { reorder, ownsColumn, ownsCard } from '$lib/server/db.js';

export async function POST({ request, platform, locals }) {
  const d1 = platform.env.DB;
  const userId = locals.user.id;
  const { columns } = await request.json();
  if (!Array.isArray(columns)) throw error(400, 'columns must be an array');

  // A drag payload names both lists and cards by id, so every id in it has to be checked
  // before any of it is written — a single foreign id would otherwise relocate another
  // user's card.
  for (const col of columns) {
    if (!(await ownsColumn(d1, userId, Number(col.id)))) throw error(404, 'list not found');
    for (const cardId of col.cardIds ?? []) {
      if (!(await ownsCard(d1, userId, Number(cardId)))) throw error(404, 'card not found');
    }
  }

  await reorder(d1, columns);
  return json({ ok: true });
}
