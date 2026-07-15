import { PaymentHTTPError, pathParameter, paymentError, paymentJSON, requireMethod } from '../payment/http'
import { createLivePaymentService, type createPaymentService } from '../payment/paymentService'

type PaymentService = ReturnType<typeof createPaymentService>

function statusToken(request: Request) {
  const authorization = request.headers.get('Authorization')
  const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]+)$/)
  if (!match) throw new PaymentHTTPError(401, 'Missing payment status bearer token')
  return match[1]
}

export function createOrderStatusHandler(service: PaymentService) {
  return async (request: Request) => {
    try {
      requireMethod(request, 'GET')
      const orderID = pathParameter(request, '/api/v1/vpn-payment/orders/')
      return paymentJSON(await service.fetchStatus(orderID, statusToken(request)))
    } catch (error) {
      return paymentError(error)
    }
  }
}

export default async function handler(request: Request) {
  return createOrderStatusHandler(createLivePaymentService())(request)
}
