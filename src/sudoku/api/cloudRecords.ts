import type { GameRecord } from '../domain/types'

const PRODUCTION_RECORDS_ENDPOINT = 'https://atube-lab.netlify.app/api/sudoku/records'
const PRODUCTION_PLAY_SESSIONS_ENDPOINT = 'https://atube-lab.netlify.app/api/sudoku/play-sessions'

type CloudRecordsResponse = {
  records: GameRecord[]
  unavailable: boolean
}

export function getCloudRecordsEndpoint(hostname = window.location.hostname) {
  return hostname === 'atube-lab.netlify.app'
    ? '/api/sudoku/records'
    : hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'atube-inspiration-lab.netlify.app'
    ? PRODUCTION_RECORDS_ENDPOINT
    : '/api/sudoku/records'
}

export function getPlaySessionsEndpoint(hostname = window.location.hostname) {
  return hostname === 'atube-lab.netlify.app'
    ? '/api/sudoku/play-sessions'
    : hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'atube-inspiration-lab.netlify.app'
    ? PRODUCTION_PLAY_SESSIONS_ENDPOINT
    : '/api/sudoku/play-sessions'
}

export async function fetchCloudRecords(): Promise<CloudRecordsResponse> {
  try {
    const response = await fetch(getCloudRecordsEndpoint(), { headers: { Accept: 'application/json' } })
    if (!response.ok) return { records: [], unavailable: true }
    const body = await response.json() as { records?: GameRecord[] }
    return { records: Array.isArray(body.records) ? body.records : [], unavailable: false }
  } catch {
    return { records: [], unavailable: true }
  }
}

export async function submitCloudRecord(record: GameRecord): Promise<{ ok: boolean }> {
  try {
    const response = await fetch(getCloudRecordsEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(record),
    })
    return { ok: response.ok }
  } catch {
    return { ok: false }
  }
}

export async function startCloudPlaySession(deviceId: string, startedAt = new Date().toISOString()): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch(getPlaySessionsEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ deviceId, startedAt }),
    })
    if (response.ok) return { ok: true }
    const body = await response.json().catch(() => ({})) as { error?: string }
    return { ok: false, message: body.error ?? '暂时无法开始游戏，请稍后再试' }
  } catch {
    return { ok: false, message: '暂时无法开始游戏，请稍后再试' }
  }
}
