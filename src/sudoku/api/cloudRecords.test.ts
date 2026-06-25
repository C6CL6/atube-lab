import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameRecord } from '../domain/types'
import { fetchCloudRecords, getCloudRecordsEndpoint, submitCloudRecord } from './cloudRecords'

function makeRecord(score: number): GameRecord {
  return {
    id: `record-${score}`,
    userId: `user-${score}`,
    username: '阿土伯',
    score,
    elapsedSeconds: 120,
    mistakes: 0,
    difficulty: 'easy',
    startedAt: '2026-06-25T08:00:00.000Z',
    completedAt: '2026-06-25T08:02:00.000Z',
    failed: false,
  }
}

describe('云端成绩客户端', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('从云端读取排行榜成绩', async () => {
    const records = [makeRecord(3000), makeRecord(2000)]
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ records }), { status: 200 }))

    await expect(fetchCloudRecords()).resolves.toEqual({ records, unavailable: false })
    expect(window.fetch).toHaveBeenCalledWith(
      'https://atube-inspiration-lab.netlify.app/api/sudoku/records',
      { headers: { Accept: 'application/json' } },
    )
  })

  it('本地开发地址使用正式云端接口，方便跨设备测试成绩', () => {
    expect(getCloudRecordsEndpoint('127.0.0.1')).toBe('https://atube-inspiration-lab.netlify.app/api/sudoku/records')
    expect(getCloudRecordsEndpoint('localhost')).toBe('https://atube-inspiration-lab.netlify.app/api/sudoku/records')
    expect(getCloudRecordsEndpoint('atube-inspiration-lab.netlify.app')).toBe('/api/sudoku/records')
  })

  it('云端不可用时返回安全降级状态', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(fetchCloudRecords()).resolves.toEqual({ records: [], unavailable: true })
  })

  it('提交一条结束成绩到云端', async () => {
    const record = makeRecord(3600)
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ record }), { status: 201 }))

    await expect(submitCloudRecord(record)).resolves.toEqual({ ok: true })
    expect(window.fetch).toHaveBeenCalledWith('https://atube-inspiration-lab.netlify.app/api/sudoku/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(record),
    })
  })

  it('提交失败时不阻断本地游戏', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('bad gateway', { status: 502 }))

    await expect(submitCloudRecord(makeRecord(1200))).resolves.toEqual({ ok: false })
  })
})
