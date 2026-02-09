/**
 * Script para verificar estructura de tablas y aplicar migraciones
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndMigrate() {
    console.log('🔍 Verificando estructura de tabla agencies...\n')

    // Get a sample row to see available columns
    const { data: sample, error } = await supabase
        .from('agencies')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error:', error.message)
        return
    }

    if (sample && sample.length > 0) {
        const columns = Object.keys(sample[0])
        console.log('📋 Columnas actuales en agencies:')
        columns.forEach(col => console.log(`  - ${col}`))

        // Check for missing columns
        const expectedNew = ['social_links', 'business_hours', 'specialties', 'cover_image_url',
            'gallery_images', 'year_established', 'languages', 'certifications',
            'tagline', 'meta_description', 'featured_until', 'avg_response_time', 'updated_at']

        const missing = expectedNew.filter(c => !columns.includes(c))
        if (missing.length > 0) {
            console.log('\n⚠️  Columnas faltantes:')
            missing.forEach(col => console.log(`  - ${col}`))
            console.log('\n📄 Debes ejecutar la migración en Supabase Dashboard.')
            console.log('   Archivo: supabase/migrations/20260209_enhance_agencies.sql')
        } else {
            console.log('\n✅ Todas las columnas nuevas están presentes!')
        }
    } else {
        console.log('No hay agencias en la BD para verificar estructura')
    }
}

checkAndMigrate()
