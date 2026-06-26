import type { Card, Team } from './domain/rules'

export type PublicSeat = {
  playerId: string
  nickname: string
  team: Team
  seatIndex?: number
  ready: boolean
  handCount: number
  spectatorPolicy: 'closed' | 'open' | 'approved'
  approvedSpectatorIds?: string[]
  hand?: Card[]
  isBot?: boolean
}

export type PublicSpectator = {
  playerId: string
  nickname: string
  watchingPlayerId?: string
}

export type PublicRoom = {
  code: string
  version: number
  status: 'waiting' | 'playing' | 'completed'
  levelRank: number
  updatedAt?: string
  expiresAt?: string
  seats: PublicSeat[]
  spectators: PublicSpectator[]
  currentPlayerId: string | null
  lastPlay: { playerId: string; cards: Card[]; type: string } | null
  passPlayerIds: string[]
  finishedOrder: string[]
  levels: { teamA: number; teamB: number }
  log: string[]
}

export type RoomAction =
  | { type: 'join'; nickname: string }
  | { type: 'addBot'; seatIndex: number }
  | { type: 'ready' }
  | { type: 'start' }
  | { type: 'play'; cardIds: string[] }
  | { type: 'setSpectatorPolicy'; policy: PublicSeat['spectatorPolicy']; approvedSpectatorIds?: string[] }
  | { type: 'watch'; watchingPlayerId?: string }
