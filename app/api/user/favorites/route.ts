import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getErrorMessage } from '@/lib/insforge/compat'
import { resolveFavoritesScope } from './_shared'

const createFavoriteSchema = z.object({
  property_id: z.number().int().positive(),
})

type FavoriteRow = {
  id: string
  property_id: number
  created_at: string
}

export async function GET() {
  try {
    const scope = await resolveFavoritesScope()
    if (scope.error) return scope.error
    if (!scope.database || !scope.userId) {
      return NextResponse.json({ error: 'Favorites scope is unavailable' }, { status: 500 })
    }

    const { data, error } = await scope.database
      .from('user_saved_properties')
      .select('id, property_id, created_at')
      .eq('user_id', scope.userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to load favorites' }, { status: 400 })
    }

    return NextResponse.json({
      data: ((data as FavoriteRow[] | null) || []).map((row) => ({
        id: row.id,
        property_id: row.property_id,
        created_at: row.created_at,
      })),
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const scope = await resolveFavoritesScope()
    if (scope.error) return scope.error
    if (!scope.database || !scope.userId) {
      return NextResponse.json({ error: 'Favorites scope is unavailable' }, { status: 500 })
    }

    const payload = await request.json()
    const parsed = createFavoriteSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid favorite payload', issues: parsed.error.issues }, { status: 400 })
    }

    const { error } = await scope.database.from('user_saved_properties').upsert(
      [
        {
          user_id: scope.userId,
          property_id: parsed.data.property_id,
        },
      ],
      { onConflict: 'user_id,property_id', ignoreDuplicates: true }
    )

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to save favorite' }, { status: 400 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
