import type { Difficulty, ScoreState } from './types'

export const BASE_SCORE: Record<Difficulty, number> = {
  easy: 1200,
  medium: 2200,
  hard: 3600,
}

const REFERENCE_SECONDS: Record<Difficulty, number> = {
  easy: 15 * 60,
  medium: 25 * 60,
  hard: 40 * 60,
}

export function createScoreState(difficulty: Difficulty, initialEmptyCount: number): ScoreState {
  return {
    difficulty,
    initialEmptyCount,
    score: 0,
    streak: 0,
    mistakes: 0,
    frozen: false,
    scoredCells: [],
  }
}

export function applyCorrectMove(state: ScoreState, cellIndex: number): ScoreState {
  if (state.scoredCells.includes(cellIndex)) return state
  if (state.frozen) {
    return {
      ...state,
      streak: state.streak + 1,
      scoredCells: [...state.scoredCells, cellIndex],
    }
  }
  const multiplier = Math.min(2, 1 + state.streak * 0.1)
  const points = (BASE_SCORE[state.difficulty] / state.initialEmptyCount) * multiplier
  return {
    ...state,
    score: Math.round(state.score + points),
    streak: state.streak + 1,
    scoredCells: [...state.scoredCells, cellIndex],
  }
}

export function applyMistake(state: ScoreState): ScoreState {
  const mistakes = state.mistakes + 1
  if (state.frozen) return { ...state, mistakes, streak: 0 }
  return {
    ...state,
    mistakes,
    streak: 0,
    frozen: mistakes >= 4,
  }
}

export function resetStreak(state: ScoreState): ScoreState {
  return state.frozen ? state : { ...state, streak: 0 }
}

export function calculateCompletionBonus(state: ScoreState, elapsedSeconds: number): number {
  if (state.frozen) return 0
  const base = BASE_SCORE[state.difficulty]
  const reference = REFERENCE_SECONDS[state.difficulty]
  const speedRatio = Math.max(0, (reference - elapsedSeconds) / reference)
  const speedBonus = base * 0.5 * speedRatio
  const accuracyBonus = state.mistakes === 0 ? base * 0.2 : state.mistakes === 1 ? base * 0.1 : 0
  return Math.round(speedBonus + accuracyBonus)
}
