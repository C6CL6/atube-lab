import { useEffect, useMemo, useRef, useState } from 'react'
import { applyCorrectMove, applyMistake, calculateCompletionBonus, resetStreak } from '../domain/scoring'
import type { Difficulty, GameState, UserProfile } from '../domain/types'

type Completion = {
  score: number
  rank: number
  previousBest: number
  failed: boolean
}

type Props = {
  user: UserProfile
  game: GameState
  onChange: (game: GameState) => void
  onNewGame: (difficulty: Difficulty) => void
  onComplete: (game: GameState) => Completion
  onSwitchUser: () => void
  onShowRanking: () => void
  onExitGame: () => void
  isGameWindow?: boolean
  onReturnHome: () => void
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: '新手', medium: '高手', hard: '专家' }
const FLASH_DURATION_MS = 900

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

function rowIndexes(row: number) {
  return Array.from({ length: 9 }, (_, offset) => row * 9 + offset)
}

function columnIndexes(column: number) {
  return Array.from({ length: 9 }, (_, offset) => offset * 9 + column)
}

function boxIndexes(index: number) {
  const row = Math.floor(index / 9)
  const column = index % 9
  const boxRow = Math.floor(row / 3) * 3
  const boxColumn = Math.floor(column / 3) * 3
  return Array.from({ length: 9 }, (_, offset) => (
    (boxRow + Math.floor(offset / 3)) * 9 + boxColumn + (offset % 3)
  ))
}

function groupFilled(values: number[], indexes: number[]) {
  return indexes.every((index) => values[index] !== 0)
}

function newlyCompletedCells(index: number, before: number[], after: number[]) {
  const row = Math.floor(index / 9)
  const column = index % 9
  const groups = [rowIndexes(row), columnIndexes(column), boxIndexes(index)]
  return [
    ...new Set(groups
      .filter((indexes) => !groupFilled(before, indexes) && groupFilled(after, indexes))
      .flat()),
  ]
}

