import { describe, expect, it } from 'vitest'

import { loadPaymentConfig } from '../../payment/config'

function validEnv(): Record<string, string> {
  return {
    VPN_PAYMENT_ENV: 'sandbox',
    ALIPAY_SANDBOX_APP_ID: '2026000000000000',
    ALIPAY_SANDBOX_MERCHANT_PID: '2088000000000000',
    ALIPAY_SANDBOX_APP_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nfake-app-private-key\n-----END PRIVATE KEY-----',
    ALIPAY_SANDBOX_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nfake-alipay-public-key\n-----END PUBLIC KEY-----',
    ALIPAY_SANDBOX_GATEWAY: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
    VPN_LICENSE_SIGNING_PRIVATE_KEY: 'c2FuZGJveC1saWNlbnNlLXNpZ25pbmcta2V5',
    SUPABASE_URL: 'https://sandbox-project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature',
    VPN_PAYMENT_PUBLIC_BASE_URL: 'https://sandbox-payment.example.com',
  }
}

describe('payment/config', () => {
  it('只接受完整的沙箱配置并返回服务端专用字段', () => {
    const config = loadPaymentConfig(validEnv())

    expect(config).toMatchObject({
      environment: 'sandbox',
      alipayAppID: '2026000000000000',
      alipayMerchantPID: '2088000000000000',
      alipayPrivateKey: expect.stringContaining('BEGIN PRIVATE KEY'),
      alipayPublicKey: expect.stringContaining('BEGIN PUBLIC KEY'),
      alipayGateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
      licensePrivateKeyRawBase64: 'c2FuZGJveC1saWNlbnNlLXNpZ25pbmcta2V5',
      supabaseServiceRoleKey: validEnv().SUPABASE_SERVICE_ROLE_KEY,
    })
    expect(config.publicBaseURL).toBeInstanceOf(URL)
    expect(config.publicBaseURL.href).toBe('https://sandbox-payment.example.com/')
    expect(config.supabaseURL).toBeInstanceOf(URL)
    expect(config.supabaseURL.href).toBe('https://sandbox-project.supabase.co/')
  })

  it('缺少任何必填变量时 fail closed', () => {
    const env = validEnv()
    delete env.ALIPAY_SANDBOX_APP_ID

    expect(() => loadPaymentConfig(env)).toThrowError(/ALIPAY_SANDBOX_APP_ID/)
  })

  it.each([
    'ALIPAY_SANDBOX_GATEWAY',
    'VPN_LICENSE_SIGNING_PRIVATE_KEY',
    'ALIPAY_SANDBOX_PUBLIC_KEY',
    'ALIPAY_SANDBOX_APP_PRIVATE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ])('缺少敏感变量 %s 时 fail closed', (key) => {
    const env = validEnv()
    delete env[key]

    expect(() => loadPaymentConfig(env)).toThrowError(new RegExp(key))
  })

  it('空白字符串不会被接受', () => {
    expect(() => loadPaymentConfig({
      ...validEnv(),
      SUPABASE_SERVICE_ROLE_KEY: '   ',
    })).toThrowError(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('拒绝非 sandbox 环境值', () => {
    expect(() => loadPaymentConfig({
      ...validEnv(),
      VPN_PAYMENT_ENV: 'production',
    })).toThrowError(/VPN_PAYMENT_ENV/)
  })

  it('当环境是 sandbox 时拒绝生产网关', () => {
    expect(() => loadPaymentConfig({
      ...validEnv(),
      ALIPAY_SANDBOX_GATEWAY: 'https://openapi.alipay.com/gateway.do',
    })).toThrowError(/ALIPAY_SANDBOX_GATEWAY/)
  })

  it('拒绝非 HTTPS 的公开地址和 Supabase 地址', () => {
    expect(() => loadPaymentConfig({
      ...validEnv(),
      VPN_PAYMENT_PUBLIC_BASE_URL: 'http://sandbox-payment.example.com',
    })).toThrowError(/VPN_PAYMENT_PUBLIC_BASE_URL/)

    expect(() => loadPaymentConfig({
      ...validEnv(),
      SUPABASE_URL: 'http://sandbox-project.supabase.co',
    })).toThrowError(/SUPABASE_URL/)
  })
})
