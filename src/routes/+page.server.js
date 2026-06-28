import { getBoard } from '$lib/server/db.js';

export function load() {
  return { board: getBoard() };
}
