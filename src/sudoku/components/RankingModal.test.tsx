import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RankingModal } from './RankingModal'
import type { GameRecord } from '../domain/types'

const record = (id: string, username: string, score: number): GameRecord => ({
  id,
  userId: `user-${id}`,
  username,
  score,
  elapsedSeconds: 300,
  mistakes: 1,
  difficulty: 'easy',
  startedAt: '2026-06-25T06:00:00.000Z',
  completedAt: '2026-06-25T06:12:00.000Z',
  failed: false,
})

describe('排行榜弹窗', () => {
  it('显示用户名、分数和拿到成绩时间', () => {
    render(
      <RankingModal
        onClose={vi.fn()}
        onlineRecords={[record('record-1', '阿土伯', 1688)]}
        localRecords={[]}
        onClearLocal={vi.fn()}
      />,
    )

    expect(screen.getByText('玩家')).toBeInTheDocument()
    expect(screen.getByText('分数')).toBeInTheDocument()
    expect(screen.getByText('拿到成绩时间')).toBeInTheDocument()
    expect(screen.getByText('阿土伯')).toBeInTheDocument()
    expect(screen.getByText('1688')).toBeInTheDocument()
    expect(screen.queryByText('新手')).not.toBeInTheDocument()
    expect(screen.queryByText('05:00')).not.toBeInTheDocument()
  })

  it('云端排行榜不可用时显示提示', () => {
    render(<RankingModal onClose={vi.fn()} onlineRecords={[]} localRecords={[]} onClearLocal={vi.fn()} cloudUnavailable />)

    expect(screen.getByText('在线排行榜暂时不可用。')).toBeInTheDocument()
  })

  it('可切换在线排行榜和本机排行榜，本机排行榜可清零', async () => {
    const userAction = userEvent.setup()
    const onClearLocal = vi.fn()

    render(
      <RankingModal
        onClose={vi.fn()}
        onlineRecords={[record('online-1', '云端玩家', 3000)]}
        localRecords={[record('local-1', '本机玩家', 2000)]}
        onClearLocal={onClearLocal}
      />,
    )

    expect(screen.getByRole('tab', { name: '在线排行榜' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('云端玩家')).toBeInTheDocument()
    expect(screen.queryByText('本机玩家')).not.toBeInTheDocument()

    await userAction.click(screen.getByRole('tab', { name: '本机排行榜' }))

    expect(screen.getByRole('tab', { name: '本机排行榜' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('本机玩家')).toBeInTheDocument()
    expect(screen.queryByText('云端玩家')).not.toBeInTheDocument()

    await userAction.click(screen.getByRole('button', { name: '清零本机排行' }))

    expect(onClearLocal).toHaveBeenCalledTimes(1)
  })
})
