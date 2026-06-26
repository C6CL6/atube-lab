import { beforeEach, describe, expect, it } from 'vitest'
import { handleSudokuRecordsRequest } from './sudokuRecords'

type StoredValue = string

const values = new Map<string, StoredValue>()

const kv = {
  list: async ({ prefix }: { prefix?: string } = {}) => ({
    keys: [...values.keys()]
      .filter((name) => !prefix || name.startsWith(prefix))
      .map((name) => ({ name })),
  }),
  get: async (key: string) => values.get(key) ?? null,
  put: async (key: string, value: string) => {
    values.set(key, value)
  },
}

function record(index: number) {
  return {
    id: `record-${index}`,
    username: `玩家${index}`,
    score: 1000 + index,
    elapsedSeconds: 300 - index,
    mistakes: index % 3,
    difficulty: 'easy',
    startedAt: `2026-06-25T08:${String(index).padStart(2, '0')}:00.000Z`,
    completedAt: `2026-06-25T08:${String(index).padStart(2, '0')}:30.000Z`,
    failed: false,
  }
}

describe('Cloudflare /api/sudoku/records', () => {
  beforeEach(() => {
    values.clear()
  })

  it('GET 从 KV 读取并返回前10名排行榜', async () => {
    for (let index = 0; index < 12; index += 1) {
      values.set(`sudoku/records/record-${index}.json`, JSON.stringify(record(index)))
    }

    const response = await handleSudokuRecordsRequest(
      new Request('https://atube.ccwu.cc/api/sudoku/records'),
      { ATUBE_KV: kv },
    )
    const body = await response.json() as { records: Array<{ score: number }> }

    expect(response.status).toBe(200)
    expect(body.records).toHaveLength(10)
    expect(body.records[0].score).toBe(1011)
  })

  it('POST 校验并保存成绩到 KV', async () => {
    const response = await handleSudokuRecordsRequest(
      new Request('https://atube.ccwu.cc/api/sudoku/records', {
        method: 'POST',
        body: JSON.stringify(record(1)),
      }),
      { ATUBE_KV: kv },
    )

    expect(response.status).toBe(201)
    expect(JSON.parse(values.get('sudoku/records/record-1.json') ?? '{}')).toMatchObject({ username: '玩家1' })
  })
})
