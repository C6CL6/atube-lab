import type { Config } from '@netlify/functions'

import { pathParameter, paymentError, paymentHTML, requireMethod } from '../payment/http'
import { createLivePaymentService, type createPaymentService } from '../payment/paymentService'

type PaymentService = ReturnType<typeof createPaymentService>

export function createCheckoutHandler(service: PaymentService) {
  return async (request: Request) => {
    try {
      requireMethod(request, 'GET')
      const orderID = pathParameter(request, '/api/v1/vpn-payment/checkout/')
      const checkoutToken = new URL(request.url).searchParams.get('token') ?? ''
      return paymentHTML(await service.checkout(orderID, checkoutToken))
    } catch (error) {
      return paymentError(error)
    }
  }
}

export default async function handler(request: Request) {
  return createCheckoutHandler(createLivePaymentService())(request)
}

export const config: Config = {
  path: '/api/v1/vpn-payment/checkout/:orderID',
}
