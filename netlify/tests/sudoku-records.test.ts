import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../functions/sudoku-records'

type StoredRecord = {
  id: string
  username: string
  score: number
  elapsedSeconds: number
  mistakes: number
  difficulty: 'easy' | 'medium' | 'hard'
  startedAt: string
  completedAt: string
  failed: boolean
}

const records = new Map<string, StoredRecord>()

vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    list: async ({ prefix }: { prefix?: string } = {}) => ({
      blobs: [...records.keys()]
        .filter((key) => !prefix || key.startsWith(prefix))
        .map((key) => ({ key, etag: key })),
    }),
    get: async (key: string, options?: { type?: string }) => {
      const value = records.get(key)
      if (!value) return null
      return options?.type === 'json' ? value : JSON.stringify(value)
    },
    setJSON: async (key: string, value: StoredRecord) => {
      records.set(key, value)
    },
  }),
}))

function makeRecord(index: number, overrides: Partial<StoredRecord> = {}): StoredRecord {
  return {
    id: `record-${index}`,
    username: `玩家${index}`,
    score: 1000 + index,
    elapsedSeconds: 300 - index,
    mistakes: index % 4,
    difficulty: 'easy',
    startedAt: `2026-06-25T08:${String(index).padStart(2, '0')}:00.000Z`,
    completedAt: `2026-06-25T08:${String(index).padStart(2, '0')}:30.000Z`,
    failed: false,
    ...overrides,
  }
}

describe('/api/sudoku/records', () => {
  beforeEach(() => {
    records.clear()
  })

  it('GET 返回云端排行榜前10名，并按分数排序', async () => {
    for (let index = 0; index < 12; index += 1) {
      const record = makeRecord(index, { score: 1000 + index })
      records.set(`records/${record.id}.json`, record)
    }

    const response = await handler(new Request('https://example.com/api/sudoku/records'))
    const body = await response.json() as { records: StoredRecord[] }

    expect(response.status).toBe(200)
    expect(body.records).toHaveLength(10)
    expect(body.records[0].score).toBe(1011)
    expect(body.records[9].score).toBe(1002)
  })

  it('POST 保存一条结束成绩，允许同名玩家重复提交', async () => {
    const first = makeRecord(1, { id: 'same-name-1', username: '阿土伯', completedAt: '2026-06-25T09:00:00.000Z' })
    const second = makeRecord(2, { id: 'same-name-2', username: '阿土伯', completedAt: '2026-06-25T09:05:00.000Z' })

    const firstResponse = await handler(new Request('https://example.com/api/sudoku/records', {
      method: 'POST',
      body: JSON.stringify(first),
    }))
    const secondResponse = await handler(new Request('https://example.com/api/sudoku/records', {
      method: 'POST',
      body: JSON.stringify(second),
    }))

    expect(firstResponse.status).toBe(201)
    expect(secondResponse.status).toBe(201)
    expect(records.get('records/same-name-1.json')?.username).toBe('阿土伯')
    expect(records.get('records/same-name-2.json')?.completedAt).toBe('2026-06-25T09:05:00.000Z')
  })

  it('POST 拒绝缺少用户名的成绩', async () => {
    const response = await handler(new Request('https://example.com/api/sudoku/records', {
      method: 'POST',
      body: JSON.stringify(makeRecord(1, { username: '' })),
    }))

    expect(response.status).toBe(400)
  })

  it('支持本地开发跨域提交成绩', async () => {
    const response = await handler(new Request('https://example.com/api/sudoku/records', {
      method: 'OPTIONS',
    }))

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
})
