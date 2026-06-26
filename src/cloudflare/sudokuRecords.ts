import { empty, errorResponse, json } from './http'
import type { CloudflareEnv } from './types'

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

const RECORD_PREFIX = 'sudoku/records/'
const RANKING_LIMIT = 10

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
  const startedAt = typeof value.startedAt === 'string' ? value.startedAt : ''
  const completedAt = typeof value.completedAt === 'string' ? value.completedAt : ''
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : crypto.randomUUID(),
    userId: typeof value.userId === 'string' ? value.userId : undefined,
    username,
    score: Math.round(value.score),
    elapsedSeconds: Math.round(value.elapsedSeconds),
    mistakes: Math.round(value.mistakes),
    difficulty: value.difficulty,
    startedAt,
    completedAt,
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

async function loadRecords(env: CloudflareEnv) {
  if (!env.ATUBE_KV.list) return []
  const { keys } = await env.ATUBE_KV.list({ prefix: RECORD_PREFIX })
  const records = await Promise.all(keys.map(async ({ name }) => {
    const raw = await env.ATUBE_KV.get(name)
    if (!raw) return null
    try {
      return JSON.parse(raw) as CloudRecord
    } catch {
      return null
    }
  }))
  return records.filter((record): record is CloudRecord => Boolean(record))
}

export async function handleSudokuRecordsRequest(req: Request, env: CloudflareEnv) {
  try {
    if (req.method === 'OPTIONS') return empty()

    if (req.method === 'GET') {
      const records = await loadRecords(env)
      return json({ records: rankRecords(records).slice(0, RANKING_LIMIT) })
    }

    if (req.method === 'POST') {
      const record = normalizeRecord(await req.json().catch(() => null))
      if (!record) return errorResponse('Invalid Sudoku record', 400)
      await env.ATUBE_KV.put(recordKey(record.id), JSON.stringify(record))
      return json({ record }, 201)
    }

    return errorResponse('Method not allowed', 405)
  } catch {
    return errorResponse('Sudoku records service unavailable', 500)
  }
}
