import type { GameRecord } from '../domain/types'

const PRODUCTION_RECORDS_ENDPOINT = 'https://atube-lab.netlify.app/api/sudoku/records'

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
