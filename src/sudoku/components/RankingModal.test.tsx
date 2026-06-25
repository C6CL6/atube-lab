import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RankingModal } from './RankingModal'

describe('排行榜弹窗', () => {
  it('显示用户名、分数和拿到成绩时间', () => {
    render(
      <RankingModal
        onClose={vi.fn()}
        records={[{
          id: 'record-1',
          userId: 'user-1',
          username: '阿土伯',
          score: 1688,
          elapsedSeconds: 300,
          mistakes: 1,
          difficulty: 'easy',
          startedAt: '2026-06-25T06:00:00.000Z',
          completedAt: '2026-06-25T06:12:00.000Z',
          failed: false,
        }]}
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
    render(<RankingModal onClose={vi.fn()} records={[]} cloudUnavailable />)

    expect(screen.getByText('云端排行榜暂时不可用，当前显示本机备份成绩。')).toBeInTheDocument()
  })
})
