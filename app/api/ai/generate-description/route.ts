import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createInsforgeClient } from '@/lib/insforge/client'

const requestSchema = z.object({
    features: z.object({
        bedrooms: z.number().optional().nullable(),
        bathrooms: z.number().optional().nullable(),
        built_area: z.number().optional().nullable(),
        amenities: z.array(z.string()).optional().nullable(),
        location: z.string().optional().nullable(),
        property_type: z.string().optional().nullable(),
    }),
})

function buildFallbackDescription(features: Record<string, unknown>) {
    const adjectives = ['espectacular', 'exclusiva', 'única', 'sofisticada', 'impresionante']
    const status = adjectives[Math.floor(Math.random() * adjectives.length)]
    const bedrooms = typeof features.bedrooms === 'number' ? features.bedrooms : 0
    const bathrooms = typeof features.bathrooms === 'number' ? features.bathrooms : 0
    const builtArea = typeof features.built_area === 'number' ? features.built_area : 0
    const amenities = Array.isArray(features.amenities) ? features.amenities : []

    return `
Descubre esta ${status} propiedad que redefine el concepto de lujo y confort.

Ubicada en una de las zonas más codiciadas, esta residencia ofrece ${bedrooms} amplias habitaciones y ${bathrooms} baños diseñados con los más finos acabados. Con una superficie construida de ${builtArea}m², cada espacio ha sido pensado para maximizar la luz natural y las vistas panorámicas.

${amenities.length > 0 ? `Disfruta de amenidades de primer nivel como ${amenities.slice(0, 3).join(', ')}, que elevan tu estilo de vida.` : ''}

El diseño arquitectónico fusiona elegancia moderna con funcionalidad, creando el escenario perfecto para momentos inolvidables. No es solo una casa, es el hogar que mereces.

Contáctanos hoy para una visita privada.
    `.trim()
}

export async function POST(req: Request) {
    const startedAt = Date.now()
    let fallbackFeatures: Record<string, unknown> = {}
    try {
        const body = await req.json()
        const parsed = requestSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request payload', issues: parsed.error.issues },
                { status: 400 }
            )
        }

        const { features } = parsed.data
        fallbackFeatures = features as Record<string, unknown>
        const model = process.env.INSFORGE_AI_MODEL || 'anthropic/claude-3.5-haiku'

        const prompt = [
            'Eres un redactor inmobiliario premium.',
            'Escribe una descripción breve (90-140 palabras), elegante y persuasiva, en español rioplatense.',
            'No inventes datos no provistos. Si falta un dato, omítelo.',
            'Usa un tono profesional, enfocado en beneficios y lifestyle.',
            'Cierra con una invitación a coordinar visita.',
        ].join(' ')

        const client = createInsforgeClient()
        const completion = await client.ai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: prompt },
                {
                    role: 'user',
                    content: JSON.stringify({
                        bedrooms: features.bedrooms,
                        bathrooms: features.bathrooms,
                        built_area: features.built_area,
                        amenities: features.amenities,
                        location: features.location,
                        property_type: features.property_type,
                    }),
                },
            ],
            temperature: 0.7,
            maxTokens: 220,
        })

        const description = completion?.choices?.[0]?.message?.content?.trim()
        if (!description) {
            throw new Error('AI completion returned empty content')
        }

        const latencyMs = Date.now() - startedAt
        const usage = completion?.usage

        return NextResponse.json({
            description,
            meta: {
                model,
                latencyMs,
                usage,
            },
        })
    } catch (error) {
        console.error('AI Generation Error:', error)
        const latencyMs = Date.now() - startedAt
        return NextResponse.json(
            {
                description: buildFallbackDescription(fallbackFeatures),
                meta: { fallback: true, latencyMs },
            },
            { status: 200 }
        )
    }
}
