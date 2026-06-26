import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuandanApp } from './GuandanApp'

const waitingRoom = {
  code: 'AB12CD',
  version: 1,
  status: 'waiting',
  levelRank: 2,
  seats: [
    { playerId: 'p1', nickname: '老板', team: 'A', ready: false, handCount: 0, spectatorPolicy: 'closed', hand: undefined },
  ],
  spectators: [],
  currentPlayerId: null,
  lastPlay: null,
  passPlayerIds: [],
  finishedOrder: [],
  levels: { teamA: 2, teamB: 2 },
  log: ['房间已创建'],
}

const spectatorRoom = {
  ...waitingRoom,
  version: 12,
  status: 'playing',
  seats: [
    { playerId: 'p1', nickname: '老板', team: 'A', ready: true, handCount: 27, spectatorPolicy: 'approved', hand: undefined },
    { playerId: 'p2', nickname: '玩家2', team: 'B', ready: true, handCount: 27, spectatorPolicy: 'closed', hand: undefined },
    { playerId: 'p3', nickname: '玩家3', team: 'A', ready: true, handCount: 27, spectatorPolicy: 'closed', hand: undefined },
    { playerId: 'p4', nickname: '玩家4', team: 'B', ready: true, handCount: 27, spectatorPolicy: 'closed', hand: undefined },
  ],
  spectators: [{ playerId: 's1', nickname: '旁观者' }],
  currentPlayerId: 'p1',
  log: ['牌局开始'],
}

describe('在线掼蛋页面', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('可以创建房间并进入牌桌', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ roomCode: 'AB12CD', version: 1, room: waitingRoom }), { status: 201 }),
    )
    const user = userEvent.setup()

    render(<GuandanApp />)

    await user.clear(screen.getByLabelText('昵称'))
    await user.type(screen.getByLabelText('昵称'), '老板')
    await user.click(screen.getByRole('button', { name: '创建房间' }))

    await waitFor(() => expect(screen.getByText('房间 AB12CD')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/guandan/rooms', expect.objectContaining({ method: 'POST' }))
    expect(screen.getByRole('button', { name: '复制邀请' })).toBeInTheDocument()
  })

  it('旁观者没有出牌按钮，玩家可开启自己的手牌旁观', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ room: spectatorRoom }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        version: 13,
        room: {
          ...spectatorRoom,
          version: 13,
          seats: spectatorRoom.seats.map((seat) => seat.playerId === 'p1' ? { ...seat, spectatorPolicy: 'open' } : seat),
        },
      }), { status: 200 }))
    const user = userEvent.setup()

    render(<GuandanApp initialRoomCode="AB12CD" initialPlayerId="p1" />)

    await waitFor(() => expect(screen.getByText('旁观者 1')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: '出牌' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '允许旁观看我的牌' }))

    await waitFor(() => expect(screen.getByText('已开放')).toBeInTheDocument())
  })

  it('房主可给空位添加机器代打', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ roomCode: 'AB12CD', version: 1, room: waitingRoom }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        version: 2,
        room: {
          ...waitingRoom,
          version: 2,
          seats: [
            waitingRoom.seats[0],
            { playerId: 'bot-1', nickname: '机器对手一号', team: 'B', ready: true, handCount: 0, spectatorPolicy: 'closed', isBot: true },
          ],
        },
      }), { status: 200 }))
    const user = userEvent.setup()

    render(<GuandanApp initialPlayerId="p1" />)

    await user.click(screen.getByRole('button', { name: '创建房间' }))
    await user.click(await screen.findByRole('button', { name: '对手一号设为机器' }))

    await waitFor(() => expect(screen.getByText('对手一号 · 机器对手一号')).toBeInTheDocument())
  })

  it('手牌按牌力从小到大整理，并把同数字牌叠成一组', async () => {
    const sortedHandRoom = {
      ...spectatorRoom,
      levelRank: 7,
      seats: [
        {
          ...spectatorRoom.seats[0],
          hand: [
            { id: 'a', suit: 'spades', rank: 14, deck: 0 },
            { id: 'b', suit: 'hearts', rank: 3, deck: 0 },
            { id: 'c', suit: 'clubs', rank: 3, deck: 1 },
            { id: 'd', suit: 'diamonds', rank: 5, deck: 0 },
            { id: 'e', suit: 'joker', rank: 17, deck: 0 },
            { id: 'f', suit: 'spades', rank: 2, deck: 0 },
            { id: 'g', suit: 'hearts', rank: 7, deck: 0 },
          ],
          handCount: 7,
        },
        ...spectatorRoom.seats.slice(1),
      ],
    }
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ room: sortedHandRoom }), { status: 200 }))

    render(<GuandanApp initialRoomCode="AB12CD" initialPlayerId="p1" />)

    const stacks = await screen.findAllByTestId('guandan-card-stack')
    expect(stacks.map((stack) => stack.getAttribute('aria-label'))).toEqual([
      '3，2张',
      '5，1张',
      'A，1张',
      '2，1张',
      '7，1张',
      '大王，1张',
    ])
  })
})
