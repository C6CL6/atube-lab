import { canBeat, identifyCombination, playCards, startRound, type Card, type RoundState, type Team } from '../guandan/domain/rules'
import { empty, errorResponse, json } from './http'
import type { CloudflareEnv } from './types'

type Seat = {
  playerId: string
  nickname: string
  team: Team
  seatIndex: number
  ready: boolean
  hand?: Card[]
  spectatorPolicy: 'closed' | 'open' | 'approved'
  approvedSpectatorIds: string[]
  isBot?: boolean
}

type Spectator = {
  playerId: string
  nickname: string
  watchingPlayerId?: string
}

type Room = {
  code: string
  version: number
  status: 'waiting' | 'playing' | 'completed'
  createdAt: string
  updatedAt: string
  expiresAt: string
  levelRank: number
  seats: Seat[]
  spectators: Spectator[]
  round: RoundState | null
  log: string[]
}

type ActionBody = {
  type?: string
  playerId?: string
  nickname?: string
  expectedVersion?: number
  cardIds?: string[]
  seatIndex?: number
  policy?: Seat['spectatorPolicy']
  approvedSpectatorIds?: string[]
  watchingPlayerId?: string
}

const ROOM_PREFIX = 'guandan/rooms/'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function roomKey(code: string) {
  return `${ROOM_PREFIX}${encodeURIComponent(code)}.json`
}

function createRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

function normalizeName(name: unknown) {
  const nickname = typeof name === 'string' ? name.trim() : ''
  return nickname.slice(0, 12) || '牌友'
}

function teamForSeat(index: number): Team {
  return index === 0 || index === 2 ? 'A' : 'B'
}

function botNickname(seatIndex: number) {
  return ['机器我方一号', '机器对手一号', '机器我方二号', '机器对手二号'][seatIndex] ?? '机器牌友'
}

function botPlayerId(roomCode: string, seatIndex: number) {
  return `bot-${roomCode}-${seatIndex}`
}

function normalizeSeats(room: Room): Seat[] {
  return room.seats
    .map((seat, index) => ({
      ...seat,
      seatIndex: typeof seat.seatIndex === 'number' ? seat.seatIndex : index,
      team: seat.team ?? teamForSeat(index),
      approvedSpectatorIds: seat.approvedSpectatorIds ?? [],
    }))
    .sort((a, b) => a.seatIndex - b.seatIndex)
}

function withNormalizedSeats(room: Room): Room {
  return { ...room, seats: normalizeSeats(room) }
}

function firstOpenSeatIndex(seats: Seat[]) {
  const taken = new Set(seats.map((seat) => seat.seatIndex))
  return [0, 1, 2, 3].find((index) => !taken.has(index))
}

function log(room: Room, message: string): Room {
  return { ...room, log: [...room.log.slice(-79), message] }
}

async function loadRoom(env: CloudflareEnv, code: string) {
  const raw = await env.ATUBE_KV.get(roomKey(code))
  if (!raw) return null
  return JSON.parse(raw) as Room
}

async function saveRoom(env: CloudflareEnv, room: Room) {
  await env.ATUBE_KV.put(roomKey(room.code), JSON.stringify(room))
}

function extractCode(pathname: string) {
  const match = pathname.match(/^\/api\/guandan\/rooms\/([^/]+)(?:\/actions)?$/)
  return match?.[1]?.toUpperCase() ?? null
}

function assertFresh(room: Room, expectedVersion: unknown) {
  if (typeof expectedVersion !== 'number' || expectedVersion !== room.version) {
    throw errorResponse('房间状态已更新，请刷新后重试', 409, { version: room.version })
  }
}

function publicSeat(seat: Seat, viewerId: string | null, spectators: Spectator[]) {
  const spectator = viewerId ? spectators.find((item) => item.playerId === viewerId) : undefined
  const canViewHand = viewerId === seat.playerId ||
    seat.spectatorPolicy === 'open' && spectator?.watchingPlayerId === seat.playerId ||
    seat.spectatorPolicy === 'approved' && seat.approvedSpectatorIds.includes(viewerId ?? '')
  const hand = seat.hand ?? []
  return {
    playerId: seat.playerId,
    nickname: seat.nickname,
    team: seat.team,
    seatIndex: seat.seatIndex,
    ready: seat.ready,
    handCount: hand.length,
    spectatorPolicy: seat.spectatorPolicy,
    approvedSpectatorIds: viewerId === seat.playerId ? seat.approvedSpectatorIds : undefined,
    isBot: seat.isBot,
    hand: canViewHand ? hand : undefined,
  }
}

