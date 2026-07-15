const SANDBOX_GATEWAY = 'https://openapi-sandbox.dl.alipaydev.com/gateway.do' as const

export type PaymentConfig = {
  environment: 'sandbox'
  publicBaseURL: URL
  alipayAppID: string
  alipayMerchantPID: string
  alipayPrivateKey: string
  alipayPublicKey: string
  alipayGateway: typeof SANDBOX_GATEWAY
  licensePrivateKeyRawBase64: string
  supabaseURL: URL
  supabaseServiceRoleKey: string
}

type PaymentEnv = Record<string, string | undefined>

function requireNonBlank(env: PaymentEnv, key: string) {
  const value = env[key]?.trim()
  if (!value) {
    throw new Error(`Missing required payment env: ${key}`)
  }
  return value
}

function requireHTTPSURL(rawValue: string, key: string) {
  const value = new URL(rawValue)
  if (value.protocol !== 'https:') {
    throw new Error(`Payment env must use HTTPS: ${key}`)
  }
  return value
}

export function loadPaymentConfig(env: PaymentEnv): PaymentConfig {
  const environment = requireNonBlank(env, 'VPN_PAYMENT_ENV')
  if (environment !== 'sandbox') {
    throw new Error('VPN_PAYMENT_ENV must be sandbox')
  }

  const alipayGateway = requireNonBlank(env, 'ALIPAY_SANDBOX_GATEWAY')
  if (alipayGateway !== SANDBOX_GATEWAY) {
    throw new Error('ALIPAY_SANDBOX_GATEWAY must point to the sandbox gateway')
  }

  return {
    environment: 'sandbox',
    publicBaseURL: requireHTTPSURL(requireNonBlank(env, 'VPN_PAYMENT_PUBLIC_BASE_URL'), 'VPN_PAYMENT_PUBLIC_BASE_URL'),
    alipayAppID: requireNonBlank(env, 'ALIPAY_SANDBOX_APP_ID'),
    alipayMerchantPID: requireNonBlank(env, 'ALIPAY_SANDBOX_MERCHANT_PID'),
    alipayPrivateKey: requireNonBlank(env, 'ALIPAY_SANDBOX_APP_PRIVATE_KEY'),
    alipayPublicKey: requireNonBlank(env, 'ALIPAY_SANDBOX_PUBLIC_KEY'),
    alipayGateway: SANDBOX_GATEWAY,
    licensePrivateKeyRawBase64: requireNonBlank(env, 'VPN_LICENSE_SIGNING_PRIVATE_KEY'),
    supabaseURL: requireHTTPSURL(requireNonBlank(env, 'SUPABASE_URL'), 'SUPABASE_URL'),
    supabaseServiceRoleKey: requireNonBlank(env, 'SUPABASE_SERVICE_ROLE_KEY'),
  }
}
