export type Difficulty = 'easy' | 'medium' | 'hard'

export type ScoreState = {
  difficulty: Difficulty
  initialEmptyCount: number
  score: number
  streak: number
  mistakes: number
  frozen: boolean
  scoredCells: number[]
}

export type Move = {
  index: number
  previousValue: number
  nextValue: number
  scoreBefore: ScoreState
}

export type GameState = {
  id: string
  difficulty: Difficulty
  puzzle: number[]
  solution: number[]
  values: number[]
  initialEmptyCount: number
  selectedIndex: number | null
  elapsedSeconds: number
  paused: boolean
  completed: boolean
  recorded: boolean
  score: ScoreState
  history: Move[]
  startedAt: string
}

export type UserProfile = {
  id: string
  name: string
  avatarColor: string
  createdAt: string
}

export type GameRecord = {
  id: string
  userId: string
  username: string
  score: number
  elapsedSeconds: number
  mistakes: number
  difficulty: Difficulty
  startedAt: string
  completedAt: string
  failed: boolean
}

export type AppData = {
  version: 1
  users: UserProfile[]
  activeUserId: string | null
  games: Record<string, GameState>
  records: GameRecord[]
  lastDifficulty: Difficulty
}
