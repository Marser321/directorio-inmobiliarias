'use server'

import { revalidatePath } from 'next/cache'
import {
  applyResolvedCoordinates,
  buildUpdatePayload,
  getPropertyForScope,
  resolvePropertyCoordinates,
  resolveAgencyForWrite,
  resolvePropertyScope,
  syncPropertyMedia,
  updatePropertySchema,
  updatePropertyWithCompat,
  writeAuditEvent,
} from '@/app/api/partners/properties/_shared'

interface PropertyUpdateData {
  title?: string
  description?: string
  price?: number
  currency?: string
  status?: string
  location_id?: number
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  agency_id?: number | null
  images?: string[]
  is_featured?: boolean
}

function safeRevalidate(path: string) {
  try {
    revalidatePath(path)
  } catch (error) {
    console.warn(`Revalidate skipped for ${path}:`, error)
  }
}

function toMediaPayload(images?: string[]) {
  if (!images) return undefined
  return images
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .map((url, index) => ({
      media_type: 'image' as const,
      url,
      key: null,
      display_order: index,
      is_primary: index === 0,
      metadata: {},
    }))
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

export async function updatePropertyAction(id: number | string, data: PropertyUpdateData) {
  const parsedId = typeof id === 'string' ? Number(id) : id
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return { success: false, message: 'ID de propiedad inválido.' }
  }

  const payloadForValidation = {
    ...data,
    title: data.title?.trim(),
    description: data.description?.trim(),
    currency: data.currency?.toUpperCase(),
    media: toMediaPayload(data.images),
  }

  const parseResult = updatePropertySchema.safeParse(payloadForValidation)
  if (!parseResult.success) {
    return {
      success: false,
      message: parseResult.error.issues[0]?.message || 'Datos inválidos para actualizar la propiedad.',
    }
  }

  try {
    const scopeResult = await resolvePropertyScope()
    if (scopeResult.error || !scopeResult.scope) {
      return { success: false, message: 'Sesión inválida. Iniciá sesión nuevamente.' }
    }

    const scope = scopeResult.scope
    if (!scope.isAdmin) {
      return { success: false, message: 'No tenés permisos para actualizar propiedades desde el panel admin.' }
    }

    const propertyResult = await getPropertyForScope(scope, parsedId)
    if (propertyResult.error || !propertyResult.property) {
      return { success: false, message: 'No se encontró la propiedad solicitada.' }
    }

    if (parseResult.data.agency_id !== undefined) {
      const agencyResolution = resolveAgencyForWrite(scope, parseResult.data.agency_id)
      if (agencyResolution.error) {
        return { success: false, message: 'No se pudo asignar la agencia seleccionada.' }
      }
    }

    let updatePayload: Record<string, unknown>
    let normalizedMedia: ReturnType<typeof buildUpdatePayload>['normalizedMedia'] = null

    try {
      const buildResult = buildUpdatePayload(parseResult.data, scope, propertyResult.property)
      updatePayload = buildResult.payload
      normalizedMedia = buildResult.normalizedMedia
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo preparar la actualización.'
      return { success: false, message }
    }

    const shouldResolveCoordinates =
      parseResult.data.location_id !== undefined ||
      parseResult.data.address !== undefined ||
      parseResult.data.latitude !== undefined ||
      parseResult.data.longitude !== undefined

    let resolvedCoordinatesSource: string | null = null
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

    const { data: updatedProperty, error } = await updatePropertyWithCompat(scope.database, parsedId, updatePayload)
    if (error || !updatedProperty?.id) {
      return { success: false, message: error?.message || 'No se pudo actualizar la propiedad.' }
    }

    if (normalizedMedia !== null) {
      const mediaSync = await syncPropertyMedia(scope.database, parsedId, normalizedMedia)
      if (mediaSync.error) {
        return { success: false, message: mediaSync.error.message || 'No se pudo sincronizar el media.' }
      }
    }

    await writeAuditEvent(scope.database, {
      actorId: scope.user.id,
      agencyId: Number(updatedProperty.agency_id || scope.membership?.agency_id || 0) || null,
      entityType: 'property',
      entityId: String(updatedProperty.id),
      action: 'updated_from_admin',
      diff: {
        updatedFields: Object.keys(updatePayload),
        ...(resolvedCoordinatesSource ? { coordinateSource: resolvedCoordinatesSource } : {}),
      },
    })

    safeRevalidate('/admin/properties')
    safeRevalidate(`/admin/properties/${parsedId}/edit`)
    safeRevalidate('/partners/dashboard')
    return { success: true, message: 'Propiedad actualizada correctamente.' }
  } catch (error: unknown) {
    console.error('Update Property Error:', error)
    const message = error instanceof Error ? error.message : 'Error al actualizar la propiedad'
    return { success: false, message }
  }
}
