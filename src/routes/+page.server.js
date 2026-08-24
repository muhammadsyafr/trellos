import { getBoards, getBoardData } from '$lib/server/db.js';

export function load({ url }) {
  const boards = getBoards();
  const requested = Number(url.searchParams.get('board'));
  const boardId = boards.some((b) => b.id === requested) ? requested : boards[0]?.id ?? null;
  const columns = boardId ? getBoardData(boardId) : [];
  const openCardId = Number(url.searchParams.get('open')) || null;
  return { boards, boardId, columns, openCardId };
}
