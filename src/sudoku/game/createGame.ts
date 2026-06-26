import { createScoreState } from '../domain/scoring'
import { generatePuzzle } from '../domain/sudoku'
import type { BoardStyle, Difficulty, GameState } from '../domain/types'

export function createGame(difficulty: Difficulty, boardStyle: BoardStyle = 'decorative'): GameState {
  const { puzzle, solution } = generatePuzzle(difficulty)
  const initialEmptyCount = puzzle.filter((value) => value === 0).length
  return {
    id: crypto.randomUUID(),
    difficulty,
    boardStyle,
    puzzle,
    solution,
    values: [...puzzle],
    initialEmptyCount,
    selectedIndex: puzzle.findIndex((value) => value === 0),
    elapsedSeconds: 0,
    paused: false,
    completed: false,
    recorded: false,
    score: createScoreState(difficulty, initialEmptyCount),
    history: [],
    startedAt: new Date().toISOString(),
  }
}
