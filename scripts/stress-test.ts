/**
 * Script de Stress Test v4 - Compatible con Schema Actual
 * Ejecutar: npx tsx scripts/stress-test.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Faltan variables de entorno')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runStressTest() {
    console.log('🚀 Iniciando Stress Test v4...\n')
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // === TEST 1: Crear Agencias (solo columnas existentes) ===
    console.log('🏢 TEST 1: Creando Agencias...')
    const testAgencies = [
        {
            name: 'Stress Test Agency A ' + Date.now(),
            slug: `stress-agency-a-${Date.now()}`,
            description: 'Agencia de prueba para stress test',
            contact_email: 'test-a@stress.com',
            contact_phone: '+598 99 111 222',
            city: 'Punta del Este',
            tier_subscription: 'enterprise',
        },
        {
            name: 'Stress Test Agency B ' + Date.now(),
            slug: `stress-agency-b-${Date.now()}`,
            description: 'Segunda agencia de prueba',
            contact_email: 'test-b@stress.com',
            city: 'Maldonado',
            tier_subscription: 'pro',
        },
        {
            // Minimal
            name: 'Minimal Agency ' + Date.now(),
            slug: `minimal-agency-${Date.now()}`,
        }
    ]

    const createdAgencyIds: number[] = []
    for (const agency of testAgencies) {
        const { data, error } = await supabase.from('agencies').insert(agency).select().single()
        if (error) {
            console.log(`  ❌ Error "${agency.name}": ${error.message}`)
            errors.push(`Agency: ${error.message}`)
            errorCount++
        } else {
            console.log(`  ✅ Creada: ${data.name} (${data.tier_subscription || 'basic'})`)
            createdAgencyIds.push(data.id)
            successCount++
        }
    }

    // === TEST 2: Verificar Ubicaciones ===
    console.log('\n📍 TEST 2: Verificando Ubicaciones...')
    const { data: existingLocs } = await supabase.from('locations').select('id, name').limit(3)

    if (existingLocs && existingLocs.length > 0) {
        console.log(`  📋 ${existingLocs.length} ubicaciones existentes`)
        successCount++
    } else {
        // Crear una ubicación de prueba
        const { data: newLoc, error } = await supabase.from('locations').insert({
            slug: `stress-loc-${Date.now()}`,
            name: 'Stress Test Location',
            type: 'zone'
        }).select().single()

        if (error) {
            console.log(`  ❌ Error creando ubicación: ${error.message}`)
            errors.push(`Location: ${error.message}`)
            errorCount++
        } else {
            console.log(`  ✅ Ubicación creada: ${newLoc.name}`)
            successCount++
        }
    }

    // Get location ID for properties
    const { data: locs } = await supabase.from('locations').select('id').limit(1)
    const locationId = locs?.[0]?.id

    if (!locationId) {
        console.log('  ⚠️  No hay ubicaciones disponibles para crear propiedades')
    }

    // === TEST 3: Crear Propiedades ===
    if (locationId) {
        console.log('\n🏠 TEST 3: Creando Propiedades...')
        const testProps = [
            {
                title: 'Villa Moderna Stress Test',
                slug: `villa-stress-${Date.now()}`,
                price: 2500000,
                currency: 'USD',
                location_id: locationId,
                agency_id: createdAgencyIds[0] || null,
                status: 'for_sale',
            },
            {
                title: 'Apartamento Stress Test',
                slug: `apto-stress-${Date.now()}`,
                price: 450000,
                currency: 'USD',
                location_id: locationId,
                status: 'for_sale',
            },
        ]

        for (const prop of testProps) {
            const { data, error } = await supabase.from('properties').insert(prop).select().single()
            if (error) {
                console.log(`  ❌ Error: ${error.message}`)
                errors.push(`Property: ${error.message}`)
                errorCount++
            } else {
                console.log(`  ✅ Creada: ${data.title}`)
                successCount++
            }
        }
    }

    // === TEST 4: Crear Usuario ===
    console.log('\n👤 TEST 4: Creando Usuario...')
    const testEmail = `stress-${Date.now()}@test.com`
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'StressTest123!',
        email_confirm: true,
        user_metadata: { full_name: 'Stress Test User', role: 'agent' }
    })

    if (userError) {
        console.log(`  ❌ Error: ${userError.message}`)
        errors.push(`User: ${userError.message}`)
        errorCount++
    } else {
        console.log(`  ✅ Creado: ${testEmail}`)
        // Create profile
        await supabase.from('profiles').upsert({
            id: newUser.user!.id,
            full_name: 'Stress Test User',
            role: 'agent'
        })
        successCount++
    }

    // === TEST 5: Validaciones de Integridad ===
    console.log('\n🔒 TEST 5: Validaciones de Integridad...')

    // Test: Property without location (should fail)
    const { error: noLocErr } = await supabase.from('properties').insert({
        title: 'Should Fail - No Location',
        slug: `fail-noloc-${Date.now()}`,
        price: 100,
        currency: 'USD',
        status: 'for_sale'
        // No location_id!
    })
    if (noLocErr) {
        console.log(`  ✅ Propiedad sin ubicación rechazada: ${noLocErr.message.substring(0, 50)}...`)
        successCount++
    } else {
        console.log(`  ❌ Propiedad sin ubicación NO fue rechazada!`)
        errors.push('Property without location was created')
        errorCount++
    }

    // Test: Duplicate slug (should fail)
    if (testAgencies.length > 0) {
        const { error: dupErr } = await supabase.from('agencies').insert({
            name: 'Duplicate Slug Test',
            slug: testAgencies[0].slug, // Same slug as first agency
        })
        if (dupErr) {
            console.log(`  ✅ Slug duplicado rechazado correctamente`)
            successCount++
        } else {
            console.log(`  ❌ Slug duplicado NO fue rechazado!`)
            errors.push('Duplicate slug was not rejected')
            errorCount++
        }
    }

    // === Resumen ===
    console.log('\n' + '='.repeat(50))
    console.log('📊 RESUMEN STRESS TEST v4')
    console.log('='.repeat(50))
    console.log(`  ✅ Éxitos: ${successCount}`)
    console.log(`  ❌ Errores: ${errorCount}`)

    if (errors.length > 0) {
        console.log('\n📋 Errores encontrados:')
        errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
    }

    // Stats
    const { count: agencyCount } = await supabase.from('agencies').select('*', { count: 'exact', head: true })
    const { count: propCount } = await supabase.from('properties').select('*', { count: 'exact', head: true })
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

    console.log(`\n📈 Estado de la BD:`)
    console.log(`  - Agencias: ${agencyCount}`)
    console.log(`  - Propiedades: ${propCount}`)
    console.log(`  - Usuarios: ${userCount}`)

    console.log('\n🏁 Stress Test Completado.')

    // Save log
    const fs = await import('fs')
    fs.writeFileSync('stress-test-results.log', `
STRESS TEST v4 - ${new Date().toISOString()}
================================================
Éxitos: ${successCount}
Errores: ${errorCount}

Agencias: ${agencyCount}
Propiedades: ${propCount}
Usuarios: ${userCount}

Errores:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n') || 'Ninguno'}
`)
}

runStressTest().catch(console.error)
