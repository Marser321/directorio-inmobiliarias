'use server'

import { revalidatePath } from 'next/cache'
import {
  applyResolvedCoordinates,
  buildCreatePayload,
  createPropertySchema,
  insertPropertyWithCompat,
  resolvePropertyCoordinates,
  resolveAgencyForWrite,
  resolvePropertyScope,
  syncPropertyMedia,
  writeAuditEvent,
} from '@/app/api/partners/properties/_shared'

function safeRevalidate(path: string) {
  try {
    revalidatePath(path)
  } catch (error) {
    console.warn(`Revalidate skipped for ${path}:`, error)
  }
}

function mapStatusMessage(errorMessage: string) {
  if (errorMessage.includes('properties_location_fk')) {
    return 'La ubicación seleccionada no es válida.'
  }
  return errorMessage
}

export async function createPropertyAction(formData: FormData) {
  const title = (formData.get('title') as string | null)?.trim() || ''
  const description = (formData.get('description') as string | null)?.trim() || null
  const priceRaw = formData.get('price') as string | null
  const currency = ((formData.get('currency') as string | null) || 'USD').toUpperCase()
  const locationIdRaw = formData.get('location_id') as string | null
  const address = (formData.get('address') as string | null)?.trim() || null
  const latitudeRaw = (formData.get('latitude') as string | null)?.trim() || null
  const longitudeRaw = (formData.get('longitude') as string | null)?.trim() || null
  const agencyIdRaw = formData.get('agency_id') as string | null
  const status = (formData.get('status') as string | null) || 'for_sale'
  const imagesStr = (formData.get('images_urls') as string | null) || ''

  const latitude = latitudeRaw ? Number(latitudeRaw) : undefined
  const longitude = longitudeRaw ? Number(longitudeRaw) : undefined
  const normalizedLatitude = typeof latitude === 'number' && Number.isFinite(latitude) ? latitude : undefined
  const normalizedLongitude = typeof longitude === 'number' && Number.isFinite(longitude) ? longitude : undefined

  const images = imagesStr
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const media = images.map((url, index) => ({
    media_type: 'image' as const,
    url,
    key: null,
    display_order: index,
    is_primary: index === 0,
    metadata: {},
  }))

  const parseResult = createPropertySchema.safeParse({
    title,
    description,
    price: priceRaw,
    currency,
    status,
    location_id: locationIdRaw,
    address,
    latitude: normalizedLatitude,
    longitude: normalizedLongitude,
    agency_id: agencyIdRaw,
    media,
  })

  if (!parseResult.success) {
    return {
      success: false,
      message: parseResult.error.issues[0]?.message || 'Datos inválidos para crear la propiedad.',
    }
  }

  try {
    const scopeResult = await resolvePropertyScope()
    if (scopeResult.error || !scopeResult.scope) {
      return { success: false, message: 'Sesión inválida. Iniciá sesión nuevamente.' }
    }

    const scope = scopeResult.scope
    if (!scope.isAdmin) {
      return { success: false, message: 'No tenés permisos para crear propiedades desde el panel admin.' }
    }

    const agencyResolution = resolveAgencyForWrite(scope, parseResult.data.agency_id)
    if (agencyResolution.error || !agencyResolution.agencyId) {
      return { success: false, message: 'Debes seleccionar una agencia válida.' }
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

    const { data: property, error } = await insertPropertyWithCompat(scope.database, propertyPayload)
    if (error || !property?.id) {
      const rawMessage = error?.message || 'No se pudo crear la propiedad.'
      return { success: false, message: mapStatusMessage(rawMessage) }
    }

    const mediaSync = await syncPropertyMedia(scope.database, Number(property.id), normalizedMedia)
    if (mediaSync.error) {
      return {
        success: false,
        message: mediaSync.error.message || 'No se pudo guardar el media de la propiedad.',
      }
    }

    await writeAuditEvent(scope.database, {
      actorId: scope.user.id,
      agencyId: agencyResolution.agencyId,
      entityType: 'property',
      entityId: String(property.id),
      action: 'created_from_admin',
      diff: {
        title: property.title,
        price: property.price,
        status: property.status,
        mediaCount: normalizedMedia.length,
        coordinateSource: resolvedCoordinates.source,
      },
    })

    safeRevalidate('/admin/properties')
    safeRevalidate('/partners/dashboard')
    return { success: true, message: 'Propiedad creada correctamente.' }
  } catch (error: unknown) {
    console.error('Create Property Error:', error)
    const message = error instanceof Error ? error.message : 'Error al crear propiedad'
    return { success: false, message }
  }
}
