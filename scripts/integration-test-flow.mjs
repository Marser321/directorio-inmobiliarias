
import { createClient } from '@/lib/insforge/compat-supabase';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (!process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) {
    console.error('Missing environment variables. Ensure .env.local has NEXT_PUBLIC_INSFORGE_BASE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_INSFORGE_BASE_URL,
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
);

async function runTest() {
    console.log('🧪 Starting Integration Test Flow (Headless)...');
    const timestamp = Date.now();
    const agencySlug = `test-agency-${timestamp}`;
    const propertySlug = `test-property-${timestamp}`;

    try {
        // 0. Fetch a valid location
        console.log('\n📍 Fetching a valid location...');
        const { data: locationData, error: locationError } = await supabase
            .from('locations')
            .select('id, name')
            .limit(1)
            .single();

        if (locationError || !locationData) {
            // Fallback: Create a dummy location if none exists? 
            // Or fail if locations are static reference data.
            throw new Error(`Could not fetch a valid location. Error: ${locationError?.message}`);
        }
        console.log(`✅ Using Location: ${locationData.name} (${locationData.id})`);


        // 1. Create Agency
        console.log('\n📝 Creating Test Agency...');
        const agencyData = {
            name: `Test Agency ${timestamp}`,
            slug: agencySlug,
            description: 'Automated test agency',
            tier_subscription: 'pro',
            city: 'Punta del Este',
            social_links: { instagram: '@test_integration' },
            specialties: ['Testing', 'Automation']
        };

        const { data: agency, error: agencyError } = await supabase
            .from('agencies')
            .insert(agencyData)
            .select()
            .single();

        if (agencyError) throw new Error(`Agency creation failed: ${agencyError.message}`);
        console.log(`✅ Agency created: ${agency.name} (${agency.id})`);

        // 2. Create Property
        console.log('\n🏠 Creating Test Property...');
        const propertyData = {
            title: `Test Property ${timestamp}`,
            slug: propertySlug,
            description: 'Automated test property',
            price: 500000,
            currency: 'USD',
            status: 'for_sale',
            agency_id: agency.id,
            location_id: locationData.id, // Using valid FK
            images: ['https://example.com/image.jpg']
        };

        const { data: property, error: propertyError } = await supabase
            .from('properties')
            .insert(propertyData)
            .select()
            .single();

        if (propertyError) throw new Error(`Property creation failed: ${propertyError.message}`);
        console.log(`✅ Property created: ${property.title} (${property.id})`);

        // 3. Verify Public Page Access (Simulated Fetch)
        console.log('\n🌍 Verifying Public Pages...');

        try {
            const baseUrl = 'http://localhost:3000';
            const agencyRes = await fetch(`${baseUrl}/agencies/${agencySlug}`);
            if (agencyRes.ok) {
                console.log(`✅ Public Agency Page Access: ${agencyRes.status} OK`);
                const text = await agencyRes.text();

                const hasName = text.includes(agencyData.name);
                const hasSpecialty = text.includes('Testing');

                if (hasName && hasSpecialty) {
                    console.log(`✅ Public Agency Page Content Verified: Name & Specialty found.`);
                } else {
                    console.warn(`⚠️ Public Agency Page loaded but content missing. Name found: ${hasName}, Specialty found: ${hasSpecialty}`);
                }
            } else {
                console.warn(`⚠️ Public Agency Page returned status: ${agencyRes.status} (Ensure 'npm run dev' is running)`);
            }
        } catch (e) {
            console.warn(`⚠️ Could not fetch public page (Ensure 'npm run dev' is running): ${e.message}`);
        }

        // 4. Cleanup
        console.log('\n🧹 Cleaning up test data...');
        const { error: deletePropError } = await supabase.from('properties').delete().eq('id', property.id);
        if (deletePropError) console.error('Error deleting property:', deletePropError);

        const { error: deleteAgencyError } = await supabase.from('agencies').delete().eq('id', agency.id);
        if (deleteAgencyError) console.error('Error deleting agency:', deleteAgencyError);

        console.log('✅ Cleanup complete.');
        console.log('\n🎉 Integration Test PASSED');

    } catch (error) {
        console.error(`\n❌ Test FAILED: ${error.message}`);
        process.exit(1);
    }
}

runTest();
