import { NextResponse } from 'next/server'
import { z } from 'zod'
import { asCompatDatabase } from '@/lib/insforge/compat'
import { createInsforgeServerClient, getServerUser } from '@/lib/insforge/server'
import type { AgencyProfileDto, AgencyProfileUpdateDto } from '@/types/domain'

type MembershipRole = 'owner' | 'admin' | 'member'

interface ProfileRow extends Record<string, unknown> {
  role?: string
  is_admin?: boolean
}

interface MembershipRow extends Record<string, unknown> {
  agency_id?: number
  role?: MembershipRole
}

interface AgencyRow extends Record<string, unknown> {
  id?: number
  name?: string
  slug?: string
}

const socialLinksSchema = z
  .object({
    instagram: z.union([z.string().trim().max(255), z.literal(''), z.null()]).optional(),
    facebook: z.union([z.string().trim().max(255), z.literal(''), z.null()]).optional(),
    linkedin: z.union([z.string().trim().max(255), z.literal(''), z.null()]).optional(),
    youtube: z.union([z.string().trim().max(255), z.literal(''), z.null()]).optional(),
    tiktok: z.union([z.string().trim().max(255), z.literal(''), z.null()]).optional(),
  })
  .optional()

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(140).optional(),
    slug: z.string().trim().min(2).max(140).optional(),
    tagline: z.union([z.string().trim().max(160), z.literal(''), z.null()]).optional(),
    description: z.union([z.string().trim().max(8000), z.literal(''), z.null()]).optional(),
    contact_email: z.union([z.string().trim().email(), z.literal(''), z.null()]).optional(),
    contact_phone: z.union([z.string().trim().max(40), z.literal(''), z.null()]).optional(),
    whatsapp: z.union([z.string().trim().max(40), z.literal(''), z.null()]).optional(),
    website: z.union([z.string().trim().url(), z.literal(''), z.null()]).optional(),
    address: z.union([z.string().trim().max(255), z.literal(''), z.null()]).optional(),
    city: z.union([z.string().trim().max(120), z.literal(''), z.null()]).optional(),
    logo_url: z.union([z.string().trim().url(), z.literal(''), z.null()]).optional(),
    cover_image_url: z.union([z.string().trim().url(), z.literal(''), z.null()]).optional(),
    meta_description: z.union([z.string().trim().max(180), z.literal(''), z.null()]).optional(),
    year_established: z.union([z.coerce.number().int().min(1800).max(2200), z.null()]).optional(),
    languages: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    specialties: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    certifications: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    social_links: socialLinksSchema,
  })
  .strict()

function normalizeNullableText(value: unknown) {
  if (value === null || value === '') return null
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]
  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0)
    )
  )
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeSocialLinks(value: unknown) {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return {
    instagram: normalizeNullableText(source.instagram),
    facebook: normalizeNullableText(source.facebook),
    linkedin: normalizeNullableText(source.linkedin),
    youtube: normalizeNullableText(source.youtube),
    tiktok: normalizeNullableText(source.tiktok),
  }
}

function toAgencyProfileDto(agency: AgencyRow): AgencyProfileDto {
  return {
    id: Number(agency.id || 0),
    name: typeof agency.name === 'string' ? agency.name : '',
    slug: typeof agency.slug === 'string' ? agency.slug : '',
    tagline: normalizeNullableText(agency.tagline),
    description: normalizeNullableText(agency.description),
    contact_email: normalizeNullableText(agency.contact_email),
    contact_phone: normalizeNullableText(agency.contact_phone),
    whatsapp: normalizeNullableText(agency.whatsapp),
    website: normalizeNullableText(agency.website),
    address: normalizeNullableText(agency.address),
    city: normalizeNullableText(agency.city),
    logo_url: normalizeNullableText(agency.logo_url),
    cover_image_url: normalizeNullableText(agency.cover_image_url),
    meta_description: normalizeNullableText(agency.meta_description),
    year_established:
      typeof agency.year_established === 'number' && Number.isFinite(agency.year_established)
        ? agency.year_established
        : null,
    languages: normalizeStringArray(agency.languages),
    specialties: normalizeStringArray(agency.specialties),
    certifications: normalizeStringArray(agency.certifications),
    social_links: normalizeSocialLinks(agency.social_links),
    is_verified: agency.is_verified === true,
    tier_subscription: typeof agency.tier_subscription === 'string' ? agency.tier_subscription : 'basic',
    total_properties:
      typeof agency.total_properties === 'number' && Number.isFinite(agency.total_properties)
        ? agency.total_properties
        : 0,
    total_views: typeof agency.total_views === 'number' && Number.isFinite(agency.total_views) ? agency.total_views : 0,
  }
}

