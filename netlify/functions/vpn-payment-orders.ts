import type { Config } from '@netlify/functions'

import { paymentError, paymentJSON, readJSONObject, requireMethod } from '../payment/http'
import { createLivePaymentService, type createPaymentService } from '../payment/paymentService'

type PaymentService = ReturnType<typeof createPaymentService>

const CREATE_FIELDS = new Set(['clientRequestID', 'authorizationRequest', 'plan', 'appVersion'])

export function createOrdersHandler(service: PaymentService) {
  return async (request: Request) => {
    try {
      requireMethod(request, 'POST')
      const body = await readJSONObject(request)
      if (Object.keys(body).some((key) => !CREATE_FIELDS.has(key))) {
        return paymentJSON({ error: 'Unexpected payment order field' }, 400)
      }

      const order = await service.createOrder({
        clientRequestID: body.clientRequestID as string,
        authorizationRequest: body.authorizationRequest as string,
        plan: body.plan as never,
        appVersion: body.appVersion as string,
      })
      return paymentJSON(order, order.statusToken ? 201 : 200)
    } catch (error) {
      return paymentError(error)
    }
  }
}

export default async function handler(request: Request) {
  return createOrdersHandler(createLivePaymentService())(request)
}

export const config: Config = {
  path: '/api/v1/vpn-payment/orders',
}
