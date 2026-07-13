import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameScreen } from './components/GameScreen'
import { DifficultyStartScreen } from './components/DifficultyStartScreen'
import { LoginScreen } from './components/LoginScreen'
import { RankingModal } from './components/RankingModal'
import { fetchCloudRecords, syncCloudPlayLimit, submitCloudRecord } from './api/cloudRecords'
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

const DEVICE_ID_KEY = 'atube-sudoku-device-id'
const SYNC_INTERVAL_SECONDS = 30

function getSudokuDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, id)
  return id
}

function restMessage(restSeconds: number) {
  return restSeconds > 0
    ? `已连续游戏 2 小时，请休息 ${Math.ceil(restSeconds / 60)} 分钟后继续`
    : '休息结束，可以继续游戏'
}

export function SudokuApp({ gameWindowMode = false, onOpenGameWindow, onPlayingChange, onReturnHome }: Props = {}) {
  const [data, setData] = useState<AppData>(() => loadAppData())
  const [showRanking, setShowRanking] = useState(false)
  const [playInCurrentWindow, setPlayInCurrentWindow] = useState(gameWindowMode)
  const [cloudRecords, setCloudRecords] = useState<GameRecord[] | null>(null)
  const [cloudUnavailable, setCloudUnavailable] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')
  const [startingGame, setStartingGame] = useState(false)
  const [remainingPlaySeconds, setRemainingPlaySeconds] = useState<number | null>(null)
  const [restSeconds, setRestSeconds] = useState(0)
  const mounted = useRef(true)
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

  const onlineRankingRecords = useMemo(
    () => cloudRecords && !cloudUnavailable ? topRankingRecords(cloudRecords) : [],
    [cloudRecords, cloudUnavailable],
  )
  const localRankingRecords = useMemo(() => topRankingRecords(data.records), [data.records])

  const refreshCloudRecords = useCallback(async () => {
    const result = await fetchCloudRecords()
    if (!mounted.current) return
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
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    onPlayingChange?.(Boolean(activeUser && currentGame && playInCurrentWindow))
  }, [activeUser, currentGame, onPlayingChange, playInCurrentWindow])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [activeUser?.id, currentGame?.id])

  useEffect(() => {
    if (restSeconds <= 0) return
    const timer = window.setInterval(() => {
      setRestSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [restSeconds > 0])

  useEffect(() => {
    if (restSeconds > 0) setLimitMessage(restMessage(restSeconds))
  }, [restSeconds])

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

  const pauseStoredGame = (game: GameState) => {
    setData((current) => {
      const ownerId = Object.entries(current.games).find(([, item]) => item.id === game.id)?.[0]
      if (!ownerId) return current
      const next = { ...current, games: { ...current.games, [ownerId]: { ...current.games[ownerId], paused: true } } }
      saveAppData(next)
      return next
    })
  }

  const syncPlayLimit = async (action: 'start' | 'resume' | 'play' | 'pause', game: GameState) => {
    const result = await syncCloudPlayLimit({
      deviceId: getSudokuDeviceId(),
      action,
      gameId: game.id,
      elapsedSeconds: game.elapsedSeconds,
    })
    if (result.unavailable) {
      setRemainingPlaySeconds(null)
      return true
    }
    if (result.ok) {
      setRemainingPlaySeconds(result.remainingSeconds ?? null)
      if (action === 'start' || action === 'resume') {
        setRestSeconds(0)
        setLimitMessage('')
      }
      return true
    }

    const nextRestSeconds = result.restSeconds ?? 0
    setRestSeconds(nextRestSeconds)
    setLimitMessage(result.message ?? (nextRestSeconds > 0 ? restMessage(nextRestSeconds) : '暂时无法开始游戏，请稍后再试'))
    pauseStoredGame(game)
    return false
  }

  const updateGame = (game: GameState) => {
    const wasPaused = currentGame?.id === game.id && currentGame.paused
    setData((current) => {
      const next = { ...current, games: { ...current.games, [activeUser.id]: game } }
      saveAppData(next)
      return next
    })
    if (game.paused && !wasPaused) void syncPlayLimit('pause', game)
  }

  const handleGameTick = (game: GameState) => {
    if (remainingPlaySeconds !== null && remainingPlaySeconds <= 1) {
      updateGame({ ...game, paused: true })
      void syncPlayLimit('play', game)
      return
    }
    updateGame(game)
    setRemainingPlaySeconds((seconds) => seconds === null ? null : Math.max(0, seconds - 1))
    if (game.elapsedSeconds % SYNC_INTERVAL_SECONDS === 0) void syncPlayLimit('play', game)
  }

  const resumeGame = async (game: GameState) => {
    if (startingGame) return
    setStartingGame(true)
    try {
      if (await syncPlayLimit('resume', game)) updateGame({ ...game, paused: false })
    } finally {
      setStartingGame(false)
    }
  }

  const newGame = (difficulty: Difficulty, boardStyle: BoardStyle = data.lastBoardStyle ?? 'decorative') => {
    if (startingGame) return
    setStartingGame(true)
    setLimitMessage('')
    void (async () => {
      if (currentGame && !currentGame.paused) await syncPlayLimit('pause', currentGame)
      const game = createGame(difficulty, boardStyle)
      if (!await syncPlayLimit('start', game)) return
      const next = {
        ...data,
        lastDifficulty: difficulty,
        lastBoardStyle: boardStyle,
        games: { ...data.games, [activeUser.id]: game },
      }
      persist(next)
      if (gameWindowMode) {
        setPlayInCurrentWindow(true)
        return
      }
      const opened = onOpenGameWindow?.() ?? false
      setPlayInCurrentWindow(!opened)
    })().finally(() => setStartingGame(false))
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
          limitMessage={limitMessage}
          disabled={startingGame}
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
    if (!game.paused) void syncPlayLimit('pause', game)
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

  return (
    <>
      <GameScreen
        user={activeUser}
        game={currentGame}
        onChange={updateGame}
        onTick={handleGameTick}
        onResume={resumeGame}
        onNewGame={newGame}
        onComplete={completeGame}
        onSwitchUser={() => persist({ ...data, activeUserId: null })}
        onShowRanking={() => setShowRanking(true)}
        onExitGame={() => exitGame(currentGame)}
        isGameWindow={gameWindowMode}
        onReturnHome={() => returnHome(currentGame)}
        limitMessage={limitMessage}
        resuming={startingGame}
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
