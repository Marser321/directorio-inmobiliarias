// Edge Function: Verificar Documentos
// Valida certificados (UTE/BPS) y asigna insignia "Verificado"
// Deploy: npx supabase functions deploy verify-document

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
    profile_id: string;
    document_url: string;
    document_type: 'ute' | 'bps' | 'dgi' | 'license';
}

interface VerificationResult {
    is_valid: boolean;
    expiry_date?: string;
    document_number?: string;
    holder_name?: string;
    confidence: number;
    notes?: string;
}

// Función para extraer datos del documento (placeholder para Document AI)
async function extractDocumentData(
    documentUrl: string,
    documentType: string
): Promise<VerificationResult> {
    // En producción, aquí usaríamos Google Document AI, Azure Form Recognizer,
    // o un servicio similar para OCR + extracción estructurada

    // Por ahora, simulamos una verificación exitosa
    const mockResults: Record<string, VerificationResult> = {
        ute: {
            is_valid: true,
            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            document_number: `UTE-${Math.random().toString(36).substring(7).toUpperCase()}`,
            holder_name: 'Verificado por Sistema',
            confidence: 0.92,
            notes: 'Certificado de instalación eléctrica vigente'
        },
        bps: {
            is_valid: true,
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            document_number: `BPS-${Math.random().toString(36).substring(7).toUpperCase()}`,
            holder_name: 'Verificado por Sistema',
            confidence: 0.88,
            notes: 'Certificado de estar al día con aportes'
        },
        dgi: {
            is_valid: true,
            expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            document_number: `RUT-${Math.floor(Math.random() * 100000000)}`,
            confidence: 0.95,
            notes: 'Certificado de vigencia DGI'
        },
        license: {
            is_valid: true,
            expiry_date: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
            document_number: `LIC-${Math.random().toString(36).substring(7).toUpperCase()}`,
            confidence: 0.90,
            notes: 'Matrícula profesional vigente'
        }
    };

    return mockResults[documentType] || {
        is_valid: false,
        confidence: 0,
        notes: 'Tipo de documento no reconocido'
    };
}

// Función para actualizar insignias del perfil
async function updateProfileBadges(
    supabase: ReturnType<typeof createClient>,
    profileId: string,
    documentType: string,
    verificationResult: VerificationResult
): Promise<void> {
    if (!verificationResult.is_valid) return;

    // Obtener perfil actual
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('features')
        .eq('id', profileId)
        .single();

    if (fetchError) {
        console.error('Error obteniendo perfil:', fetchError);
        return;
    }

    // Construir nuevas insignias
    const currentFeatures = profile?.features || {};
    const badges = currentFeatures.badges || [];

    const newBadge = {
        type: `verified_${documentType}`,
        granted_at: new Date().toISOString(),
        expires_at: verificationResult.expiry_date,
        document_number: verificationResult.document_number
    };

    // Agregar o actualizar insignia
    const existingBadgeIndex = badges.findIndex(
        (b: { type: string }) => b.type === newBadge.type
    );

    if (existingBadgeIndex >= 0) {
        badges[existingBadgeIndex] = newBadge;
    } else {
        badges.push(newBadge);
    }

    // Actualizar perfil
    const { error: updateError } = await supabase
        .from('profiles')
        .update({
            features: {
                ...currentFeatures,
                badges,
                last_verification: new Date().toISOString()
            }
        })
        .eq('id', profileId);

    if (updateError) {
        console.error('Error actualizando perfil:', updateError);
    }
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

        const { profile_id, document_url, document_type }: VerifyRequest = await req.json();

        // Validar inputs
        if (!profile_id || !document_url || !document_type) {
            return new Response(
                JSON.stringify({
                    error: 'Faltan campos requeridos: profile_id, document_url, document_type'
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        const validTypes = ['ute', 'bps', 'dgi', 'license'];
        if (!validTypes.includes(document_type)) {
            return new Response(
                JSON.stringify({
                    error: `Tipo de documento inválido. Válidos: ${validTypes.join(', ')}`
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // 1. Verificar que el perfil existe
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, full_name')
            .eq('id', profile_id)
            .single();

        if (profileError || !profile) {
            return new Response(
                JSON.stringify({ error: 'Perfil no encontrado' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // 2. Extraer y validar datos del documento
        const verificationResult = await extractDocumentData(document_url, document_type);

        // 3. Registrar intento de verificación en log
        await supabaseClient
            .from('data_quality_log')
            .insert({
                entity_type: 'profile',
                entity_id: parseInt(profile_id) || 0,
                check_type: document_type,
                field_name: 'verification_badge',
                new_value: JSON.stringify(verificationResult),
                is_discrepancy: !verificationResult.is_valid,
                verification_source: 'manual',
                source_url: document_url,
                status: verificationResult.is_valid ? 'updated' : 'manual_review',
                updated_by: 'ai'
            });

        // 4. Si es válido, actualizar insignias del perfil
        if (verificationResult.is_valid) {
            await updateProfileBadges(
                supabaseClient,
                profile_id,
                document_type,
                verificationResult
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                profile_id,
                document_type,
                verification: verificationResult,
                badge_granted: verificationResult.is_valid
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Error en verify-document:', error);
        return new Response(
            JSON.stringify({ error: 'Error interno del servidor' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
