import fixture from './fixtures/license-interop.json'
import { describe, expect, it } from 'vitest'

import {
  decodeLicenseRequest,
  isValidMachineCode,
  signLicense,
  verifyLicense,
  type SignedLicensePayload,
} from '../../payment/licenseCodec'

describe('payment/licenseCodec', () => {
  it('decodes the Swift MOSRREQ1 fixture', () => {
    expect(decodeLicenseRequest(fixture.request)).toEqual({
      version: 1,
      machineCode: fixture.payload.machineCode,
      requestedAt: fixture.payload.issuedAt,
      trialStartAt: 1779840000,
      trialDaysUsed: 5,
      trialDaysRemaining: 10,
      currentLicense: null,
    })
  })

  it('verifies the Swift-compatible MOSR2 fixture with its x9.63 public key', () => {
    expect(verifyLicense(fixture.license, fixture.publicKeyX963Base64)).toEqual(fixture.payload)
  })

  it('signs a sorted MOSR2 payload that verifies with the fixture public key', () => {
    const payload = fixture.payload as SignedLicensePayload
    const license = signLicense(payload, fixture.testOnlyPrivateKeyRawBase64)
    const [, encodedPayload] = license.split('.')

    expect(Buffer.from(encodedPayload, 'base64url').toString('utf8')).toBe(
      '{"expiresAt":1783036799,"issuedAt":1780272000,"licenseID":"CLOUD-TEST-LICENSE-0001","machineCode":"MOSR-MAC-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF","plan":"month","version":2}',
    )
    expect(verifyLicense(license, fixture.publicKeyX963Base64)).toEqual(payload)
  })

  it('accepts only the Swift MOSR machine-code format', () => {
    expect(isValidMachineCode('MOSR-MAC-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF')).toBe(true)
    expect(isValidMachineCode('MOSR-MAC-aaaa-BBBB-CCCC-DDDD-EEEE-FFFF')).toBe(false)
    expect(isValidMachineCode('MOSR-MAC-AAAA-BBBB-CCCC-DDDD-EEEE')).toBe(false)
  })
})
