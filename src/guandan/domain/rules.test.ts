import { describe, expect, it } from 'vitest'
import {
  canBeat,
  createDeck,
  dealCards,
  playCards,
  startRound,
  identifyCombination,
  makeCard,
} from './rules'

describe('掼蛋规则核心', () => {
  it('双副牌发给四名玩家，每人27张且没有重复牌', () => {
    const deck = createDeck()
    const hands = dealCards(deck)

    expect(deck).toHaveLength(108)
    expect(hands).toHaveLength(4)
    expect(hands.every((hand) => hand.length === 27)).toBe(true)
    expect(new Set(hands.flat().map((card) => card.id)).size).toBe(108)
  })

  it('识别红桃级牌为逢人配', () => {
    const wild = makeCard('hearts', 10, 0)
    const normal = makeCard('spades', 10, 0)

    expect(identifyCombination([wild], 10)).toMatchObject({ type: 'single', wildCount: 1 })
    expect(identifyCombination([normal], 10)).toMatchObject({ type: 'single', wildCount: 0 })
  })

  it('支持基础牌型识别：单张、对子、三张、三带二、顺子、连对、钢板、炸弹、同花顺、王炸', () => {
    expect(identifyCombination([makeCard('spades', 3, 0)], 2)?.type).toBe('single')
    expect(identifyCombination([makeCard('spades', 4, 0), makeCard('clubs', 4, 0)], 2)?.type).toBe('pair')
    expect(identifyCombination([makeCard('spades', 5, 0), makeCard('clubs', 5, 0), makeCard('diamonds', 5, 0)], 2)?.type).toBe('triple')
    expect(identifyCombination([
      makeCard('spades', 6, 0),
      makeCard('clubs', 6, 0),
      makeCard('diamonds', 6, 0),
      makeCard('spades', 9, 0),
      makeCard('clubs', 9, 0),
    ], 2)?.type).toBe('fullHouse')
    expect(identifyCombination([
      makeCard('spades', 3, 0),
      makeCard('clubs', 4, 0),
      makeCard('diamonds', 5, 0),
      makeCard('spades', 6, 0),
      makeCard('clubs', 7, 0),
    ], 2)?.type).toBe('straight')
    expect(identifyCombination([
      makeCard('spades', 7, 0),
      makeCard('clubs', 7, 0),
      makeCard('spades', 8, 0),
      makeCard('clubs', 8, 0),
      makeCard('spades', 9, 0),
      makeCard('clubs', 9, 0),
    ], 2)?.type).toBe('pairSequence')
    expect(identifyCombination([
      makeCard('spades', 7, 0),
      makeCard('clubs', 7, 0),
      makeCard('diamonds', 7, 0),
      makeCard('spades', 8, 0),
      makeCard('clubs', 8, 0),
      makeCard('diamonds', 8, 0),
    ], 2)?.type).toBe('tripleSequence')
    expect(identifyCombination([
      makeCard('spades', 9, 0),
      makeCard('clubs', 9, 0),
      makeCard('diamonds', 9, 0),
      makeCard('hearts', 9, 1),
    ], 2)?.type).toBe('bomb')
    expect(identifyCombination([
      makeCard('spades', 9, 0),
      makeCard('spades', 10, 0),
      makeCard('spades', 11, 0),
      makeCard('spades', 12, 0),
      makeCard('spades', 13, 0),
    ], 2)?.type).toBe('straightFlush')
    expect(identifyCombination([
      makeCard('joker', 16, 0),
      makeCard('joker', 16, 1),
      makeCard('joker', 17, 0),
      makeCard('joker', 17, 1),
    ], 2)?.type).toBe('jokerBomb')
  })

  it('比较大小：普通同型按主值比较，炸弹压普通牌，王炸最大', () => {
    const pair4 = identifyCombination([makeCard('spades', 4, 0), makeCard('clubs', 4, 0)], 2)
    const pair5 = identifyCombination([makeCard('spades', 5, 0), makeCard('clubs', 5, 0)], 2)
    const triple7 = identifyCombination([makeCard('spades', 7, 0), makeCard('clubs', 7, 0), makeCard('diamonds', 7, 0)], 2)
    const bomb3 = identifyCombination([
      makeCard('spades', 3, 0),
      makeCard('clubs', 3, 0),
      makeCard('diamonds', 3, 0),
      makeCard('hearts', 3, 0),
    ], 2)
    const jokerBomb = identifyCombination([
      makeCard('joker', 16, 0),
      makeCard('joker', 16, 1),
      makeCard('joker', 17, 0),
      makeCard('joker', 17, 1),
    ], 2)

    expect(canBeat(pair5, pair4)).toBe(true)
    expect(canBeat(pair4, pair5)).toBe(false)
    expect(canBeat(triple7, pair5)).toBe(false)
    expect(canBeat(bomb3, triple7)).toBe(true)
    expect(canBeat(jokerBomb, bomb3)).toBe(true)
    expect(canBeat(bomb3, jokerBomb)).toBe(false)
  })

  it('拒绝非法出牌，并在连续过牌后把出牌权交回上一手玩家', () => {
    const state = startRound(['p1', 'p2', 'p3', 'p4'], 2)
    const firstPlayer = state.currentPlayerId
    const secondPlayer = state.turnOrder[1]
    const thirdPlayer = state.turnOrder[2]
    const fourthPlayer = state.turnOrder[3]
    const firstSingle = state.players[firstPlayer].hand[0]

    expect(() => playCards(state, firstPlayer, [firstSingle.id, 'missing-card'])).toThrow(/不在手牌/)

    const afterPlay = playCards(state, firstPlayer, [firstSingle.id])
    expect(afterPlay.lastPlay?.playerId).toBe(firstPlayer)
    expect(afterPlay.currentPlayerId).toBe(secondPlayer)

    const afterOnePass = playCards(afterPlay, secondPlayer, [])
    const afterTwoPass = playCards(afterOnePass, thirdPlayer, [])
    const afterThreePass = playCards(afterTwoPass, fourthPlayer, [])

    expect(afterThreePass.lastPlay).toBeNull()
    expect(afterThreePass.currentPlayerId).toBe(firstPlayer)
  })

  it('玩家出完牌后记录名次，并在一方包揽前两名时升级3级', () => {
    const state = startRound(['p1', 'p2', 'p3', 'p4'], 2)
    const p1OnlyCard = state.players.p1.hand[0]
    const p3OnlyCard = state.players.p3.hand[0]
    const almostFinished = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, hand: [p1OnlyCard] },
        p3: { ...state.players.p3, hand: [p3OnlyCard] },
      },
      currentPlayerId: 'p1',
      turnOrder: ['p1', 'p2', 'p3', 'p4'],
    }

    const afterP1 = playCards(almostFinished, 'p1', [p1OnlyCard.id])
    const afterP3 = playCards({ ...afterP1, currentPlayerId: 'p3', lastPlay: null, passPlayerIds: [] }, 'p3', [p3OnlyCard.id])

    expect(afterP3.finishedOrder).toEqual(['p1', 'p3'])
    expect(afterP3.completed).toBe(true)
    expect(afterP3.levels.teamA).toBe(5)
  })
})
