import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameRecord } from '../domain/types'
import { fetchCloudRecords, getCloudRecordsEndpoint, getPlaySessionsEndpoint, syncCloudPlayLimit, submitCloudRecord } from './cloudRecords'

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
      'https://atube-lab.netlify.app/api/sudoku/records',
      { headers: { Accept: 'application/json' } },
    )
  })

  it('本地开发地址使用正式云端接口，方便跨设备测试成绩', () => {
    expect(getCloudRecordsEndpoint('127.0.0.1')).toBe('https://atube-lab.netlify.app/api/sudoku/records')
    expect(getCloudRecordsEndpoint('localhost')).toBe('https://atube-lab.netlify.app/api/sudoku/records')
    expect(getCloudRecordsEndpoint('atube-inspiration-lab.netlify.app')).toBe('https://atube-lab.netlify.app/api/sudoku/records')
    expect(getCloudRecordsEndpoint('atube-lab.netlify.app')).toBe('/api/sudoku/records')
    expect(getPlaySessionsEndpoint('localhost')).toBe('https://atube-lab.netlify.app/api/sudoku/play-sessions')
    expect(getPlaySessionsEndpoint('atube-lab.netlify.app')).toBe('/api/sudoku/play-sessions')
  })

  it('云端不可用时返回安全降级状态', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(fetchCloudRecords()).resolves.toEqual({ records: [], unavailable: true })
  })

  it('提交一条结束成绩到云端', async () => {
    const record = makeRecord(3600)
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ record }), { status: 201 }))

    await expect(submitCloudRecord(record)).resolves.toEqual({ ok: true })
    expect(window.fetch).toHaveBeenCalledWith('https://atube-lab.netlify.app/api/sudoku/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(record),
    })
  })

  it('提交失败时不阻断本地游戏', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('bad gateway', { status: 502 }))

    await expect(submitCloudRecord(makeRecord(1200))).resolves.toEqual({ ok: false })
  })

  it('连续游戏超过两小时时返回后端休息提示', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: '已连续游戏 2 小时，请休息 30 分钟后继续', restSeconds: 1800 }),
      { status: 429 },
    ))

    await expect(syncCloudPlayLimit({
      deviceId: 'device-1234567890',
      action: 'play',
      gameId: 'game-1',
      elapsedSeconds: 7200,
    })).resolves.toEqual({
      ok: false,
      message: '已连续游戏 2 小时，请休息 30 分钟后继续',
      restSeconds: 1800,
    })
    expect(window.fetch).toHaveBeenCalledWith('https://atube-lab.netlify.app/api/sudoku/play-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        deviceId: 'device-1234567890',
        action: 'play',
        gameId: 'game-1',
        elapsedSeconds: 7200,
      }),
    })
  })

  it('防沉迷服务暂时不可用时不阻断本地游戏', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(syncCloudPlayLimit({
      deviceId: 'device-1234567890',
      action: 'start',
      gameId: 'game-1',
      elapsedSeconds: 0,
    })).resolves.toEqual({ ok: false, unavailable: true, message: '防沉迷服务暂时不可用' })
  })

  it('非防沉迷拒绝的接口错误也按服务不可用降级', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('not found', { status: 404 }))

    await expect(syncCloudPlayLimit({
      deviceId: 'device-1234567890',
      action: 'start',
      gameId: 'game-1',
      elapsedSeconds: 0,
    })).resolves.toEqual({ ok: false, unavailable: true, message: '防沉迷服务暂时不可用' })
  })
})
