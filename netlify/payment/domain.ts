export type PaymentPlan = 'ten' | 'month' | 'quarter' | 'year'

export const PLAN_CATALOG = {
  ten: { name: '10 天', amountFen: 480, durationDays: 10 },
  month: { name: '30 天', amountFen: 980, durationDays: 30 },
  quarter: { name: '90 天', amountFen: 1980, durationDays: 90 },
  year: { name: '1 年', amountFen: 5980, durationDays: 365 },
} as const satisfies Record<PaymentPlan, {
  name: string
  amountFen: number
  durationDays: number
}>

export const ALLOWED_ALIPAY_METHODS = [
  'alipay.trade.page.pay',
  'alipay.trade.query',
] as const
