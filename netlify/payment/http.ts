const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
} as const

export class PaymentHTTPError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export function paymentJSON(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  })
}

export function paymentHTML(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

export function paymentError(error: unknown) {
  if (error instanceof PaymentHTTPError) {
    return paymentJSON({ error: error.message }, error.status)
  }

  return paymentJSON({ error: 'Payment service unavailable' }, 500)
}

export async function readJSONObject(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new PaymentHTTPError(400, 'Request body must be valid JSON')
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new PaymentHTTPError(400, 'Request body must be a JSON object')
  }

  return body as Record<string, unknown>
}

export function requireMethod(request: Request, method: string) {
  if (request.method !== method) throw new PaymentHTTPError(405, 'Method not allowed')
}

export function pathParameter(request: Request, prefix: string) {
  const pathname = new URL(request.url).pathname
  if (!pathname.startsWith(prefix)) throw new PaymentHTTPError(404, 'Payment order not found')

  const value = pathname.slice(prefix.length)
  if (!value || value.includes('/')) throw new PaymentHTTPError(404, 'Payment order not found')

  try {
    return decodeURIComponent(value)
  } catch {
    throw new PaymentHTTPError(400, 'Invalid payment order ID')
  }
}
