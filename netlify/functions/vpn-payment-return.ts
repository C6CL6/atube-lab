import type { Config } from '@netlify/functions'

import { paymentHTML } from '../payment/http'

export default function handler() {
  return paymentHTML('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>支付结果</title><p>支付结果将由应用安全查询。</p></html>')
}

export const config: Config = {
  path: '/api/v1/vpn-payment/return',
}
