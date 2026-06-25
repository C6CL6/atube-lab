import { useState } from 'react'
import type { UserProfile } from '../domain/types'
import { BrandHeader } from './BrandHeader'

type Props = {
  users: UserProfile[]
  onLogin: (userId: string) => void
  onCreate: (name: string) => string | null
  onDelete: (userId: string) => void
  onShowRanking: () => void
}

export function LoginScreen({ users, onLogin, onCreate, onDelete, onShowRanking }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const message = onCreate(name)
    if (message) setError(message)
  }

  return (
    <div className="page-shell">
      <BrandHeader onShowRanking={onShowRanking} />
      <main className="login-layout">
        <section>
          <p className="eyebrow">大字 · 清晰 · 无需密码</p>
          <h1>欢迎来到数独</h1>
          <p className="lead">选择您的名字继续游戏，或者创建一位新玩家。</p>
          {users.length > 0 ? (
            <div className="profile-grid">
              {users.map((user) => (
                <div className="profile-card" key={user.id}>
                  <button className="profile-login" onClick={() => onLogin(user.id)} aria-label={`${user.name}，进入游戏`}>
                    <span className="profile-avatar" style={{ background: user.avatarColor }}>{user.name.slice(0, 1)}</span>
                    <strong>{user.name}</strong>
                    <span>进入游戏</span>
                  </button>
                  <button className="delete-profile" onClick={() => onDelete(user.id)}>删除</button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <form className="create-profile" onSubmit={submit}>
          <h2>{users.length > 0 ? '新玩家' : '创建用户名'}</h2>
          <p>不用密码，下次直接点击姓名即可。</p>
          <label htmlFor="username">用户名</label>
          <input
            id="username"
            maxLength={12}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
            placeholder="例如：王阿姨"
            autoComplete="off"
          />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button" type="submit">开始游戏</button>
        </form>
      </main>
    </div>
  )
}
