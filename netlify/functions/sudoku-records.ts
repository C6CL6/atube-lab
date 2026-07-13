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

type PlayLimitState = {
  deviceId: string
  activeSeconds: number
  lastGameId: string | null
  lastElapsedSeconds: number
  pausedAt: string | null
  cooldownUntil: string | null
  updatedAt: string
}

const RECORD_PREFIX = 'records/'
const PLAY_LIMIT_PREFIX = 'play-limits/'
const RANKING_LIMIT = 10
const CONTINUOUS_PLAY_LIMIT_SECONDS = 2 * 60 * 60
const REST_SECONDS = 30 * 60

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

function playLimitKey(deviceId: string) {
  return `${PLAY_LIMIT_PREFIX}${encodeURIComponent(deviceId)}.json`
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

function normalizeGameId(value: unknown) {
  if (typeof value !== 'string') return ''
  const gameId = value.trim()
  return gameId.length >= 1 && gameId.length <= 128 ? gameId : ''
}

function normalizeElapsedSeconds(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null
}

function restSecondsUntil(value: string, now: Date) {
  return Math.max(0, Math.ceil((new Date(value).getTime() - now.getTime()) / 1000))
}

function initialPlayLimitState(deviceId: string, now: string): PlayLimitState {
  return {
    deviceId,
    activeSeconds: 0,
    lastGameId: null,
    lastElapsedSeconds: 0,
    pausedAt: null,
    cooldownUntil: null,
    updatedAt: now,
  }
}

function resetAfterRest(state: PlayLimitState, now: Date): PlayLimitState {
  if (!state.pausedAt || now.getTime() - new Date(state.pausedAt).getTime() < REST_SECONDS * 1000) return state
  return initialPlayLimitState(state.deviceId, now.toISOString())
}

function responseForState(state: PlayLimitState, now: Date) {
  return {
    activeSeconds: state.activeSeconds,
    remainingSeconds: Math.max(0, CONTINUOUS_PLAY_LIMIT_SECONDS - state.activeSeconds),
    restSeconds: state.cooldownUntil ? restSecondsUntil(state.cooldownUntil, now) : 0,
  }
}

async function updatePlayLimit(input: unknown) {
  if (!input || typeof input !== 'object') return json({ error: '缺少设备信息，无法开始游戏' }, 400)
  const body = input as { deviceId?: unknown; action?: unknown; gameId?: unknown; elapsedSeconds?: unknown; at?: unknown }
  const deviceId = normalizeDeviceId(body.deviceId)
  const action = body.action === 'start' || body.action === 'resume' || body.action === 'play' || body.action === 'pause' ? body.action : ''
  const gameId = normalizeGameId(body.gameId)
  const elapsedSeconds = normalizeElapsedSeconds(body.elapsedSeconds)
  const now = typeof body.at === 'string' && isIsoDate(body.at) ? new Date(body.at) : new Date()
  if (!deviceId) return json({ error: '缺少设备信息，无法开始游戏' }, 400)
  if (!action || !gameId || elapsedSeconds === null) return json({ error: '游戏状态无效，无法更新防沉迷限制' }, 400)

  const store = getStore({ name: 'sudoku-records', consistency: 'strong' })
  const key = playLimitKey(deviceId)
  const saved = await store.get(key, { type: 'json' }) as PlayLimitState | null
  let state = resetAfterRest(saved ?? initialPlayLimitState(deviceId, now.toISOString()), now)
  const cooldownSeconds = state.cooldownUntil ? restSecondsUntil(state.cooldownUntil, now) : 0
  if (cooldownSeconds > 0) {
    return json({
      error: `已连续游戏 2 小时，请休息 ${Math.ceil(cooldownSeconds / 60)} 分钟后继续`,
      activeSeconds: state.activeSeconds,
      remainingSeconds: 0,
      restSeconds: cooldownSeconds,
    }, 429)
  }

  if (state.lastGameId === gameId) {
    state = {
      ...state,
      activeSeconds: state.activeSeconds + Math.max(0, elapsedSeconds - state.lastElapsedSeconds),
      lastElapsedSeconds: elapsedSeconds,
    }
  } else {
    state = { ...state, lastGameId: gameId, lastElapsedSeconds: elapsedSeconds }
  }

  if (action === 'pause') {
    state = { ...state, pausedAt: now.toISOString(), updatedAt: now.toISOString() }
  } else {
    state = { ...state, pausedAt: null, updatedAt: now.toISOString() }
  }

  if (state.activeSeconds >= CONTINUOUS_PLAY_LIMIT_SECONDS) {
    const cooldownUntil = new Date(now.getTime() + REST_SECONDS * 1000).toISOString()
    state = { ...state, activeSeconds: CONTINUOUS_PLAY_LIMIT_SECONDS, pausedAt: now.toISOString(), cooldownUntil, updatedAt: now.toISOString() }
    await store.setJSON(key, state)
    return json({
      error: '已连续游戏 2 小时，请休息 30 分钟后继续',
      activeSeconds: state.activeSeconds,
      remainingSeconds: 0,
      restSeconds: REST_SECONDS,
    }, 429)
  }

  await store.setJSON(key, state)
  return json(responseForState(state, now))
}

export default async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return empty()
    }

    const url = new URL(req.url)
    if (url.pathname === '/api/sudoku/play-sessions') {
      if (req.method === 'POST') {
        return updatePlayLimit(await req.json().catch(() => null))
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
