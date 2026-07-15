import { describe, expect, it } from 'vitest'

import { createAlipayNotifyHandler } from '../../functions/vpn-payment-alipay-notify'
import { createPaymentService } from '../../payment/paymentService'
import type { PaymentConfig } from '../../payment/config'
import type { VerifiedAlipayNotification, VerifiedAlipayTrade } from '../../payment/alipayGateway'
import type { PaymentOrder, PaymentOrderRepository } from '../../payment/orderRepository'

const orderID = '8e06565f-d920-4f2a-bde2-894c7cbbd4d5'
const tradeNo = '2026071622001499999999999999'
const licenseID = 'c3d4fb70-2429-45e9-a3c1-bcf883bab544'
const baseURL = 'https://sandbox-payment.example.com'

function config(): PaymentConfig {
  return {
    environment: 'sandbox',
    publicBaseURL: new URL(baseURL),
    alipayAppID: '2026000000000000',
    alipayMerchantPID: '2088000000000000',
    alipayPrivateKey: 'private-key',
    alipayPublicKey: 'public-key',
    alipayGateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
    licensePrivateKeyRawBase64: 'license-key',
    supabaseURL: new URL('https://sandbox-project.supabase.co'),
    supabaseServiceRoleKey: 'service-role-key',
  }
}

function authorizationRequest() {
  return 'MOSRREQ1.eyJjdXJyZW50TGljZW5zZSI6bnVsbCwibWFjaGluZUNvZGUiOiJNT1NSLU1BQy1BQUFBLUJCQkItQ0NDQy1ERERELUVFRUUtRkZGRiIsInJlcXVlc3RlZEF0IjoxNzgzOTg3MjAwLCJ0cmlhbERheXNSZW1haW5pbmciOjE1LCJ0cmlhbERheXNVc2VkIjowLCJ0cmlhbFN0YXJ0QXQiOjE3ODM5ODcyMDAsInZlcnNpb24iOjF9'
}

function paymentOrder(overrides: Partial<PaymentOrder> = {}): PaymentOrder {
  return {
    id: orderID,
    clientRequestID: '96b2aa7a-33a9-4ed0-8c7c-79cba94eb6ca',
    statusTokenHash: 'status-token-hash',
    checkoutTokenHash: 'checkout-token-hash',
    machineCodeHash: 'machine-code-hash',
    authorizationRequest: authorizationRequest(),
    plan: 'quarter',
    amountFen: 1980,
    status: 'pending',
    alipayTradeNo: null,
    licenseID: null,
    licenseKey: null,
    licenseExpiresAt: null,
    expiresAt: '2026-07-16T00:30:00.000Z',
    ...overrides,
  }
}

function notification(overrides: Partial<VerifiedAlipayNotification> = {}): VerifiedAlipayNotification {
  return {
    tradeNo,
    orderID,
    totalAmount: '19.80',
    appID: config().alipayAppID,
    sellerID: config().alipayMerchantPID,
    tradeStatus: 'TRADE_SUCCESS',
    ...overrides,
  }
}

