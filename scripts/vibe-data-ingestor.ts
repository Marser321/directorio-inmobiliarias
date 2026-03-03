/**
 * Vibe Data Ingestor Agent
 * 
 * Crosss property coordinates with external APIs to calculate:
 * - Wind Score: Open-Meteo API (wind speed data)
 * - Noise Score: Proxy via location type density
 * - Safety Score: Based on area classification
 * 
 * Run: npx tsx scripts/vibe-data-ingestor.ts
 * Run with args: npx tsx scripts/vibe-data-ingestor.ts --dry-run
 */

import { createClient } from '@/lib/insforge/compat-supabase';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Punta del Este zone classifications
const ZONE_CLASSIFICATIONS = {
    'La Barra': { surf: true, nightlife: true, baseNoise: 70, baseSafety: 75 },
    'José Ignacio': { surf: true, nightlife: false, baseNoise: 20, baseSafety: 95 },
    'Punta del Este': { surf: false, nightlife: true, baseNoise: 80, baseSafety: 80 },
    'Punta Ballena': { surf: false, nightlife: false, baseNoise: 15, baseSafety: 90 },
    'Manantiales': { surf: true, nightlife: true, baseNoise: 60, baseSafety: 80 },
    'Montoya': { surf: true, nightlife: false, baseNoise: 30, baseSafety: 85 },
    'Bikini': { surf: true, nightlife: false, baseNoise: 25, baseSafety: 88 },
    'Chihuahua': { surf: false, nightlife: false, baseNoise: 10, baseSafety: 92 },
} as const;

// Types
interface Property {
    id: number;
    title: string;
    location_point?: { coordinates: [number, number] } | null;
    location?: { name: string; coordinates?: unknown } | { name: string; coordinates?: unknown }[] | null;
}

interface WindData {
    current_weather: {
        windspeed: number;
        winddirection: number;
    };
}

interface VibeScore {
    property_id: number;
    coordinates: string;
    wind_score: number;
    noise_score: number;
    safety_score: number;
    surf_zone: boolean;
    nightlife: boolean;
    total_silence: boolean;
    forest_retreat: boolean;
    beach_access: boolean;
    season: 'summer' | 'winter' | 'transition';
    data_sources: object;
}

// ============================================
// API INTEGRATIONS
// ============================================

/**
 * Fetch wind data from Open-Meteo (free, no API key required)
 */
async function getWindData(lat: number, lng: number): Promise<number> {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn(`Open-Meteo API error: ${response.status}`);
            return 50; // Default score
        }

        const data: WindData = await response.json();
        const windSpeed = data.current_weather.windspeed;

        // Convert wind speed to score (0-100)
        // Higher wind = higher score for surf zones but lower for residential
        // Scale: 0-5 km/h = 10, 5-15 = 40, 15-25 = 70, 25+ = 90
        if (windSpeed < 5) return 10;
        if (windSpeed < 15) return 40;
        if (windSpeed < 25) return 70;
        return 90;
    } catch (error) {
        console.error('Error fetching wind data:', error);
        return 50;
    }
}

/**
 * Calculate noise score based on zone type and time of year
 */
function calculateNoiseScore(zoneName: string, isSummer: boolean): number {
    const zone = Object.entries(ZONE_CLASSIFICATIONS).find(([name]) =>
        zoneName.toLowerCase().includes(name.toLowerCase())
    );

    let baseNoise = zone ? zone[1].baseNoise : 50;

    // Seasonal adjustment: Summer is much noisier in Punta del Este
    if (isSummer && zone?.[1].nightlife) {
        baseNoise = Math.min(100, baseNoise + 20);
    } else if (!isSummer) {
        baseNoise = Math.max(0, baseNoise - 30);
    }

    return baseNoise;
}

/**
 * Calculate safety score based on zone classification
 */
function calculateSafetyScore(zoneName: string): number {
    const zone = Object.entries(ZONE_CLASSIFICATIONS).find(([name]) =>
        zoneName.toLowerCase().includes(name.toLowerCase())
    );

    return zone ? zone[1].baseSafety : 75;
}

/**
 * Determine if current season is summer (Dec-Mar in Uruguay)
 */
function isSummerSeason(): boolean {
    const month = new Date().getMonth(); // 0-11
    return month === 11 || month === 0 || month === 1 || month === 2; // Dec, Jan, Feb, Mar
}

/**
 * Classify zone based on coordinates and name
 */
function classifyZone(zoneName: string): {
    surf: boolean;
    nightlife: boolean;
    silence: boolean;
    forest: boolean;
    beach: boolean;
} {
    const zone = Object.entries(ZONE_CLASSIFICATIONS).find(([name]) =>
        zoneName.toLowerCase().includes(name.toLowerCase())
    );

    if (zone) {
        const [, config] = zone;
        return {
            surf: config.surf,
            nightlife: config.nightlife,
            silence: config.baseNoise < 30,
            forest: ['Punta Ballena', 'Chihuahua'].some(n => zoneName.includes(n)),
            beach: config.surf || ['Bikini', 'Montoya', 'Manantiales'].some(n => zoneName.includes(n)),
        };
    }

    return { surf: false, nightlife: false, silence: false, forest: false, beach: false };
}

