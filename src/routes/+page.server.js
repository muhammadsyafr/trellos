import { getBoards, getBoardData } from '$lib/server/db.js';

export async function load({ url, platform }) {
  const d1 = platform.env.DB;
  const boards = await getBoards(d1);
  const requested = Number(url.searchParams.get('board'));
  const boardId = boards.some((b) => b.id === requested) ? requested : boards[0]?.id ?? null;
  const columns = boardId ? await getBoardData(d1, boardId) : [];
  const openCardId = Number(url.searchParams.get('open')) || null;
  return { boards, boardId, columns, openCardId };
}
