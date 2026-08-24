import { error, redirect } from '@sveltejs/kit';
import { getCardByCode } from '$lib/server/db.js';

// JIRA-style deep link: /B-1 -> the board that owns card B-1, with its detail modal open
export function load({ params }) {
  const card = getCardByCode(params.code);
  if (!card) throw error(404, `No card found for "${params.code}"`);
  throw redirect(307, `/?board=${card.boardId}&open=${card.id}`);
}
