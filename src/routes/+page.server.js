import { redirect } from '@sveltejs/kit';
import { getBoards, getBoardData, seedWorkspace } from '$lib/server/db.js';
import { SESSION_COOKIE, destroySession, clearSessionCookie } from '$lib/server/auth.js';

export async function load({ url, platform, locals }) {
  const d1 = platform.env.DB;
  // hooks.server.js has already redirected anonymous visitors to /signin
  let boards = await getBoards(d1, locals.user.id);
  // The header binds to a current board, so an account with none (fresh signup, or a user
  // created by scripts/create-user.mjs) gets a starter workspace on first load.
  if (!boards.length) {
    await seedWorkspace(d1, locals.user.id);
    boards = await getBoards(d1, locals.user.id);
  }
  const requested = Number(url.searchParams.get('board'));
  const boardId = boards.some((b) => b.id === requested) ? requested : boards[0]?.id ?? null;
  const columns = boardId ? await getBoardData(d1, boardId) : [];
  const openCardId = Number(url.searchParams.get('open')) || null;
  return { boards, boardId, columns, openCardId, user: locals.user };
}

export const actions = {
  // A form action rather than a fetch endpoint so signing out still works without JS
  signout: async ({ cookies, platform }) => {
    await destroySession(platform.env.DB, cookies.get(SESSION_COOKIE));
    clearSessionCookie(cookies);
    throw redirect(303, '/signin');
  }
};
