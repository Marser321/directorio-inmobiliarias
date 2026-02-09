// Edge Function: Enriquecer Propiedad
// Calcula Vibe Score y mejora descripción con storytelling
// Deploy: npx supabase functions deploy enrich-property

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Puntos de interés por categoría para calcular Vibe Score
const POI_CATEGORIES = {
    nightlife: ['restaurant', 'bar', 'nightclub', 'casino'],
    silence: ['nature_reserve', 'park', 'beach_quiet'],
    golf: ['golf_course', 'country_club', 'equestrian'],
    surf: ['surf_school', 'beach_waves', 'water_sports'],
    family: ['school', 'playground', 'supermarket', 'hospital']
};

interface EnrichRequest {
    property_id: number;
}

interface VibeScore {
    nightlife: number;
    silence: number;
    golf: number;
    surf: number;
    family: number;
    dominant: string;
}

// Función para calcular el Vibe Score basado en POIs cercanos
async function calculateVibeScore(
    supabase: ReturnType<typeof createClient>,
    propertyId: number
): Promise<VibeScore> {
    // Obtener ubicación de la propiedad
    const { data: property, error } = await supabase
        .from('properties')
        .select('location_point')
        .eq('id', propertyId)
        .single();

    if (error || !property?.location_point) {
        console.error('Error obteniendo propiedad:', error);
        return {
            nightlife: 0,
            silence: 50, // Default a silencio si no hay datos
            golf: 0,
            surf: 0,
            family: 0,
            dominant: 'silence'
        };
    }

    // En producción, aquí consultaríamos una tabla de POIs
    // Por ahora, simulamos basado en la zona
    const scores: VibeScore = {
        nightlife: Math.random() * 100,
        silence: Math.random() * 100,
        golf: Math.random() * 100,
        surf: Math.random() * 100,
        family: Math.random() * 100,
        dominant: ''
    };

    // Determinar vibe dominante
    const vibes = ['nightlife', 'silence', 'golf', 'surf', 'family'] as const;
    let maxScore = 0;
    let dominant = 'silence';

    for (const vibe of vibes) {
        if (scores[vibe] > maxScore) {
            maxScore = scores[vibe];
            dominant = vibe;
        }
    }

    scores.dominant = dominant;
    return scores;
}

// Función para generar storytelling mejorado (placeholder para OpenAI)
async function generateStorytelling(
    originalDescription: string,
    vibeScore: VibeScore,
    location: string
): Promise<string> {
    // En producción, aquí llamaríamos a OpenAI/Claude para reescribir
    // Por ahora, retornamos una versión mejorada simple

    const vibePhrase = {
        nightlife: 'A pasos de la vibrante vida nocturna de la zona',
        silence: 'En un entorno de paz y naturaleza',
        golf: 'Rodeada de exclusivos campos de golf y country clubs',
        surf: 'Con acceso directo a las mejores olas de la costa',
        family: 'En un barrio familiar seguro con todos los servicios'
    };

    const enhancedDescription = `
${vibePhrase[vibeScore.dominant as keyof typeof vibePhrase]}.

${originalDescription}

📍 Ubicación: ${location}
⭐ Vibe Score: ${Math.round(vibeScore[vibeScore.dominant as keyof typeof vibePhrase])}% ${vibeScore.dominant}
  `.trim();

    return enhancedDescription;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        const { property_id }: EnrichRequest = await req.json();

        if (!property_id) {
            return new Response(
                JSON.stringify({ error: 'property_id es requerido' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // 1. Obtener datos de la propiedad
        const { data: property, error: fetchError } = await supabaseClient
            .from('properties')
            .select(`
        id,
        title,
        description,
        location_id,
        lifestyle_tags,
        locations!inner(name, type)
      `)
            .eq('id', property_id)
            .single();

        if (fetchError || !property) {
            return new Response(
                JSON.stringify({ error: 'Propiedad no encontrada', details: fetchError }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // 2. Calcular Vibe Score
        const vibeScore = await calculateVibeScore(supabaseClient, property_id);

        // 3. Generar descripción mejorada
        const enhancedDescription = await generateStorytelling(
            property.description || '',
            vibeScore,
            (property.locations as { name: string })?.name || ''
        );

        // 4. Actualizar lifestyle_tags basado en vibe dominante
        const updatedTags = [
            ...(property.lifestyle_tags || []),
            vibeScore.dominant
        ].filter((tag, index, self) => self.indexOf(tag) === index); // Eliminar duplicados

        // 5. Actualizar propiedad en la base de datos
        const { error: updateError } = await supabaseClient
            .from('properties')
            .update({
                features: {
                    ...(property.features || {}),
                    vibe_score: vibeScore,
                    enriched_at: new Date().toISOString()
                },
                lifestyle_tags: updatedTags
            })
            .eq('id', property_id);

        if (updateError) {
            console.error('Error actualizando propiedad:', updateError);
        }

        return new Response(
            JSON.stringify({
                success: true,
                property_id,
                vibe_score: vibeScore,
                enhanced_description: enhancedDescription,
                lifestyle_tags: updatedTags
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Error en enrich-property:', error);
        return new Response(
            JSON.stringify({ error: 'Error interno del servidor' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
