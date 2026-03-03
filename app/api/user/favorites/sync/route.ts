import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getErrorMessage } from '@/lib/insforge/compat'
import { resolveFavoritesScope } from '../_shared'

const syncSchema = z.object({
  property_ids: z.array(z.number().int().positive()).max(200),
})

type FavoriteRow = {
  property_id: number
}

export async function POST(request: Request) {
  try {
    const scope = await resolveFavoritesScope()
    if (scope.error) return scope.error
    if (!scope.database || !scope.userId) {
      return NextResponse.json({ error: 'Favorites scope is unavailable' }, { status: 500 })
    }

    const payload = await request.json()
    const parsed = syncSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid favorites sync payload', issues: parsed.error.issues }, { status: 400 })
    }

    const deduped = [...new Set(parsed.data.property_ids)]
    if (deduped.length > 0) {
      const upsertPayload = deduped.map((propertyId) => ({
        user_id: scope.userId,
        property_id: propertyId,
      }))

      const { error: upsertError } = await scope.database
        .from('user_saved_properties')
        .upsert(upsertPayload, { onConflict: 'user_id,property_id', ignoreDuplicates: true })

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message || 'Failed to sync favorites' }, { status: 400 })
      }
    }

    const { data, error } = await scope.database
      .from('user_saved_properties')
      .select('property_id')
      .eq('user_id', scope.userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load synced favorites' }, { status: 400 })
    }

    return NextResponse.json({
      data: ((data as FavoriteRow[] | null) || []).map((row) => row.property_id),
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
