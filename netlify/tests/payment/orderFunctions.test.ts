import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { createCheckoutHandler } from '../../functions/vpn-payment-checkout'
import { createOrderStatusHandler } from '../../functions/vpn-payment-order'
import { createOrdersHandler } from '../../functions/vpn-payment-orders'
import { createPaymentService, type PaymentOrderReader } from '../../payment/paymentService'
import { AlipayReceiveOnlyGateway } from '../../payment/alipayGateway'
import type { PaymentConfig } from '../../payment/config'
import type { PaymentOrder, PaymentOrderInput, PaymentOrderRepository } from '../../payment/orderRepository'

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

function hash(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

class MemoryOrderRepository implements PaymentOrderRepository, PaymentOrderReader {
  readonly orders: PaymentOrder[] = []
  readonly inputs: PaymentOrderInput[] = []

  async createOrder(input: PaymentOrderInput) {
    const existing = this.orders.find((order) => order.clientRequestID === input.clientRequestID)
    if (existing) return existing

    this.inputs.push(input)
    const order: PaymentOrder = {
      id: input.id,
      clientRequestID: input.clientRequestID,
      statusTokenHash: hash(input.statusToken),
      checkoutTokenHash: hash(input.checkoutToken),
      machineCodeHash: hash(input.machineCode),
      authorizationRequest: input.authorizationRequest,
      plan: input.plan,
      amountFen: input.amountFen,
      status: 'pending',
      alipayTradeNo: null,
      licenseID: null,
      licenseKey: null,
      licenseExpiresAt: null,
      expiresAt: input.expiresAt,
    }
    this.orders.push(order)
    return order
  }

  async findOrderByID(orderID: string) {
    return this.orders.find((order) => order.id === orderID) ?? null
  }

  async findOrderByStatusTokenHash(statusTokenHash: string) {
    return this.orders.find((order) => order.statusTokenHash === statusTokenHash) ?? null
  }

  async findOrderByCheckoutTokenHash(checkoutTokenHash: string) {
    return this.orders.find((order) => order.checkoutTokenHash === checkoutTokenHash) ?? null
  }

  async claimPaidOrder(): Promise<never> {
    throw new Error('not needed by order endpoint tests')
  }

  async completeLicense(): Promise<never> {
    throw new Error('not needed by order endpoint tests')
  }
}

class FakeAlipaySDK {
  pageExecute() {
    return '<form action="https://alipay.example.test/checkout"></form>'
  }

  async exec() {
    throw new Error('not needed by order endpoint tests')
  }

  checkNotifySignV2() {
    return true
  }
}

function createTestApp(now = new Date('2026-07-16T00:00:00.000Z')) {
  const orders = new MemoryOrderRepository()
  const service = createPaymentService({
    config: config(),
    orders,
    reader: orders,
    gateway: new AlipayReceiveOnlyGateway(config(), new FakeAlipaySDK()),
    now: () => now,
  })

  return {
    orders,
    service,
    createOrder: createOrdersHandler(service),
    status: createOrderStatusHandler(service),
    checkout: createCheckoutHandler(service),
  }
}

function orderRequest(body: Record<string, unknown>) {
  return new Request(`${baseURL}/api/v1/vpn-payment/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientRequestID: '96b2aa7a-33a9-4ed0-8c7c-79cba94eb6ca',
      machineCode: 'MOSR-MAC-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF',
      authorizationRequest: 'MOSRREQ1.confidential-request',
      plan: 'month',
      ...body,
    }),
  })
}

async function json(response: Response) {
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  const body = await response.json() as Record<string, unknown>
  expect(JSON.stringify(body)).not.toContain('MOSRREQ1.confidential-request')
  expect(body).not.toHaveProperty('authorizationRequest')
  return body
}

describe('payment order functions', () => {
  it('rejects client-supplied amounts and always uses the server plan catalog price', async () => {
    const app = createTestApp()

    const rejected = await app.createOrder(orderRequest({ amountFen: 1, amount: 0.01 }))
    expect(rejected.status).toBe(400)

    const response = await app.createOrder(orderRequest({}))
    expect(response.status).toBe(201)
    expect(app.orders.inputs).toHaveLength(1)
    expect(app.orders.inputs[0]).toMatchObject({ plan: 'month', amountFen: 980 })
  })

  it('is idempotent by clientRequestID while returning raw tokens only on the first create', async () => {
    const app = createTestApp()

    const first = await json(await app.createOrder(orderRequest({})))
    const second = await json(await app.createOrder(orderRequest({})))

    expect(second.orderID).toBe(first.orderID)
    expect(second).not.toHaveProperty('statusToken')
    expect(second).not.toHaveProperty('checkoutURL')
    expect(app.orders.orders).toHaveLength(1)
  })

  it('returns separate 32-byte status and checkout credentials once without exposing the authorization request', async () => {
    const app = createTestApp()
    const response = await json(await app.createOrder(orderRequest({})))
    const statusToken = String(response.statusToken)
    const checkoutURL = new URL(String(response.checkoutURL))

    expect(Buffer.from(statusToken, 'base64url')).toHaveLength(32)
    expect(Buffer.from(checkoutURL.searchParams.get('token') ?? '', 'base64url')).toHaveLength(32)
    expect(checkoutURL.searchParams.get('token')).not.toBe(statusToken)
    expect(checkoutURL.pathname).toBe(`/api/v1/vpn-payment/checkout/${response.orderID}`)
    expect(app.orders.orders[0].statusTokenHash).toBe(hash(statusToken))
    expect(app.orders.orders[0].checkoutTokenHash).toBe(hash(checkoutURL.searchParams.get('token') ?? ''))
    expect(app.orders.orders[0].statusTokenHash).not.toContain(statusToken)
    expect(app.orders.orders[0].checkoutTokenHash).not.toContain(checkoutURL.searchParams.get('token') ?? '')
    expect(new Date(String(response.expiresAt)).getTime()).toBe(new Date('2026-07-16T00:30:00.000Z').getTime())
  })

  it('requires the status bearer token and returns only a redacted status model', async () => {
    const app = createTestApp()
    const created = await json(await app.createOrder(orderRequest({})))
    const orderID = String(created.orderID)

    expect((await app.status(new Request(`${baseURL}/api/v1/vpn-payment/orders/${orderID}`))).status).toBe(401)
    expect((await app.status(new Request(`${baseURL}/api/v1/vpn-payment/orders/${orderID}`, {
      headers: { Authorization: 'Bearer wrong-token' },
    }))).status).toBe(403)

    const response = await app.status(new Request(`${baseURL}/api/v1/vpn-payment/orders/${orderID}`, {
      headers: { Authorization: `Bearer ${created.statusToken}` },
    }))
    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toMatchObject({ orderID, status: 'pending' })
  })

  it('uses the separate checkout token and AlipayReceiveOnlyGateway only for pending orders', async () => {
    const app = createTestApp()
    const created = await json(await app.createOrder(orderRequest({})))
    const checkoutURL = String(created.checkoutURL)

    expect((await app.checkout(new Request(checkoutURL.replace(/token=[^&]+/, 'token=wrong-token')))).status).toBe(403)

    const checkout = await app.checkout(new Request(checkoutURL))
    expect(checkout.status).toBe(200)
    expect(checkout.headers.get('Content-Type')).toContain('text/html')
    await expect(checkout.text()).resolves.toContain('alipay.example.test/checkout')

    app.orders.orders[0].status = 'paid'
    expect((await app.checkout(new Request(checkoutURL))).status).toBe(409)
  })

  it('refuses checkout after the 30-minute expiry', async () => {
    const app = createTestApp(new Date('2026-07-16T00:31:00.000Z'))
    app.orders.orders.push({
      id: '8e06565f-d920-4f2a-bde2-894c7cbbd4d5',
      clientRequestID: '96b2aa7a-33a9-4ed0-8c7c-79cba94eb6ca',
      statusTokenHash: hash('status-token'),
      checkoutTokenHash: hash('checkout-token'),
      machineCodeHash: hash('machine'),
      authorizationRequest: 'MOSRREQ1.confidential-request',
      plan: 'month',
      amountFen: 980,
      status: 'pending',
      alipayTradeNo: null,
      licenseID: null,
      licenseKey: null,
      licenseExpiresAt: null,
      expiresAt: '2026-07-16T00:30:00.000Z',
    })

    const response = await app.checkout(new Request(`${baseURL}/api/v1/vpn-payment/checkout/8e06565f-d920-4f2a-bde2-894c7cbbd4d5?token=checkout-token`))
    expect(response.status).toBe(410)
    await json(response)
  })
})
