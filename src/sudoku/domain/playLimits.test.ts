import { describe, expect, it } from 'vitest'
import { addPlaySecond, createPlayLimitState, getPlayLimitStatus } from './playLimits'

describe('数独防沉迷规则', () => {
  it('连续游戏满2小时后需要休息30分钟', () => {
    const now = Date.parse('2026-07-19T08:00:00.000Z')
    const state = createPlayLimitState(now)
    let current = state
    for (let index = 0; index < 7200; index += 1) {
      current = addPlaySecond(current, now + index * 1000)
    }

    const blocked = getPlayLimitStatus(current, now + 7200 * 1000)
    expect(blocked).toMatchObject({ kind: 'rest', remainingSeconds: 1800 })

    const released = getPlayLimitStatus(current, now + 9000 * 1000)
    expect(released.kind).toBe('ok')
  })

  it('24小时内累计游戏满4小时后当天不可继续', () => {
    const now = Date.parse('2026-07-19T08:00:00.000Z')
    let state = createPlayLimitState(now)
    for (let index = 0; index < 7200; index += 1) {
      state = addPlaySecond(state, now + index * 1000)
    }

    const afterRest = now + 9000 * 1000
    for (let index = 0; index < 7200; index += 1) {
      state = addPlaySecond(state, afterRest + index * 1000)
    }

    const blocked = getPlayLimitStatus(state, afterRest + 7200 * 1000)
    expect(blocked).toMatchObject({ kind: 'daily-limit' })

    const tomorrow = getPlayLimitStatus(state, now + 24 * 60 * 60 * 1000 + 1000)
    expect(tomorrow.kind).toBe('ok')
  })
})
