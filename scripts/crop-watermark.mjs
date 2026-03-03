// scripts/crop-watermark.mjs
// Removes watermark by cropping bottom portion of frames
import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const INPUT_DIR = './public/sequences/mansion';
const CROP_BOTTOM = 60; // Pixels to crop from bottom (where Veo logo is)

async function cropWatermark() {
    console.log('🚀 Removing watermark from frames...\n');

    const files = await readdir(INPUT_DIR);
    const webpFiles = files.filter(f => f.endsWith('.webp')).sort();

    console.log(`Found ${webpFiles.length} files to process\n`);

    for (let i = 0; i < webpFiles.length; i++) {
        const file = webpFiles[i];
        const filePath = join(INPUT_DIR, file);

        // Get image metadata
        const metadata = await sharp(filePath).metadata();
        const newHeight = metadata.height - CROP_BOTTOM;

        // Read, crop, and overwrite
        const buffer = await sharp(filePath)
            .extract({
                left: 0,
                top: 0,
                width: metadata.width,
                height: newHeight
            })
            .webp({ quality: 80 })
            .toBuffer();

        await sharp(buffer).toFile(filePath);

        const progress = ((i + 1) / webpFiles.length * 100).toFixed(1);
        process.stdout.write(`\r[${progress}%] Processing ${file}`);
    }

    console.log('\n\n✅ Watermark removed from all frames!\n');
}

cropWatermark().catch(console.error);
