import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  SupabasePaymentOrderRepository,
  hashMachineCode,
  hashPaymentToken,
  type PaymentOrderInput,
  type PaymentOrderStore,
} from '../../payment/orderRepository'

type Order = Record<string, unknown>

class MemoryStore implements PaymentOrderStore {
  readonly orders: Order[] = []
  readonly trialLedger = new Map<string, { trialBonusConsumed: boolean }>()

  async findOrderByClientRequestID(clientRequestID: string) {
    return this.orders.find((order) => order.client_request_id === clientRequestID) ?? null
  }

  async insertOrder(order: Order) {
    if (this.orders.some((existing) => existing.client_request_id === order.client_request_id)) {
      const error = Object.assign(new Error('duplicate client request'), { code: '23505' })
      throw error
    }
    this.orders.push({ ...order })
    return order
  }

  async claimPaidOrder(input: { orderID: string, alipayTradeNo: string, licenseID: string, trialBonusDays: number }) {
    const order = this.orders.find((candidate) => candidate.id === input.orderID)
    if (!order) throw new Error('order not found')
    const claimedByAnother = this.orders.find((candidate) => candidate.alipay_trade_no === input.alipayTradeNo && candidate.id !== input.orderID)
    if (claimedByAnother) throw Object.assign(new Error('trade already claimed'), { code: '23505' })

    if (order.alipay_trade_no && order.alipay_trade_no !== input.alipayTradeNo) {
      throw Object.assign(new Error('trade conflict'), { code: '23505' })
    }

    const machineHash = String(order.machine_code_hash)
    const ledger = this.trialLedger.get(machineHash) ?? { trialBonusConsumed: false }
    const trialBonusApplied = !ledger.trialBonusConsumed && input.trialBonusDays > 0
    ledger.trialBonusConsumed = true
    this.trialLedger.set(machineHash, ledger)

    order.alipay_trade_no = input.alipayTradeNo
    order.status = order.status === 'licensed' ? 'licensed' : 'paid'
    order.license_id ??= input.licenseID
    order.license_expires_at ??= '2026-08-01T23:59:59.000Z'
    return { ...order, trial_bonus_applied: trialBonusApplied }
  }

  async completeLicense(input: { orderID: string, licenseID: string, licenseKey: string }) {
    const order = this.orders.find((candidate) => candidate.id === input.orderID)
    if (!order || order.license_id !== input.licenseID) throw new Error('license conflict')
    order.status = 'licensed'
    order.license_key = input.licenseKey
    return order
  }
}

function createOrder(overrides: Partial<PaymentOrderInput> = {}): PaymentOrderInput {
  return {
    id: '8e06565f-d920-4f2a-bde2-894c7cbbd4d5',
    clientRequestID: '96b2aa7a-33a9-4ed0-8c7c-79cba94eb6ca',
    statusToken: 'status-token',
    checkoutToken: 'checkout-token',
    machineCode: 'MOSR-MAC-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF',
    authorizationRequest: 'MOSRREQ1.data',
    plan: 'month',
    amountFen: 980,
    expiresAt: '2026-07-16T01:00:00.000Z',
    ...overrides,
  }
}

