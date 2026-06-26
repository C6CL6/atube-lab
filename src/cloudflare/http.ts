export function corsHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() })
}

export function empty(status = 204) {
  return new Response(null, { status, headers: corsHeaders() })
}

export function errorResponse(message: string, status = 400, extras: Record<string, unknown> = {}) {
  return json({ error: message, ...extras }, status)
}
