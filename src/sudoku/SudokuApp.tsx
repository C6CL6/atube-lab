import { useCallback, useEffect, useMemo, useState } from 'react'
import { GameScreen } from './components/GameScreen'
import { DifficultyStartScreen } from './components/DifficultyStartScreen'
import { LoginScreen } from './components/LoginScreen'
import { RankingModal } from './components/RankingModal'
import { rankRecords, topRankingRecords } from './domain/ranking'
import type { AppData, Difficulty, GameRecord, GameState } from './domain/types'
import { createGame } from './game/createGame'
import { createUser, deleteUser, loadAppData, saveAppData } from './storage/storage'

type Props = {
  onPlayingChange?: (playing: boolean) => void
  onReturnHome?: () => void
}

export function SudokuApp({ onPlayingChange, onReturnHome }: Props = {}) {
  const [data, setData] = useState<AppData>(() => loadAppData())
  const [showRanking, setShowRanking] = useState(false)
  const activeUser = data.users.find((user) => user.id === data.activeUserId)
  const currentGame = activeUser ? data.games[activeUser.id] : undefined

  const persist = useCallback((next: AppData) => {
    setData(next)
    saveAppData(next)
  }, [])

  const login = (userId: string) => {
    persist({ ...data, activeUserId: userId })
  }

  const addUser = (name: string) => {
    try {
      const created = createUser(data, name)
      persist(created.data)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : '无法创建用户'
    }
  }

  const removeUser = (userId: string) => {
    const user = data.users.find((item) => item.id === userId)
    if (!user) return
    if (window.confirm(`确定删除“${user.name}”吗？该玩家的游戏进度和成绩也会删除。`)) {
      persist(deleteUser(data, userId))
    }
  }

  const rankedRecords = useMemo(() => topRankingRecords(data.records), [data.records])

  useEffect(() => {
    onPlayingChange?.(Boolean(activeUser && currentGame))
  }, [activeUser, currentGame, onPlayingChange])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [activeUser?.id, currentGame?.id])

  if (!activeUser) {
    return (
      <>
        <LoginScreen
          users={data.users}
          onLogin={login}
          onCreate={addUser}
          onDelete={removeUser}
          onShowRanking={() => setShowRanking(true)}
        />
        {showRanking ? <RankingModal records={rankedRecords} onClose={() => setShowRanking(false)} /> : null}
      </>
    )
  }

  const updateGame = (game: GameState) => {
    setData((current) => {
      const next = { ...current, games: { ...current.games, [activeUser.id]: game } }
      saveAppData(next)
      return next
    })
  }

  const newGame = (difficulty: Difficulty) => {
    persist({
      ...data,
      lastDifficulty: difficulty,
      games: { ...data.games, [activeUser.id]: createGame(difficulty) },
    })
  }

  if (!currentGame) {
    return (
      <>
        <DifficultyStartScreen
          user={activeUser}
          onSelect={newGame}
          onSwitchUser={() => persist({ ...data, activeUserId: null })}
          onShowRanking={() => setShowRanking(true)}
        />
        {showRanking ? <RankingModal records={rankedRecords} onClose={() => setShowRanking(false)} /> : null}
      </>
    )
  }

  const completeGame = (game: GameState) => {
    const previousBest = data.records
      .filter((record) => record.userId === activeUser.id)
      .reduce((best, record) => Math.max(best, record.score), 0)
    const record: GameRecord = {
      id: crypto.randomUUID(),
      userId: activeUser.id,
      username: activeUser.name,
      score: game.score.score,
      elapsedSeconds: game.elapsedSeconds,
      mistakes: game.score.mistakes,
      difficulty: game.difficulty,
      startedAt: game.startedAt,
      completedAt: new Date().toISOString(),
      failed: game.score.frozen,
    }
    const records = [...data.records, record]
    const rankedRecords = rankRecords(records)
    const rank = rankedRecords.findIndex((item) => item.id === record.id) + 1
    persist({
      ...data,
      games: { ...data.games, [activeUser.id]: game },
      records,
    })
    return {
      score: record.score,
      rank: rank || rankedRecords.length + 1,
      previousBest,
      failed: record.failed,
    }
  }

  const recordAndEndGame = (game: GameState) => {
    const games = { ...data.games }
    delete games[activeUser.id]
    const record: GameRecord | null = game.recorded ? null : {
      id: crypto.randomUUID(),
      userId: activeUser.id,
      username: activeUser.name,
      score: game.score.score,
      elapsedSeconds: game.elapsedSeconds,
      mistakes: game.score.mistakes,
      difficulty: game.difficulty,
      startedAt: game.startedAt,
      completedAt: new Date().toISOString(),
      failed: game.score.frozen,
    }
    persist({
      ...data,
      games,
      records: record ? [...data.records, record] : data.records,
    })
  }

  const exitGame = (game: GameState) => {
    if (!window.confirm('确定退出游戏吗？当前游戏会结束，分数会保存。')) return
    recordAndEndGame(game)
  }

  const returnHome = (game: GameState) => {
    if (!window.confirm('确定返回主页吗？当前游戏会结束，分数会保存。')) return
    recordAndEndGame(game)
    onReturnHome?.()
  }

  return (
    <>
      <GameScreen
        user={activeUser}
        game={currentGame}
        onChange={updateGame}
        onNewGame={newGame}
        onComplete={completeGame}
        onSwitchUser={() => persist({ ...data, activeUserId: null })}
        onShowRanking={() => setShowRanking(true)}
        onExitGame={() => exitGame(currentGame)}
        onReturnHome={() => returnHome(currentGame)}
      />
      {showRanking ? <RankingModal records={rankedRecords} onClose={() => setShowRanking(false)} /> : null}
    </>
  )
}
