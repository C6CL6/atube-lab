import { useCallback, useEffect, useMemo, useState } from 'react'
import { GameScreen } from './components/GameScreen'
import { DifficultyStartScreen } from './components/DifficultyStartScreen'
import { LoginScreen } from './components/LoginScreen'
import { RankingModal } from './components/RankingModal'
import { fetchCloudRecords, submitCloudRecord } from './api/cloudRecords'
import { getPlayLimitStatus, addPlaySecond, normalizePlayLimitState } from './domain/playLimits'
import { rankRecords, topRankingRecords } from './domain/ranking'
import type { AppData, BoardStyle, Difficulty, GameRecord, GameState } from './domain/types'
import { createGame } from './game/createGame'
import { createUser, deleteUser, loadAppData, saveAppData } from './storage/storage'

type Props = {
  gameWindowMode?: boolean
  onOpenGameWindow?: () => boolean
  onPlayingChange?: (playing: boolean) => void
  onReturnHome?: () => void
}

export function SudokuApp({ gameWindowMode = false, onOpenGameWindow, onPlayingChange, onReturnHome }: Props = {}) {
  const [data, setData] = useState<AppData>(() => loadAppData())
  const [showRanking, setShowRanking] = useState(false)
  const [playInCurrentWindow, setPlayInCurrentWindow] = useState(gameWindowMode)
  const [cloudRecords, setCloudRecords] = useState<GameRecord[] | null>(null)
  const [cloudUnavailable, setCloudUnavailable] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const activeUser = data.users.find((user) => user.id === data.activeUserId)
  const playLimit = normalizePlayLimitState(data.playLimit, now)
  const playLimitStatus = getPlayLimitStatus(playLimit, now)
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

  const onlineRankingRecords = useMemo(
    () => cloudRecords && !cloudUnavailable ? topRankingRecords(cloudRecords) : [],
    [cloudRecords, cloudUnavailable],
  )
  const localRankingRecords = useMemo(() => topRankingRecords(data.records), [data.records])

  const refreshCloudRecords = useCallback(async () => {
    const result = await fetchCloudRecords()
    setCloudRecords(result.records)
    setCloudUnavailable(result.unavailable)
  }, [])

  const syncRecordToCloud = useCallback((record: GameRecord) => {
    void submitCloudRecord(record).then(() => refreshCloudRecords())
  }, [refreshCloudRecords])

  const clearLocalRanking = () => {
    if (data.records.length === 0) return
    if (!window.confirm('确定清零本机排行榜吗？这只会删除当前浏览器里的本机成绩，不影响在线排行榜。')) return
    persist({ ...data, records: [] })
  }

  useEffect(() => {
    void refreshCloudRecords()
  }, [refreshCloudRecords])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    onPlayingChange?.(Boolean(activeUser && currentGame && playInCurrentWindow))
  }, [activeUser, currentGame, onPlayingChange, playInCurrentWindow])

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
        {showRanking ? (
          <RankingModal
            onlineRecords={onlineRankingRecords}
            localRecords={localRankingRecords}
            cloudUnavailable={cloudUnavailable}
            onClearLocal={clearLocalRanking}
            onClose={() => setShowRanking(false)}
          />
        ) : null}
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

  const newGame = (difficulty: Difficulty, boardStyle: BoardStyle = data.lastBoardStyle ?? 'decorative') => {
    const next = {
      ...data,
      lastDifficulty: difficulty,
      lastBoardStyle: boardStyle,
      games: { ...data.games, [activeUser.id]: createGame(difficulty, boardStyle) },
    }
    persist(next)
    if (gameWindowMode) {
      setPlayInCurrentWindow(true)
      return
    }
    const opened = onOpenGameWindow?.() ?? false
    setPlayInCurrentWindow(!opened)
  }

  if (!currentGame || !playInCurrentWindow) {
    return (
      <>
        <DifficultyStartScreen
          user={activeUser}
          defaultBoardStyle={data.lastBoardStyle ?? 'decorative'}
          onSelect={newGame}
          onSwitchUser={() => persist({ ...data, activeUserId: null })}
          onShowRanking={() => setShowRanking(true)}
        />
        {showRanking ? (
          <RankingModal
            onlineRecords={onlineRankingRecords}
            localRecords={localRankingRecords}
            cloudUnavailable={cloudUnavailable}
            onClearLocal={clearLocalRanking}
            onClose={() => setShowRanking(false)}
          />
        ) : null}
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
    const rankedRecords = rankRecords([...(cloudRecords ?? data.records), record])
    const rank = rankedRecords.findIndex((item) => item.id === record.id) + 1
    persist({
      ...data,
      games: { ...data.games, [activeUser.id]: game },
      records,
    })
    syncRecordToCloud(record)
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
    if (record) syncRecordToCloud(record)
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

  const trackPlaySecond = (tickNow: number) => {
    setData((current) => {
      const next = { ...current, playLimit: addPlaySecond(normalizePlayLimitState(current.playLimit, tickNow), tickNow) }
      saveAppData(next)
      return next
    })
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
        isGameWindow={gameWindowMode}
        onReturnHome={() => returnHome(currentGame)}
        playLimitStatus={playLimitStatus}
        onPlaySecond={trackPlaySecond}
      />
      {showRanking ? (
        <RankingModal
          onlineRecords={onlineRankingRecords}
          localRecords={localRankingRecords}
          cloudUnavailable={cloudUnavailable}
          onClearLocal={clearLocalRanking}
          onClose={() => setShowRanking(false)}
        />
      ) : null}
    </>
  )
}
