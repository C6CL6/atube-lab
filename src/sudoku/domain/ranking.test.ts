import { describe, expect, it } from 'vitest'
import { rankRecords, topRankingRecords } from './ranking'
import type { GameRecord } from './types'

const record = (id: string, score: number, elapsedSeconds: number, mistakes: number): GameRecord => ({
  id,
  userId: id,
  username: id,
  score,
  elapsedSeconds,
  mistakes,
  difficulty: 'medium',
  completedAt: '2026-06-21T10:00:00.000Z',
  failed: false,
})

describe('综合排行榜', () => {
  it('按分数、用时、错误数排序并保留所有成绩', () => {
    const records = Array.from({ length: 22 }, (_, index) =>
      record(String(index), index === 0 ? 100 : 2000 - index, index === 1 ? 500 : 400, index === 2 ? 2 : 1),
    )
    const ranked = rankRecords(records)

    expect(ranked).toHaveLength(22)
    expect(ranked[0].score).toBe(1999)
    expect(ranked.at(-1)?.score).toBe(100)
  })

  it('排行榜展示时只取前10名', () => {
    const records = Array.from({ length: 22 }, (_, index) =>
      record(String(index), 2000 - index, 400, 1),
    )
    const ranked = topRankingRecords(records)

    expect(ranked).toHaveLength(10)
    expect(ranked[0].score).toBe(2000)
    expect(ranked.at(-1)?.score).toBe(1991)
  })

  it('同分时用时短者优先，再比较错误数', () => {
    const ranked = rankRecords([
      record('慢', 1000, 500, 0),
      record('错', 1000, 400, 2),
      record('准', 1000, 400, 0),
    ])

    expect(ranked.map((item) => item.username)).toEqual(['准', '错', '慢'])
  })
})
