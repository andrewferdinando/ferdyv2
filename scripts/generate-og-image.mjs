import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputPath = path.join(__dirname, '..', 'public', 'images', 'og-default.png')

const WIDTH = 1200
const HEIGHT = 630

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F5F3FF"/>
    </linearGradient>
    <linearGradient id="wordmark" gradientUnits="userSpaceOnUse" x1="380" y1="0" x2="820" y2="0">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#9333EA"/>
    </linearGradient>
    <style>
      .wordmark {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-weight: 800;
        font-size: 240px;
        letter-spacing: -10px;
        fill: url(#wordmark);
      }
      .tagline {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-weight: 600;
        font-size: 56px;
        letter-spacing: -1.5px;
        fill: #0A0A0A;
      }
    </style>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <text x="${WIDTH / 2}" y="320" text-anchor="middle" class="wordmark">Ferdy</text>
  <text x="${WIDTH / 2}" y="450" text-anchor="middle" class="tagline">Social media automation for venues.</text>
</svg>`

await sharp(Buffer.from(svg))
  .png({ quality: 95, compressionLevel: 9 })
  .toFile(outputPath)

console.log(`Wrote ${outputPath}`)
