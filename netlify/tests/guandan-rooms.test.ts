import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../functions/guandan-rooms'

type StoredRoom = { code: string; version: number; [key: string]: unknown }

const rooms = new Map<string, StoredRoom>()

vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    get: async (key: string, options?: { type?: string }) => {
      const value = rooms.get(key)
      if (!value) return null
      return options?.type === 'json' ? value : JSON.stringify(value)
    },
    setJSON: async (key: string, value: StoredRoom) => {
      rooms.set(key, value)
    },
  }),
}))

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://example.com${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

async function json(response: Response) {
  return await response.json() as Record<string, unknown>
}

async function createRoom() {
  const response = await handler(request('/api/guandan/rooms', {
    method: 'POST',
    body: JSON.stringify({ playerId: 'p1', nickname: '老板' }),
  }))
  const body = await json(response)
  return { response, body, code: body.roomCode as string, version: body.version as number }
}

async function action(code: string, actionBody: Record<string, unknown>) {
  return handler(request(`/api/guandan/rooms/${code}/actions`, {
    method: 'POST',
    body: JSON.stringify(actionBody),
  }))
}

describe('/api/guandan/rooms', () => {
  beforeEach(() => {
    rooms.clear()
  })

  it('创建房间返回房间号，并让创建者坐到一号位', async () => {
    const { response, body } = await createRoom()

    expect(response.status).toBe(201)
    expect(body.roomCode).toMatch(/^[A-Z0-9]{6}$/)
    expect(body.room).toMatchObject({
      seats: [{ playerId: 'p1', nickname: '老板', team: 'A' }],
    })
  })

  it('4名玩家可入座，第5名只能旁观', async () => {
    const { code } = await createRoom()

    for (let index = 2; index <= 5; index += 1) {
      await action(code, {
        type: 'join',
        playerId: `p${index}`,
        nickname: `玩家${index}`,
        expectedVersion: index - 1,
      })
    }

    const response = await handler(request(`/api/guandan/rooms/${code}?viewerId=p5`))
    const body = await json(response)
    const room = body.room as { seats: unknown[]; spectators: unknown[] }

    expect(room.seats).toHaveLength(4)
    expect(room.spectators).toMatchObject([{ playerId: 'p5', nickname: '玩家5' }])
  })

  it('房主可以把空位补成机器代打', async () => {
    const { code } = await createRoom()
    await action(code, { type: 'addBot', playerId: 'p1', seatIndex: 1, expectedVersion: 1 })
    await action(code, { type: 'addBot', playerId: 'p1', seatIndex: 2, expectedVersion: 2 })
    const response = await action(code, { type: 'addBot', playerId: 'p1', seatIndex: 3, expectedVersion: 3 })
    const body = await json(response)
    const room = body.room as { seats: Array<{ playerId: string; isBot?: boolean; ready: boolean; nickname: string }> }

    expect(room.seats.filter((seat) => seat.isBot)).toHaveLength(3)
    expect(room.seats.map((seat) => seat.nickname)).toEqual(['老板', '机器对手一号', '机器我方二号', '机器对手二号'])
    expect(room.seats.filter((seat) => seat.isBot).every((seat) => seat.ready)).toBe(true)
    expect(room.seats.find((seat) => seat.playerId === 'p1')?.ready).toBe(false)
  })

  it('未授权旁观者拿不到任何玩家手牌，授权后只能看到被授权那一家', async () => {
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

    const hiddenResponse = await handler(request(`/api/guandan/rooms/${code}?viewerId=s1`))
    const hiddenBody = await json(hiddenResponse)
    const hiddenRoom = hiddenBody.room as { seats: Array<{ playerId: string; hand?: unknown[]; handCount: number }> }

    expect(hiddenRoom.seats.every((seat) => seat.hand === undefined)).toBe(true)
    expect(hiddenRoom.seats.every((seat) => seat.handCount === 27)).toBe(true)

    await action(code, {
      type: 'setSpectatorPolicy',
      playerId: 'p1',
      policy: 'approved',
      approvedSpectatorIds: ['s1'],
      expectedVersion: 10,
    })

    const visibleResponse = await handler(request(`/api/guandan/rooms/${code}?viewerId=s1`))
    const visibleBody = await json(visibleResponse)
    const visibleRoom = visibleBody.room as { seats: Array<{ playerId: string; hand?: unknown[] }> }

    expect(visibleRoom.seats.find((seat) => seat.playerId === 'p1')?.hand).toHaveLength(27)
    expect(visibleRoom.seats.find((seat) => seat.playerId === 'p2')?.hand).toBeUndefined()
  })

  it('拒绝旧版本动作，避免覆盖较新的房间状态', async () => {
    const { code } = await createRoom()
    const response = await action(code, {
      type: 'join',
      playerId: 'p2',
      nickname: '玩家2',
      expectedVersion: 0,
    })

    expect(response.status).toBe(409)
  })
})
