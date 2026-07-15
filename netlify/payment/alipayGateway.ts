import { AlipaySdk } from 'alipay-sdk'

import type { PaymentConfig } from './config'

type PagePaymentInput = {
  orderID: string
  subject: string
  amountFen: number
  notifyURL: URL
  returnURL: URL
}

type AlipaySDK = Pick<AlipaySdk, 'pageExecute' | 'exec' | 'checkNotifySignV2'>

export type VerifiedAlipayTrade = {
  tradeNo: string
  orderID: string
  totalAmount: string
  appID: string
  sellerID: string
  tradeStatus: string
}

export type VerifiedAlipayNotification = VerifiedAlipayTrade

function amountFromFen(amountFen: number) {
  if (!Number.isSafeInteger(amountFen) || amountFen <= 0) {
    throw new Error('amountFen must be a positive integer')
  }

  return `${Math.floor(amountFen / 100)}.${String(amountFen % 100).padStart(2, '0')}`
}

function requiredField(fields: Record<string, unknown>, snakeCaseName: string, camelCaseName = snakeCaseName) {
  const value = fields[camelCaseName] ?? fields[snakeCaseName]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing verified Alipay field: ${snakeCaseName}`)
  }
  return value
}

function verifiedTrade(fields: Record<string, unknown>): VerifiedAlipayTrade {
  return {
    tradeNo: requiredField(fields, 'trade_no', 'tradeNo'),
    orderID: requiredField(fields, 'out_trade_no', 'outTradeNo'),
    totalAmount: requiredField(fields, 'total_amount', 'totalAmount'),
    appID: requiredField(fields, 'app_id', 'appId'),
    sellerID: requiredField(fields, 'seller_id', 'sellerId'),
    tradeStatus: requiredField(fields, 'trade_status', 'tradeStatus'),
  }
}

export class AlipayReceiveOnlyGateway {
  private readonly sdk: AlipaySDK

  constructor(config: PaymentConfig, sdk: AlipaySDK = new AlipaySdk({
    appId: config.alipayAppID,
    privateKey: config.alipayPrivateKey,
    alipayPublicKey: config.alipayPublicKey,
    gateway: config.alipayGateway,
    signType: 'RSA2',
    keyType: 'PKCS8',
  })) {
    this.sdk = sdk
  }

  createPagePayment(input: PagePaymentInput): string {
    return this.sdk.pageExecute('alipay.trade.page.pay', {
      notifyUrl: input.notifyURL.href,
      returnUrl: input.returnURL.href,
      bizContent: {
        out_trade_no: input.orderID,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        subject: input.subject,
        total_amount: amountFromFen(input.amountFen),
      },
    })
  }

  async queryTrade(orderID: string): Promise<VerifiedAlipayTrade> {
    const response = await this.sdk.exec('alipay.trade.query', {
      bizContent: { out_trade_no: orderID },
    }, { validateSign: true })

    return verifiedTrade(response as Record<string, unknown>)
  }

  verifyNotification(fields: URLSearchParams): VerifiedAlipayNotification {
    const notification = Object.fromEntries(fields.entries())
    if (!this.sdk.checkNotifySignV2(notification)) {
      throw new Error('Invalid Alipay notification signature')
    }

    return verifiedTrade(notification)
  }
}