function notificationRequest(fields: Record<string, string> = {}) {
  return new Request(`${baseURL}/api/v1/vpn-payment/alipay-notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ sign: 'signed', ...fields }),
  })
}

class MemoryOrders implements PaymentOrderRepository {
  readonly claims: Array<{ orderID: string, alipayTradeNo: string, licenseID: string }> = []
  readonly completions: Array<{ orderID: string, licenseID: string, licenseKey: string }> = []

  constructor(readonly order: PaymentOrder, private readonly fail = false) {}

  async createOrder(): Promise<never> {
    throw new Error('not used by notification tests')
  }

  async claimPaidOrder(input: { orderID: string, alipayTradeNo: string, licenseID: string }) {
    if (this.fail) throw new Error('service-role-jwt MOSR2.secret')
    if (this.order.alipayTradeNo && this.order.alipayTradeNo !== input.alipayTradeNo) {
      throw new Error('Alipay trade conflict')
    }
    if (this.order.alipayTradeNo === input.alipayTradeNo && this.order.id !== input.orderID) {
      throw new Error('Alipay trade conflict')
    }

    this.claims.push(input)
    this.order.alipayTradeNo = input.alipayTradeNo
    this.order.licenseID ??= input.licenseID
    this.order.licenseExpiresAt ??= '2026-10-14T23:59:59.000Z'
    this.order.status = this.order.status === 'licensed' ? 'licensed' : 'paid'
    return { ...this.order, trialBonusApplied: false }
  }

  async completeLicense(input: { orderID: string, licenseID: string, licenseKey: string }) {
    if (this.fail) throw new Error('database unavailable with MOSR2.secret')
    this.completions.push(input)
    this.order.status = 'licensed'
    this.order.licenseKey ??= input.licenseKey
    return this.order
  }
}

class FakeGateway {
  readonly queries: string[] = []

  constructor(
    private readonly verified: VerifiedAlipayNotification = notification(),
    private readonly queried: VerifiedAlipayTrade = notification(),
    private readonly verifyError?: Error,
  ) {}

  verifyNotification() {
    if (this.verifyError) throw this.verifyError
    return this.verified
  }

  async queryTrade(id: string) {
    this.queries.push(id)
    return this.queried
  }
}

function createApp(options: {
  order?: PaymentOrder | null
  verified?: VerifiedAlipayNotification
  queried?: VerifiedAlipayTrade
  verifyError?: Error
  databaseFails?: boolean
  sign?: (payload: { licenseID: string, expiresAt: number }) => string
} = {}) {
  const currentOrder = options.order === undefined ? paymentOrder() : options.order
  const orders = new MemoryOrders(currentOrder ?? paymentOrder(), options.databaseFails)
  const gateway = new FakeGateway(options.verified, options.queried, options.verifyError)
  const logs: unknown[] = []
  const signed: Array<{ licenseID: string, expiresAt: number }> = []
  const service = createPaymentService({
    config: config(),
    orders,
    reader: { findOrderByID: async () => currentOrder },
    gateway: gateway as never,
    now: () => new Date('2026-07-16T00:00:00.000Z'),
    signLicense: (payload) => {
      signed.push({ licenseID: payload.licenseID, expiresAt: payload.expiresAt })
      return options.sign?.(payload) ?? `MOSR2.${payload.licenseID}.${payload.expiresAt}`
    },
  })
  return {
    orders,
    gateway,
    signed,
    logs,
    handler: createAlipayNotifyHandler(service, (entry) => logs.push(entry)),
  }
}

async function expectFailure(app: ReturnType<typeof createApp>) {
  const response = await app.handler(notificationRequest())
  expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  expect(await response.text()).toBe('failure')
  expect(response.status).toBeGreaterThanOrEqual(400)
  expect(app.orders.completions).toHaveLength(0)
}

describe('支付宝异步通知', () => {
  it('在 RSA2 验签失败时返回 failure，且不会主动查单或签发', async () => {
    const app = createApp({ verifyError: new Error('Invalid Alipay notification signature') })

    await expectFailure(app)
    expect(app.gateway.queries).toHaveLength(0)
    expect(app.orders.claims).toHaveLength(0)
  })

  it.each([
    ['wrong APPID', notification({ appID: 'wrong-app-id' })],
    ['wrong seller PID', notification({ sellerID: 'wrong-seller-id' })],
    ['non-success status', notification({ tradeStatus: 'WAIT_BUYER_PAY' })],
  ])('在 %s 时返回 failure，且不会主动查单', async (_, verified) => {
    const app = createApp({ verified })

    await expectFailure(app)
    expect(app.gateway.queries).toHaveLength(0)
  })

  it('订单不存在时在主动查单后返回 failure', async () => {
    const app = createApp({ order: null })

    await expectFailure(app)
    expect(app.gateway.queries).toEqual([orderID])
  })

  it('通知金额与服务器订单金额不符时返回 failure', async () => {
    const app = createApp({ verified: notification({ totalAmount: '0.01' }), queried: notification({ totalAmount: '0.01' }) })

    await expectFailure(app)
  })

  it('金额字段不符合两位小数格式时在主动查单前返回 failure', async () => {
    const app = createApp({ verified: notification({ totalAmount: '19.8' }) })

    await expectFailure(app)
    expect(app.gateway.queries).toHaveLength(0)
  })

  it.each([
    ['trade number', notification({ tradeNo: 'other-trade' })],
    ['order ID', notification({ orderID: 'other-order' })],
    ['amount', notification({ totalAmount: '0.01' })],
    ['APPID', notification({ appID: 'other-app' })],
    ['seller PID', notification({ sellerID: 'other-seller' })],
    ['status', notification({ tradeStatus: 'WAIT_BUYER_PAY' })],
  ])('主动查询结果与通知的 %s 不一致时返回 failure', async (_, queried) => {
    const app = createApp({ queried })

    await expectFailure(app)
  })

  it('支付宝交易号被另一个订单复用时返回 failure', async () => {
    const app = createApp({ order: paymentOrder({ alipayTradeNo: 'another-trade' }) })

    await expectFailure(app)
  })

  it('重复的合法通知只签发一次，但两次都返回纯文本 success', async () => {
    const app = createApp()

    const first = await app.handler(notificationRequest())
    const second = await app.handler(notificationRequest())

    for (const response of [first, second]) {
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
      expect(await response.text()).toBe('success')
    }
    expect(app.orders.completions).toHaveLength(1)
    expect(app.orders.claims).toHaveLength(1)
    expect(app.signed).toHaveLength(1)
  })

  it('paid 状态在签发崩溃后会用同一冻结 license ID 和 expiry 重试', async () => {
    const order = paymentOrder({
      status: 'paid',
      alipayTradeNo: tradeNo,
      licenseID,
      licenseExpiresAt: '2026-10-14T23:59:59.000Z',
    })
    const app = createApp({ order })

    const response = await app.handler(notificationRequest())

    expect(await response.text()).toBe('success')
    expect(app.orders.claims).toEqual([{ orderID, alipayTradeNo: tradeNo, licenseID }])
    expect(app.signed).toEqual([{ licenseID, expiresAt: Math.floor(new Date('2026-10-14T23:59:59.000Z').getTime() / 1000) }])
  })

  it('数据库故障只能返回 failure，并且日志仅保留订单 ID 和脱敏错误分类', async () => {
    const app = createApp({ databaseFails: true })

    await expectFailure(app)
    expect(app.logs).toEqual([{
      orderID,
      category: 'persistence_failure',
    }])
    expect(JSON.stringify(app.logs)).not.toContain('MOSR2.secret')
    expect(JSON.stringify(app.logs)).not.toContain('service-role-jwt')
  })
})
