import { describe, expect, it } from 'vitest'

import { ALLOWED_ALIPAY_METHODS, PLAN_CATALOG, type PaymentPlan } from '../../payment/domain'

describe('payment/domain', () => {
  it('定义精确的服务端套餐目录', () => {
    const plans: PaymentPlan[] = ['ten', 'month', 'quarter', 'year']

    expect(plans).toEqual(['ten', 'month', 'quarter', 'year'])
    expect(PLAN_CATALOG.ten).toEqual({ name: '10 天', amountFen: 480, durationDays: 10 })
    expect(PLAN_CATALOG.month).toEqual({ name: '30 天', amountFen: 980, durationDays: 30 })
    expect(PLAN_CATALOG.quarter).toEqual({ name: '90 天', amountFen: 1980, durationDays: 90 })
    expect(PLAN_CATALOG.year).toEqual({ name: '1 年', amountFen: 5980, durationDays: 365 })
  })

  it('只允许支付宝收款白名单方法', () => {
    expect(ALLOWED_ALIPAY_METHODS).toEqual(['alipay.trade.page.pay', 'alipay.trade.query'])
    expect(JSON.stringify(ALLOWED_ALIPAY_METHODS)).not.toMatch(/refund|transfer|fund|agreement|settle/)
  })
})
