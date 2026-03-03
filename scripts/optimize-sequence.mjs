// scripts/optimize-sequence.mjs
// Converts PNG sequence to optimized WebP format
import sharp from 'sharp';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';

const INPUT_DIR = './public/sequences/mansion';
const QUALITY = 75; // WebP quality (0-100)

async function optimizeSequence() {
    console.log('🚀 Starting image optimization...\n');

    const files = await readdir(INPUT_DIR);
    const pngFiles = files.filter(f => f.endsWith('.png')).sort();

    console.log(`Found ${pngFiles.length} PNG files to convert\n`);

    let totalOriginal = 0;
    let totalOptimized = 0;

    for (let i = 0; i < pngFiles.length; i++) {
        const pngFile = pngFiles[i];
        const inputPath = join(INPUT_DIR, pngFile);
        const outputPath = inputPath.replace('.png', '.webp');

        // Get original size
        const originalStats = await stat(inputPath);
        totalOriginal += originalStats.size;

        // Convert to WebP
        await sharp(inputPath)
            .webp({ quality: QUALITY })
            .toFile(outputPath);

        // Get new size
        const newStats = await stat(outputPath);
        totalOptimized += newStats.size;

        // Delete original PNG
        await unlink(inputPath);

        // Progress
        const progress = ((i + 1) / pngFiles.length * 100).toFixed(1);
        const saved = ((1 - newStats.size / originalStats.size) * 100).toFixed(0);
        process.stdout.write(`\r[${progress}%] ${pngFile} → ${pngFile.replace('.png', '.webp')} (${saved}% smaller)`);
    }

    console.log('\n\n✅ Optimization complete!\n');
    console.log(`📊 Results:`);
    console.log(`   Original: ${(totalOriginal / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   Optimized: ${(totalOptimized / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   Saved: ${((1 - totalOptimized / totalOriginal) * 100).toFixed(0)}%\n`);
}

optimizeSequence().catch(console.error);
