import { error, redirect } from '@sveltejs/kit';
import { getCardByCode } from '$lib/server/db.js';

// JIRA-style deep link: /B-1 -> the board that owns card B-1, with its detail modal open.
// Scoped to the signed-in user, so a code belonging to someone else reads as "not found"
// rather than confirming that the card exists.
export async function load({ params, platform, locals }) {
  const card = await getCardByCode(platform.env.DB, params.code, locals.user.id);
  if (!card) throw error(404, `No card found for "${params.code}"`);
  throw redirect(307, `/?board=${card.boardId}&open=${card.id}`);
}