export function GameScreen({ user, game, onChange, onNewGame, onComplete, onSwitchUser, onShowRanking, onExitGame, isGameWindow = false, onReturnHome }: Props) {
  const [wrongCell, setWrongCell] = useState<number | null>(null)
  const [flashingCells, setFlashingCells] = useState<number[]>([])
  const [completion, setCompletion] = useState<Completion | null>(null)
  const [newGameOpen, setNewGameOpen] = useState(false)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    if (game.paused || game.completed) return
    const timer = window.setInterval(() => {
      onChange({ ...game, elapsedSeconds: game.elapsedSeconds + 1 })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [game, onChange])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !game.completed) onChange({ ...game, paused: true })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [game, onChange])

  useEffect(() => () => {
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
  }, [])

  const selectedValue = game.selectedIndex === null ? 0 : game.values[game.selectedIndex]
  const remaining = game.values.filter((value) => value === 0).length
  const completedNumbers = useMemo(() => new Set(
    Array.from({ length: 9 }, (_, index) => index + 1)
      .filter((value) => game.values.filter((cellValue) => cellValue === value).length >= 9),
  ), [game.values])

  const relatedCells = useMemo(() => {
    const result = new Set<number>()
    if (game.selectedIndex === null) return result
    const row = Math.floor(game.selectedIndex / 9)
    const column = game.selectedIndex % 9
    const boxRow = Math.floor(row / 3) * 3
    const boxColumn = Math.floor(column / 3) * 3
    for (let offset = 0; offset < 9; offset += 1) {
      result.add(row * 9 + offset)
      result.add(offset * 9 + column)
      result.add((boxRow + Math.floor(offset / 3)) * 9 + boxColumn + (offset % 3))
    }
    return result
  }, [game.selectedIndex])

  const finishIfNeeded = (next: GameState) => {
    if (next.values.some((value) => value === 0) || next.recorded) return next
    const bonus = calculateCompletionBonus(next.score, next.elapsedSeconds)
    const completedGame = {
      ...next,
      completed: true,
      recorded: true,
      score: { ...next.score, score: next.score.score + bonus },
    }
    const result = onComplete(completedGame)
    setCompletion(result)
    return completedGame
  }

  const flashCompletedGroups = (index: number, before: number[], after: number[]) => {
    const cells = newlyCompletedCells(index, before, after)
    if (cells.length === 0) return
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    setFlashingCells(cells)
    flashTimer.current = window.setTimeout(() => {
      setFlashingCells([])
      flashTimer.current = null
    }, FLASH_DURATION_MS)
  }

  const enterNumber = (value: number) => {
    const index = game.selectedIndex
    if (index === null || game.paused || game.completed || game.puzzle[index] !== 0) return
    if (value !== game.solution[index]) {
      const score = applyMistake(game.score)
      setWrongCell(index)
      window.setTimeout(() => setWrongCell(null), 650)
      const next = { ...game, score }
      onChange(next)
      return
    }
    const score = applyCorrectMove(game.score, index)
    const values = [...game.values]
    values[index] = value
    flashCompletedGroups(index, game.values, values)
    const next = finishIfNeeded({
      ...game,
      values,
      score,
      history: [...game.history, { index, previousValue: 0, nextValue: value, scoreBefore: game.score }],
    })
    onChange(next)
  }

  const erase = () => {
    const index = game.selectedIndex
    if (index === null || game.puzzle[index] !== 0 || game.values[index] === 0) return
    const values = [...game.values]
    values[index] = 0
    onChange({ ...game, values, score: resetStreak(game.score) })
  }

  const undo = () => {
    const move = game.history.at(-1)
    if (!move) return
    const values = [...game.values]
    values[move.index] = move.previousValue
    onChange({
      ...game,
      values,
      selectedIndex: move.index,
      score: resetStreak(game.score),
      history: game.history.slice(0, -1),
    })
  }

  const hint = () => {
    const index = game.selectedIndex !== null && game.values[game.selectedIndex] === 0
      ? game.selectedIndex
      : game.values.findIndex((value) => value === 0)
    if (index < 0 || game.score.frozen) return
    const values = [...game.values]
    values[index] = game.solution[index]
    flashCompletedGroups(index, game.values, values)
    const score = resetStreak({
      ...game.score,
      scoredCells: game.score.scoredCells.includes(index)
        ? game.score.scoredCells
        : [...game.score.scoredCells, index],
    })
    const next = finishIfNeeded({ ...game, values, score, selectedIndex: index })
    onChange(next)
  }

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key >= '1' && event.key <= '9') enterNumber(Number(event.key))
      if (event.key === 'Backspace' || event.key === 'Delete') erase()
      if (event.key === 'ArrowLeft' && game.selectedIndex !== null) onChange({ ...game, selectedIndex: Math.max(0, game.selectedIndex - 1) })
      if (event.key === 'ArrowRight' && game.selectedIndex !== null) onChange({ ...game, selectedIndex: Math.min(80, game.selectedIndex + 1) })
      if (event.key === 'ArrowUp' && game.selectedIndex !== null) onChange({ ...game, selectedIndex: Math.max(0, game.selectedIndex - 9) })
      if (event.key === 'ArrowDown' && game.selectedIndex !== null) onChange({ ...game, selectedIndex: Math.min(80, game.selectedIndex + 9) })
    }
    window.addEventListener('keydown', keyHandler)
    return () => window.removeEventListener('keydown', keyHandler)
  })

  return (
    <div className={`page-shell game-shell ${isGameWindow ? 'game-shell--window' : ''}`}>
      <main>
        {isGameWindow ? null : (
          <div className="game-toolbar">
            <span className="game-brand"><span>A</span> 阿土伯灵感实验室出品</span>
            <div className="game-toolbar-actions">
              <button className="text-button" onClick={onReturnHome}>返回主页</button>
              <button className="text-button" onClick={onShowRanking}>排行榜</button>
              <button className="user-chip compact-user-chip" onClick={onSwitchUser}>
                <span className="mini-avatar" style={{ background: user.avatarColor }}>{user.name.slice(0, 1)}</span>
                <span>{user.name}</span>
              </button>
            </div>
          </div>
        )}
        <div className="game-heading">
          <div>
            <p className="eyebrow">{DIFFICULTY_LABELS[game.difficulty]}难度 · 还剩 {remaining} 格</p>
            <h1>数独挑战</h1>
          </div>
          <div className="scoreboard">
            <div><span>分数</span><strong>{game.score.score}</strong></div>
            <div><span>连对</span><strong>{game.score.streak}</strong></div>
            <div>
              <span>错误</span>
              <strong
                data-testid="mistake-counter"
                className={game.score.mistakes <= 3 ? 'mistake-safe' : 'mistake-failed'}
              >
                {game.score.mistakes} / 3
              </strong>
            </div>
            <div><span>用时</span><strong>{formatTime(game.elapsedSeconds)}</strong></div>
          </div>
        </div>

        <div className="game-layout">
          <div className={`board-wrap ${game.paused ? 'is-paused' : ''}`}>
            <div className="sudoku-board" role="grid" aria-label="数独棋盘">
              {game.values.map((value, index) => {
                const selected = index === game.selectedIndex
                const sameValue = selectedValue > 0 && value === selectedValue
                const classes = [
                  'sudoku-cell',
                  game.puzzle[index] !== 0 ? 'given' : 'editable',
                  relatedCells.has(index) ? 'related' : '',
                  selected ? 'selected' : '',
                  sameValue ? 'same-value' : '',
                  wrongCell === index ? 'wrong' : '',
                  flashingCells.includes(index) ? 'completed-flash' : '',
                ].filter(Boolean).join(' ')
                return (
                  <button
                    key={index}
                    className={classes}
                    role="gridcell"
                    aria-label={`第${Math.floor(index / 9) + 1}行第${index % 9 + 1}列${value ? `，数字${value}` : '，空格'}`}
                    onClick={() => onChange({ ...game, selectedIndex: index })}
                  >
                    {wrongCell === index ? '×' : value || ''}
                  </button>
                )
              })}
            </div>
            {game.paused ? (
              <div className="pause-cover">
                <h2>游戏已暂停</h2>
                <button className="primary-button" onClick={() => onChange({ ...game, paused: false })}>继续游戏</button>
              </div>
            ) : null}
          </div>

          <aside className="control-panel">
            <h2>选择数字</h2>
            <p>先点棋盘空格，再点一个大数字。</p>
            <div className="number-pad">
              {Array.from({ length: 9 }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  className={`number-key ${completedNumbers.has(value) ? 'is-complete' : ''}`}
                  onClick={() => enterNumber(value)}
                  aria-label={`数字 ${value}`}
                  disabled={completedNumbers.has(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            {!game.score.frozen ? (
              <div className="tool-grid">
                <button onClick={undo} disabled={game.history.length === 0}>撤销一步</button>
                <button onClick={onExitGame}>退出游戏</button>
                <button onClick={hint}>给我提示</button>
                <button onClick={() => onChange({ ...game, paused: true })}>暂停游戏</button>
              </div>
            ) : null}
            {game.score.frozen ? (
              <div className="tool-grid frozen-tool-grid">
                <button onClick={onExitGame}>退出游戏</button>
                <button onClick={() => onChange({ ...game, paused: true })}>暂停游戏</button>
              </div>
            ) : null}
            {game.score.frozen ? <p className="frozen-note">分数已冻结，继续完成棋盘</p> : null}
            <button className="new-game-button" onClick={() => setNewGameOpen(true)}>开始新游戏</button>
          </aside>
        </div>
      </main>

      {newGameOpen ? (
        <div className="modal-backdrop">
          <section className="modal difficulty-modal" role="dialog" aria-modal="true" aria-labelledby="difficulty-title">
            <button className="close-button" onClick={() => setNewGameOpen(false)} aria-label="关闭">×</button>
            <p className="eyebrow">选择挑战</p>
            <h2 id="difficulty-title">开始新游戏</h2>
            <div className="difficulty-list">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((difficulty) => (
                <button key={difficulty} onClick={() => {
                  setNewGameOpen(false)
                  onNewGame(difficulty)
                }}>
                  <strong>{DIFFICULTY_LABELS[difficulty]}</strong>
                  <span>{difficulty === 'easy' ? '轻松热身' : difficulty === 'medium' ? '日常挑战' : '冲击高分'}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {completion ? (
        <div className="modal-backdrop">
          <section className="modal encouragement-modal" role="dialog" aria-modal="true">
            <p className="eyebrow">{completion.rank <= 10 ? `排行榜第 ${completion.rank} 名` : '完成挑战'}</p>
            <h2>{completion.score > completion.previousBest ? '恭喜，刷新个人最高分！' : '漂亮，棋盘完成了！'}</h2>
            <div className="big-score">{completion.score}</div>
            <p>{completion.failed ? '本局在第四次错误后完成，冻结分数已记入排行榜。' : `比此前最佳成绩提高 ${Math.max(0, completion.score - completion.previousBest)} 分。`}</p>
            <div className="modal-actions">
              <button className="primary-button" onClick={() => onNewGame(game.difficulty)}>再来一局</button>
              <button className="secondary-button" onClick={() => setCompletion(null)}>查看棋盘</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
