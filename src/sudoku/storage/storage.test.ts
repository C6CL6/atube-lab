import { beforeEach, describe, expect, it } from 'vitest'
import { createUser, deleteUser, loadAppData, saveAppData } from './storage'

describe('本机用户数据', () => {
  beforeEach(() => localStorage.clear())

  it('创建用户时修剪空格并允许重名玩家分别记录', () => {
    const first = createUser(loadAppData(), '  阿土伯  ')
    const second = createUser(first.data, '阿土伯')

    expect(first.user.name).toBe('阿土伯')
    expect(second.user.name).toBe('阿土伯')
    expect(second.user.id).not.toBe(first.user.id)
    expect(second.data.users).toHaveLength(2)
  })

  it('删除用户时同步删除其进度和排行榜成绩', () => {
    const created = createUser(loadAppData(), '张老师')
    const data = {
      ...created.data,
      games: { [created.user.id]: { id: 'game' } as never },
      records: [{
        id: 'r1',
        userId: created.user.id,
        username: created.user.name,
        score: 100,
      } as never],
    }
    const deleted = deleteUser(data, created.user.id)

    expect(deleted.users).toHaveLength(0)
    expect(deleted.games[created.user.id]).toBeUndefined()
    expect(deleted.records).toHaveLength(0)
  })

  it('保存后可以恢复版本化数据', () => {
    const created = createUser(loadAppData(), '王阿姨')
    saveAppData(created.data)

    expect(loadAppData().users[0].name).toBe('王阿姨')
  })

  it('旧规则下三次错误冻结的游戏会自动恢复计分状态', () => {
    const created = createUser(loadAppData(), '老玩家')
    const userId = created.user.id
    saveAppData({
      ...created.data,
      games: {
        [userId]: {
          score: { mistakes: 3, frozen: true },
        } as never,
      },
    })

    expect(loadAppData().games[userId].score.frozen).toBe(false)
  })

  it('恢复未完成游戏时先暂停，避免离开页面后继续计时', () => {
    const created = createUser(loadAppData(), '计时玩家')
    const userId = created.user.id
    saveAppData({
      ...created.data,
      games: {
        [userId]: {
          completed: false,
          paused: false,
          score: { mistakes: 0, frozen: false },
        } as never,
      },
    })

    expect(loadAppData().games[userId].paused).toBe(true)
  })
})
