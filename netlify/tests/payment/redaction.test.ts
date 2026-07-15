import { describe, expect, it } from 'vitest'

import { redactPaymentLog } from '../../payment/redaction'

describe('payment/redaction', () => {
  it('脱敏 PEM 私钥、MOSR2 授权和 service-role JWT', () => {
    const source = {
      appPrivateKey: '-----BEGIN PRIVATE KEY-----\nsecret-material\n-----END PRIVATE KEY-----',
      issuedLicense: 'MOSR2.eyJtYWNoaW5lQ29kZSI6Ik1PU1ItTUFDLUFCQ0QtRUZHSC1JSktMLU1OT1AtUVJTVC1VVldYIn0.MEQCIHNhbXBsZS1zaWduYXR1cmU',
      serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature',
      nested: [
        'prefix -----BEGIN RSA PRIVATE KEY-----\nsecret\n-----END RSA PRIVATE KEY----- suffix',
      ],
    }

    expect(redactPaymentLog(source)).toEqual({
      appPrivateKey: '[REDACTED]',
      issuedLicense: '[REDACTED]',
      serviceRoleKey: '[REDACTED]',
      nested: ['prefix [REDACTED] suffix'],
    })
  })

  it.each([
    '-----BEGIN PUBLIC KEY-----\npublic-material\n-----END PUBLIC KEY-----',
    '-----BEGIN EC PRIVATE KEY-----\nec-secret\n-----END EC PRIVATE KEY-----',
    '-----BEGIN ENCRYPTED PRIVATE KEY-----\nencrypted-secret\n-----END ENCRYPTED PRIVATE KEY-----',
    '-----BEGIN OPENSSH PRIVATE KEY-----\nopenssh-secret\n-----END OPENSSH PRIVATE KEY-----',
  ])('脱敏其他 PEM 密钥格式', (pem) => {
    expect(redactPaymentLog(pem)).toBe('[REDACTED]')
  })

  it('保留普通日志字段，避免误伤非敏感信息', () => {
    expect(redactPaymentLog({
      orderID: '0d3be6a2-2c74-4e1f-9162-a8113d26cf19',
      status: 'pending',
      amountFen: 1980,
    })).toEqual({
      orderID: '0d3be6a2-2c74-4e1f-9162-a8113d26cf19',
      status: 'pending',
      amountFen: 1980,
    })
  })
})
