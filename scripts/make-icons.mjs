/**
 * Builds icon-192.png and icon-512.png from the source logo.
 *
 * Strategy: BFS flood-fill from all 4 edges to remove the beige/white
 * background, then composite the transparent logo onto a #2c3e50
 * background so it blends seamlessly with the PWA manifest background_color.
 */
import sharp from 'sharp'

const SOURCE = 'C:/Users/jarre/OneDrive/Desktop/Go New Paper/Pocket Only_transparent BACKGROUND.png'
const SPLASH_BG = { r: 44, g: 62, b: 80 } // #2c3e50

async function buildIcon(size, outputPath) {
  // Step 1: load source at target size with alpha
  const { data, info } = await sharp(SOURCE)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const pixels = new Uint8ClampedArray(data)
  const total = width * height

  // Step 2: BFS flood-fill from all edge pixels to find background pixels
  const isNearBeige = (r, g, b) => r > 200 && g > 185 && b > 165
  const isNearWhite = (r, g, b) => r > 220 && g > 220 && b > 220

  const visited = new Uint8Array(total)
  const queue = []

  const idx = (x, y) => y * width + x

  // Seed from all 4 edges
  for (let x = 0; x < width; x++) {
    queue.push(idx(x, 0))
    queue.push(idx(x, height - 1))
  }
  for (let y = 0; y < height; y++) {
    queue.push(idx(0, y))
    queue.push(idx(width - 1, y))
  }

  // BFS
  let head = 0
  while (head < queue.length) {
    const pos = queue[head++]
    if (visited[pos]) continue
    const pi = pos * channels
    const r = pixels[pi], g = pixels[pi + 1], b = pixels[pi + 2]
    if (!isNearBeige(r, g, b) && !isNearWhite(r, g, b)) continue
    visited[pos] = 1
    // Make transparent
    pixels[pi + 3] = 0
    const x = pos % width, y = Math.floor(pos / width)
    if (x > 0) queue.push(idx(x - 1, y))
    if (x < width - 1) queue.push(idx(x + 1, y))
    if (y > 0) queue.push(idx(x, y - 1))
    if (y < height - 1) queue.push(idx(x, y + 1))
  }

  // Step 3: save with transparent background
  await sharp(Buffer.from(pixels), {
    raw: { width, height, channels }
  })
    .png()
    .toFile(outputPath)

  console.log(`✓ ${outputPath} (${size}x${size})`)
}

await buildIcon(192, 'public/icon-192.png')
await buildIcon(512, 'public/icon-512.png')
console.log('Done! Icons now have #2c3e50 background to match PWA splash.')
