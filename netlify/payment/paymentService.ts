import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

import { AlipayReceiveOnlyGateway, AlipayTradeQueryError } from './alipayGateway'
import { loadPaymentConfig, type PaymentConfig } from './config'
import { PLAN_CATALOG, type PaymentPlan } from './domain'
import { PaymentHTTPError } from './http'
import { decodeLicenseRequest, isValidMachineCode, signLicense as signMOSR2, type SignedLicensePayload } from './licenseCodec'
import { SupabasePaymentOrderRepository, type PaymentOrder, type PaymentOrderRepository } from './orderRepository'
import { redactPaymentLog } from './redaction'

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
  reason?: string
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
  logReconciliationFailure?: (failure: AlipayNotificationFailure) => void
}

type CreateOrderInput = {
  clientRequestID: string
  authorizationRequest: string
  plan: PaymentPlan
  appVersion: string
}

export type CreatedPaymentOrder = {
  orderID: string
  status: PaymentOrder['status']
  expiresAt: string
  planName: string
  priceText: string
  statusToken?: string
  checkoutURL?: string
}

export type PaymentOrderStatus = {
  orderID: string
  status: PaymentOrder['status']
  expiresAt: string
  machineCode: string
  plan: PaymentPlan
  message: string
  licenseKey?: string
  licenseExpiresAt?: number
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

function unusedTrialDays(authorizationRequest: string, current: Date) {
  const request = decodeLicenseRequest(authorizationRequest)
  const currentDay = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate())
  const trialStart = new Date(request.trialStartAt * 1000)
  const trialStartDay = Date.UTC(trialStart.getUTCFullYear(), trialStart.getUTCMonth(), trialStart.getUTCDate())
  const usedDays = Math.floor((currentDay - trialStartDay) / (24 * 60 * 60 * 1000))
  return Math.max(0, 15 - Math.min(15, Math.max(0, usedDays)))
}

function notificationError(category: AlipayNotificationFailureCategory, orderID?: string, reason?: string): never {
  throw new AlipayNotificationError({ category, ...(orderID ? { orderID } : {}), ...(reason ? { reason } : {}) })
}

function safePersistenceReason(stage: 'read' | 'claim' | 'complete', error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code)
    if (/^[A-Za-z0-9._-]{1,64}$/.test(code) && code !== 'undefined') return `${stage}_${code}`
  }
  return `${stage}_unknown`
}

function safeQueryFailureReason(error: unknown) {
  if (error instanceof AlipayTradeQueryError) return error.reason
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code)
    if (/^[A-Za-z0-9._-]{1,64}$/.test(code)) return `sdk_${code}`
  }
  if (error instanceof Error) {
    if (error.message.startsWith('HttpClient Request error')) return 'network_error'
    if (error.message.includes('验签失败') || error.message.includes('响应验签失败')) return 'signature_verification_error'
    if (error.message.includes('支付宝公钥')) return 'public_key_configuration_error'
    const missing = error.message.match(/^Missing verified Alipay field: ([a-z_]+)$/)?.[1]
    if (missing) return `missing_${missing}`
  }
  return undefined
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

function statusMessage(status: PaymentOrder['status']) {
  switch (status) {
    case 'pending': return '等待支付宝沙箱付款。'
    case 'paid': return '付款已确认，正在签发授权。'
    case 'licensed': return '授权已签发。'
    case 'failed': return '付款失败。'
    case 'cancelled': return '订单已取消。'
    case 'expired': return '订单已过期。'
  }
}

function priceText(amountFen: number) {
  return `${(amountFen / 100).toFixed(2).replace(/\.?0+$/, '')} 元`
}

