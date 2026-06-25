import type { Difficulty, UserProfile } from '../domain/types'
import { BrandHeader } from './BrandHeader'

type Props = {
  user: UserProfile
  onSelect: (difficulty: Difficulty) => void
  onSwitchUser: () => void
  onShowRanking: () => void
}

const OPTIONS: Array<{ difficulty: Difficulty; title: string; description: string }> = [
  { difficulty: 'easy', title: '新手', description: '轻松热身' },
  { difficulty: 'medium', title: '高手', description: '日常挑战' },
  { difficulty: 'hard', title: '专家', description: '冲击高分' },
]

export function DifficultyStartScreen({ user, onSelect, onSwitchUser, onShowRanking }: Props) {
  return (
    <div className="page-shell">
      <BrandHeader user={user} onSwitchUser={onSwitchUser} onShowRanking={onShowRanking} />
      <main className="start-difficulty">
        <p className="eyebrow">欢迎，{user.name}</p>
        <h1>选择游戏难度</h1>
        <p className="lead">专家题的计分权重更高，更容易冲击排行榜。</p>
        <div className="start-difficulty-grid">
          {OPTIONS.map((option) => (
            <button key={option.difficulty} onClick={() => onSelect(option.difficulty)}>
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
