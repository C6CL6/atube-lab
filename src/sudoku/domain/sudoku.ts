import type { Difficulty } from './types'

const SIZE = 9
const CELL_COUNT = 81
const EMPTY_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 40,
  medium: 48,
  hard: 54,
}

type RandomSource = () => number

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function canPlace(grid: number[], index: number, value: number): boolean {
  const row = Math.floor(index / SIZE)
  const column = index % SIZE
  const boxRow = Math.floor(row / 3) * 3
  const boxColumn = Math.floor(column / 3) * 3

  for (let offset = 0; offset < SIZE; offset += 1) {
    if (grid[row * SIZE + offset] === value) return false
    if (grid[offset * SIZE + column] === value) return false
    const boxIndex = (boxRow + Math.floor(offset / 3)) * SIZE + boxColumn + (offset % 3)
    if (grid[boxIndex] === value) return false
  }
  return true
}

function fillGrid(grid: number[], random: RandomSource): boolean {
  const index = grid.indexOf(0)
  if (index === -1) return true

  for (const value of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random)) {
    if (!canPlace(grid, index, value)) continue
    grid[index] = value
    if (fillGrid(grid, random)) return true
    grid[index] = 0
  }
  return false
}

export function countSolutions(input: number[], limit = 2): number {
  const grid = [...input]
  let count = 0

  const solve = () => {
    if (count >= limit) return
    let bestIndex = -1
    let bestCandidates: number[] = []

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (grid[index] !== 0) continue
      const candidates = []
      for (let value = 1; value <= SIZE; value += 1) {
        if (canPlace(grid, index, value)) candidates.push(value)
      }
      if (candidates.length === 0) return
      if (bestIndex === -1 || candidates.length < bestCandidates.length) {
        bestIndex = index
        bestCandidates = candidates
        if (candidates.length === 1) break
      }
    }

    if (bestIndex === -1) {
      count += 1
      return
    }

    for (const value of bestCandidates) {
      grid[bestIndex] = value
      solve()
      grid[bestIndex] = 0
      if (count >= limit) return
    }
  }

  solve()
  return count
}

export function isValidCompletedGrid(grid: number[]): boolean {
  if (grid.length !== CELL_COUNT || grid.some((value) => value < 1 || value > 9)) return false
  const expected = '123456789'
  const sortedDigits = (values: number[]) => [...values].sort((a, b) => a - b).join('')
  for (let index = 0; index < SIZE; index += 1) {
    const row = sortedDigits(grid.slice(index * SIZE, index * SIZE + SIZE))
    const column = sortedDigits(Array.from({ length: SIZE }, (_, rowIndex) => grid[rowIndex * SIZE + index]))
    if (row !== expected || column !== expected) return false
  }
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxColumn = 0; boxColumn < 3; boxColumn += 1) {
      const box = []
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 3; column += 1) {
          box.push(grid[(boxRow * 3 + row) * SIZE + boxColumn * 3 + column])
        }
      }
      if (sortedDigits(box) !== expected) return false
    }
  }
  return true
}

export function generatePuzzle(difficulty: Difficulty, random: RandomSource = Math.random) {
  const solution = Array(CELL_COUNT).fill(0)
  fillGrid(solution, random)
  const puzzle = [...solution]
  const positions = shuffle(Array.from({ length: CELL_COUNT }, (_, index) => index), random)
  let removed = 0

  for (const index of positions) {
    if (removed >= EMPTY_BY_DIFFICULTY[difficulty]) break
    const previous = puzzle[index]
    puzzle[index] = 0
    if (countSolutions(puzzle, 2) === 1) {
      removed += 1
    } else {
      puzzle[index] = previous
    }
  }

  return { puzzle, solution }
}
