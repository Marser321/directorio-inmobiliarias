import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/insforge/compat-supabase'
import { getInsforgeEnv } from '@/lib/insforge/env'
import { getErrorMessage } from '@/lib/insforge/compat'
import type { CompareResponse } from '@/types/domain'

const idsSchema = z
  .array(z.number().int().positive())
  .min(2)
  .max(4)

type CompareRawProperty = {
  id: number
  title: string
  slug: string | null
  agency_id: number | null
  price: number
  currency: string | null
  bedrooms: number | null
  bathrooms: number | null
  built_area: number | null
  main_image: string | null
  status: string
  coordinate_source?: 'manual' | 'geocoded' | 'centroid' | 'none' | 'unknown' | null
  is_featured: boolean
  boost_level: number | null
  location?: {
    name?: string | null
  } | null
}

function parseIds(value: string | null) {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
}

function asRankingScore(property: CompareRawProperty) {
  const featuredBonus = property.is_featured ? 100 : 0
  const boostBonus = typeof property.boost_level === 'number' ? property.boost_level * 10 : 0
  return featuredBonus + boostBonus
}

function isMissingColumnError(error: { message?: string } | null, column: string) {
  if (!error?.message) return false
  const message = error.message.toLowerCase()
  const normalized = column.toLowerCase()
  return (
    message.includes(`column ${normalized}`) ||
    message.includes(`column "${normalized}"`) ||
    message.includes(`could not find the '${normalized}' column`)
  )
}

export async function GET(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureCompare) {
      return NextResponse.json({ error: 'Compare feature is disabled' }, { status: 503 })
    }

    const url = new URL(request.url)
    const parsedIds = parseIds(url.searchParams.get('ids'))
    const ids = [...new Set(parsedIds)]
    const validatedIds = idsSchema.safeParse(ids)
    if (!validatedIds.success) {
      return NextResponse.json({ error: 'Compare requires 2 to 4 valid property ids' }, { status: 400 })
    }

    const supabase = createClient(env.baseUrl, env.anonKey)
    const baseSelect =
      'id, title, slug, agency_id, price, currency, bedrooms, bathrooms, built_area, main_image, status, is_featured, boost_level, coordinate_source, location:locations(name)'

    let { data, error } = await supabase
      .from('properties')
      .select(baseSelect)
      .in('id', validatedIds.data)

    if (error && isMissingColumnError(error, 'coordinate_source')) {
      const fallbackSelect = baseSelect.replace(', coordinate_source', '')
      const fallbackResult = await supabase
        .from('properties')
        .select(fallbackSelect)
        .in('id', validatedIds.data)
      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load compare data' }, { status: 400 })
    }

    const mapById = new Map<number, CompareRawProperty>()
    for (const row of (data || []) as CompareRawProperty[]) {
      mapById.set(row.id, row)
    }

    const ordered = validatedIds.data
      .map((id) => mapById.get(id))
      .filter((row): row is CompareRawProperty => Boolean(row))

    const response: CompareResponse = {
      data: ordered.map((property) => ({
        id: property.id,
        title: property.title,
        slug: property.slug,
        agency_id: property.agency_id,
        price: Number(property.price || 0),
        currency: property.currency || 'USD',
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        built_area: property.built_area,
        location_name: property.location?.name || null,
        main_image: property.main_image,
        status: property.status,
        coordinate_source: property.coordinate_source || null,
        ranking_score: asRankingScore(property),
      })),
    }

    return NextResponse.json(response)
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
