const REDACTED = '[REDACTED]'
const PRIVATE_KEY_PATTERN = /-----BEGIN(?: RSA)? PRIVATE KEY-----[\s\S]+?-----END(?: RSA)? PRIVATE KEY-----/g
const MOSR2_PATTERN = /MOSR2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isServiceRoleJWT(token: string) {
  const [, payload] = token.split('.')
  if (!payload) return false

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    return decoded.includes('"service_role"')
  } catch {
    return false
  }
}

function redactString(value: string) {
  let next = value.replace(PRIVATE_KEY_PATTERN, REDACTED)
  next = next.replace(MOSR2_PATTERN, REDACTED)
  next = next.replace(JWT_PATTERN, (token) => (isServiceRoleJWT(token) ? REDACTED : token))
  return next
}

export function redactPaymentLog<T>(value: T): T {
  if (typeof value === 'string') {
    return redactString(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactPaymentLog(entry)) as T
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactPaymentLog(entry)]),
    ) as T
  }

  return value
}
