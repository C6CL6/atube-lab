import type { Card } from './domain/rules'

const SUITS = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
  joker: '',
}

const RANKS: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  16: '小王',
  17: '大王',
}

export function cardLabel(card: Card) {
  if (card.suit === 'joker') return RANKS[card.rank]
  return `${SUITS[card.suit]}${RANKS[card.rank] ?? card.rank}`
}

export function rankLabel(rank: number) {
  return RANKS[rank] ?? String(rank)
}

export function isRedCard(card: Card) {
  return card.suit === 'hearts' || card.suit === 'diamonds' || card.rank === 17
}

export function levelLabel(level: number) {
  return RANKS[level] ?? String(level)
}
