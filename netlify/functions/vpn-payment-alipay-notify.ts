import { alipayNotificationFailure, createLivePaymentService, type createPaymentService } from '../payment/paymentService'
import type { Config } from '@netlify/functions'

import { redactPaymentLog } from '../payment/redaction'

type PaymentService = ReturnType<typeof createPaymentService>
type PaymentLogger = (entry: Record<string, string>) => void

function plainText(body: 'success' | 'failure', status: number) {
  return new Response(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

function defaultLogger(entry: Record<string, string>) {
  console.error(entry)
}

export function createAlipayNotifyHandler(service: PaymentService, logger: PaymentLogger = defaultLogger) {
  return async (request: Request) => {
    if (request.method !== 'POST' || !request.headers.get('Content-Type')?.toLowerCase().startsWith('application/x-www-form-urlencoded')) {
      logger(redactPaymentLog({ category: 'validation_failure' }))
      return plainText('failure', 400)
    }

    try {
      const fields = new URLSearchParams(await request.text())
      await service.processAlipayNotification(fields)
      return plainText('success', 200)
    } catch (error) {
      const failure = alipayNotificationFailure(error)
      logger(redactPaymentLog({
        ...(failure.orderID ? { orderID: failure.orderID } : {}),
        category: failure.category,
        ...(failure.reason ? { reason: failure.reason } : {}),
      }))
      return plainText('failure', 500)
    }
  }
}

export default async function handler(request: Request) {
  return createAlipayNotifyHandler(createLivePaymentService())(request)
}

export const config: Config = {
  path: '/api/v1/vpn-payment/alipay-notify',
}
