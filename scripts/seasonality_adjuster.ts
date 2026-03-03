/**
 * Seasonality Adjuster
 * 
 * Updates Vibe Scores based on season changes in Punta del Este.
 * 
 * Usage:
 *   npx tsx scripts/seasonality_adjuster.ts --season winter
 *   npx tsx scripts/seasonality_adjuster.ts --season summer
 *   npx tsx scripts/seasonality_adjuster.ts --season winter --dry-run
 * 
 * Scheduled via N8N:
 *   - March 1st (end of summer): --season winter
 *   - December 1st (start of summer): --season summer
 * 
 * Logic:
 *   - WINTER: Noisy zones become quiet, nightlife zones deactivate
 *   - SUMMER: Tourist zones become noisy, nightlife zones activate
 */

import { createClient } from '@/lib/insforge/compat-supabase';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Season types
type Season = 'summer' | 'winter' | 'transition';

// Zone seasonal modifiers
const SEASONAL_MODIFIERS: Record<string, {
    summer: { noise: number; nightlife: boolean };
    winter: { noise: number; nightlife: boolean };
}> = {
    'La Barra': {
        summer: { noise: 75, nightlife: true },
        winter: { noise: 25, nightlife: false },
    },
    'José Ignacio': {
        summer: { noise: 40, nightlife: false },
        winter: { noise: 10, nightlife: false },
    },
    'Punta del Este': {
        summer: { noise: 85, nightlife: true },
        winter: { noise: 35, nightlife: false },
    },
    'Manantiales': {
        summer: { noise: 70, nightlife: true },
        winter: { noise: 20, nightlife: false },
    },
    'Montoya': {
        summer: { noise: 35, nightlife: false },
        winter: { noise: 10, nightlife: false },
    },
    'Punta Ballena': {
        summer: { noise: 25, nightlife: false },
        winter: { noise: 10, nightlife: false },
    },
    'Bikini': {
        summer: { noise: 30, nightlife: false },
        winter: { noise: 5, nightlife: false },
    },
    'Chihuahua': {
        summer: { noise: 15, nightlife: false },
        winter: { noise: 5, nightlife: false },
    },
};

// Parse command line arguments
function parseArgs(): { season: Season; dryRun: boolean } {
    const args = process.argv.slice(2);
    let season: Season = 'summer';
    let dryRun = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--season' && args[i + 1]) {
            const value = args[i + 1].toLowerCase();
            if (value === 'summer' || value === 'winter' || value === 'transition') {
                season = value;
            }
            i++;
        }
        if (args[i] === '--dry-run') {
            dryRun = true;
        }
    }

    return { season, dryRun };
}

// Get location name from coordinates or ID
async function getLocationName(locationId: number): Promise<string> {
    const { data } = await supabase
        .from('locations')
        .select('name')
        .eq('id', locationId)
        .single();

    return data?.name || 'Unknown';
}

// Update vibe scores for a specific season
async function updateVibeScores(season: Season, dryRun: boolean) {
    console.log(`\n🌊 Seasonality Adjuster`);
    console.log('========================');
    console.log(`Season: ${season.toUpperCase()} ${season === 'summer' ? '☀️' : '❄️'}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
    console.log('');

    // Fetch all vibe scores
    const { data: vibeScores, error } = await supabase
        .from('vibe_scores')
        .select('*');

    if (error) {
        console.error('Error fetching vibe scores:', error);
        return;
    }

    if (!vibeScores || vibeScores.length === 0) {
        console.log('No vibe scores found in database.');
        return;
    }

    console.log(`Found ${vibeScores.length} vibe score records\n`);

    const updates: Array<{
        id: number;
        zone: string;
        oldNoise: number;
        newNoise: number;
        oldNightlife: boolean;
        newNightlife: boolean;
    }> = [];

    // Process each vibe score
    for (const score of vibeScores) {
        let zoneName = 'Unknown';

        // Try to identify the zone
        if (score.location_id) {
            zoneName = await getLocationName(score.location_id);
        } else {
            // Match by coordinates or use data_sources
            const sources = score.data_sources as { source?: string } | null;
            if (sources?.source === 'manual_seed') {
                // For seeded data, try to match by existing values
                for (const [name, config] of Object.entries(SEASONAL_MODIFIERS)) {
                    if (score.nightlife === config.summer.nightlife || !score.nightlife === config.winter.nightlife) {
                        zoneName = name;
                        break;
                    }
                }
            }
        }

        // Get seasonal modifiers for this zone
        const modifiers = Object.entries(SEASONAL_MODIFIERS).find(([name]) =>
            zoneName.toLowerCase().includes(name.toLowerCase())
        )?.[1];

        if (!modifiers) {
            console.log(`  ⏭️  Skipping ${zoneName} (no seasonal modifiers defined)`);
            continue;
        }

        const seasonConfig = modifiers[season === 'transition' ? 'winter' : season];

        // Check if update is needed
        const needsUpdate =
            score.noise_score !== seasonConfig.noise ||
            score.nightlife !== seasonConfig.nightlife;

        if (needsUpdate) {
            updates.push({
                id: score.id,
                zone: zoneName,
                oldNoise: score.noise_score || 50,
                newNoise: seasonConfig.noise,
                oldNightlife: score.nightlife || false,
                newNightlife: seasonConfig.nightlife,
            });
        }
    }

    // Display planned updates
    console.log(`📋 Changes to apply:\n`);

    if (updates.length === 0) {
        console.log('  No changes needed - all zones are already set for this season.');
        return;
    }

    for (const update of updates) {
        const noiseChange = update.newNoise - update.oldNoise;
        const noiseArrow = noiseChange > 0 ? '📈' : noiseChange < 0 ? '📉' : '➡️';
        const nightlifeChange = update.oldNightlife !== update.newNightlife
            ? update.newNightlife ? '🌙 ON' : '💤 OFF'
            : '—';

        console.log(`  ${update.zone}:`);
        console.log(`    Noise: ${update.oldNoise} → ${update.newNoise} ${noiseArrow}`);
        console.log(`    Nightlife: ${update.oldNightlife ? 'ON' : 'OFF'} → ${nightlifeChange}`);
        console.log('');
    }

    // Apply updates
    if (!dryRun) {
        console.log('💾 Applying changes...\n');

        let successCount = 0;
        let errorCount = 0;

        for (const update of updates) {
            const { error: updateError } = await supabase
                .from('vibe_scores')
                .update({
                    noise_score: update.newNoise,
                    nightlife: update.newNightlife,
                    season: season,
                    season_modifier: update.newNoise - update.oldNoise,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', update.id);

            if (updateError) {
                console.error(`  ❌ Failed to update ${update.zone}:`, updateError);
                errorCount++;
            } else {
                console.log(`  ✅ Updated ${update.zone}`);
                successCount++;
            }
        }

        console.log(`\n📊 Summary: ${successCount} updated, ${errorCount} errors`);
    } else {
        console.log('🔍 DRY RUN - No changes were made to the database');
    }

    console.log('\n🎉 Done!');
}

// Main execution
const { season, dryRun } = parseArgs();
updateVibeScores(season, dryRun).catch(console.error);
