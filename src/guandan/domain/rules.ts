export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds' | 'joker'
export type Team = 'A' | 'B'
export type CombinationType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'fullHouse'
  | 'straight'
  | 'pairSequence'
  | 'tripleSequence'
  | 'bomb'
  | 'straightFlush'
  | 'jokerBomb'

export type Card = {
  id: string
  suit: Suit
  rank: number
  deck: number
}

export type Combination = {
  type: CombinationType
  cards: Card[]
  rank: number
  length: number
  wildCount: number
  strength: number
}

export type RoundPlayer = {
  id: string
  team: Team
  hand: Card[]
  finishedRank?: number
}

export type LastPlay = {
  playerId: string
  cards: Card[]
  combination: Combination
}

export type RoundState = {
  players: Record<string, RoundPlayer>
  turnOrder: string[]
  currentPlayerId: string
  levelRank: number
  levels: Record<'teamA' | 'teamB', number>
  lastPlay: LastPlay | null
  passPlayerIds: string[]
  finishedOrder: string[]
  completed: boolean
}

const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds']
const NATURAL_SEQUENCE_RANKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export function makeCard(suit: Suit, rank: number, deck: number): Card {
  return {
    id: `${deck}-${suit}-${rank}`,
    suit,
    rank,
    deck,
  }
}

export function createDeck(): Card[] {
  const cards: Card[] = []
  for (let deck = 0; deck < 2; deck += 1) {
    for (const suit of SUITS) {
      for (let rank = 2; rank <= 14; rank += 1) {
        cards.push(makeCard(suit, rank, deck))
      }
    }
    cards.push(makeCard('joker', 16, deck))
    cards.push(makeCard('joker', 17, deck))
  }
  return cards
}

export function dealCards(deck: Card[]): Card[][] {
  return [0, 1, 2, 3].map((seatIndex) => deck.filter((_, index) => index % 4 === seatIndex))
}

function isWild(card: Card, levelRank: number) {
  return card.suit === 'hearts' && card.rank === levelRank
}

function valueOfRank(rank: number, levelRank: number) {
  if (rank === 17) return 180
  if (rank === 16) return 170
  if (rank === levelRank) return 160
  if (rank === 2) return 150
  if (rank === 14) return 140
  return rank
}

function countRanks(cards: Card[]) {
  const counts = new Map<number, number>()
  for (const card of cards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1)
  return counts
}

function sameRankWithWild(cards: Card[], levelRank: number) {
  const natural = cards.filter((card) => !isWild(card, levelRank))
  if (natural.some((card) => card.suit === 'joker')) return null
  const rank = natural[0]?.rank ?? levelRank
  return natural.every((card) => card.rank === rank) ? rank : null
}

function canFormSequence(cards: Card[], levelRank: number, sameSuit: boolean) {
  const wildCount = cards.filter((card) => isWild(card, levelRank)).length
  const natural = cards.filter((card) => !isWild(card, levelRank))
  if (natural.some((card) => card.suit === 'joker' || card.rank === 2)) return null
  if (sameSuit && new Set(natural.map((card) => card.suit)).size > 1) return null

  for (let startIndex = 0; startIndex <= NATURAL_SEQUENCE_RANKS.length - cards.length; startIndex += 1) {
    const target = NATURAL_SEQUENCE_RANKS.slice(startIndex, startIndex + cards.length)
    const used = new Set<number>()
    let missing = 0
    let valid = true
    for (const card of natural) {
      if (!target.includes(card.rank) || used.has(card.rank)) {
        valid = false
        break
      }
      used.add(card.rank)
    }
    if (!valid) continue
    for (const rank of target) {
      if (!used.has(rank)) missing += 1
    }
    if (missing <= wildCount) return target[target.length - 1]
  }
  return null
}

