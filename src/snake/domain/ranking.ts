import type { SnakeRecord } from "./types";

const RANKING_LIMIT = 10;

export function rankSnakeRecords(records: SnakeRecord[]) {
  return [...records].sort((a, b) =>
    b.score - a.score ||
    b.length - a.length ||
    b.speedLevel - a.speedLevel ||
    a.completedAt.localeCompare(b.completedAt),
  );
}

export function topSnakeRecords(records: SnakeRecord[]) {
  return rankSnakeRecords(records).slice(0, RANKING_LIMIT);
}
