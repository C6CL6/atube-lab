import { handleSnakeRecordsRequest } from '../../../src/cloudflare/snakeRecords'
import type { PagesContext } from '../../../src/cloudflare/types'

export function onRequest(context: PagesContext) {
  return handleSnakeRecordsRequest(context.request, context.env)
}
