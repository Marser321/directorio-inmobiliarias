import { NextResponse } from 'next/server'
import { z } from 'zod'
import { asCompatDatabase } from '@/lib/insforge/compat'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import type {
  AgencyCommissionProfileDto,
  AgencyCommissionProfileUpdateDto,
  CommissionModel,
  CommissionOperationType,
  CommissionVerificationStatus,
} from '@/types/domain'

interface ProfileRow extends Record<string, unknown> {
  role?: string
  is_admin?: boolean
}

interface MembershipRow extends Record<string, unknown> {
  agency_id?: number
  role?: 'owner' | 'admin' | 'member'
}

type CommissionRow = Record<string, unknown>

const updateSchema = z
  .object({
    operation_type: z.enum(['sale', 'rent']),
    commission_model: z.enum(['percent', 'fixed', 'mixed']).optional(),
    commission_percent: z.union([z.coerce.number().min(0).max(100), z.null()]).optional(),
    commission_fixed_amount: z.union([z.coerce.number().min(0), z.null()]).optional(),
    currency: z.string().trim().min(3).max(3).optional(),
    additional_fees: z.union([z.string().trim().max(2000), z.null(), z.literal('')]).optional(),
    notes: z.union([z.string().trim().max(4000), z.null(), z.literal('')]).optional(),
    verification_status: z.enum(['unverified', 'pending', 'verified', 'rejected']).optional(),
    evidence_url: z.union([z.string().trim().url(), z.null(), z.literal('')]).optional(),
    is_public: z.boolean().optional(),
  })
  .strict()

function normalizeNullableText(value: unknown) {
  if (value === null || value === '') return null
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function isMissingTableError(error: { message?: string; code?: string } | null | undefined, table: string) {
  const message = String(error?.message || '').toLowerCase()
  const code = String(error?.code || '').toLowerCase()
  return (
    code === '42p01' ||
    (code.startsWith('pgrst') && message.includes(table.toLowerCase()) && message.includes('table')) ||
    message.includes(`relation "${table}" does not exist`) ||
    message.includes(`relation 'public.${table}' does not exist`) ||
    message.includes(`could not find the '${table}' table`)
  )
}

function toDto(row: CommissionRow): AgencyCommissionProfileDto {
  return {
    id: typeof row.id === 'string' ? row.id : '',
    agency_id: typeof row.agency_id === 'number' ? row.agency_id : 0,
    operation_type: (row.operation_type as CommissionOperationType) || 'sale',
    commission_model: (row.commission_model as CommissionModel) || 'percent',
    commission_percent: typeof row.commission_percent === 'number' ? row.commission_percent : null,
    commission_fixed_amount: typeof row.commission_fixed_amount === 'number' ? row.commission_fixed_amount : null,
    currency: typeof row.currency === 'string' ? row.currency : 'USD',
    additional_fees: normalizeNullableText(row.additional_fees),
    notes: normalizeNullableText(row.notes),
    verification_status:
      (row.verification_status as CommissionVerificationStatus) || 'unverified',
    evidence_url: normalizeNullableText(row.evidence_url),
    is_public: row.is_public === true,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  }
}

async function resolveScope() {
  const client = await createInsforgeServerClient()
  const database = asCompatDatabase(client.database)
  const { user } = await getServerUser()

  if (!user?.id) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      scope: null,
    }
  }

  const [{ data: profile }, { data: membership }] = await Promise.all([
    database.from('profiles').select('role, is_admin').eq('id', user.id).maybeSingle<ProfileRow>(),
    database
      .from('agency_memberships')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .maybeSingle<MembershipRow>(),
  ])

  if (!membership?.agency_id) {
    return {
      error: NextResponse.json({ error: 'Forbidden: agency membership required' }, { status: 403 }),
      scope: null,
    }
  }

  const isAdmin = Boolean(profile?.is_admin || profile?.role === 'platform_admin')
  const canEdit = Boolean(isAdmin || membership.role === 'owner' || membership.role === 'admin')

  return {
    error: null,
    scope: {
      database,
      agencyId: membership.agency_id,
      membershipRole: membership.role || null,
      canEdit,
      userId: user.id,
    },
  }
}

