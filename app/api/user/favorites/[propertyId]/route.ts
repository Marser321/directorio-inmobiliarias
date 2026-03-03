import { NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/insforge/compat'
import { parsePropertyId, resolveFavoritesScope } from '../_shared'

interface RouteParams {
  params: Promise<{ propertyId: string }>
}

export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const scope = await resolveFavoritesScope()
    if (scope.error) return scope.error
    if (!scope.database || !scope.userId) {
      return NextResponse.json({ error: 'Favorites scope is unavailable' }, { status: 500 })
    }

    const { propertyId } = await context.params
    const parsedPropertyId = parsePropertyId(propertyId)
    if (!parsedPropertyId) {
      return NextResponse.json({ error: 'Invalid property id' }, { status: 400 })
    }

    const { error } = await scope.database
      .from('user_saved_properties')
      .delete()
      .eq('user_id', scope.userId)
      .eq('property_id', parsedPropertyId)

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to remove favorite' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
