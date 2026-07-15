import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

import { AlipayReceiveOnlyGateway } from './alipayGateway'
import { loadPaymentConfig, type PaymentConfig } from './config'
import { PLAN_CATALOG, type PaymentPlan } from './domain'
import { PaymentHTTPError } from './http'
import { SupabasePaymentOrderRepository, type PaymentOrder, type PaymentOrderRepository } from './orderRepository'

const ORDER_LIFETIME_MS = 30 * 60 * 1000

export type PaymentOrderReader = {
  findOrderByID(orderID: string): Promise<PaymentOrder | null>
}

type PaymentGateway = Pick<AlipayReceiveOnlyGateway, 'createPagePayment'>

type PaymentServiceDependencies = {
  config: PaymentConfig
  orders: PaymentOrderRepository
  reader: PaymentOrderReader
  gateway: PaymentGateway
  now?: () => Date
}

type CreateOrderInput = {
  clientRequestID: string
  machineCode: string
  authorizationRequest: string
  plan: PaymentPlan
}

export type CreatedPaymentOrder = {
  orderID: string
  status: PaymentOrder['status']
  expiresAt: string
  statusToken?: string
  checkoutURL?: string
}

export type PaymentOrderStatus = {
  orderID: string
  status: PaymentOrder['status']
  expiresAt: string
  licenseKey?: string
  licenseExpiresAt?: string
}

function hashToken(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function requireString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PaymentHTTPError(400, `Invalid ${field}`)
  }
  return value.trim()
}

function isPaymentPlan(value: string): value is PaymentPlan {
  return Object.hasOwn(PLAN_CATALOG, value)
}

function publicOrder(order: PaymentOrder): PaymentOrderStatus {
  return {
    orderID: order.id,
    status: order.status,
    expiresAt: order.expiresAt,
    ...(order.status === 'licensed' && order.licenseKey ? { licenseKey: order.licenseKey } : {}),
    ...(order.licenseExpiresAt ? { licenseExpiresAt: order.licenseExpiresAt } : {}),
  }
}

export function createPaymentService(dependencies: PaymentServiceDependencies) {
  const now = dependencies.now ?? (() => new Date())

  async function orderFor(orderID: string) {
    const order = await dependencies.reader.findOrderByID(orderID)
    if (!order) throw new PaymentHTTPError(404, 'Payment order not found')
    return order
  }

  return {
    async createOrder(input: CreateOrderInput): Promise<CreatedPaymentOrder> {
      const clientRequestID = requireString(input.clientRequestID, 'clientRequestID')
      const machineCode = requireString(input.machineCode, 'machineCode')
      const authorizationRequest = requireString(input.authorizationRequest, 'authorizationRequest')
      const plan = requireString(input.plan, 'plan')
      if (!isPaymentPlan(plan)) throw new PaymentHTTPError(400, 'Invalid plan')

      const statusToken = randomBytes(32).toString('base64url')
      const checkoutToken = randomBytes(32).toString('base64url')
      const createdAt = now()
      const expiresAt = new Date(createdAt.getTime() + ORDER_LIFETIME_MS).toISOString()
      const generatedID = randomUUID()
      const order = await dependencies.orders.createOrder({
        id: generatedID,
        clientRequestID,
        statusToken,
        checkoutToken,
        machineCode,
        authorizationRequest,
        plan,
        amountFen: PLAN_CATALOG[plan].amountFen,
        expiresAt,
      })

      if (order.id !== generatedID) return publicOrder(order)

      const checkoutURL = new URL(`/api/v1/vpn-payment/checkout/${encodeURIComponent(order.id)}`, dependencies.config.publicBaseURL)
      checkoutURL.searchParams.set('token', checkoutToken)
      return {
        ...publicOrder(order),
        statusToken,
        checkoutURL: checkoutURL.toString(),
      }
    },

    async fetchStatus(orderID: string, statusToken: string) {
      const order = await orderFor(orderID)
      if (hashToken(statusToken) !== order.statusTokenHash) {
        throw new PaymentHTTPError(403, 'Invalid payment status token')
      }
      return publicOrder(order)
    },

    async checkout(orderID: string, checkoutToken: string) {
      const order = await orderFor(orderID)
      if (hashToken(checkoutToken) !== order.checkoutTokenHash) {
        throw new PaymentHTTPError(403, 'Invalid payment checkout token')
      }
      if (order.status !== 'pending') throw new PaymentHTTPError(409, 'Payment order is no longer pending')
      if (new Date(order.expiresAt).getTime() <= now().getTime()) {
        throw new PaymentHTTPError(410, 'Payment order has expired')
      }

      return dependencies.gateway.createPagePayment({
        orderID: order.id,
        subject: `Mac mini VPN Gateway ${PLAN_CATALOG[order.plan].name}`,
        amountFen: PLAN_CATALOG[order.plan].amountFen,
        notifyURL: new URL('/api/v1/vpn-payment/alipay-notify', dependencies.config.publicBaseURL),
        returnURL: new URL('/api/v1/vpn-payment/return', dependencies.config.publicBaseURL),
      })
    },
  }
}

type SupabaseResult = {
  data: Record<string, unknown> | null
  error: { message: string } | null
}

function toPaymentOrder(row: Record<string, unknown>): PaymentOrder {
  const asString = (value: unknown) => value == null ? null : String(value)
  return {
    id: String(row.id),
    clientRequestID: String(row.client_request_id),
    statusTokenHash: String(row.status_token_hash),
    checkoutTokenHash: String(row.checkout_token_hash),
    machineCodeHash: String(row.machine_code_hash),
    authorizationRequest: String(row.authorization_request),
    plan: row.plan as PaymentPlan,
    amountFen: Number(row.amount_fen),
    status: row.status as PaymentOrder['status'],
    alipayTradeNo: asString(row.alipay_trade_no),
    licenseID: asString(row.license_id),
    licenseKey: asString(row.license_key),
    licenseExpiresAt: asString(row.license_expires_at),
    expiresAt: String(row.expires_at),
  }
}

class SupabasePaymentOrderReader implements PaymentOrderReader {
  constructor(private readonly client: ReturnType<typeof createClient>) {}

  async findOrderByID(orderID: string) {
    const result = await this.client
      .from('vpn_payment_orders')
      .select('*')
      .eq('id', orderID)
      .maybeSingle() as SupabaseResult
    if (result.error) throw new Error(result.error.message)
    return result.data ? toPaymentOrder(result.data) : null
  }
}

export function createLivePaymentService(env = process.env) {
  const config = loadPaymentConfig(env)
  const client = createClient(config.supabaseURL.toString(), config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return createPaymentService({
    config,
    orders: SupabasePaymentOrderRepository.fromPaymentConfig(config),
    reader: new SupabasePaymentOrderReader(client),
    gateway: new AlipayReceiveOnlyGateway(config),
  })
}
