import { NextResponse } from 'next/server'
import { getInsforgeEnv } from '@/lib/insforge/env'
import {
  applyResolvedCoordinates,
  buildCreatePayload,
  createPropertySchema,
  evaluatePropertyQualityChecklist,
  resolvePropertyCoordinates,
  resolveAgencyForWrite,
  resolvePropertyScope,
  syncPropertyMedia,
  validationErrorResponse,
  writeAuditEvent,
  insertPropertyWithCompat,
} from './_shared'

export async function POST(request: Request) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeProperties) {
      return NextResponse.json({ error: 'Properties feature is disabled' }, { status: 503 })
    }

    const scopeResult = await resolvePropertyScope()
    if (scopeResult.error || !scopeResult.scope) {
      return scopeResult.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parseResult = createPropertySchema.safeParse(body)

    if (!parseResult.success) {
      return validationErrorResponse(parseResult.error)
    }

    const scope = scopeResult.scope
    const agencyResolution = resolveAgencyForWrite(scope, parseResult.data.agency_id)
    if (agencyResolution.error || !agencyResolution.agencyId) {
      return agencyResolution.error || NextResponse.json({ error: 'agency_id is required' }, { status: 400 })
    }

    const { propertyPayload, normalizedMedia } = buildCreatePayload(
      parseResult.data,
      agencyResolution.agencyId,
      scope.user.id
    )
    const resolvedCoordinates = await resolvePropertyCoordinates(scope.database, {
      locationId: parseResult.data.location_id,
      address: parseResult.data.address ?? null,
      latitude: parseResult.data.latitude ?? null,
      longitude: parseResult.data.longitude ?? null,
    })
    applyResolvedCoordinates(propertyPayload, resolvedCoordinates)

    const publicationStatus = parseResult.data.publication_status || 'draft'
    if (publicationStatus !== 'draft') {
      const checklist = evaluatePropertyQualityChecklist(parseResult.data, normalizedMedia, resolvedCoordinates)
      if (!checklist.isComplete) {
        return NextResponse.json(
          {
            error: 'Checklist de publicación incompleto',
            checklist,
          },
          { status: 400 }
        )
      }
    }

    const { data: property, error } = await insertPropertyWithCompat(scope.database, propertyPayload)
    if (error || !property?.id) {
      return NextResponse.json({ error: error?.message || 'Failed to create property' }, { status: 400 })
    }

    const mediaSync = await syncPropertyMedia(scope.database, Number(property.id), normalizedMedia)
    if (mediaSync.error) {
      return NextResponse.json({ error: mediaSync.error.message || 'Failed to sync property media' }, { status: 400 })
    }

    await writeAuditEvent(scope.database, {
      actorId: scope.user.id,
      agencyId: agencyResolution.agencyId,
      entityType: 'property',
      entityId: String(property.id),
      action: 'created',
      diff: {
        title: property.title,
        price: property.price,
        status: property.status,
        mediaCount: normalizedMedia.length,
        coordinateSource: resolvedCoordinates.source,
      },
    })

    return NextResponse.json(
      {
        data: {
          property,
          media: mediaSync.media,
          mediaCanonical: mediaSync.tableAvailable,
          coordinate_source: resolvedCoordinates.source,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
