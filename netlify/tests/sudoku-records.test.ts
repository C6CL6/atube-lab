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

const records = new Map<string, unknown>()

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
    setJSON: async (key: string, value: unknown) => {
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
    expect((records.get('records/same-name-1.json') as StoredRecord | undefined)?.username).toBe('阿土伯')
    expect((records.get('records/same-name-2.json') as StoredRecord | undefined)?.completedAt).toBe('2026-06-25T09:05:00.000Z')
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

  it('同一设备累计实际游戏两小时后必须休息半小时', async () => {
    const deviceId = 'device-aaaaaaaaaaaaaaaa'
    const start = await handler(new Request('https://example.com/api/sudoku/play-sessions', {
      method: 'POST',
      body: JSON.stringify({ deviceId, action: 'start', gameId: 'game-1', elapsedSeconds: 0, at: '2026-06-25T08:00:00.000Z' }),
    }))
    expect(start.status).toBe(200)

    const limit = await handler(new Request('https://example.com/api/sudoku/play-sessions', {
      method: 'POST',
      body: JSON.stringify({ deviceId, action: 'play', gameId: 'game-1', elapsedSeconds: 7200, at: '2026-06-25T10:00:00.000Z' }),
    }))
    const body = await limit.json() as { error: string; restSeconds: number }

    expect(limit.status).toBe(429)
    expect(body.error).toBe('已连续游戏 2 小时，请休息 30 分钟后继续')
    expect(body.restSeconds).toBe(1800)
  })

  it('暂停或退出满三十分钟后重置同一设备的连续游戏时间', async () => {
    const deviceId = 'device-bbbbbbbbbbbbbbbb'
    await handler(new Request('https://example.com/api/sudoku/play-sessions', {
      method: 'POST',
      body: JSON.stringify({ deviceId, action: 'start', gameId: 'game-1', elapsedSeconds: 0, at: '2026-06-25T08:00:00.000Z' }),
    }))
    await handler(new Request('https://example.com/api/sudoku/play-sessions', {
      method: 'POST',
      body: JSON.stringify({ deviceId, action: 'play', gameId: 'game-1', elapsedSeconds: 7100, at: '2026-06-25T09:58:20.000Z' }),
    }))
    await handler(new Request('https://example.com/api/sudoku/play-sessions', {
      method: 'POST',
      body: JSON.stringify({ deviceId, action: 'pause', gameId: 'game-1', elapsedSeconds: 7100, at: '2026-06-25T09:58:20.000Z' }),
    }))

    const resume = await handler(new Request('https://example.com/api/sudoku/play-sessions', {
      method: 'POST',
      body: JSON.stringify({ deviceId, action: 'resume', gameId: 'game-1', elapsedSeconds: 7100, at: '2026-06-25T10:28:20.000Z' }),
    }))
    const body = await resume.json() as { activeSeconds: number; remainingSeconds: number }

    expect(resume.status).toBe(200)
    expect(body.activeSeconds).toBe(0)
    expect(body.remainingSeconds).toBe(7200)
  })
})
