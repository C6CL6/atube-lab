import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createScoreState } from '../domain/scoring'
import type { GameState, UserProfile } from '../domain/types'
import { GameScreen } from './GameScreen'

const user: UserProfile = {
  id: 'u1',
  name: '测试玩家',
  avatarColor: '#913f30',
  createdAt: '2026-06-21T00:00:00.000Z',
}

function frozenGame(): GameState {
  const score = { ...createScoreState('easy', 1), score: 300, mistakes: 4, frozen: true }
  return {
    id: 'g1',
    difficulty: 'easy',
    puzzle: Array(81).fill(1),
    solution: Array(81).fill(1),
    values: Array(81).fill(1),
    initialEmptyCount: 1,
    selectedIndex: 0,
    elapsedSeconds: 100,
    paused: false,
    completed: false,
    recorded: false,
    score,
    history: [],
    startedAt: '2026-06-21T00:00:00.000Z',
  }
}

describe('分数冻结后的游戏界面', () => {
  it('不弹挑战结束窗口，保留数字键盘并隐藏辅助操作', () => {
    render(
      <GameScreen
        user={user}
        game={frozenGame()}
        onChange={vi.fn()}
        onNewGame={vi.fn()}
        onComplete={vi.fn()}
        onSwitchUser={vi.fn()}
        onShowRanking={vi.fn()}
        onExitGame={vi.fn()}
        onReturnHome={vi.fn()}
      />,
    )

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '数字 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '撤销一步' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '退出游戏' })).toBeInTheDocument()
    expect(screen.getByText('分数已冻结，继续完成棋盘')).toBeInTheDocument()
  })

  it('错误栏右侧固定为3，三次以内绿色，超过三次红色', () => {
    const { rerender } = render(
      <GameScreen
        user={user}
        game={{ ...frozenGame(), score: { ...frozenGame().score, mistakes: 3, frozen: false } }}
        onChange={vi.fn()}
        onNewGame={vi.fn()}
        onComplete={vi.fn()}
        onSwitchUser={vi.fn()}
        onShowRanking={vi.fn()}
        onExitGame={vi.fn()}
        onReturnHome={vi.fn()}
      />,
    )

    const normalCounter = screen.getByTestId('mistake-counter')
    expect(normalCounter).toHaveTextContent('3 / 3')
    expect(normalCounter).toHaveClass('mistake-safe')

    rerender(
      <GameScreen
        user={user}
        game={{ ...frozenGame(), score: { ...frozenGame().score, mistakes: 5, frozen: true } }}
        onChange={vi.fn()}
        onNewGame={vi.fn()}
        onComplete={vi.fn()}
        onSwitchUser={vi.fn()}
        onShowRanking={vi.fn()}
        onExitGame={vi.fn()}
        onReturnHome={vi.fn()}
      />,
    )

    const failedCounter = screen.getByTestId('mistake-counter')
    expect(failedCounter).toHaveTextContent('5 / 3')
    expect(failedCounter).toHaveClass('mistake-failed')
  })
})

function interactiveGame(): GameState {
  const puzzle = Array(81).fill(0)
  const solution = Array(81).fill(1)
  const values = Array(81).fill(1)
  values[8] = 0
  solution[8] = 9
  return {
    id: 'interactive',
    difficulty: 'easy',
    puzzle,
    solution,
    values,
    initialEmptyCount: 1,
    selectedIndex: 8,
    elapsedSeconds: 0,
    paused: false,
    completed: false,
    recorded: false,
    score: createScoreState('easy', 1),
    history: [],
    startedAt: '2026-06-21T00:00:00.000Z',
  }
}

function StatefulGame({ initialGame }: { initialGame: GameState }) {
  const [game, setGame] = useState(initialGame)
  return (
    <GameScreen
      user={user}
      game={game}
      onChange={setGame}
      onNewGame={vi.fn()}
      onComplete={() => ({ score: 0, rank: 1, previousBest: 0, failed: false })}
      onSwitchUser={vi.fn()}
      onShowRanking={vi.fn()}
      onExitGame={vi.fn()}
      onReturnHome={vi.fn()}
    />
  )
}

describe('棋盘完成反馈', () => {
  it('某个数字填满9个后，选择数字按钮变灰并不可点击', () => {
    const game = interactiveGame()
    game.values = game.values.map((_, index) => (index < 9 ? 2 : 1))
    game.values[8] = 0
    game.solution[8] = 2

    render(
      <GameScreen
        user={user}
        game={game}
        onChange={vi.fn()}
        onNewGame={vi.fn()}
        onComplete={vi.fn()}
        onSwitchUser={vi.fn()}
        onShowRanking={vi.fn()}
        onExitGame={vi.fn()}
        onReturnHome={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '数字 1' })).toHaveClass('is-complete')
    expect(screen.getByRole('button', { name: '数字 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '数字 2' })).not.toHaveClass('is-complete')
  })

  it('填满一行时，该行出现祝贺闪烁样式', async () => {
    const userAction = userEvent.setup()
    render(<StatefulGame initialGame={interactiveGame()} />)

    await userAction.click(screen.getByRole('button', { name: '数字 9' }))

    expect(screen.getByRole('gridcell', { name: '第1行第1列，数字1' })).toHaveClass('completed-flash')
    expect(screen.getByRole('gridcell', { name: '第1行第9列，数字9' })).toHaveClass('completed-flash')
  })
})

describe('正式游戏退出入口', () => {
  it('用退出游戏替代擦除数字，并调用保存退出处理', async () => {
    const userAction = userEvent.setup()
    const onExitGame = vi.fn()

    render(
      <GameScreen
        user={user}
        game={interactiveGame()}
        onChange={vi.fn()}
        onNewGame={vi.fn()}
        onComplete={vi.fn()}
        onSwitchUser={vi.fn()}
        onShowRanking={vi.fn()}
        onExitGame={onExitGame}
        onReturnHome={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: '擦除数字' })).not.toBeInTheDocument()

    await userAction.click(screen.getByRole('button', { name: '退出游戏' }))

    expect(onExitGame).toHaveBeenCalledTimes(1)
  })

  it('顶部提供返回主页入口，并调用保存返回处理', async () => {
    const userAction = userEvent.setup()
    const onReturnHome = vi.fn()

    render(
      <GameScreen
        user={user}
        game={interactiveGame()}
        onChange={vi.fn()}
        onNewGame={vi.fn()}
        onComplete={vi.fn()}
        onSwitchUser={vi.fn()}
        onShowRanking={vi.fn()}
        onExitGame={vi.fn()}
        onReturnHome={onReturnHome}
      />,
    )

    await userAction.click(screen.getByRole('button', { name: '返回主页' }))

    expect(onReturnHome).toHaveBeenCalledTimes(1)
  })
})
