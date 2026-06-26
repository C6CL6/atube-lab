import { handleSudokuRecordsRequest } from '../../../src/cloudflare/sudokuRecords'
import type { PagesContext } from '../../../src/cloudflare/types'

export function onRequest(context: PagesContext) {
  return handleSudokuRecordsRequest(context.request, context.env)
}
