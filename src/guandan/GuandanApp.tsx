import { ArrowLeft, ChevronDown, Clipboard, Eye, Info, Lightbulb, LogIn, MessageCircle, Mic, Play, RefreshCw, Settings, Signal, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoom, fetchRoom, sendAction } from './api'
import { cardLabel, isRedCard, levelLabel, rankLabel } from './format'
import type { Card } from './domain/rules'
import type { PublicRoom, PublicSeat } from './types'

const PLAYER_ID_KEY = 'atube-guandan-player-id'
const NICKNAME_KEY = 'atube-guandan-nickname'

function getStoredPlayerId() {
  const existing = localStorage.getItem(PLAYER_ID_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(PLAYER_ID_KEY, id)
  return id
}

function getStoredNickname() {
  return localStorage.getItem(NICKNAME_KEY) ?? '牌友'
}

function seatLabel(index: number) {
  return ['我方一号', '对手一号', '我方二号', '对手二号'][index] ?? `座位${index + 1}`
}

function seatRoleLabel(index: number, self: boolean) {
  if (self) return '我'
  return index === 0 || index === 2 ? '队友' : '对家'
}

function seatForIndex(room: PublicRoom, index: number) {
  return room.seats.find((seat, fallbackIndex) => (seat.seatIndex ?? fallbackIndex) === index)
}

const SUIT_SORT: Record<Card['suit'], number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
  joker: 4,
}

function handSortValue(card: Card, levelRank: number) {
  if (card.rank === 17) return 18
  if (card.rank === 16) return 17
  if (card.rank === levelRank) return 16
  if (card.rank === 2) return 15
  return card.rank
}

function groupedHand(cards: Card[] | undefined, levelRank: number) {
  const groups = new Map<number, Card[]>()
  for (const card of [...(cards ?? [])].sort((a, b) => {
    const valueDelta = handSortValue(a, levelRank) - handSortValue(b, levelRank)
    if (valueDelta !== 0) return valueDelta
    return SUIT_SORT[a.suit] - SUIT_SORT[b.suit] || a.deck - b.deck
  })) {
    groups.set(card.rank, [...(groups.get(card.rank) ?? []), card])
  }
  return [...groups.entries()].map(([rank, groupCards]) => ({ rank, cards: groupCards }))
}

function avatarText(nickname: string | undefined, fallback: string) {
  return (nickname ?? fallback).trim().slice(0, 1) || fallback
}

type GuandanAppProps = {
  initialRoomCode?: string
  initialPlayerId?: string
}

