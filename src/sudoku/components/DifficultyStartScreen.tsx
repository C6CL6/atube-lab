import { useState } from 'react'
import type { BoardStyle, Difficulty, UserProfile } from '../domain/types'
import { BrandHeader } from './BrandHeader'

type Props = {
  user: UserProfile
  defaultBoardStyle?: BoardStyle
  onSelect: (difficulty: Difficulty, boardStyle: BoardStyle) => void
  onSwitchUser: () => void
  onShowRanking: () => void
}

const OPTIONS: Array<{ difficulty: Difficulty; title: string; description: string }> = [
  { difficulty: 'easy', title: '新手', description: '轻松热身' },
  { difficulty: 'medium', title: '高手', description: '日常挑战' },
  { difficulty: 'hard', title: '专家', description: '冲击高分' },
]

const STYLE_OPTIONS: Array<{ style: BoardStyle; title: string; description: string }> = [
  { style: 'decorative', title: '牌面棋盘', description: '纸感浮雕，更醒目有趣' },
  { style: 'minimal', title: '极简棋盘', description: '清爽线框，更接近原来的界面' },
]

export function DifficultyStartScreen({ user, defaultBoardStyle = 'decorative', onSelect, onSwitchUser, onShowRanking }: Props) {
  const [boardStyle, setBoardStyle] = useState<BoardStyle>(defaultBoardStyle)

  return (
    <div className="page-shell">
      <BrandHeader user={user} onSwitchUser={onSwitchUser} onShowRanking={onShowRanking} />
      <main className="start-difficulty">
        <p className="eyebrow">欢迎，{user.name}</p>
        <h1>选择游戏界面与难度</h1>
        <p className="lead">先选喜欢的棋盘界面，再选择本局难度。</p>
        <section className="board-style-picker" aria-label="选择棋盘界面">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.style}
              className={boardStyle === option.style ? 'is-selected' : ''}
              onClick={() => setBoardStyle(option.style)}
              aria-pressed={boardStyle === option.style}
            >
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </section>
        <div className="start-difficulty-grid">
          {OPTIONS.map((option) => (
            <button key={option.difficulty} onClick={() => onSelect(option.difficulty, boardStyle)}>
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
