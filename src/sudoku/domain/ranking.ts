import type { GameRecord } from './types'

export const RANKING_DISPLAY_LIMIT = 10

export function rankRecords(records: GameRecord[]): GameRecord[] {
  return [...records]
    .sort((a, b) =>
      b.score - a.score ||
      a.elapsedSeconds - b.elapsedSeconds ||
      a.mistakes - b.mistakes ||
      a.completedAt.localeCompare(b.completedAt),
    )
}

export function topRankingRecords(records: GameRecord[], limit = RANKING_DISPLAY_LIMIT): GameRecord[] {
  return rankRecords(records).slice(0, limit)
}
