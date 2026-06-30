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

type PlaySession = {
  id: string
  deviceId: string
  day: string
  startedAt: string
}

const RECORD_PREFIX = 'records/'
const PLAY_SESSION_PREFIX = 'play-sessions/'
const RANKING_LIMIT = 10
const DAILY_PLAY_LIMIT = 6

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  })
}

function empty(status = 204) {
  return new Response(null, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

function playSessionPrefix(deviceId: string, day: string) {
  return `${PLAY_SESSION_PREFIX}${encodeURIComponent(deviceId)}/${day}/`
}

function playSessionKey(session: PlaySession) {
  return `${playSessionPrefix(session.deviceId, session.day)}${encodeURIComponent(session.id)}.json`
}

function beijingDay(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function normalizeDeviceId(value: unknown) {
  if (typeof value !== 'string') return ''
  const deviceId = value.trim()
  return deviceId.length >= 16 && deviceId.length <= 128 ? deviceId : ''
}

async function loadRecords() {
  const store = getStore({ name: 'sudoku-records', consistency: 'strong' })
  const { blobs } = await store.list({ prefix: RECORD_PREFIX })
  const records = await Promise.all(
    blobs.map(async (blob) => store.get(blob.key, { type: 'json' }) as Promise<CloudRecord | null>),
  )
  return records.filter((record): record is CloudRecord => Boolean(record))
}

async function createPlaySession(input: unknown) {
  if (!input || typeof input !== 'object') return json({ error: '缺少设备信息，无法开始游戏' }, 400)
  const body = input as { deviceId?: unknown; startedAt?: unknown }
  const deviceId = normalizeDeviceId(body.deviceId)
  const startedAt = typeof body.startedAt === 'string' && isIsoDate(body.startedAt) ? body.startedAt : new Date().toISOString()
  if (!deviceId) return json({ error: '缺少设备信息，无法开始游戏' }, 400)

  const day = beijingDay(startedAt)
  const store = getStore({ name: 'sudoku-records', consistency: 'strong' })
  const prefix = playSessionPrefix(deviceId, day)
  const { blobs } = await store.list({ prefix })
  const played = blobs.length
  if (played >= DAILY_PLAY_LIMIT) {
    return json({
      error: '已经超过一天的限制了，请明天再玩',
      limit: DAILY_PLAY_LIMIT,
      remaining: 0,
    }, 429)
  }

  const session: PlaySession = {
    id: crypto.randomUUID(),
    deviceId,
    day,
    startedAt,
  }
  await store.setJSON(playSessionKey(session), session)
  return json({ session, limit: DAILY_PLAY_LIMIT, remaining: DAILY_PLAY_LIMIT - played - 1 }, 201)
}

export default async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return empty()
    }

    const url = new URL(req.url)
    if (url.pathname === '/api/sudoku/play-sessions') {
      if (req.method === 'POST') {
        return createPlaySession(await req.json().catch(() => null))
      }
      return json({ error: 'Method not allowed' }, 405)
    }

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
  path: ['/api/sudoku/records', '/api/sudoku/play-sessions'],
}
