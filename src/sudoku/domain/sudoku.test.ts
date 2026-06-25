import { describe, expect, it } from 'vitest'
import { countSolutions, generatePuzzle, isValidCompletedGrid } from './sudoku'

describe('数独生成器', () => {
  it.each(['easy', 'medium', 'hard'] as const)('生成 %s 难度的唯一解题目', (difficulty) => {
    const game = generatePuzzle(difficulty, () => 0.314159)

    expect(game.puzzle).toHaveLength(81)
    expect(game.solution).toHaveLength(81)
    expect(isValidCompletedGrid(game.solution)).toBe(true)
    expect(countSolutions(game.puzzle, 2)).toBe(1)
  })

  it('连续新游戏会生成不同题目', () => {
    const first = generatePuzzle('medium')
    const second = generatePuzzle('medium')

    expect(second.puzzle).not.toEqual(first.puzzle)
  })
})
