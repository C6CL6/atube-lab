import { handleGuandanRoomsRequest } from '../../../../src/cloudflare/guandanRooms'
import type { PagesContext } from '../../../../src/cloudflare/types'

export function onRequest(context: PagesContext) {
  return handleGuandanRoomsRequest(context.request, context.env)
}
