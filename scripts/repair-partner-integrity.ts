import { config } from 'dotenv'

config({ path: '.env.local' })

import { createAdminClient } from '@/utils/supabase/admin'

type JsonRecord = Record<string, unknown>

interface RepairResult extends JsonRecord {
  mode?: string
  target?: JsonRecord
  before?: JsonRecord
  impact?: JsonRecord
  applied?: JsonRecord
  after?: JsonRecord
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
  return fallback
}

function printJson(label: string, payload: unknown) {
  console.log(`\n${label}`)
  console.log(JSON.stringify(payload, null, 2))
}

function pickMetrics(report: RepairResult) {
  const before = report.before || {}
  const after = report.after || {}

  return {
    mode: report.mode || null,
    target: report.target || null,
    impact: report.impact || null,
    applied: report.applied || null,
    before: {
      authWithoutProfile: before.authWithoutProfile ?? null,
      targetMembershipAgencyId: before.targetMembershipAgencyId ?? null,
      targetAgencyOwners: before.targetAgencyOwners ?? null,
      targetAgencyPropertiesWithoutOwner: before.targetAgencyPropertiesWithoutOwner ?? null,
      agenciesWithTotalPropertiesMismatch: before.agenciesWithTotalPropertiesMismatch ?? null,
    },
    after: {
      authWithoutProfile: after.authWithoutProfile ?? null,
      targetMembershipAgencyId: after.targetMembershipAgencyId ?? null,
      targetAgencyOwners: after.targetAgencyOwners ?? null,
      targetAgencyPropertiesWithoutOwner: after.targetAgencyPropertiesWithoutOwner ?? null,
      agenciesWithTotalPropertiesMismatch: after.agenciesWithTotalPropertiesMismatch ?? null,
    },
  }
}

async function callRepairRpc(params: {
  targetOwnerEmail: string
  targetAgencySlug: string
  apply: boolean
  allowMembershipTransfer: boolean
}): Promise<RepairResult> {
  const client = createAdminClient()
  const { data, error } = await client.rpc('repair_partner_integrity', {
    p_target_owner_email: params.targetOwnerEmail,
    p_target_agency_slug: params.targetAgencySlug,
    p_apply: params.apply,
    p_allow_membership_transfer: params.allowMembershipTransfer,
  })

  if (error) {
    const message = [error.message, error.details, error.hint].filter(Boolean).join(' | ')
    throw new Error(message || 'repair_partner_integrity failed')
  }

  if (!data || typeof data !== 'object') {
    throw new Error('repair_partner_integrity returned an empty payload')
  }

  return data as RepairResult
}

async function main() {
  const targetOwnerEmail = process.env.TARGET_OWNER_EMAIL?.trim() || ''
  const targetAgencySlug = process.env.TARGET_AGENCY_SLUG?.trim() || 'codex-agency'
  const allowMembershipTransfer = parseBoolean(process.env.ALLOW_MEMBERSHIP_TRANSFER, false)
  const applyMode = process.argv.includes('--apply')

  if (!targetOwnerEmail) {
    console.error('Missing required env var: TARGET_OWNER_EMAIL')
    process.exit(1)
  }

  console.log('repair-partner-integrity')
  console.log(`targetOwnerEmail=${targetOwnerEmail}`)
  console.log(`targetAgencySlug=${targetAgencySlug}`)
  console.log(`allowMembershipTransfer=${allowMembershipTransfer}`)
  console.log(`applyMode=${applyMode}`)

  const dryRunReport = await callRepairRpc({
    targetOwnerEmail,
    targetAgencySlug,
    apply: false,
    allowMembershipTransfer,
  })

  printJson('DRY RUN REPORT', dryRunReport)
  printJson('DRY RUN KEY METRICS', pickMetrics(dryRunReport))

  if (!applyMode) {
    console.log('\nDry-run only. Re-run with --apply to execute mutations.')
    return
  }

  const applyReport = await callRepairRpc({
    targetOwnerEmail,
    targetAgencySlug,
    apply: true,
    allowMembershipTransfer,
  })

  printJson('APPLY REPORT', applyReport)
  printJson('APPLY KEY METRICS', pickMetrics(applyReport))

  const postCheck = await callRepairRpc({
    targetOwnerEmail,
    targetAgencySlug,
    apply: false,
    allowMembershipTransfer,
  })

  printJson('POST-APPLY DRY RUN (EXPECTED LOW/NO IMPACT)', postCheck)
  printJson('POST-APPLY KEY METRICS', pickMetrics(postCheck))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
