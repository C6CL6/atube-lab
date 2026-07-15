import {
  createECDH,
  createPrivateKey,
  createPublicKey,
  sign as signSignature,
  verify as verifySignature,
} from 'node:crypto'

export type LicensePlan = 'ten' | 'month' | 'quarter' | 'year'

export type SignedLicensePayload = {
  version: 2
  licenseID: string
  machineCode: string
  plan: LicensePlan
  issuedAt: number
  expiresAt: number
}

export type LicenseRequestPayload = {
  version: 1
  machineCode: string
  requestedAt: number
  trialStartAt: number
  trialDaysUsed: number
  trialDaysRemaining: number
  currentLicense: string | null
}

type JSONRecord = Record<string, unknown>

function base64URL(data: Buffer) {
  return data.toString('base64url')
}

function decodeBase64URL(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid base64url value')
  }
  return Buffer.from(value, 'base64url')
}

function sortedJSON(value: JSONRecord) {
  const sorted = Object.fromEntries(Object.entries(value).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)))
  return Buffer.from(JSON.stringify(sorted))
}

function parseJSONObject(data: Buffer): JSONRecord {
  try {
    const value: unknown = JSON.parse(data.toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('not an object')
    }
    return value as JSONRecord
  } catch {
    throw new Error('Invalid license payload')
  }
}

function integerField(value: JSONRecord, name: string): number {
  const field = value[name]
  if (!Number.isSafeInteger(field)) {
    throw new Error(`Invalid license field: ${name}`)
  }
  return field as number
}

function stringField(value: JSONRecord, name: string) {
  const field = value[name]
  if (typeof field !== 'string') {
    throw new Error(`Invalid license field: ${name}`)
  }
  return field
}

function licensePlan(value: unknown): LicensePlan {
  if (value === 'ten' || value === 'month' || value === 'quarter' || value === 'year') {
    return value
  }
  throw new Error('Invalid license field: plan')
}

function parseRequestPayload(value: JSONRecord): LicenseRequestPayload {
  if (integerField(value, 'version') !== 1) {
    throw new Error('Unsupported license request version')
  }
  const currentLicense = value.currentLicense
  if (currentLicense !== undefined && currentLicense !== null && typeof currentLicense !== 'string') {
    throw new Error('Invalid license field: currentLicense')
  }
  return {
    version: 1,
    machineCode: stringField(value, 'machineCode'),
    requestedAt: integerField(value, 'requestedAt'),
    trialStartAt: integerField(value, 'trialStartAt'),
    trialDaysUsed: integerField(value, 'trialDaysUsed'),
    trialDaysRemaining: integerField(value, 'trialDaysRemaining'),
    currentLicense: currentLicense ?? null,
  }
}

function parseSignedPayload(value: JSONRecord): SignedLicensePayload {
  if (integerField(value, 'version') !== 2) {
    throw new Error('Unsupported license version')
  }
  return {
    version: 2,
    licenseID: stringField(value, 'licenseID'),
    machineCode: stringField(value, 'machineCode'),
    plan: licensePlan(value.plan),
    issuedAt: integerField(value, 'issuedAt'),
    expiresAt: integerField(value, 'expiresAt'),
  }
}

function splitValue(value: string, prefix: string, partCount: number) {
  const parts = value.trim().split('.')
  if (parts.length !== partCount || parts[0] !== prefix || parts.slice(1).some((part) => part === '')) {
    throw new Error('Invalid license format')
  }
  return parts
}

function publicKeyFromX963(publicKeyX963Base64: string) {
  const point = Buffer.from(publicKeyX963Base64, 'base64')
  if (point.length !== 65 || point[0] !== 4) {
    throw new Error('Invalid P-256 public key')
  }
  return createPublicKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: base64URL(point.subarray(1, 33)),
      y: base64URL(point.subarray(33, 65)),
    },
    format: 'jwk',
  })
}

function privateKeyFromRawBase64(privateKeyRawBase64: string) {
  const scalar = Buffer.from(privateKeyRawBase64, 'base64')
  if (scalar.length !== 32) {
    throw new Error('Invalid P-256 private key')
  }
  const ecdh = createECDH('prime256v1')
  ecdh.setPrivateKey(scalar)
  const point = ecdh.getPublicKey()
  return createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      d: base64URL(scalar),
      x: base64URL(point.subarray(1, 33)),
      y: base64URL(point.subarray(33, 65)),
    },
    format: 'jwk',
  })
}

export function publicKeyX963FromPrivateKey(privateKeyRawBase64: string) {
  const scalar = Buffer.from(privateKeyRawBase64, 'base64')
  if (scalar.length !== 32) {
    throw new Error('Invalid P-256 private key')
  }
  const ecdh = createECDH('prime256v1')
  ecdh.setPrivateKey(scalar)
  return ecdh.getPublicKey().toString('base64')
}

export function isValidMachineCode(value: string) {
  return /^MOSR-MAC-[0-9A-F]{4}(?:-[0-9A-F]{4}){5}$/.test(value)
}

export function encodeLicenseRequest(payload: LicenseRequestPayload) {
  return `MOSRREQ1.${base64URL(sortedJSON(payload))}`
}

export function decodeLicenseRequest(request: string) {
  const [, encodedPayload] = splitValue(request, 'MOSRREQ1', 2)
  return parseRequestPayload(parseJSONObject(decodeBase64URL(encodedPayload)))
}

export function signLicense(payload: SignedLicensePayload, privateKeyRawBase64: string) {
  const data = sortedJSON(payload)
  const signature = signSignature('sha256', data, privateKeyFromRawBase64(privateKeyRawBase64))
  return `MOSR2.${base64URL(data)}.${base64URL(signature)}`
}

export function verifyLicense(license: string, publicKeyX963Base64: string) {
  if (license.trim().startsWith('MOSR-')) {
    throw new Error('Legacy license unsupported')
  }
  const [, encodedPayload, encodedSignature] = splitValue(license, 'MOSR2', 3)
  const payload = decodeBase64URL(encodedPayload)
  const signature = decodeBase64URL(encodedSignature)
  if (!verifySignature('sha256', payload, publicKeyFromX963(publicKeyX963Base64), signature)) {
    throw new Error('Invalid license signature')
  }
  return parseSignedPayload(parseJSONObject(payload))
}
