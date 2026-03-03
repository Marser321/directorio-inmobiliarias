import { NextResponse } from 'next/server'
import { getInsforgeEnv } from '@/lib/insforge/env'
import {
  applyResolvedCoordinates,
  buildUpdatePayload,
  getPropertyForScope,
  getPropertyIdFromParam,
  loadPropertyMedia,
  resolvePropertyCoordinates,
  resolveAgencyForWrite,
  resolvePropertyScope,
  syncPropertyMedia,
  updatePropertySchema,
  updatePropertyWithCompat,
  validationErrorResponse,
  writeAuditEvent,
} from '../_shared'

interface RouteParams {
  params: Promise<{ id: string }>
}

function asFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export async function GET(_request: Request, context: RouteParams) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeProperties) {
      return NextResponse.json({ error: 'Properties feature is disabled' }, { status: 503 })
    }

    const { id } = await context.params
    const parsed = getPropertyIdFromParam(id)
    if (parsed.error) return parsed.error
    if (!parsed.propertyId) {
      return NextResponse.json({ error: 'Invalid property id' }, { status: 400 })
    }

    const scopeResult = await resolvePropertyScope()
    if (scopeResult.error) return scopeResult.error
    if (!scopeResult.scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const propertyResult = await getPropertyForScope(scopeResult.scope, parsed.propertyId)
    if (propertyResult.error) return propertyResult.error
    if (!propertyResult.property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    const mediaResult = await loadPropertyMedia(
      scopeResult.scope.database,
      parsed.propertyId,
      propertyResult.property
    )

    return NextResponse.json({
      data: {
        property: propertyResult.property,
        media: mediaResult.media,
        mediaCanonical: mediaResult.fromCanonical,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeProperties) {
      return NextResponse.json({ error: 'Properties feature is disabled' }, { status: 503 })
    }

    const { id } = await context.params
    const parsed = getPropertyIdFromParam(id)
    if (parsed.error) return parsed.error
    if (!parsed.propertyId) {
      return NextResponse.json({ error: 'Invalid property id' }, { status: 400 })
    }

    const scopeResult = await resolvePropertyScope()
    if (scopeResult.error) return scopeResult.error
    if (!scopeResult.scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = scopeResult.scope
    const propertyResult = await getPropertyForScope(scope, parsed.propertyId)
    if (propertyResult.error) return propertyResult.error
    if (!propertyResult.property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    const body = await request.json()
    const parseResult = updatePropertySchema.safeParse(body)
    if (!parseResult.success) {
      return validationErrorResponse(parseResult.error)
    }

    const requestedAgencyId = parseResult.data.agency_id
    if (requestedAgencyId !== undefined) {
      const agencyResolution = resolveAgencyForWrite(scope, requestedAgencyId)
      if (agencyResolution.error) return agencyResolution.error
    }

    let updatePayload: Record<string, unknown>
    let normalizedMedia = null
    let resolvedCoordinatesSource: string | null = null

    try {
      const buildResult = buildUpdatePayload(parseResult.data, scope, propertyResult.property)
      updatePayload = buildResult.payload
      normalizedMedia = buildResult.normalizedMedia
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid update payload'
      return NextResponse.json({ error: message }, { status: 403 })
    }

    if (!scope.isAdmin && updatePayload.agency_id !== undefined) {
      return NextResponse.json({ error: 'Only admins can reassign agency ownership' }, { status: 403 })
    }

    const shouldResolveCoordinates =
      parseResult.data.location_id !== undefined ||
      parseResult.data.address !== undefined ||
      parseResult.data.latitude !== undefined ||
      parseResult.data.longitude !== undefined

    if (shouldResolveCoordinates) {
      const effectiveLocationId =
        parseResult.data.location_id !== undefined
          ? parseResult.data.location_id
          : asFiniteNumber(propertyResult.property.location_id)
      const effectiveAddress =
        parseResult.data.address !== undefined
          ? parseResult.data.address
          : normalizeText(propertyResult.property.address)

      const resolvedCoordinates = await resolvePropertyCoordinates(scope.database, {
        locationId: effectiveLocationId,
        address: effectiveAddress,
        latitude: parseResult.data.latitude ?? null,
        longitude: parseResult.data.longitude ?? null,
      })
      applyResolvedCoordinates(updatePayload, resolvedCoordinates)
      resolvedCoordinatesSource = resolvedCoordinates.source
    }

    const { data: updatedProperty, error } = await updatePropertyWithCompat(
      scope.database,
      parsed.propertyId,
      updatePayload
    )

    if (error || !updatedProperty?.id) {
      return NextResponse.json({ error: error?.message || 'Failed to update property' }, { status: 400 })
    }

    let media: unknown[] = []
    let mediaCanonical = false

    if (normalizedMedia !== null) {
      const mediaSync = await syncPropertyMedia(scope.database, parsed.propertyId, normalizedMedia)
      if (mediaSync.error) {
        return NextResponse.json({ error: mediaSync.error.message || 'Failed to sync media' }, { status: 400 })
      }

      media = mediaSync.media
      mediaCanonical = mediaSync.tableAvailable
    } else {
      const mediaResult = await loadPropertyMedia(scope.database, parsed.propertyId, updatedProperty)
      media = mediaResult.media
      mediaCanonical = mediaResult.fromCanonical
    }

    await writeAuditEvent(scope.database, {
      actorId: scope.user.id,
      agencyId: Number(updatedProperty.agency_id || scope.membership?.agency_id || 0) || null,
      entityType: 'property',
      entityId: String(updatedProperty.id),
      action: 'updated',
      diff: {
        updatedFields: Object.keys(updatePayload),
        ...(resolvedCoordinatesSource ? { coordinateSource: resolvedCoordinatesSource } : {}),
      },
    })

    return NextResponse.json({
      data: {
        property: updatedProperty,
        media,
        mediaCanonical,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const env = getInsforgeEnv()
    if (!env.featureInsforgeProperties) {
      return NextResponse.json({ error: 'Properties feature is disabled' }, { status: 503 })
    }

    const { id } = await context.params
    const parsed = getPropertyIdFromParam(id)
    if (parsed.error) return parsed.error
    if (!parsed.propertyId) {
      return NextResponse.json({ error: 'Invalid property id' }, { status: 400 })
    }

    const scopeResult = await resolvePropertyScope()
    if (scopeResult.error) return scopeResult.error
    if (!scopeResult.scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const scope = scopeResult.scope
    const propertyResult = await getPropertyForScope(scope, parsed.propertyId)
    if (propertyResult.error) return propertyResult.error
    if (!propertyResult.property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    const { error } = await scope.database
      .from('properties')
      .delete()
      .eq('id', parsed.propertyId)

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to delete property' }, { status: 400 })
    }

    await writeAuditEvent(scope.database, {
      actorId: scope.user.id,
      agencyId: Number(propertyResult.property.agency_id || scope.membership?.agency_id || 0) || null,
      entityType: 'property',
      entityId: String(parsed.propertyId),
      action: 'deleted',
      diff: {
        title: propertyResult.property.title,
      },
    })

    return NextResponse.json({ success: true, id: parsed.propertyId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
