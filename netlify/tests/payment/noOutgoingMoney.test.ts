import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const forbiddenPatterns = [
  /alipay\.trade\.refund/i,
  /alipay\.fund/i,
  /alipay\.trade\.royalty/i,
  /alipay\.user\.agreement/i,
  /transfer/i,
  /payout/i,
  /withdraw/i,
]

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

describe('payment source boundary', () => {
  it('不包含任何对外付款能力', () => {
    const files = [
      ...sourceFiles('netlify/payment'),
      ...sourceFiles('netlify/functions'),
    ]

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const pattern of forbiddenPatterns) {
        expect(source, `${file} must not match ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})