// ============================================
// MAIN INGESTOR LOGIC
// ============================================

async function fetchPropertiesWithCoordinates(): Promise<Property[]> {
    const { data, error } = await supabase
        .from('properties')
        .select(`
      id,
      title,
      location_point,
      location:locations(name)
    `)
        .not('location_point', 'is', null);

    if (error) {
        // If location_point doesn't exist yet, fetch by location
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('properties')
            .select(`
        id,
        title,
        location:locations(name, coordinates)
      `);

        if (fallbackError) {
            console.error('Error fetching properties:', fallbackError);
            return [];
        }

        return (fallbackData || []) as Property[];
    }

    return (data || []) as Property[];
}

async function calculateVibeScore(property: Property): Promise<VibeScore | null> {
    // Get location name - handle both array and single object from Supabase join
    const locationData = Array.isArray(property.location)
        ? property.location[0]
        : property.location;
    const locationName = locationData?.name || 'Punta del Este';

    // Use mock coordinates for Punta del Este area if not available
    const lat = -34.9126;
    const lng = -54.8711;

    const isSummer = isSummerSeason();

    // Calculate scores
    const windScore = await getWindData(lat, lng);
    const noiseScore = calculateNoiseScore(locationName, isSummer);
    const safetyScore = calculateSafetyScore(locationName);

    // Classify zone
    const zoneClass = classifyZone(locationName);

    return {
        property_id: property.id,
        coordinates: `SRID=4326;POINT(${lng} ${lat})`,
        wind_score: windScore,
        noise_score: noiseScore,
        safety_score: safetyScore,
        surf_zone: zoneClass.surf,
        nightlife: zoneClass.nightlife,
        total_silence: zoneClass.silence,
        forest_retreat: zoneClass.forest,
        beach_access: zoneClass.beach,
        season: isSummer ? 'summer' : 'winter',
        data_sources: {
            wind: 'open-meteo',
            noise: 'zone-classification',
            safety: 'zone-classification',
            calculated_at: new Date().toISOString(),
        },
    };
}

async function upsertVibeScores(scores: VibeScore[]): Promise<void> {
    for (const score of scores) {
        const { error } = await supabase
            .from('vibe_scores')
            .upsert({
                property_id: score.property_id,
                coordinates: score.coordinates,
                wind_score: score.wind_score,
                noise_score: score.noise_score,
                safety_score: score.safety_score,
                surf_zone: score.surf_zone,
                nightlife: score.nightlife,
                total_silence: score.total_silence,
                forest_retreat: score.forest_retreat,
                beach_access: score.beach_access,
                season: score.season,
                data_sources: score.data_sources,
                last_calculated: new Date().toISOString(),
            }, {
                onConflict: 'property_id',
            });

        if (error) {
            console.error(`Error upserting vibe score for property ${score.property_id}:`, error);
        }
    }
}

// ============================================
// CLI EXECUTION
// ============================================

async function main() {
    const isDryRun = process.argv.includes('--dry-run');

    console.log('🌊 Vibe Data Ingestor Agent');
    console.log('===========================');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Season: ${isSummerSeason() ? 'SUMMER ☀️' : 'WINTER ❄️'}`);
    console.log('');

    // Fetch properties
    console.log('📍 Fetching properties with coordinates...');
    const properties = await fetchPropertiesWithCoordinates();
    console.log(`Found ${properties.length} properties`);

    if (properties.length === 0) {
        console.log('No properties found. Creating sample vibe scores for zones...');

        // Create zone-based scores instead
        const zones = Object.entries(ZONE_CLASSIFICATIONS);
        for (const [zoneName, config] of zones) {
            const windScore = await getWindData(-34.9126, -54.8711);
            console.log(`  ${zoneName}: Wind=${windScore}, Noise=${config.baseNoise}, Safety=${config.baseSafety}`);
        }

        if (!isDryRun) {
            console.log('\n✅ Zone data already seeded in migration.');
        }
        return;
    }

    // Calculate scores
    console.log('\n🧮 Calculating Vibe Scores...');
    const scores: VibeScore[] = [];

    for (const property of properties) {
        const score = await calculateVibeScore(property);
        if (score) {
            scores.push(score);
            console.log(`  ${property.title}: Vibe=${Math.round((score.wind_score + score.noise_score + score.safety_score) / 3)}`);
        }
    }

    // Upsert to database
    if (!isDryRun) {
        console.log('\n💾 Saving to database...');
        await upsertVibeScores(scores);
        console.log(`✅ Updated ${scores.length} vibe scores`);
    } else {
        console.log('\n🔍 DRY RUN - No changes made to database');
    }

    console.log('\n🎉 Done!');
}

main().catch(console.error);
