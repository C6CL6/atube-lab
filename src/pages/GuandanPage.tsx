import { GuandanApp } from '../guandan/GuandanApp'
import '../guandan/styles.css'

export function GuandanPage() {
  const roomCode = new URLSearchParams(window.location.search).get('room') ?? ''

  return <GuandanApp initialRoomCode={roomCode} />
}
