import { describe, expect, it } from 'vitest'

import { config as notifyConfig } from '../../functions/vpn-payment-alipay-notify'
import { config as checkoutConfig } from '../../functions/vpn-payment-checkout'
import { config as orderConfig } from '../../functions/vpn-payment-order'
import { config as ordersConfig } from '../../functions/vpn-payment-orders'
import { config as returnConfig } from '../../functions/vpn-payment-return'

describe('Netlify payment routing', () => {
  it('maps every public payment API path before the SPA fallback', () => {
    expect(ordersConfig.path).toBe('/api/v1/vpn-payment/orders')
    expect(orderConfig.path).toBe('/api/v1/vpn-payment/orders/:orderID')
    expect(checkoutConfig.path).toBe('/api/v1/vpn-payment/checkout/:orderID')
    expect(notifyConfig.path).toBe('/api/v1/vpn-payment/alipay-notify')
    expect(returnConfig.path).toBe('/api/v1/vpn-payment/return')
  })
})
