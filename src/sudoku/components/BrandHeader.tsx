import type { UserProfile } from '../domain/types'

type Props = {
  user?: UserProfile
  onSwitchUser?: () => void
  onShowRanking?: () => void
}

export function BrandHeader({ user, onSwitchUser, onShowRanking }: Props) {
  return (
    <header className="brand-header">
      <div className="header-actions">
        <span className="made-by">阿土伯灵感实验室出品</span>
        {onShowRanking ? <button className="text-button" onClick={onShowRanking}>排行榜</button> : null}
        {user && onSwitchUser ? (
          <button className="user-chip" onClick={onSwitchUser} aria-label="切换玩家">
            <span className="mini-avatar" style={{ background: user.avatarColor }}>{user.name.slice(0, 1)}</span>
            <span>{user.name}</span>
          </button>
        ) : null}
      </div>
    </header>
  )
}
