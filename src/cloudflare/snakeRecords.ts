import { empty, errorResponse, json } from './http'
import type { CloudflareEnv } from './types'

type Skin = 'sudoku' | 'ink' | 'jade'

type CloudSnakeRecord = {
  id: string
  userId?: string
  username: string
  score: number
  length: number
  speedLevel: number
  skin: Skin
  startedAt: string
  completedAt: string
}

const RECORD_PREFIX = 'snake/records/'
const RANKING_LIMIT = 10

function isSkin(value: unknown): value is Skin {
  return value === 'sudoku' || value === 'ink' || value === 'jade'
}

function isIsoDate(value: unknown) {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime())
}

function normalizeRecord(input: unknown): CloudSnakeRecord | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Partial<CloudSnakeRecord>
  const username = typeof value.username === 'string' ? value.username.trim() : ''
  if (!username || username.length > 12) return null
  if (typeof value.score !== 'number' || !Number.isFinite(value.score) || value.score < 0) return null
  if (typeof value.length !== 'number' || !Number.isFinite(value.length) || value.length < 3) return null
  if (typeof value.speedLevel !== 'number' || !Number.isFinite(value.speedLevel) || value.speedLevel < 1) return null
  if (!isSkin(value.skin)) return null
  if (!isIsoDate(value.startedAt) || !isIsoDate(value.completedAt)) return null
  const startedAt = typeof value.startedAt === 'string' ? value.startedAt : ''
  const completedAt = typeof value.completedAt === 'string' ? value.completedAt : ''
  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : crypto.randomUUID(),
    userId: typeof value.userId === 'string' ? value.userId : undefined,
    username,
    score: Math.round(value.score),
    length: Math.round(value.length),
    speedLevel: Math.round(value.speedLevel),
    skin: value.skin,
    startedAt,
    completedAt,
  }
}

function rankRecords(records: CloudSnakeRecord[]) {
  return [...records].sort((a, b) =>
    b.score - a.score ||
    b.length - a.length ||
    b.speedLevel - a.speedLevel ||
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
      return JSON.parse(raw) as CloudSnakeRecord
    } catch {
      return null
    }
  }))
  return records.filter((record): record is CloudSnakeRecord => Boolean(record))
}

export async function handleSnakeRecordsRequest(req: Request, env: CloudflareEnv) {
  try {
    if (req.method === 'OPTIONS') return empty()

    if (req.method === 'GET') {
      const records = await loadRecords(env)
      return json({ records: rankRecords(records).slice(0, RANKING_LIMIT) })
    }

    if (req.method === 'POST') {
      const record = normalizeRecord(await req.json().catch(() => null))
      if (!record) return errorResponse('Invalid Snake record', 400)
      await env.ATUBE_KV.put(recordKey(record.id), JSON.stringify(record))
      return json({ record }, 201)
    }

    return errorResponse('Method not allowed', 405)
  } catch {
    return errorResponse('Snake records service unavailable', 500)
  }
}