function canFormGroupedSequence(cards: Card[], levelRank: number, groupSize: 2 | 3) {
  const wildCount = cards.filter((card) => isWild(card, levelRank)).length
  const natural = cards.filter((card) => !isWild(card, levelRank))
  if (natural.some((card) => card.suit === 'joker' || card.rank === 2)) return null
  const groupCount = cards.length / groupSize
  const counts = countRanks(natural)

  for (let startIndex = 0; startIndex <= NATURAL_SEQUENCE_RANKS.length - groupCount; startIndex += 1) {
    const target = NATURAL_SEQUENCE_RANKS.slice(startIndex, startIndex + groupCount)
    if ([...counts.keys()].some((rank) => !target.includes(rank))) continue
    const missing = target.reduce((total, rank) => total + Math.max(0, groupSize - (counts.get(rank) ?? 0)), 0)
    if (missing <= wildCount) return target[target.length - 1]
  }
  return null
}

function canFormFullHouse(cards: Card[], levelRank: number) {
  const wildCount = cards.filter((card) => isWild(card, levelRank)).length
  const natural = cards.filter((card) => !isWild(card, levelRank))
  if (natural.some((card) => card.suit === 'joker')) return null
  const ranks = [...new Set([...natural.map((card) => card.rank), ...NATURAL_SEQUENCE_RANKS])]

  for (const tripleRank of ranks) {
    for (const pairRank of ranks) {
      if (pairRank === tripleRank) continue
      const tripleHave = natural.filter((card) => card.rank === tripleRank).length
      const pairHave = natural.filter((card) => card.rank === pairRank).length
      const outside = natural.filter((card) => card.rank !== tripleRank && card.rank !== pairRank).length
      if (outside > 0) continue
      const needed = Math.max(0, 3 - tripleHave) + Math.max(0, 2 - pairHave)
      if (needed <= wildCount) return tripleRank
    }
  }
  return null
}

function combination(type: CombinationType, cards: Card[], rank: number, wildCount: number, levelRank: number): Combination {
  const base = type === 'jokerBomb' ? 10000 : type === 'straightFlush' ? 9000 : type === 'bomb' ? 8000 + cards.length * 100 : 0
  return {
    type,
    cards,
    rank,
    length: cards.length,
    wildCount,
    strength: base + valueOfRank(rank, levelRank),
  }
}

export function identifyCombination(cards: Card[], levelRank: number): Combination | null {
  if (cards.length === 0) return null
  const wildCount = cards.filter((card) => isWild(card, levelRank)).length
  const jokerCount = cards.filter((card) => card.suit === 'joker').length

  if (cards.length === 4 && jokerCount === 4) return combination('jokerBomb', cards, 17, wildCount, levelRank)

  const sameRank = sameRankWithWild(cards, levelRank)
  if (cards.length >= 4 && sameRank !== null) return combination('bomb', cards, sameRank, wildCount, levelRank)
  if (cards.length === 5) {
    const flushHigh = canFormSequence(cards, levelRank, true)
    if (flushHigh !== null) return combination('straightFlush', cards, flushHigh, wildCount, levelRank)
  }
  if (cards.length === 1) return combination('single', cards, cards[0].rank, wildCount, levelRank)
  if (cards.length === 2 && sameRank !== null) return combination('pair', cards, sameRank, wildCount, levelRank)
  if (cards.length === 3 && sameRank !== null) return combination('triple', cards, sameRank, wildCount, levelRank)
  if (cards.length === 5) {
    const fullHouseRank = canFormFullHouse(cards, levelRank)
    if (fullHouseRank !== null) return combination('fullHouse', cards, fullHouseRank, wildCount, levelRank)
    const straightHigh = canFormSequence(cards, levelRank, false)
    if (straightHigh !== null) return combination('straight', cards, straightHigh, wildCount, levelRank)
  }
  if (cards.length >= 6 && cards.length % 2 === 0) {
    const pairHigh = canFormGroupedSequence(cards, levelRank, 2)
    if (pairHigh !== null) return combination('pairSequence', cards, pairHigh, wildCount, levelRank)
  }
  if (cards.length >= 6 && cards.length % 3 === 0) {
    const tripleHigh = canFormGroupedSequence(cards, levelRank, 3)
    if (tripleHigh !== null) return combination('tripleSequence', cards, tripleHigh, wildCount, levelRank)
  }
  return null
}