export async function GET() {
  const { error, scope } = await resolveScope()
  if (error || !scope) return error

  const { data, error: queryError } = await scope.database
    .from('agency_commission_profiles')
    .select('*')
    .eq('agency_id', scope.agencyId)
    .order('operation_type', { ascending: true })

  if (queryError) {
    if (isMissingTableError(queryError, 'agency_commission_profiles')) {
      return NextResponse.json(
        { data: [], permissions: { membershipRole: scope.membershipRole, canEditAgencyCommissionProfile: scope.canEdit } },
        { status: 200 }
      )
    }
    return NextResponse.json({ error: queryError.message || 'Failed to fetch commission profiles' }, { status: 400 })
  }

  return NextResponse.json({
    data: (Array.isArray(data) ? data : []).map((row) => toDto(row as CommissionRow)),
    permissions: {
      membershipRole: scope.membershipRole,
      canEditAgencyCommissionProfile: scope.canEdit,
    },
  })
}

export async function PATCH(request: Request) {
  const { error, scope } = await resolveScope()
  if (error || !scope) return error

  if (!scope.canEdit) {
    return NextResponse.json({ error: 'Forbidden: owner/admin role required' }, { status: 403 })
  }

  let payload: AgencyCommissionProfileUpdateDto & { operation_type: CommissionOperationType }
  try {
    payload = updateSchema.parse(await request.json())
  } catch (parseError) {
    if (parseError instanceof z.ZodError) {
      return NextResponse.json({ error: parseError.issues[0]?.message || 'Invalid payload' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const upsertPayload: Record<string, unknown> = {
    agency_id: scope.agencyId,
    operation_type: payload.operation_type,
    updated_by: scope.userId,
  }

  if (payload.commission_model !== undefined) upsertPayload.commission_model = payload.commission_model
  if (payload.commission_percent !== undefined) upsertPayload.commission_percent = payload.commission_percent
  if (payload.commission_fixed_amount !== undefined) upsertPayload.commission_fixed_amount = payload.commission_fixed_amount
  if (payload.currency !== undefined) upsertPayload.currency = payload.currency.trim().toUpperCase()
  if (payload.additional_fees !== undefined) upsertPayload.additional_fees = normalizeNullableText(payload.additional_fees)
  if (payload.notes !== undefined) upsertPayload.notes = normalizeNullableText(payload.notes)
  if (payload.verification_status !== undefined) upsertPayload.verification_status = payload.verification_status
  if (payload.evidence_url !== undefined) upsertPayload.evidence_url = normalizeNullableText(payload.evidence_url)
  if (payload.is_public !== undefined) upsertPayload.is_public = payload.is_public

  const { error: upsertError } = await scope.database
    .from('agency_commission_profiles')
    .upsert([upsertPayload], { onConflict: 'agency_id,operation_type' })

  if (upsertError) {
    if (isMissingTableError(upsertError, 'agency_commission_profiles')) {
      return NextResponse.json(
        { error: 'Commission profile table is not available in this backend yet' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: upsertError.message || 'Failed to update commission profile' }, { status: 400 })
  }

  const { data, error: selectError } = await scope.database
    .from('agency_commission_profiles')
    .select('*')
    .eq('agency_id', scope.agencyId)
    .eq('operation_type', payload.operation_type)
    .maybeSingle<CommissionRow>()

  if (selectError) {
    return NextResponse.json({ error: selectError.message || 'Failed to fetch updated commission profile' }, { status: 400 })
  }

  return NextResponse.json({
    data: toDto((data || {}) as CommissionRow),
    permissions: {
      membershipRole: scope.membershipRole,
      canEditAgencyCommissionProfile: scope.canEdit,
    },
  })
}