export function GuandanApp({ initialRoomCode = '', initialPlayerId }: GuandanAppProps) {
  const [playerId] = useState(() => initialPlayerId ?? getStoredPlayerId())
  const [nickname, setNickname] = useState(() => getStoredNickname())
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode)
  const [room, setRoom] = useState<PublicRoom | null>(null)
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const me = useMemo(() => room?.seats.find((seat) => seat.playerId === playerId), [playerId, room])
  const isSeated = Boolean(me)
  const isSpectator = Boolean(room && !isSeated)
  const currentSeat = room?.seats.find((seat) => seat.playerId === room.currentPlayerId)
  const myTurn = Boolean(me?.hand?.length && room?.currentPlayerId === playerId && room.status === 'playing')
  const isHost = Boolean(room && seatForIndex(room, 0)?.playerId === playerId)
  const handGroups = useMemo(() => groupedHand(me?.hand, room?.levelRank ?? 2), [me?.hand, room?.levelRank])
  const isPlaying = room?.status === 'playing'
  const inviteUrl = room ? `${window.location.origin}/guandan?room=${room.code}` : ''

  const refreshRoom = useCallback(async (code: string) => {
    if (!code) return
    const payload = await fetchRoom(code, playerId)
    setRoom(payload.room)
  }, [playerId])

  useEffect(() => {
    if (!initialRoomCode) return
    refreshRoom(initialRoomCode).catch((caught) => setError(caught instanceof Error ? caught.message : '房间加载失败'))
  }, [initialRoomCode, refreshRoom])

  useEffect(() => {
    if (!room?.code) return
    const timer = window.setInterval(() => {
      refreshRoom(room.code).catch(() => undefined)
    }, 1800)
    return () => window.clearInterval(timer)
  }, [refreshRoom, room?.code])

  const run = async (task: () => Promise<PublicRoom>) => {
    setBusy(true)
    setError('')
    try {
      const next = await task()
      setRoom(next)
      setSelectedCardIds([])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = () => run(async () => {
    localStorage.setItem(NICKNAME_KEY, nickname)
    const payload = await createRoom(playerId, nickname)
    setRoomCodeInput(payload.room.code)
    return payload.room
  })

  const handleJoin = () => run(async () => {
    localStorage.setItem(NICKNAME_KEY, nickname)
    const payload = await fetchRoom(roomCodeInput.trim().toUpperCase(), playerId)
    const existing = payload.room.seats.some((seat) => seat.playerId === playerId) ||
      payload.room.spectators.some((spectator) => spectator.playerId === playerId)
    if (existing) return payload.room
    const joined = await sendAction(payload.room, playerId, { type: 'join', nickname })
    return joined.room
  })

  const handleAction = (action: Parameters<typeof sendAction>[2]) => {
    if (!room) return
    void run(async () => {
      const payload = await sendAction(room, playerId, action)
      return payload.room
    })
  }

  const copyInvite = async () => {
    if (!room) return
    await navigator.clipboard?.writeText(inviteUrl)
  }

  const toggleCard = (id: string) => {
    setSelectedCardIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  return (
    <main className={isPlaying ? 'guandan-shell guandan-shell--playing' : 'guandan-shell'}>
      <section className="guandan-topbar">
        <div className="guandan-topbar__brand">
          <span className="guandan-seal">灵感</span>
          <span className="guandan-brand">A-tube的灵感实验室</span>
          {isPlaying ? (
            <button className="guandan-button guandan-button--ghost" type="button" onClick={() => setRoom(null)}>
              <ArrowLeft size={17} /> 返回大厅
            </button>
          ) : null}
        </div>
        <h1>在线掼蛋</h1>
        <div className="guandan-score" aria-label="当前级牌">
          {isPlaying ? (
            <>
              <span><Info size={14} /> 规则</span>
              <strong><Signal size={15} /> 网络良好</strong>
              <button className="guandan-icon-button" type="button" aria-label="设置">
                <Settings size={18} />
              </button>
            </>
          ) : (
            <>
              <span>我方 {levelLabel(room?.levels.teamA ?? 2)}</span>
              <span>对手 {levelLabel(room?.levels.teamB ?? 2)}</span>
              <strong>{room?.status === 'completed' ? '已结算' : '等人开局'}</strong>
            </>
          )}
        </div>
      </section>

      {!isPlaying ? <section className="guandan-entry" aria-label="房间入口">
        <label>
          昵称
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={12} />
        </label>
        <label>
          房间号
          <input value={roomCodeInput} onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())} placeholder="例如 AB12CD" />
        </label>
        <button className="guandan-button guandan-button--primary" onClick={handleCreate} disabled={busy}>
          <Play size={17} /> 创建房间
        </button>
        <button className="guandan-button" onClick={handleJoin} disabled={busy || roomCodeInput.trim().length < 4}>
          <LogIn size={17} /> 加入房间
        </button>
        {error ? <p className="guandan-error">{error}</p> : null}
      </section> : null}

      {room ? (
        <section className="guandan-layout">
          <div className="guandan-table">
            {isPlaying ? (
              <div className="guandan-scoreboard">
                <span>中级场</span>
                <span>底分：3</span>
                <strong>我们(我方) <b>{room.levels.teamA}</b> ： <b>{room.levels.teamB}</b> 对方</strong>
              </div>
            ) : null}
            <div className="guandan-table__header">
              <div>
                <span>房间 {room.code}</span>
                <strong>{currentSeat ? `轮到 ${currentSeat.nickname}` : '等待开局'}</strong>
              </div>
              <button className="guandan-icon-button" onClick={copyInvite} aria-label="复制邀请">
                <Clipboard size={18} />
              </button>
            </div>

            <div className="guandan-seats">
              {Array.from({ length: 4 }).map((_, index) => {
                const seat = seatForIndex(room, index)
                return (
                  <SeatView
                    key={seat?.playerId ?? index}
                    seat={seat}
                    index={index}
                    current={seat?.playerId === room.currentPlayerId}
                    self={seat?.playerId === playerId}
                  />
                )
              })}
            </div>

            <div className="guandan-trick">
              <span>上一手</span>
              {room.lastPlay ? (
                <div>
                  <strong>{room.seats.find((seat) => seat.playerId === room.lastPlay?.playerId)?.nickname ?? '玩家'}</strong>
                  <p>{room.lastPlay.type}</p>
                  <div className="guandan-trick__cards">
                    {room.lastPlay.cards.map((card) => (
                      <span className={isRedCard(card) ? 'guandan-mini-card guandan-mini-card--red' : 'guandan-mini-card'} key={card.id}>{cardLabel(card)}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p>当前轮次可自由出牌</p>
              )}
            </div>

            <div className="guandan-hand">
              <div className="guandan-hand__title">
                <strong>{me ? '我的手牌' : isSpectator ? '旁观视角' : '等待入座'}</strong>
                <span>{me?.hand?.length ? `${me.hand.length} 张` : isSpectator ? '未获得手牌授权' : '加入房间后自动入座或旁观'}</span>
              </div>
              <div className="guandan-cards">
                {handGroups.map((group) => (
                  <div
                    className="guandan-card-stack"
                    data-testid="guandan-card-stack"
                    aria-label={`${rankLabel(group.rank)}，${group.cards.length}张`}
                    key={group.rank}
                    style={{ width: `${46 + Math.max(0, group.cards.length - 1) * 18}px` }}
                  >
                    {group.cards.map((card, index) => (
                      <button
                        key={card.id}
                        className={selectedCardIds.includes(card.id) ? 'guandan-card guandan-card--selected' : 'guandan-card'}
                        onClick={() => toggleCard(card.id)}
                        aria-pressed={selectedCardIds.includes(card.id)}
                        style={{ left: `${index * 18}px`, zIndex: index + 1 }}
                      >
                        <span className={isRedCard(card) ? 'guandan-card__red' : ''}>{cardLabel(card)}</span>
                      </button>
                    ))}
                    {group.cards.length > 1 ? <span className="guandan-card-stack__count">{group.cards.length}</span> : null}
                  </div>
                ))}
              </div>
              {myTurn ? (
                <>
                  <div className="guandan-turn-tip">本轮出牌</div>
                  <p className="guandan-play-hint">您可以出牌</p>
                <div className="guandan-actions">
                  <button className="guandan-button guandan-button--primary" onClick={() => handleAction({ type: 'play', cardIds: selectedCardIds })} disabled={busy || selectedCardIds.length === 0}>
                    出牌
                  </button>
                  <button className="guandan-button" onClick={() => handleAction({ type: 'play', cardIds: [] })} disabled={busy}>
                    不要
                  </button>
                  <button className="guandan-button" type="button">
                    <Lightbulb size={17} /> 提示
                  </button>
                  <button className="guandan-button" type="button">
                    理牌 <ChevronDown size={17} />
                  </button>
                </div>
                </>
              ) : null}
            </div>
            {isPlaying ? (
              <div className="guandan-table-tools">
                <button className="guandan-button guandan-button--ghost" type="button"><Mic size={17} /> 语音</button>
                <button className="guandan-button guandan-button--ghost" type="button"><MessageCircle size={17} /> 聊天</button>
              </div>
            ) : null}
          </div>

          <aside className="guandan-side">
            {isPlaying ? (
              <section>
                <h2>房间信息 <button className="guandan-icon-button" onClick={copyInvite} aria-label="复制房间"><Clipboard size={15} /></button></h2>
                <div className="guandan-room-code">
                  <span>房间号：</span>
                  <strong>{room.code}</strong>
                </div>
                <div className="guandan-invite-line">
                  <span>{inviteUrl}</span>
                  <button className="guandan-button guandan-button--mini" onClick={copyInvite}>复制链接</button>
                </div>
                <button className="guandan-button guandan-button--full guandan-button--primary" onClick={copyInvite}>
                  邀请好友
                </button>
              </section>
            ) : null}
            <section>
              <h2><Users size={17} /> 玩家</h2>
              {Array.from({ length: 4 }).map((_, index) => {
                const seat = seatForIndex(room, index)
                return (
                  <div className={seat ? 'guandan-row' : 'guandan-row guandan-row--empty'} key={seat?.playerId ?? index}>
                    <span>{seatLabel(index)} · {seat?.nickname ?? '空位'}</span>
                    {seat ? <strong>{seat.handCount}张{seat.isBot ? ' · 机器' : ''}</strong> : null}
                    {!seat && isHost && room.status === 'waiting' && index > 0 ? (
                      <button className="guandan-button guandan-button--mini" onClick={() => handleAction({ type: 'addBot', seatIndex: index })} disabled={busy}>
                        {seatLabel(index)}设为机器
                      </button>
                    ) : null}
                  </div>
                )
              })}
              {room.seats.length === 4 && room.status === 'waiting' ? (
                <button className="guandan-button guandan-button--full" onClick={() => handleAction({ type: 'start' })} disabled={busy || !room.seats.every((seat) => seat.ready)}>
                  开始对局
                </button>
              ) : null}
              {me && !me.ready && room.status === 'waiting' ? (
                <button className="guandan-button guandan-button--full guandan-button--primary" onClick={() => handleAction({ type: 'ready' })} disabled={busy}>
                  准备
                </button>
              ) : null}
            </section>

            <section>
              <h2><Eye size={17} /> 旁观者 {room.spectators.length}</h2>
              {room.spectators.length ? room.spectators.map((spectator) => (
                <div className="guandan-row" key={spectator.playerId}>
                  <span>{spectator.nickname}</span>
                  <strong>{spectator.watchingPlayerId ? '跟看中' : '公共视角'}</strong>
                </div>
              )) : <p className="guandan-muted">暂无旁观者</p>}
              {me ? (
                <div className="guandan-policy">
                  <span>{me.spectatorPolicy === 'open' ? '已开放' : me.spectatorPolicy === 'approved' ? '需授权' : '已关闭'}</span>
                  <button className="guandan-button guandan-button--full" onClick={() => handleAction({ type: 'setSpectatorPolicy', policy: me.spectatorPolicy === 'open' ? 'closed' : 'open' })} disabled={busy}>
                    {me.spectatorPolicy === 'open' ? '关闭旁观看我的牌' : '允许旁观看我的牌'}
                  </button>
                </div>
              ) : null}
            </section>

            <section>
              <h2><RefreshCw size={17} /> 牌局日志</h2>
              <ol className="guandan-log">
                {room.log.slice(-8).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
              </ol>
            </section>
          </aside>
        </section>
      ) : null}
    </main>
  )
}

function SeatView({ seat, index, current, self }: { seat?: PublicSeat; index: number; current: boolean; self: boolean }) {
  return (
    <article className={[
      'guandan-seat',
      current ? 'guandan-seat--current' : '',
      self ? 'guandan-seat--self' : '',
      seat?.isBot ? 'guandan-seat--bot' : '',
    ].filter(Boolean).join(' ')}>
      <div className="guandan-avatar" aria-hidden="true">{avatarText(seat?.nickname, seatLabel(index))}</div>
      <div className="guandan-seat__body">
        <span>{seat ? seatRoleLabel(index, self) : seatLabel(index)}</span>
        <strong>{seat?.nickname ?? '空位'}</strong>
        <small>{seat ? `▥ 剩余 ${seat.handCount} 张${seat.isBot ? ' · 机器' : ''}` : '等待加入'}</small>
      </div>
    </article>
  )
}
