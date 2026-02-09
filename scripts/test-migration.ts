/**
 * Script para aplicar migración de enriquecimiento de agencias
 * Usa conexión directa con pg
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
    console.log('🔄 Aplicando migración de enriquecimiento de agencias...\n')

    // Test what columns we can add by trying to insert data with new fields
    // First, let's try updating an existing agency with the new fields

    const { data: existingAgency, error: fetchError } = await supabase
        .from('agencies')
        .select('id, name')
        .limit(1)
        .single()

    if (fetchError || !existingAgency) {
        console.log('⚠️  No hay agencias para probar. Creando una de prueba...')
        const { data: newAgency, error } = await supabase
            .from('agencies')
            .insert({
                name: 'Migration Test Agency',
                slug: `migration-test-${Date.now()}`
            })
            .select()
            .single()

        if (error) {
            console.log('❌ Error creando agencia de prueba:', error.message)
            return
        }
        console.log('✅ Agencia de prueba creada')
    }

    // Try to update with new fields to see which ones exist
    const newFields = {
        tagline: 'Test tagline',
        social_links: { instagram: 'test' },
        specialties: ['Luxury', 'Beachfront'],
        languages: ['Spanish', 'English'],
        year_established: 2020,
        cover_image_url: 'https://example.com/cover.jpg',
        gallery_images: ['https://example.com/1.jpg'],
        meta_description: 'Test meta description'
    }

    console.log('📋 Probando campos nuevos...\n')

    for (const [field, value] of Object.entries(newFields)) {
        const { error } = await supabase
            .from('agencies')
            .update({ [field]: value } as any)
            .eq('id', existingAgency?.id || 1)

        if (error) {
            if (error.message.includes('column') || error.message.includes('schema cache')) {
                console.log(`  ❌ ${field}: No existe en la BD`)
            } else {
                console.log(`  ⚠️  ${field}: ${error.message}`)
            }
        } else {
            console.log(`  ✅ ${field}: Funciona`)
        }
    }

    console.log('\n📄 Instrucciones para agregar columnas faltantes:')
    console.log('   1. Ve a https://supabase.com/dashboard/project/vzyjvlppwzjjmscvkaqg/sql')
    console.log('   2. Copia y ejecuta el contenido de:')
    console.log('      supabase/migrations/20260209_enhance_agencies.sql')
    console.log('')
}

applyMigration()