describe('payment/orderRepository', () => {
  it('hashes status, checkout, and machine values using SHA-256', () => {
    expect(hashPaymentToken('checkout-token')).toBe('f73b9044d0a39db82876ca2560ec62234efc73e2560689b5b5a3fc92f70904e3')
    expect(hashMachineCode('MOSR-MAC-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF')).toHaveLength(64)
    expect(hashMachineCode('machine-a')).not.toBe(hashMachineCode('machine-b'))
  })

  it('returns the original order for a repeated clientRequestID', async () => {
    const store = new MemoryStore()
    const repository = new SupabasePaymentOrderRepository(store)
    const first = await repository.createOrder(createOrder())
    const repeated = await repository.createOrder(createOrder({ id: 'db4bfae1-0d6f-48e4-9b87-7a2e7c56178f' }))

    expect(repeated.id).toBe(first.id)
    expect(store.orders).toHaveLength(1)
  })

  it('rejects an Alipay trade number claimed by another order', async () => {
    const store = new MemoryStore()
    const repository = new SupabasePaymentOrderRepository(store)
    await repository.createOrder(createOrder())
    await repository.createOrder(createOrder({
      id: 'db4bfae1-0d6f-48e4-9b87-7a2e7c56178f',
      clientRequestID: '41349a34-318c-4ce7-9231-1132038cf574',
    }))
    await repository.claimPaidOrder({
      orderID: '8e06565f-d920-4f2a-bde2-894c7cbbd4d5',
      alipayTradeNo: '2026071622001499999999999999',
      licenseID: 'c3d4fb70-2429-45e9-a3c1-bcf883bab544',
      trialBonusDays: 15,
    })

    await expect(repository.claimPaidOrder({
      orderID: 'db4bfae1-0d6f-48e4-9b87-7a2e7c56178f',
      alipayTradeNo: '2026071622001499999999999999',
      licenseID: 'e7569d11-8a21-4321-9b47-2df2eeed2af0',
      trialBonusDays: 15,
    })).rejects.toThrow(/Alipay trade conflict/)
  })

  it('consumes a machine trial bonus only once', async () => {
    const store = new MemoryStore()
    const repository = new SupabasePaymentOrderRepository(store)
    await repository.createOrder(createOrder())
    await repository.createOrder(createOrder({
      id: 'db4bfae1-0d6f-48e4-9b87-7a2e7c56178f',
      clientRequestID: '41349a34-318c-4ce7-9231-1132038cf574',
    }))

    const first = await repository.claimPaidOrder({ orderID: '8e06565f-d920-4f2a-bde2-894c7cbbd4d5', alipayTradeNo: 'trade-1', licenseID: 'c3d4fb70-2429-45e9-a3c1-bcf883bab544', trialBonusDays: 15 })
    const second = await repository.claimPaidOrder({ orderID: 'db4bfae1-0d6f-48e4-9b87-7a2e7c56178f', alipayTradeNo: 'trade-2', licenseID: 'e7569d11-8a21-4321-9b47-2df2eeed2af0', trialBonusDays: 15 })

    expect(first.trialBonusApplied).toBe(true)
    expect(second.trialBonusApplied).toBe(false)
  })

  it('reclaims a paid order that has not yet been licensed and completes it once', async () => {
    const store = new MemoryStore()
    const repository = new SupabasePaymentOrderRepository(store)
    await repository.createOrder(createOrder())
    Object.assign(store.orders[0], { status: 'paid', alipay_trade_no: 'trade-1', license_id: 'c3d4fb70-2429-45e9-a3c1-bcf883bab544' })

    const claimed = await repository.claimPaidOrder({ orderID: '8e06565f-d920-4f2a-bde2-894c7cbbd4d5', alipayTradeNo: 'trade-1', licenseID: 'c3d4fb70-2429-45e9-a3c1-bcf883bab544', trialBonusDays: 15 })
    const completed = await repository.completeLicense({ orderID: claimed.id, licenseID: claimed.licenseID, licenseKey: 'MOSR2.payload.signature' })

    expect(claimed.status).toBe('paid')
    expect(completed.status).toBe('licensed')
    expect(completed.licenseKey).toBe('MOSR2.payload.signature')
  })

  it('does not accept raw database rows that can bypass hashing', async () => {
    const repository = new SupabasePaymentOrderRepository(new MemoryStore())

    await expect(repository.createOrder({
      id: 'raw-order',
      client_request_id: 'raw-request',
      status_token_hash: 'plaintext-token',
      checkout_token_hash: 'plaintext-token',
      machine_code_hash: 'plaintext-machine',
      status: 'licensed',
    } as never)).rejects.toThrow()
  })

  it('locks RPC execution to service_role and rejects terminal orders', () => {
    const migration = readFileSync('supabase/migrations/202607150001_vpn_payment.sql', 'utf8')

    expect(migration).toMatch(/grant execute on function public\.claim_vpn_payment_order\([^)]+\) to service_role;/i)
    expect(migration).toMatch(/grant execute on function public\.complete_vpn_payment_license\([^)]+\) to service_role;/i)
    expect(migration).toMatch(/v_order\.status not in \('pending', 'paid', 'licensed'\)/)
  })
})