function publicOrder(order: PaymentOrder): PaymentOrderStatus {
  const request = decodeLicenseRequest(order.authorizationRequest)
  const licenseExpiresAt = order.licenseExpiresAt
    ? Math.floor(new Date(order.licenseExpiresAt).getTime() / 1000)
    : null
  return {
    orderID: order.id,
    status: order.status,
    expiresAt: order.expiresAt,
    machineCode: request.machineCode,
    plan: order.plan,
    message: statusMessage(order.status),
    ...(order.status === 'licensed' && order.licenseKey ? { licenseKey: order.licenseKey } : {}),
    ...(licenseExpiresAt !== null && Number.isFinite(licenseExpiresAt) ? { licenseExpiresAt } : {}),
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

  async function settleSuccessfulTrade(order: PaymentOrder, trade: Awaited<ReturnType<PaymentGateway['queryTrade']>>) {
    const expectedAmount = amountFromFen(order.amountFen)
    if (
      trade.appID !== dependencies.config.alipayAppID
      || trade.sellerID !== dependencies.config.alipayMerchantPID
      || trade.orderID !== order.id
      || trade.tradeStatus !== 'TRADE_SUCCESS'
      || !isPaymentPlan(order.plan)
      || order.amountFen !== PLAN_CATALOG[order.plan].amountFen
      || trade.totalAmount !== expectedAmount
    ) {
      return notificationError('payment_mismatch', order.id)
    }
    if (order.status === 'licensed' && order.licenseKey) return order

    const requestedLicenseID = order.licenseID ?? randomUUID()
    let claimed: Awaited<ReturnType<PaymentOrderRepository['claimPaidOrder']>>
    try {
      claimed = await dependencies.orders.claimPaidOrder({
        orderID: order.id,
        alipayTradeNo: trade.tradeNo,
        licenseID: requestedLicenseID,
        trialBonusDays: unusedTrialDays(order.authorizationRequest, now()),
      })
    } catch (error) {
      return notificationError('persistence_failure', order.id, safePersistenceReason('claim', error))
    }

    if (!claimed.licenseID || !claimed.licenseExpiresAt || claimed.alipayTradeNo !== trade.tradeNo) {
      return notificationError('persistence_failure', order.id)
    }
    if (claimed.status === 'licensed' && claimed.licenseKey) return claimed

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
      return await dependencies.orders.completeLicense({
        orderID: order.id,
        licenseID: claimed.licenseID,
        licenseKey,
      })
    } catch (error) {
      return notificationError('persistence_failure', order.id, safePersistenceReason('complete', error))
    }
  }

  return {
    async createOrder(input: CreateOrderInput): Promise<CreatedPaymentOrder> {
      const clientRequestID = requireString(input.clientRequestID, 'clientRequestID')
      const authorizationRequest = requireString(input.authorizationRequest, 'authorizationRequest')
      const plan = requireString(input.plan, 'plan')
      requireString(input.appVersion, 'appVersion')
      if (!isPaymentPlan(plan)) throw new PaymentHTTPError(400, 'Invalid plan')
      let machineCode: string
      try {
        machineCode = decodeLicenseRequest(authorizationRequest).machineCode
      } catch {
        throw new PaymentHTTPError(400, 'Invalid authorization request')
      }
      if (!isValidMachineCode(machineCode)) throw new PaymentHTTPError(400, 'Invalid authorization request')

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

      if (order.id !== generatedID) {
        return {
          ...publicOrder(order),
          planName: PLAN_CATALOG[order.plan].name,
          priceText: priceText(PLAN_CATALOG[order.plan].amountFen),
        }
      }

      const checkoutURL = new URL(`/api/v1/vpn-payment/checkout/${encodeURIComponent(order.id)}`, dependencies.config.publicBaseURL)
      checkoutURL.searchParams.set('token', checkoutToken)
      return {
        ...publicOrder(order),
        planName: PLAN_CATALOG[order.plan].name,
        priceText: priceText(PLAN_CATALOG[order.plan].amountFen),
        statusToken,
        checkoutURL: checkoutURL.toString(),
      }
    },

    async fetchStatus(orderID: string, statusToken: string) {
      let order = await orderFor(orderID)
      if (hashToken(statusToken) !== order.statusTokenHash) {
        throw new PaymentHTTPError(403, 'Invalid payment status token')
      }
      if (order.status === 'pending' || order.status === 'paid') {
        try {
          const queried = await dependencies.gateway.queryTrade(order.id)
          if (queried.tradeStatus === 'TRADE_SUCCESS') {
            order = await settleSuccessfulTrade(order, queried)
          }
        } catch (error) {
          const reason = safeQueryFailureReason(error)
          const failure = error instanceof AlipayNotificationError
            ? error.failure
            : {
                orderID: order.id,
                category: 'query_failure' as const,
                ...(reason ? { reason } : {}),
              }
          dependencies.logReconciliationFailure?.(failure)
          // A delayed or unavailable Alipay query must not invalidate the local order.
        }
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
      } catch (error) {
        return notificationError('persistence_failure', notification.orderID, safePersistenceReason('read', error))
      }
      if (!order) return notificationError('payment_mismatch', notification.orderID)

      await settleSuccessfulTrade(order, queried)
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
    logReconciliationFailure: (failure) => console.error(redactPaymentLog(failure)),
  })
}
