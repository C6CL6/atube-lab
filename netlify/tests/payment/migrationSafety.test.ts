import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const initialMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/202607150001_vpn_payment.sql'),
  'utf8',
)
const ambiguityFixMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/202607160002_fix_vpn_payment_function_ambiguity.sql'),
  'utf8',
)

describe('vpn payment database migrations', () => {
  it('qualifies columns that overlap PL/pgSQL output parameter names', () => {
    for (const migration of [initialMigration, ambiguityFixMigration]) {
      expect(migration).toContain('from public.vpn_machine_trial_ledger as ledger')
      expect(migration).toContain('where ledger.machine_code_hash = v_order.machine_code_hash')
      expect(migration).toContain("case when payment.status = 'licensed'")
      expect(migration).toContain('coalesce(payment.license_key, p_license_key)')
    }
  })

  it('uses a server-calculated unused-trial allowance only once per machine', () => {
    for (const migration of [initialMigration, ambiguityFixMigration]) {
      expect(migration).toContain('p_trial_bonus_days integer')
      expect(migration).toContain('least(15, greatest(0, p_trial_bonus_days))')
      expect(migration).toContain('not v_ledger.trial_bonus_consumed')
      expect(migration).toContain('ledger.trial_bonus_consumed or v_trial_bonus_applied')
    }
  })
})
