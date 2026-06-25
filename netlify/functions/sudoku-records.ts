import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'

type Difficulty = 'easy' | 'medium' | 'hard'

type CloudRecord = {
  id: string
  userId?: string
  username: string
  score: number
  elapsedSeconds: number
  mistakes: number
  difficulty: Difficulty
  startedAt: string
  completedAt: string
  failed: boolean
}

const RECORD_PREFIX = 'records/'
const RANKING_LIMIT = 10

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

function isIsoDate(value: unknown) {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime())
}

function normalizeRecord(input: unknown): CloudRecord | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Partial<CloudRecord>
  const username = typeof value.username === 'string' ? value.username.trim() : ''
  if (!username || username.length > 12) return null
  if (typeof value.score !== 'number' || !Number.isFinite(value.score) || value.score < 0) return null
  if (typeof value.elapsedSeconds !== 'number' || !Number.isFinite(value.elapsedSeconds) || value.elapsedSeconds < 0) return null
  if (typeof value.mistakes !== 'number' || !Number.isFinite(value.mistakes) || value.mistakes < 0) return null
  if (!isDifficulty(value.difficulty)) return null
  if (!isIsoDate(value.startedAt) || !isIsoDate(value.completedAt)) return null
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : crypto.randomUUID(),
    userId: typeof value.userId === 'string' ? value.userId : undefined,
    username,
    score: Math.round(value.score),
    elapsedSeconds: Math.round(value.elapsedSeconds),
    mistakes: Math.round(value.mistakes),
    difficulty: value.difficulty,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    failed: Boolean(value.failed),
  }
}

function rankRecords(records: CloudRecord[]) {
  return [...records].sort((a, b) =>
    b.score - a.score ||
    a.elapsedSeconds - b.elapsedSeconds ||
    a.mistakes - b.mistakes ||
    a.completedAt.localeCompare(b.completedAt),
  )
}

function recordKey(id: string) {
  return `${RECORD_PREFIX}${encodeURIComponent(id)}.json`
}

async function loadRecords() {
  const store = getStore({ name: 'sudoku-records', consistency: 'strong' })
  const { blobs } = await store.list({ prefix: RECORD_PREFIX })
  const records = await Promise.all(
    blobs.map(async (blob) => store.get(blob.key, { type: 'json' }) as Promise<CloudRecord | null>),
  )
  return records.filter((record): record is CloudRecord => Boolean(record))
}

export default async (req: Request) => {
  try {
    if (req.method === 'GET') {
      const records = await loadRecords()
      return json({ records: rankRecords(records).slice(0, RANKING_LIMIT) })
    }

    if (req.method === 'POST') {
      const record = normalizeRecord(await req.json().catch(() => null))
      if (!record) return json({ error: 'Invalid Sudoku record' }, 400)
      const store = getStore({ name: 'sudoku-records', consistency: 'strong' })
      await store.setJSON(recordKey(record.id), record)
      return json({ record }, 201)
    }

    return json({ error: 'Method not allowed' }, 405)
  } catch {
    return json({ error: 'Sudoku records service unavailable' }, 500)
  }
}

export const config: Config = {
  path: '/api/sudoku/records',
}
