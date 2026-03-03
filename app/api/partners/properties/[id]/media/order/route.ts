import { NextResponse } from 'next/server'
import { getInsforgeEnv } from '@/lib/insforge/env'
import {
  deriveLegacyMediaFields,
  getPropertyForScope,
  getPropertyIdFromParam,
  mediaOrderSchema,
  normalizeMediaItems,
  resolvePropertyScope,
  syncPropertyMedia,
  updatePropertyWithCompat,
  validationErrorResponse,
  writeAuditEvent,
} from '../../../_shared'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface ExistingMediaRow {
  id?: string
  media_type?: string
  url?: string
  key?: string | null
  display_order?: number
  is_primary?: boolean
  metadata?: Record<string, unknown> | null
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeProperties) {
      return NextResponse.json({ error: 'Properties feature is disabled' }, { status: 503 })
    }

    const { id } = await context.params
    const parsedId = getPropertyIdFromParam(id)
    if (parsedId.error) return parsedId.error
    if (!parsedId.propertyId) {
      return NextResponse.json({ error: 'Invalid property id' }, { status: 400 })
    }

    const scopeResult = await resolvePropertyScope()
    if (scopeResult.error) return scopeResult.error
    if (!scopeResult.scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = scopeResult.scope
    const propertyResult = await getPropertyForScope(scope, parsedId.propertyId)
    if (propertyResult.error) return propertyResult.error
    if (!propertyResult.property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    const body = await request.json()
    const parseResult = mediaOrderSchema.safeParse(body)
    if (!parseResult.success) {
      return validationErrorResponse(parseResult.error)
    }

    const { data: currentMediaRows } = await scope.database
      .from('property_media')
      .select('*')
      .eq('property_id', parsedId.propertyId)

    const existingMedia = (Array.isArray(currentMediaRows) ? currentMediaRows : []) as ExistingMediaRow[]
    const existingById = new Map(existingMedia.map((item) => [String(item.id || ''), item]))
    const existingByUrl = new Map(existingMedia.map((item) => [String(item.url || ''), item]))

    const mergedMedia = parseResult.data.media.map((item, index) => {
      const byId = item.id !== undefined ? existingById.get(String(item.id)) : undefined
      const byUrl = item.url ? existingByUrl.get(item.url) : undefined
      const source = byId || byUrl

      return {
        media_type: (item.media_type || source?.media_type || 'image') as 'image' | 'video' | 'tour360' | 'floorplan',
        url: item.url || source?.url || '',
        key: item.key ?? source?.key ?? null,
        display_order: item.display_order ?? index,
        is_primary: item.is_primary ?? source?.is_primary ?? false,
        metadata: item.metadata ?? source?.metadata ?? {},
      }
    })

    const normalizedMedia = normalizeMediaItems(
      mergedMedia.filter((item) => item.url.length > 0)
    )

    if (normalizedMedia.length === 0) {
      return NextResponse.json({ error: 'At least one media item is required' }, { status: 400 })
    }

    const mediaSync = await syncPropertyMedia(scope.database, parsedId.propertyId, normalizedMedia)
    if (mediaSync.error) {
      return NextResponse.json({ error: mediaSync.error.message || 'Failed to sync media ordering' }, { status: 400 })
    }

    const legacyMedia = deriveLegacyMediaFields(normalizedMedia)
    const { data: property, error: updateError } = await updatePropertyWithCompat(scope.database, parsedId.propertyId, {
      images: legacyMedia.images,
      main_image: legacyMedia.main_image,
      video_url: legacyMedia.video_url,
      virtual_tour_url: legacyMedia.virtual_tour_url,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to update property media cache' }, { status: 400 })
    }

    await writeAuditEvent(scope.database, {
      actorId: scope.user.id,
      agencyId: Number(property?.agency_id || scope.membership?.agency_id || 0) || null,
      entityType: 'property_media',
      entityId: String(parsedId.propertyId),
      action: 'reordered',
      diff: {
        mediaCount: normalizedMedia.length,
      },
    })

    return NextResponse.json({
      data: {
        property,
        media: mediaSync.media,
        mediaCanonical: mediaSync.tableAvailable,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
