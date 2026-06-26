import type { PublicRoom, RoomAction } from './types'

type RoomPayload = {
  room: PublicRoom
  roomCode?: string
  version?: number
  error?: string
}

async function parseRoomResponse(response: Response) {
  const body = await response.json() as RoomPayload
  if (!response.ok) throw new Error(body.error ?? '掼蛋房间请求失败')
  return body
}

export async function createRoom(playerId: string, nickname: string) {
  const response = await fetch('/api/guandan/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, nickname }),
  })
  return parseRoomResponse(response)
}

export async function fetchRoom(roomCode: string, playerId: string) {
  const response = await fetch(`/api/guandan/rooms/${roomCode}?viewerId=${encodeURIComponent(playerId)}`)
  return parseRoomResponse(response)
}

export async function sendAction(room: PublicRoom, playerId: string, action: RoomAction) {
  const response = await fetch(`/api/guandan/rooms/${room.code}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...action, playerId, expectedVersion: room.version }),
  })
  return parseRoomResponse(response)
}
