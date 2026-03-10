import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'

async function removeWhiteBackground(inputPath, outputPath) {
  const image = sharp(inputPath)
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const pixels = new Uint8ClampedArray(data)

  // Threshold: treat pixels close to white as transparent
  const THRESHOLD = 30 // how close to white (255,255,255) to zap

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]

    // If pixel is near-white, make transparent
    if (r > 255 - THRESHOLD && g > 255 - THRESHOLD && b > 255 - THRESHOLD) {
      pixels[i + 3] = 0
    }
  }

  await sharp(Buffer.from(pixels), {
    raw: { width, height, channels }
  })
    .png()
    .toFile(outputPath)

  console.log(`✓ Saved ${outputPath}`)
}

await removeWhiteBackground('public/icon-192.png', 'public/icon-192.png')
await removeWhiteBackground('public/icon-512.png', 'public/icon-512.png')
console.log('Done! Icons updated with transparent backgrounds.')
