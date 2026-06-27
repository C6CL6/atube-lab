import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(join(process.cwd(), 'src/sudoku/styles.css'), 'utf8')

describe('数独牌面棋盘样式', () => {
  it('同数字高亮画在整个格子上，和选中格子的绿色边框强度一致', () => {
    expect(styles).toContain('.sudoku-app .sudoku-board:not(.board-style-minimal) .sudoku-cell.same-value')
    expect(styles).toContain('inset 0 0 0 4px var(--green)')
    expect(styles).not.toContain('0 0 0 3px rgba(47,138,70,.28)')
  })
})