function publicRoom(room: Room, viewerId: string | null) {
  const seats = normalizeSeats(room)
  return {
    code: room.code,
    version: room.version,
    status: room.status,
    levelRank: room.levelRank,
    updatedAt: room.updatedAt,
    expiresAt: room.expiresAt,
    seats: seats.map((seat) => publicSeat(seat, viewerId, room.spectators)),
    spectators: room.spectators,
    currentPlayerId: room.round?.currentPlayerId ?? null,
    lastPlay: room.round?.lastPlay ? {
      playerId: room.round.lastPlay.playerId,
      cards: room.round.lastPlay.cards,
      type: room.round.lastPlay.combination.type,
    } : null,
    passPlayerIds: room.round?.passPlayerIds ?? [],
    finishedOrder: room.round?.finishedOrder ?? [],
    levels: room.round?.levels ?? { teamA: room.levelRank, teamB: room.levelRank },
    log: room.log,
  }
}

function syncSeatsFromRound(room: Room, round: RoundState): Seat[] {
  return normalizeSeats(room).map((seat) => ({
    ...seat,
    hand: round.players[seat.playerId]?.hand ?? seat.hand ?? [],
  }))
}

function chooseBotCardIds(round: RoundState, botId: string) {
  const hand = round.players[botId]?.hand ?? []
  if (!hand.length) return []
  if (!round.lastPlay) return [hand[0].id]
  if (round.lastPlay.combination.type !== 'single') return []
  const card = hand.find((candidate) => canBeat(identifyCombination([candidate], round.levelRank), round.lastPlay?.combination))
  return card ? [card.id] : []
}

function advanceBots(room: Room): Room {
  let next = withNormalizedSeats(room)
  for (let guard = 0; guard < 12; guard += 1) {
    if (!next.round || next.round.completed) return next
    const bot = normalizeSeats(next).find((seat) => seat.playerId === next.round?.currentPlayerId && seat.isBot)
    if (!bot) return next
    const cardIds = chooseBotCardIds(next.round, bot.playerId)
    let round: RoundState
    try {
      round = playCards(next.round, bot.playerId, cardIds)
    } catch {
      round = playCards(next.round, bot.playerId, [])
    }
    next = log({
      ...next,
      status: round.completed ? 'completed' : 'playing',
      round,
      seats: syncSeatsFromRound(next, round),
    }, cardIds.length ? `${bot.nickname} 出牌` : `${bot.nickname} 不要`)
  }
  return next
}

