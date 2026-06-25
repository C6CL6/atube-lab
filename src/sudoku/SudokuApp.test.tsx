import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SudokuApp } from './SudokuApp'
import type { AppData, GameState, UserProfile } from './domain/types'
import { createScoreState } from './domain/scoring'

const STORAGE_KEY = 'atube-sudoku-v1'

function oneMoveGame(): GameState {
  const puzzle = Array(81).fill(1)
  const solution = Array(81).fill(1)
  const values = Array(81).fill(1)
  puzzle[80] = 0
  values[80] = 0
  solution[80] = 9
  return {
    id: 'game-1',
    difficulty: 'easy',
    puzzle,
    solution,
    values,
    initialEmptyCount: 1,
    selectedIndex: 80,
    elapsedSeconds: 12,
    paused: false,
    completed: false,
    recorded: false,
    score: createScoreState('easy', 1),
    history: [],
    startedAt: '2026-06-25T06:00:00.000Z',
  }
}

function saveAppDataWithGame() {
  const user: UserProfile = {
    id: 'user-1',
    name: '阿土伯',
    avatarColor: '#913f30',
    createdAt: '2026-06-25T00:00:00.000Z',
  }
  const data: AppData = {
    version: 1,
    users: [user],
    activeUserId: user.id,
    games: { [user.id]: oneMoveGame() },
    records: [],
    lastDifficulty: 'easy',
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

describe('数独应用记录成绩', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ records: [] }), { status: 200 }))
  })

  it('完成棋盘后保留成绩记录，并写入开始和结束时间', async () => {
    saveAppDataWithGame()
    const userAction = userEvent.setup()

    render(<SudokuApp gameWindowMode />)

    await userAction.click(screen.getByRole('button', { name: '继续游戏' }))
    await userAction.click(screen.getByRole('button', { name: '数字 9' }))

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as AppData
      expect(saved.records).toHaveLength(1)
    })

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as AppData
    expect(saved.records[0]).toMatchObject({
      username: '阿土伯',
      startedAt: '2026-06-25T06:00:00.000Z',
    })
    expect(saved.records[0].score).toBeGreaterThan(0)
    expect(saved.records[0].completedAt).toEqual(expect.any(String))
    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        'https://atube-inspiration-lab.netlify.app/api/sudoku/records',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('退出游戏会保存当前分数并结束当前题局', async () => {
    saveAppDataWithGame()
    const userAction = userEvent.setup()

    render(<SudokuApp gameWindowMode />)

    await userAction.click(screen.getByRole('button', { name: '退出游戏' }))

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as AppData
    expect(saved.records).toHaveLength(1)
    expect(saved.records[0].username).toBe('阿土伯')
    expect(saved.records[0].startedAt).toBe('2026-06-25T06:00:00.000Z')
    expect(saved.records[0].completedAt).toEqual(expect.any(String))
    expect(saved.games['user-1']).toBeUndefined()
    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        'https://atube-inspiration-lab.netlify.app/api/sudoku/records',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
