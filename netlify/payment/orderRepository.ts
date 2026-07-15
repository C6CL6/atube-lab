import { createHash } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

import type { PaymentConfig } from './config'
import type { PaymentPlan } from './domain'

export type PaymentOrderInput = {
  id: string
  clientRequestID: string
  statusToken: string
  checkoutToken: string
  machineCode: string
  authorizationRequest: string
  plan: PaymentPlan
  amountFen: number
  expiresAt: string
}

export type PaymentOrder = {
  id: string
  clientRequestID: string
  statusTokenHash: string
  checkoutTokenHash: string
  machineCodeHash: string
  authorizationRequest: string
  plan: PaymentPlan
  amountFen: number
  status: 'pending' | 'paid' | 'licensed' | 'failed' | 'cancelled' | 'expired'
  alipayTradeNo: string | null
  licenseID: string | null
  licenseKey: string | null
  licenseExpiresAt: string | null
  expiresAt: string
}

export type ClaimedPaidOrder = PaymentOrder & { trialBonusApplied: boolean }

export interface PaymentOrderStore {
  findOrderByClientRequestID(clientRequestID: string): Promise<Record<string, unknown> | null>
  insertOrder(order: Record<string, unknown>): Promise<Record<string, unknown>>
  claimPaidOrder(input: { orderID: string, alipayTradeNo: string, licenseID: string }): Promise<Record<string, unknown>>
  completeLicense(input: { orderID: string, licenseID: string, licenseKey: string }): Promise<Record<string, unknown>>
}

export interface PaymentOrderRepository {
  createOrder(input: PaymentOrderInput | Record<string, unknown>): Promise<PaymentOrder>
  claimPaidOrder(input: { orderID: string, alipayTradeNo: string, licenseID: string }): Promise<ClaimedPaidOrder>
  completeLicense(input: { orderID: string, licenseID: string, licenseKey: string }): Promise<PaymentOrder>
}

export function hashPaymentToken(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export const hashMachineCode = hashPaymentToken

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

function asString(value: unknown) {
  return value == null ? null : String(value)
}

function toPaymentOrder(row: Record<string, unknown>): PaymentOrder {
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

export class SupabasePaymentOrderRepository implements PaymentOrderRepository {
  constructor(private readonly store: PaymentOrderStore) {}

  static fromPaymentConfig(config: PaymentConfig) {
    const client = createClient(config.supabaseURL.toString(), config.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    return new SupabasePaymentOrderRepository(new SupabaseStore(client))
  }

  async createOrder(input: PaymentOrderInput | Record<string, unknown>) {
    const supplied = input as Record<string, unknown>
    const clientRequestID = String(supplied.clientRequestID ?? supplied.client_request_id)
    const existing = await this.store.findOrderByClientRequestID(clientRequestID)
    if (existing) return toPaymentOrder(existing)

    const order = 'statusToken' in supplied
      ? {
          id: supplied.id,
          client_request_id: clientRequestID,
          status_token_hash: hashPaymentToken(String(supplied.statusToken)),
          checkout_token_hash: hashPaymentToken(String(supplied.checkoutToken)),
          machine_code_hash: hashMachineCode(String(supplied.machineCode)),
          authorization_request: supplied.authorizationRequest,
          plan: supplied.plan,
          amount_fen: supplied.amountFen,
          status: 'pending',
          expires_at: supplied.expiresAt,
        }
      : supplied

    try {
      return toPaymentOrder(await this.store.insertOrder(order))
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      const original = await this.store.findOrderByClientRequestID(clientRequestID)
      if (original) return toPaymentOrder(original)
      throw new Error('Payment order conflict')
    }
  }

  async claimPaidOrder(input: { orderID: string, alipayTradeNo: string, licenseID: string }) {
    try {
      const row = await this.store.claimPaidOrder(input)
      return { ...toPaymentOrder(row), trialBonusApplied: Boolean(row.trial_bonus_applied) }
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error('Alipay trade conflict')
      throw error
    }
  }

  async completeLicense(input: { orderID: string, licenseID: string, licenseKey: string }) {
    return toPaymentOrder(await this.store.completeLicense(input))
  }
}

type SupabaseResult = { data: Record<string, unknown> | null, error: { code?: string, message: string } | null }

class SupabaseStore implements PaymentOrderStore {
  constructor(private readonly client: ReturnType<typeof createClient>) {}

  async findOrderByClientRequestID(clientRequestID: string) {
    const result = await this.client.from('vpn_payment_orders').select('*').eq('client_request_id', clientRequestID).maybeSingle() as SupabaseResult
    if (result.error) throw result.error
    return result.data
  }

  async insertOrder(order: Record<string, unknown>) {
    const result = await this.client.from('vpn_payment_orders').insert(order).select('*').single() as SupabaseResult
    if (result.error) throw result.error
    if (!result.data) throw new Error('Payment order insert returned no row')
    return result.data
  }

  async claimPaidOrder(input: { orderID: string, alipayTradeNo: string, licenseID: string }) {
    const result = await this.client.rpc('claim_vpn_payment_order', {
      p_order_id: input.orderID,
      p_alipay_trade_no: input.alipayTradeNo,
      p_license_id: input.licenseID,
    }).single() as SupabaseResult
    if (result.error) throw result.error
    if (!result.data) throw new Error('Payment order claim returned no row')
    return result.data
  }

  async completeLicense(input: { orderID: string, licenseID: string, licenseKey: string }) {
    const result = await this.client.rpc('complete_vpn_payment_license', {
      p_order_id: input.orderID,
      p_license_id: input.licenseID,
      p_license_key: input.licenseKey,
    }).single() as SupabaseResult
    if (result.error) throw result.error
    if (!result.data) throw new Error('Payment license completion returned no row')
    return result.data
  }
}