async function resolveAgencyScope() {
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
    database.from('profiles').select('id, role, is_admin').eq('id', user.id).maybeSingle<ProfileRow>(),
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
  const membershipRole = membership.role || null
  const canEditAgencyProfile = Boolean(isAdmin || membershipRole === 'owner' || membershipRole === 'admin')

  const { data: agency, error: agencyError } = await database
    .from('agencies')
    .select('*')
    .eq('id', membership.agency_id)
    .maybeSingle<AgencyRow>()

  if (agencyError || !agency?.id) {
    return {
      error: NextResponse.json({ error: 'Agency not found' }, { status: 404 }),
      scope: null,
    }
  }

  return {
    error: null,
    scope: {
      database,
      agency,
      membershipRole,
      canEditAgencyProfile,
    },
  }
}

export async function GET() {
  const { error, scope } = await resolveAgencyScope()
  if (error || !scope) return error

  return NextResponse.json({
    data: toAgencyProfileDto(scope.agency),
    permissions: {
      membershipRole: scope.membershipRole,
      canEditAgencyProfile: scope.canEditAgencyProfile,
    },
  })
}

export async function PATCH(request: Request) {
  const { error, scope } = await resolveAgencyScope()
  if (error || !scope) return error

  if (!scope.canEditAgencyProfile) {
    return NextResponse.json({ error: 'Forbidden: profile edit requires owner/admin role' }, { status: 403 })
  }

  let payload: AgencyProfileUpdateDto
  try {
    payload = updateSchema.parse(await request.json())
  } catch (parseError) {
    if (parseError instanceof z.ZodError) {
      return NextResponse.json({ error: parseError.issues[0]?.message || 'Invalid payload' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const normalized: Record<string, unknown> = {}

  if (payload.name !== undefined) normalized.name = payload.name.trim()
  if (payload.slug !== undefined) normalized.slug = slugify(payload.slug)
  if (payload.tagline !== undefined) normalized.tagline = normalizeNullableText(payload.tagline)
  if (payload.description !== undefined) normalized.description = normalizeNullableText(payload.description)
  if (payload.contact_email !== undefined) normalized.contact_email = normalizeNullableText(payload.contact_email)
  if (payload.contact_phone !== undefined) normalized.contact_phone = normalizeNullableText(payload.contact_phone)
  if (payload.whatsapp !== undefined) normalized.whatsapp = normalizeNullableText(payload.whatsapp)
  if (payload.website !== undefined) normalized.website = normalizeNullableText(payload.website)
  if (payload.address !== undefined) normalized.address = normalizeNullableText(payload.address)
  if (payload.city !== undefined) normalized.city = normalizeNullableText(payload.city)
  if (payload.logo_url !== undefined) normalized.logo_url = normalizeNullableText(payload.logo_url)
  if (payload.cover_image_url !== undefined) normalized.cover_image_url = normalizeNullableText(payload.cover_image_url)
  if (payload.meta_description !== undefined)
    normalized.meta_description = normalizeNullableText(payload.meta_description)
  if (payload.year_established !== undefined) normalized.year_established = payload.year_established
  if (payload.languages !== undefined) normalized.languages = normalizeStringArray(payload.languages)
  if (payload.specialties !== undefined) normalized.specialties = normalizeStringArray(payload.specialties)
  if (payload.certifications !== undefined) normalized.certifications = normalizeStringArray(payload.certifications)
  if (payload.social_links !== undefined) normalized.social_links = normalizeSocialLinks(payload.social_links)

  if (Object.keys(normalized).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const existingKeys = new Set(Object.keys(scope.agency || {}))
  const filteredUpdate = Object.fromEntries(Object.entries(normalized).filter(([key]) => existingKeys.has(key)))

  if (Object.keys(filteredUpdate).length === 0) {
    return NextResponse.json({ error: 'No compatible fields available in this backend schema' }, { status: 400 })
  }

  const { data: updatedAgency, error: updateError } = await scope.database
    .from('agencies')
    .update(filteredUpdate)
    .select('*')
    .eq('id', scope.agency.id)
    .maybeSingle<AgencyRow>()

  if (updateError) {
    const message = String(updateError.message || '').toLowerCase()
    if (message.includes('duplicate') || message.includes('unique')) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
    }

    return NextResponse.json({ error: updateError.message || 'Failed to update agency profile' }, { status: 400 })
  }

  if (!updatedAgency?.id) {
    return NextResponse.json({ error: 'Failed to update agency profile' }, { status: 400 })
  }

  return NextResponse.json({
    data: toAgencyProfileDto(updatedAgency),
    permissions: {
      membershipRole: scope.membershipRole,
      canEditAgencyProfile: scope.canEditAgencyProfile,
    },
  })
}
