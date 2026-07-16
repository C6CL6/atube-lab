import { describe, expect, it } from 'vitest'

import { AlipayReceiveOnlyGateway, AlipayTradeQueryError } from '../../payment/alipayGateway'
import type { PaymentConfig } from '../../payment/config'

type Call = {
  method: string
  bizContent: Record<string, unknown>
}

class FakeAlipaySDK {
  readonly calls: Call[] = []

  pageExecute(method: string, bizContent: { bizContent: Record<string, unknown> }) {
    this.calls.push({ method, bizContent: bizContent.bizContent })
    return '<form id="alipay"></form>'
  }

  async exec(method: string, params: { bizContent: Record<string, unknown> }, options: { validateSign: boolean, requestTimeout: number }) {
    this.calls.push({ method, bizContent: params.bizContent })
    expect(options).toEqual({ validateSign: true, requestTimeout: 3_000 })
    return {
      code: '10000',
      tradeNo: '2026071622001499999999999999',
      outTradeNo: params.bizContent.out_trade_no,
      totalAmount: '19.80',
      tradeStatus: 'TRADE_SUCCESS',
    }
  }

  checkNotifySignV2() {
    return true
  }
}

function config(): PaymentConfig {
  return {
    environment: 'sandbox',
    publicBaseURL: new URL('https://sandbox-payment.example.com'),
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

describe('payment/alipayGateway', () => {
  it('只创建 FAST_INSTANT_TRADE_PAY 收款页并以精确两位小数传递金额', async () => {
    const sdk = new FakeAlipaySDK()
    const gateway = new AlipayReceiveOnlyGateway(config(), sdk)

    const checkout = gateway.createPagePayment({
      orderID: 'order-123',
      subject: 'Mac mini VPN Gateway 90 days',
      amountFen: 1980,
      notifyURL: new URL('https://sandbox-payment.example.com/notify'),
      returnURL: new URL('https://sandbox-payment.example.com/return'),
    })
    const trade = await gateway.queryTrade('order-123')

    expect(checkout).toBe('<form id="alipay"></form>')
    expect(sdk.calls[0]).toMatchObject({
      method: 'alipay.trade.page.pay',
      bizContent: {
        product_code: 'FAST_INSTANT_TRADE_PAY',
        total_amount: '19.80',
        out_trade_no: 'order-123',
      },
    })
    expect(sdk.calls[1]).toMatchObject({
      method: 'alipay.trade.query',
      bizContent: { out_trade_no: 'order-123' },
    })
    expect(trade).toMatchObject({
      tradeNo: '2026071622001499999999999999',
      orderID: 'order-123',
      totalAmount: '19.80',
      appID: '2026000000000000',
      sellerID: '2088000000000000',
      tradeStatus: 'TRADE_SUCCESS',
    })
  })

  it.each([0, -1, 19.8, Number.NaN, Number.POSITIVE_INFINITY])('拒绝无效金额 %s', (amountFen) => {
    const gateway = new AlipayReceiveOnlyGateway(config(), new FakeAlipaySDK())

    expect(() => gateway.createPagePayment({
      orderID: 'order-123',
      subject: 'Mac mini VPN Gateway',
      amountFen,
      notifyURL: new URL('https://sandbox-payment.example.com/notify'),
      returnURL: new URL('https://sandbox-payment.example.com/return'),
    })).toThrowError(/amountFen/)
  })

  it('验签失败的通知会被拒绝', () => {
    const sdk = new FakeAlipaySDK()
    sdk.checkNotifySignV2 = () => false
    const gateway = new AlipayReceiveOnlyGateway(config(), sdk)

    expect(() => gateway.verifyNotification(new URLSearchParams({ sign: 'invalid' }))).toThrowError(/signature/i)
  })

  it('查单业务失败时只暴露安全错误码，不暴露支付宝响应正文', async () => {
    const sdk = new FakeAlipaySDK()
    sdk.exec = async () => ({
      code: '40004',
      msg: 'Business Failed',
      subCode: 'ACQ.TRADE_NOT_EXIST',
      subMsg: 'sensitive response detail',
    }) as never
    const gateway = new AlipayReceiveOnlyGateway(config(), sdk)

    await expect(gateway.queryTrade('order-123')).rejects.toEqual(
      new AlipayTradeQueryError('alipay_40004_ACQ.TRADE_NOT_EXIST'),
    )
  })

  it.each(['trade_no', 'out_trade_no', 'total_amount', 'app_id', 'seller_id'])('验签通过后仍拒绝缺少 %s 的通知', (missingField) => {
    const fields = new URLSearchParams({
      sign: 'valid',
      trade_no: '2026071622001499999999999999',
      out_trade_no: 'order-123',
      total_amount: '19.80',
      app_id: '2026000000000000',
      seller_id: '2088000000000000',
      trade_status: 'TRADE_SUCCESS',
    })
    fields.delete(missingField)
    const gateway = new AlipayReceiveOnlyGateway(config(), new FakeAlipaySDK())

    expect(() => gateway.verifyNotification(fields)).toThrowError(new RegExp(missingField))
  })
})