function applyAction(room: Room, body: ActionBody): Room {
  assertFresh(room, body.expectedVersion)
  if (!body.playerId) throw errorResponse('缺少玩家身份', 400)
  const now = new Date().toISOString()
  let next: Room = { ...withNormalizedSeats(room), updatedAt: now, version: room.version + 1 }

  if (body.type === 'join') {
    const nickname = normalizeName(body.nickname)
    if (next.seats.some((seat) => seat.playerId === body.playerId) || next.spectators.some((item) => item.playerId === body.playerId)) return next
    const seatIndex = firstOpenSeatIndex(next.seats)
    if (typeof seatIndex === 'number') {
      const seat: Seat = {
        playerId: body.playerId,
        nickname,
        team: teamForSeat(seatIndex),
        seatIndex,
        ready: false,
        spectatorPolicy: 'closed',
        approvedSpectatorIds: [],
      }
      return log({ ...next, seats: normalizeSeats({ ...next, seats: [...next.seats, seat] }) }, `${nickname} 入座`)
    }
    return log({ ...next, spectators: [...next.spectators, { playerId: body.playerId, nickname }] }, `${nickname} 进入旁观`)
  }

  if (body.type === 'addBot') {
    if (next.status !== 'waiting') throw errorResponse('牌局已开始，不能补机器', 400)
    const host = next.seats.find((seat) => seat.seatIndex === 0)
    if (host?.playerId !== body.playerId) throw errorResponse('只有房主可以补机器', 403)
    const seatIndex = body.seatIndex
    if (seatIndex !== 1 && seatIndex !== 2 && seatIndex !== 3) throw errorResponse('请选择可补位的机器座位', 400)
    if (next.seats.some((seat) => seat.seatIndex === seatIndex)) throw errorResponse('该座位已经有人', 400)
    const nickname = botNickname(seatIndex)
    const seat: Seat = {
      playerId: botPlayerId(next.code, seatIndex),
      nickname,
      team: teamForSeat(seatIndex),
      seatIndex,
      ready: true,
      spectatorPolicy: 'closed',
      approvedSpectatorIds: [],
      isBot: true,
    }
    return log({ ...next, seats: normalizeSeats({ ...next, seats: [...next.seats, seat] }) }, `${nickname} 入座代打`)
  }

  if (body.type === 'ready') {
    next = { ...next, seats: next.seats.map((seat) => seat.playerId === body.playerId ? { ...seat, ready: true } : seat) }
    return log(next, `${next.seats.find((seat) => seat.playerId === body.playerId)?.nickname ?? '玩家'} 已准备`)
  }

  if (body.type === 'start') {
    if (next.seats.length !== 4 || next.seats.some((seat) => !seat.ready)) {
      throw errorResponse('需要四名玩家全部准备', 400)
    }
    const seats = normalizeSeats(next)
    const round = startRound(seats.map((seat) => seat.playerId), next.levelRank)
    return advanceBots(log({ ...next, status: 'playing', round, seats: syncSeatsFromRound({ ...next, seats }, round) }, '牌局开始'))
  }

  if (body.type === 'play') {
    if (!next.round) throw errorResponse('牌局尚未开始', 400)
    const round = playCards(next.round, body.playerId, body.cardIds ?? [])
    const playerName = next.seats.find((seat) => seat.playerId === body.playerId)?.nickname ?? '玩家'
    return advanceBots(log({
      ...next,
      status: round.completed ? 'completed' : 'playing',
      round,
      seats: syncSeatsFromRound(next, round),
    }, body.cardIds?.length ? `${playerName} 出牌` : `${playerName} 不要`))
  }

  if (body.type === 'setSpectatorPolicy') {
    next = {
      ...next,
      seats: next.seats.map((seat) => seat.playerId === body.playerId ? {
        ...seat,
        spectatorPolicy: body.policy ?? 'closed',
        approvedSpectatorIds: Array.isArray(body.approvedSpectatorIds) ? body.approvedSpectatorIds.filter((id): id is string => typeof id === 'string') : [],
      } : seat),
    }
    return log(next, '旁观权限已更新')
  }

  if (body.type === 'watch') {
    next = {
      ...next,
      spectators: next.spectators.map((spectator) => spectator.playerId === body.playerId ? {
        ...spectator,
        watchingPlayerId: typeof body.watchingPlayerId === 'string' ? body.watchingPlayerId : undefined,
      } : spectator),
    }
    return log(next, '旁观视角已更新')
  }

  throw errorResponse('未知动作', 400)
}

async function createRoom(req: Request, env: CloudflareEnv) {
  const body = await req.json().catch(() => ({})) as ActionBody
  if (!body.playerId) return errorResponse('缺少玩家身份', 400)
  const now = new Date()
  const code = createRoomCode()
  const room: Room = {
    code,
    version: 1,
    status: 'waiting',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ONE_DAY_MS).toISOString(),
    levelRank: 2,
    seats: [{
      playerId: body.playerId,
      nickname: normalizeName(body.nickname),
      team: 'A',
      seatIndex: 0,
      ready: false,
      spectatorPolicy: 'closed',
      approvedSpectatorIds: [],
    }],
    spectators: [],
    round: null,
    log: ['房间已创建'],
  }
  await saveRoom(env, room)
  return json({ roomCode: code, version: room.version, room: publicRoom(room, body.playerId) }, 201)
}

export async function handleGuandanRoomsRequest(req: Request, env: CloudflareEnv) {
  try {
    if (req.method === 'OPTIONS') return empty()
    const url = new URL(req.url)
    if (req.method === 'POST' && url.pathname === '/api/guandan/rooms') return createRoom(req, env)

    const code = extractCode(url.pathname)
    if (!code) return errorResponse('Not found', 404)
    const room = await loadRoom(env, code)
    if (!room) return errorResponse('房间不存在', 404)

    if (req.method === 'GET') {
      return json({ room: publicRoom(room, url.searchParams.get('viewerId')) })
    }

    if (req.method === 'POST' && url.pathname.endsWith('/actions')) {
      const body = await req.json().catch(() => ({})) as ActionBody
      const next = applyAction(room, body)
      await saveRoom(env, next)
      return json({ version: next.version, room: publicRoom(next, body.playerId ?? null) })
    }

    return errorResponse('Method not allowed', 405)
  } catch (caught) {
    if (caught instanceof Response) return caught
    return errorResponse('掼蛋房间服务暂不可用', 500)
  }
}
