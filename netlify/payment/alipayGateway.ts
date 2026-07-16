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

export class AlipayTradeQueryError extends Error {
  constructor(readonly reason: string) {
    super(reason)
    this.name = 'AlipayTradeQueryError'
  }
}

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

function diagnosticPart(value: unknown, fallback: string) {
  return typeof value === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(value) ? value : fallback
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

function queriedTrade(fields: Record<string, unknown>, appID: string, merchantPID: string): VerifiedAlipayTrade {
  return {
    tradeNo: requiredField(fields, 'trade_no', 'tradeNo'),
    orderID: requiredField(fields, 'out_trade_no', 'outTradeNo'),
    totalAmount: requiredField(fields, 'total_amount', 'totalAmount'),
    appID,
    sellerID: merchantPID,
    tradeStatus: requiredField(fields, 'trade_status', 'tradeStatus'),
  }
}

export class AlipayReceiveOnlyGateway {
  private readonly sdk: AlipaySDK
  private readonly appID: string
  private readonly merchantPID: string

  constructor(config: PaymentConfig, sdk: AlipaySDK = new AlipaySdk({
    appId: config.alipayAppID,
    privateKey: config.alipayPrivateKey,
    alipayPublicKey: config.alipayPublicKey,
    gateway: config.alipayGateway,
    signType: 'RSA2',
    keyType: 'PKCS8',
  })) {
    this.sdk = sdk
    this.appID = config.alipayAppID
    this.merchantPID = config.alipayMerchantPID
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
    }, { validateSign: true, requestTimeout: 3_000 })

    const fields = response as Record<string, unknown>
    if (fields.code !== '10000') {
      const code = diagnosticPart(fields.code, 'unknown_code')
      const subCode = diagnosticPart(fields.subCode ?? fields.sub_code, 'unknown_subcode')
      throw new AlipayTradeQueryError(`alipay_${code}_${subCode}`)
    }

    try {
      return queriedTrade(fields, this.appID, this.merchantPID)
    } catch (error) {
      const missing = error instanceof Error
        ? error.message.match(/^Missing verified Alipay field: ([a-z_]+)$/)?.[1]
        : undefined
      throw new AlipayTradeQueryError(missing ? `missing_${missing}` : 'invalid_success_response')
    }
  }

  verifyNotification(fields: URLSearchParams): VerifiedAlipayNotification {
    const notification = Object.fromEntries(fields.entries())
    if (!this.sdk.checkNotifySignV2(notification)) {
      throw new Error('Invalid Alipay notification signature')
    }

    return verifiedTrade(notification)
  }
}
