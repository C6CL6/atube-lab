import { describe, expect, it } from 'vitest'
import { applyCorrectMove, applyMistake, calculateCompletionBonus, createScoreState } from './scoring'

describe('计分规则', () => {
  it('连续正确填写提高倍率且每格只能得分一次', () => {
    let score = createScoreState('medium', 50)
    score = applyCorrectMove(score, 10)
    const afterFirst = score.score
    score = applyCorrectMove(score, 11)
    const afterSecond = score.score
    score = applyCorrectMove(score, 10)

    expect(afterSecond - afterFirst).toBeGreaterThan(afterFirst)
    expect(score.score).toBe(afterSecond)
  })

  it('允许三次错误，第四次错误才冻结当前分数且不清零', () => {
    let score = applyCorrectMove(createScoreState('hard', 55), 0)
    score = applyMistake(applyMistake(applyMistake(score)))

    expect(score.mistakes).toBe(3)
    expect(score.frozen).toBe(false)

    score = applyMistake(score)
    expect(score.mistakes).toBe(4)
    expect(score.frozen).toBe(true)
    expect(score.score).toBeGreaterThan(0)
    expect(applyCorrectMove(score, 1).score).toBe(score.score)
  })

  it('分数冻结后错误次数仍会继续累计', () => {
    let score = createScoreState('medium', 48)
    for (let count = 0; count < 6; count += 1) score = applyMistake(score)

    expect(score.mistakes).toBe(6)
    expect(score.frozen).toBe(true)
  })

  it('分数冻结后答对仍累计连对但不增加分数，答错后连对归零', () => {
    let score = { ...createScoreState('medium', 48), score: 500, frozen: true }
    score = applyCorrectMove(score, 12)

    expect(score.score).toBe(500)
    expect(score.streak).toBe(1)

    score = applyMistake(score)
    expect(score.score).toBe(500)
    expect(score.streak).toBe(0)
  })

  it('未冻结完成时按速度与准确度增加奖励', () => {
    const score = createScoreState('easy', 40)
    const perfect = calculateCompletionBonus(score, 300)
    const slow = calculateCompletionBonus({ ...score, mistakes: 2 }, 1200)

    expect(perfect).toBeGreaterThan(slow)
    expect(slow).toBe(0)
  })
})
