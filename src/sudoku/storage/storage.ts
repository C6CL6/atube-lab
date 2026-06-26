import type { AppData, UserProfile } from '../domain/types'

const STORAGE_KEY = 'atube-sudoku-v1'
const AVATAR_COLORS = ['#913f30', '#426255', '#76573d', '#46566f', '#7d4d67', '#587073']

export function createEmptyData(): AppData {
  return {
    version: 1,
    users: [],
    activeUserId: null,
    games: {},
    records: [],
    lastDifficulty: 'medium',
    lastBoardStyle: 'decorative',
  }
}

export function loadAppData(): AppData {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return createEmptyData()
    const parsed = JSON.parse(value) as AppData
    if (parsed.version !== 1) return createEmptyData()
    const games = Object.fromEntries(
      Object.entries(parsed.games).map(([userId, game]) => {
        const score = game.score.mistakes <= 3 && game.score.frozen
          ? { ...game.score, frozen: false }
          : game.score
        return [
          userId,
          game.completed ? { ...game, score } : { ...game, paused: true, score },
        ]
      }),
    )
    return { ...parsed, games }
  } catch {
    return createEmptyData()
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function createUser(data: AppData, rawName: string): { data: AppData; user: UserProfile } {
  const name = rawName.trim()
  if (name.length < 1 || name.length > 12) throw new Error('用户名需要1到12个字符')
  const user: UserProfile = {
    id: crypto.randomUUID(),
    name,
    avatarColor: AVATAR_COLORS[data.users.length % AVATAR_COLORS.length],
    createdAt: new Date().toISOString(),
  }
  return {
    user,
    data: {
      ...data,
      users: [...data.users, user],
      activeUserId: user.id,
    },
  }
}

export function deleteUser(data: AppData, userId: string): AppData {
  const games = { ...data.games }
  delete games[userId]
  return {
    ...data,
    users: data.users.filter((user) => user.id !== userId),
    activeUserId: data.activeUserId === userId ? null : data.activeUserId,
    games,
    records: data.records.filter((record) => record.userId !== userId),
  }
}
