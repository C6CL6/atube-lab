import { beforeEach, describe, expect, it } from 'vitest'
import { handleGuandanRoomsRequest } from './guandanRooms'

const values = new Map<string, string>()

const kv = {
  get: async (key: string) => values.get(key) ?? null,
  put: async (key: string, value: string) => {
    values.set(key, value)
  },
}

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://atube.ccwu.cc${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

async function json(response: Response) {
  return await response.json() as Record<string, unknown>
}

async function createRoom() {
  const response = await handleGuandanRoomsRequest(request('/api/guandan/rooms', {
    method: 'POST',
    body: JSON.stringify({ playerId: 'p1', nickname: '老板' }),
  }), { ATUBE_KV: kv })
  const body = await json(response)
  return { response, body, code: body.roomCode as string }
}

async function action(code: string, body: Record<string, unknown>) {
  return handleGuandanRoomsRequest(request(`/api/guandan/rooms/${code}/actions`, {
    method: 'POST',
    body: JSON.stringify(body),
  }), { ATUBE_KV: kv })
}

describe('Cloudflare /api/guandan/rooms', () => {
  beforeEach(() => {
    values.clear()
  })

  it('创建房间并保存到 KV', async () => {
    const { response, body } = await createRoom()

    expect(response.status).toBe(201)
    expect(body.roomCode).toMatch(/^[A-Z0-9]{6}$/)
    expect(values.size).toBe(1)
  })

  it('房主可以把空位补成机器代打，并由机器人自动跟牌', async () => {
    const { code } = await createRoom()
    await action(code, { type: 'addBot', playerId: 'p1', seatIndex: 1, expectedVersion: 1 })
    await action(code, { type: 'addBot', playerId: 'p1', seatIndex: 2, expectedVersion: 2 })
    await action(code, { type: 'addBot', playerId: 'p1', seatIndex: 3, expectedVersion: 3 })
    await action(code, { type: 'ready', playerId: 'p1', expectedVersion: 4 })
    const startResponse = await action(code, { type: 'start', playerId: 'p1', expectedVersion: 5 })
    const startBody = await json(startResponse)
    const started = startBody.room as {
      seats: Array<{ playerId: string; isBot?: boolean; ready: boolean; handCount: number; hand?: Array<{ id: string }> }>
      currentPlayerId: string
    }

    expect(started.seats.filter((seat) => seat.isBot)).toHaveLength(3)
    expect(started.seats.every((seat) => seat.ready)).toBe(true)
    expect(started.currentPlayerId).toBe('p1')

    const firstCard = started.seats.find((seat) => seat.playerId === 'p1')
    expect(firstCard?.hand?.length).toBeGreaterThan(0)
    const playResponse = await action(code, {
      type: 'play',
      playerId: 'p1',
      cardIds: [firstCard?.hand?.[0].id ?? 'missing-card'],
      expectedVersion: 6,
    })
    const playBody = await json(playResponse)
    const afterPlay = playBody.room as { currentPlayerId: string; log: string[]; lastPlay: { playerId: string } | null }

    expect(afterPlay.currentPlayerId).toBe('p1')
    expect(afterPlay.log.join(' ')).toContain('机器')
    expect(afterPlay.lastPlay?.playerId).toMatch(/^bot-/)
  })

  it('未授权旁观者看不到手牌，玩家授权后只能看到该玩家手牌', async () => {
    const { code } = await createRoom()
    await action(code, { type: 'join', playerId: 'p2', nickname: '玩家2', expectedVersion: 1 })
    await action(code, { type: 'join', playerId: 'p3', nickname: '玩家3', expectedVersion: 2 })
    await action(code, { type: 'join', playerId: 'p4', nickname: '玩家4', expectedVersion: 3 })
    await action(code, { type: 'join', playerId: 's1', nickname: '旁观者', expectedVersion: 4 })
    await action(code, { type: 'ready', playerId: 'p1', expectedVersion: 5 })
    await action(code, { type: 'ready', playerId: 'p2', expectedVersion: 6 })
    await action(code, { type: 'ready', playerId: 'p3', expectedVersion: 7 })
    await action(code, { type: 'ready', playerId: 'p4', expectedVersion: 8 })
    await action(code, { type: 'start', playerId: 'p1', expectedVersion: 9 })

    const hiddenResponse = await handleGuandanRoomsRequest(request(`/api/guandan/rooms/${code}?viewerId=s1`), { ATUBE_KV: kv })
    const hiddenBody = await json(hiddenResponse)
    const hiddenRoom = hiddenBody.room as { seats: Array<{ hand?: unknown[]; handCount: number }> }

    expect(hiddenRoom.seats.every((seat) => seat.hand === undefined)).toBe(true)
    expect(hiddenRoom.seats.every((seat) => seat.handCount === 27)).toBe(true)

    await action(code, {
      type: 'setSpectatorPolicy',
      playerId: 'p1',
      policy: 'approved',
      approvedSpectatorIds: ['s1'],
      expectedVersion: 10,
    })

    const visibleResponse = await handleGuandanRoomsRequest(request(`/api/guandan/rooms/${code}?viewerId=s1`), { ATUBE_KV: kv })
    const visibleBody = await json(visibleResponse)
    const visibleRoom = visibleBody.room as { seats: Array<{ playerId: string; hand?: unknown[] }> }

    expect(visibleRoom.seats.find((seat) => seat.playerId === 'p1')?.hand).toHaveLength(27)
    expect(visibleRoom.seats.find((seat) => seat.playerId === 'p2')?.hand).toBeUndefined()
  })
})
