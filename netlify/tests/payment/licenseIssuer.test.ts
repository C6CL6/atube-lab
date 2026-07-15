import fixture from './fixtures/license-interop.json'
import { describe, expect, it } from 'vitest'

import { encodeLicenseRequest, signLicense } from '../../payment/licenseCodec'
import { issueCloudLicense } from '../../payment/licenseIssuer'

const machineCode = 'MOSR-MAC-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF'

function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function requestCode(trialStartAt: number, currentLicense: string | null = null) {
  return encodeLicenseRequest({
    version: 1,
    machineCode,
    requestedAt: Math.floor(utcDate('2026-07-14').getTime() / 1000),
    trialStartAt,
    trialDaysUsed: 0,
    trialDaysRemaining: 15,
    currentLicense,
  })
}

describe('payment/licenseIssuer', () => {
  it('adds only unused trial days based on UTC natural days and expires at UTC 23:59:59', () => {
    const result = issueCloudLicense({
      plan: 'month',
      requestCode: requestCode(Math.floor(utcDate('2026-07-09').getTime() / 1000)),
      now: utcDate('2026-07-14'),
      licenseID: 'cloud-trial',
      privateKeyRawBase64: fixture.testOnlyPrivateKeyRawBase64,
    })

    expect(result.trialBonusDays).toBe(10)
    expect(result.totalDays).toBe(40)
    expect(result.payload.expiresAt).toBe(Math.floor(new Date('2026-08-23T23:59:59.000Z').getTime() / 1000))
  })

  it('renews an active license from its current expiry without a second trial bonus', () => {
    const currentLicense = signLicense({
      version: 2,
      licenseID: 'current-license',
      machineCode,
      plan: 'quarter',
      issuedAt: Math.floor(utcDate('2026-07-01').getTime() / 1000),
      expiresAt: Math.floor(new Date('2026-08-01T23:59:59.000Z').getTime() / 1000),
    }, fixture.testOnlyPrivateKeyRawBase64)
    const result = issueCloudLicense({
      plan: 'month',
      requestCode: requestCode(Math.floor(utcDate('2026-07-09').getTime() / 1000), currentLicense),
      now: utcDate('2026-07-14'),
      licenseID: 'cloud-renewal',
      privateKeyRawBase64: fixture.testOnlyPrivateKeyRawBase64,
    })

    expect(result.trialBonusDays).toBe(0)
    expect(result.totalDays).toBe(30)
    expect(result.payload.expiresAt).toBe(Math.floor(new Date('2026-08-31T23:59:59.000Z').getTime() / 1000))
  })

  it('does not grant trial days after fifteen UTC days even when request counters claim otherwise', () => {
    const result = issueCloudLicense({
      plan: 'ten',
      requestCode: requestCode(Math.floor(utcDate('2026-06-29').getTime() / 1000)),
      now: utcDate('2026-07-14'),
      licenseID: 'cloud-no-trial',
      privateKeyRawBase64: fixture.testOnlyPrivateKeyRawBase64,
    })

    expect(result.trialBonusDays).toBe(0)
    expect(result.totalDays).toBe(10)
  })
})
