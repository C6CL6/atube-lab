import type { GameRecord } from '../domain/types'

type CloudRecordsResponse = {
  records: GameRecord[]
  unavailable: boolean
}

export async function fetchCloudRecords(): Promise<CloudRecordsResponse> {
  try {
    const response = await fetch('/api/sudoku/records', { headers: { Accept: 'application/json' } })
    if (!response.ok) return { records: [], unavailable: true }
    const body = await response.json() as { records?: GameRecord[] }
    return { records: Array.isArray(body.records) ? body.records : [], unavailable: false }
  } catch {
    return { records: [], unavailable: true }
  }
}

export async function submitCloudRecord(record: GameRecord): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/sudoku/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(record),
    })
    return { ok: response.ok }
  } catch {
    return { ok: false }
  }
}