export function canBeat(next: Combination | null | undefined, previous: Combination | null | undefined) {
  if (!next) return false
  if (!previous) return true
  if (next.type === 'jokerBomb') return previous.type !== 'jokerBomb'
  if (previous.type === 'jokerBomb') return false
  const nextBomb = next.type === 'bomb' || next.type === 'straightFlush'
  const previousBomb = previous.type === 'bomb' || previous.type === 'straightFlush'
  if (nextBomb || previousBomb) return nextBomb && (!previousBomb || next.strength > previous.strength)
  return next.type === previous.type && next.length === previous.length && next.strength > previous.strength
}

function nextActivePlayer(state: RoundState, afterPlayerId: string) {
  const start = state.turnOrder.indexOf(afterPlayerId)
  for (let offset = 1; offset <= state.turnOrder.length; offset += 1) {
    const candidate = state.turnOrder[(start + offset) % state.turnOrder.length]
    if (!state.finishedOrder.includes(candidate)) return candidate
  }
  return afterPlayerId
}

function teamForSeat(index: number): Team {
  return index === 0 || index === 2 ? 'A' : 'B'
}

export function startRound(playerIds: string[], levelRank: number, levels = { teamA: levelRank, teamB: levelRank }): RoundState {
  const hands = dealCards(createDeck())
  const players = Object.fromEntries(playerIds.map((id, index) => [
    id,
    { id, team: teamForSeat(index), hand: sortCards(hands[index] ?? []) },
  ])) as Record<string, RoundPlayer>
  return {
    players,
    turnOrder: playerIds,
    currentPlayerId: playerIds[0],
    levelRank,
    levels,
    lastPlay: null,
    passPlayerIds: [],
    finishedOrder: [],
    completed: false,
  }
}

export function sortCards(cards: Card[]) {
  return [...cards].sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank || a.deck - b.deck)
}

function settleIfNeeded(state: RoundState): RoundState {
  if (state.finishedOrder.length < 2) return state
  const [first, second] = state.finishedOrder
  const firstTeam = state.players[first].team
  const secondTeam = state.players[second].team
  if (firstTeam !== secondTeam) {
    if (state.finishedOrder.length < 3) return state
    const winnerTeam = firstTeam
    const key = winnerTeam === 'A' ? 'teamA' : 'teamB'
    return { ...state, completed: true, levels: { ...state.levels, [key]: state.levels[key] + 1 } }
  }
  const key = firstTeam === 'A' ? 'teamA' : 'teamB'
  return { ...state, completed: true, levels: { ...state.levels, [key]: state.levels[key] + 3 } }
}

export function playCards(state: RoundState, playerId: string, cardIds: string[]): RoundState {
  if (state.completed) throw new Error('本局已经结束')
  if (state.currentPlayerId !== playerId) throw new Error('还没轮到该玩家')

  if (cardIds.length === 0) {
    if (!state.lastPlay) throw new Error('首家不能过牌')
    const passPlayerIds = [...new Set([...state.passPlayerIds, playerId])]
    const activeCount = state.turnOrder.length - state.finishedOrder.length
    if (passPlayerIds.length >= activeCount - 1) {
      return {
        ...state,
        lastPlay: null,
        passPlayerIds: [],
        currentPlayerId: state.lastPlay.playerId,
      }
    }
    return { ...state, passPlayerIds, currentPlayerId: nextActivePlayer(state, playerId) }
  }

  const player = state.players[playerId]
  const selected = cardIds.map((id) => {
    const card = player.hand.find((candidate) => candidate.id === id)
    if (!card) throw new Error('选择的牌不在手牌中')
    return card
  })
  const combo = identifyCombination(selected, state.levelRank)
  if (!combo) throw new Error('不是合法牌型')
  if (!canBeat(combo, state.lastPlay?.combination)) throw new Error('压不过上一手牌')

  const selectedIds = new Set(cardIds)
  const hand = player.hand.filter((card) => !selectedIds.has(card.id))
  const finishedOrder = hand.length === 0 && !state.finishedOrder.includes(playerId)
    ? [...state.finishedOrder, playerId]
    : state.finishedOrder
  const nextState: RoundState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        hand,
        finishedRank: hand.length === 0 ? finishedOrder.length : player.finishedRank,
      },
    },
    lastPlay: { playerId, cards: selected, combination: combo },
    passPlayerIds: [],
    finishedOrder,
    currentPlayerId: nextActivePlayer({ ...state, finishedOrder }, playerId),
  }
  return settleIfNeeded(nextState)
}
