import { PLAN_CATALOG, type PaymentPlan } from './domain'
import {
  decodeLicenseRequest,
  isValidMachineCode,
  publicKeyX963FromPrivateKey,
  signLicense,
  verifyLicense,
  type SignedLicensePayload,
} from './licenseCodec'

export type LicenseLedgerRecord = {
  machineCode: string
  latestExpiry: number
}

export type CloudLicenseIssue = {
  payload: SignedLicensePayload
  licenseKey: string
  trialBonusDays: number
  totalDays: number
}

export type CloudLicenseIssuerInput = {
  plan: PaymentPlan
  requestCode: string
  now: Date
  licenseID: string
  privateKeyRawBase64: string
  priorRecord?: LicenseLedgerRecord | null
}

const TRIAL_DAYS = 15
const DAY_MS = 24 * 60 * 60 * 1000

function startOfUTCDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function addUTCDays(value: Date, days: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days))
}

function endOfUTCDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59))
}

export function issueCloudLicense(input: CloudLicenseIssuerInput): CloudLicenseIssue {
  const request = decodeLicenseRequest(input.requestCode)
  if (!isValidMachineCode(request.machineCode)) {
    throw new Error('Invalid machine code')
  }

  const nowDay = startOfUTCDay(input.now)
  let baseDate = nowDay
  let trialBonusDays = 0

  if (input.priorRecord) {
    if (input.priorRecord.machineCode !== request.machineCode) {
      throw new Error('Prior license machine mismatch')
    }
    const recordedExpiry = new Date(input.priorRecord.latestExpiry * 1000)
    if (recordedExpiry > input.now) {
      baseDate = recordedExpiry
    }
  } else if (request.currentLicense) {
    const current = verifyLicense(
      request.currentLicense,
      publicKeyX963FromPrivateKey(input.privateKeyRawBase64),
    )
    if (current.machineCode !== request.machineCode) {
      throw new Error('Current license machine mismatch')
    }
    const currentExpiry = new Date(current.expiresAt * 1000)
    if (currentExpiry > input.now) {
      baseDate = currentExpiry
    }
  } else {
    const trialStart = startOfUTCDay(new Date(request.trialStartAt * 1000))
    const used = Math.floor((nowDay.getTime() - trialStart.getTime()) / DAY_MS)
    trialBonusDays = Math.max(0, TRIAL_DAYS - Math.min(TRIAL_DAYS, Math.max(0, used)))
  }

  const totalDays = PLAN_CATALOG[input.plan].durationDays + trialBonusDays
  const expiry = endOfUTCDay(addUTCDays(baseDate, totalDays))
  const payload: SignedLicensePayload = {
    version: 2,
    licenseID: input.licenseID,
    machineCode: request.machineCode,
    plan: input.plan,
    issuedAt: Math.floor(input.now.getTime() / 1000),
    expiresAt: Math.floor(expiry.getTime() / 1000),
  }

  return {
    payload,
    licenseKey: signLicense(payload, input.privateKeyRawBase64),
    trialBonusDays,
    totalDays,
  }
}
