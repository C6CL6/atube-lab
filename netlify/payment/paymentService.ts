import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

import { AlipayReceiveOnlyGateway } from './alipayGateway'
import { loadPaymentConfig, type PaymentConfig } from './config'
import { PLAN_CATALOG, type PaymentPlan } from './domain'
import { PaymentHTTPError } from './http'
import { decodeLicenseRequest, isValidMachineCode, signLicense as signMOSR2, type SignedLicensePayload } from './licenseCodec'
import { SupabasePaymentOrderRepository, type PaymentOrder, type PaymentOrderRepository } from './orderRepository'

const ORDER_LIFETIME_MS = 30 * 60 * 1000

export type PaymentOrderReader = {
  findOrderByID(orderID: string): Promise<PaymentOrder | null>
}

type PaymentGateway = Pick<AlipayReceiveOnlyGateway, 'createPagePayment' | 'queryTrade' | 'verifyNotification'>

export type AlipayNotificationFailureCategory =
  | 'verification_failure'
  | 'validation_failure'
  | 'query_failure'
  | 'payment_mismatch'
  | 'signing_failure'
  | 'persistence_failure'

type AlipayNotificationFailure = {
  category: AlipayNotificationFailureCategory
  orderID?: string
}

class AlipayNotificationError extends Error {
  constructor(
    readonly failure: AlipayNotificationFailure,
  ) {
    super(failure.category)
  }
}

type PaymentServiceDependencies = {
  config: PaymentConfig
  orders: PaymentOrderRepository
  reader: PaymentOrderReader
  gateway: PaymentGateway
  now?: () => Date
  signLicense?: (payload: SignedLicensePayload) => string
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

function amountFromFen(amountFen: number) {
  return `${Math.floor(amountFen / 100)}.${String(amountFen % 100).padStart(2, '0')}`
}

function notificationError(category: AlipayNotificationFailureCategory, orderID?: string): never {
  throw new AlipayNotificationError({ category, ...(orderID ? { orderID } : {}) })
}

function equalTrades(
  notification: { tradeNo: string, orderID: string, totalAmount: string, appID: string, sellerID: string, tradeStatus: string },
  queried: { tradeNo: string, orderID: string, totalAmount: string, appID: string, sellerID: string, tradeStatus: string },
) {
  return notification.tradeNo === queried.tradeNo
    && notification.orderID === queried.orderID
    && notification.totalAmount === queried.totalAmount
    && notification.appID === queried.appID
    && notification.sellerID === queried.sellerID
    && notification.tradeStatus === queried.tradeStatus
}

function stableIssuedAt(order: PaymentOrder, expiresAt: number) {
  const createdAt = new Date(order.expiresAt).getTime() - ORDER_LIFETIME_MS
  if (!Number.isFinite(createdAt) || createdAt <= 0 || createdAt > expiresAt * 1000) {
    notificationError('signing_failure', order.id)
  }
  return Math.floor(createdAt / 1000)
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
  const signLicense = dependencies.signLicense ?? ((payload) => signMOSR2(payload, dependencies.config.licensePrivateKeyRawBase64))

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

    async processAlipayNotification(fields: URLSearchParams) {
      let notification: ReturnType<PaymentGateway['verifyNotification']>
      try {
        notification = dependencies.gateway.verifyNotification(fields)
      } catch {
        return notificationError('verification_failure')
      }

      if (
        notification.appID !== dependencies.config.alipayAppID
        || notification.sellerID !== dependencies.config.alipayMerchantPID
        || !/^(?:0|[1-9]\d*)\.\d{2}$/.test(notification.totalAmount)
        || Number(notification.totalAmount) <= 0
        || notification.tradeStatus !== 'TRADE_SUCCESS'
      ) {
        return notificationError('validation_failure', notification.orderID)
      }

      let queried: Awaited<ReturnType<PaymentGateway['queryTrade']>>
      try {
        queried = await dependencies.gateway.queryTrade(notification.orderID)
      } catch {
        return notificationError('query_failure', notification.orderID)
      }

      if (
        queried.appID !== dependencies.config.alipayAppID
        || queried.sellerID !== dependencies.config.alipayMerchantPID
        || queried.tradeStatus !== 'TRADE_SUCCESS'
        || !equalTrades(notification, queried)
      ) {
        return notificationError('payment_mismatch', notification.orderID)
      }

      let order: PaymentOrder | null
      try {
        order = await dependencies.reader.findOrderByID(notification.orderID)
      } catch {
        return notificationError('persistence_failure', notification.orderID)
      }
      if (!order) return notificationError('payment_mismatch', notification.orderID)

      const expectedAmount = amountFromFen(order.amountFen)
      if (
        !isPaymentPlan(order.plan)
        || order.amountFen !== PLAN_CATALOG[order.plan].amountFen
        || notification.totalAmount !== expectedAmount
        || queried.totalAmount !== expectedAmount
      ) {
        return notificationError('payment_mismatch', order.id)
      }
      if (order.status === 'licensed' && order.licenseKey) return

      const requestedLicenseID = order.licenseID ?? randomUUID()
      let claimed: Awaited<ReturnType<PaymentOrderRepository['claimPaidOrder']>>
      try {
        claimed = await dependencies.orders.claimPaidOrder({
          orderID: order.id,
          alipayTradeNo: notification.tradeNo,
          licenseID: requestedLicenseID,
        })
      } catch {
        return notificationError('persistence_failure', order.id)
      }

      if (!claimed.licenseID || !claimed.licenseExpiresAt || claimed.alipayTradeNo !== notification.tradeNo) {
        return notificationError('persistence_failure', order.id)
      }
      if (claimed.status === 'licensed' && claimed.licenseKey) return

      let licenseKey: string
      try {
        const request = decodeLicenseRequest(order.authorizationRequest)
        if (!isValidMachineCode(request.machineCode)) return notificationError('signing_failure', order.id)
        const expiresAt = Math.floor(new Date(claimed.licenseExpiresAt).getTime() / 1000)
        if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0) return notificationError('signing_failure', order.id)
        licenseKey = signLicense({
          version: 2,
          licenseID: claimed.licenseID,
          machineCode: request.machineCode,
          plan: order.plan,
          issuedAt: stableIssuedAt(order, expiresAt),
          expiresAt,
        })
      } catch (error) {
        if (error instanceof AlipayNotificationError) throw error
        return notificationError('signing_failure', order.id)
      }

      try {
        await dependencies.orders.completeLicense({
          orderID: order.id,
          licenseID: claimed.licenseID,
          licenseKey,
        })
      } catch {
        return notificationError('persistence_failure', order.id)
      }
    },
  }
}

export function alipayNotificationFailure(error: unknown): AlipayNotificationFailure {
  if (error instanceof AlipayNotificationError) return error.failure
  return { category: 'persistence_failure' }
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
