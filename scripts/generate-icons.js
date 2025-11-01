/**
 * Icon Generation Script for PWA
 * Generates all required icon sizes from a base SVG or PNG
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Base SVG content for the app icon
const baseSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" rx="120" fill="url(#grad)"/>
  
  <!-- Options Symbol (Greek Phi) -->
  <text x="256" y="200" font-family="serif" font-size="180" font-weight="bold" 
        text-anchor="middle" fill="white" opacity="0.9">Φ</text>
  
  <!-- Chart Lines -->
  <path d="M80 350 L160 320 L240 340 L320 300 L432 280" 
        stroke="white" stroke-width="8" fill="none" opacity="0.8"/>
  <path d="M80 380 L160 360 L240 390 L320 350 L432 320" 
        stroke="white" stroke-width="6" fill="none" opacity="0.6"/>
  
  <!-- Data Points -->
  <circle cx="160" cy="320" r="8" fill="white" opacity="0.9"/>
  <circle cx="240" cy="340" r="8" fill="white" opacity="0.9"/>
  <circle cx="320" cy="300" r="8" fill="white" opacity="0.9"/>
  
  <!-- Bottom Text -->
  <text x="256" y="450" font-family="sans-serif" font-size="32" font-weight="600" 
        text-anchor="middle" fill="white" opacity="0.8">OPTIONS</text>
</svg>`;

// Required PWA icon sizes
const iconSizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Create icons directory
const iconsDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Save base SVG
fs.writeFileSync(path.join(iconsDir, 'icon-base.svg'), baseSvg);

// Helper to render the SVG to a PNG file of a given size
async function renderPng(size, fileName) {
  const outPath = path.join(iconsDir, fileName);
  await sharp(Buffer.from(baseSvg)).resize(size, size, { fit: 'cover' }).png().toFile(outPath);
}

// Generate PNG icons for all required sizes
await Promise.all(iconSizes.map(({ size, name }) => renderPng(size, name)));

// Create Apple touch icons as PNGs
const appleTouchSizes = [
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
];

await Promise.all(appleTouchSizes.map(({ size, name }) => renderPng(size, name)));

// Create favicon.ico template
const faviconSvg = `
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="7" fill="#4F46E5"/>
  <text x="16" y="20" font-family="serif" font-size="18" font-weight="bold" 
        text-anchor="middle" fill="white">Φ</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSvg);

console.log('✅ Icons generated successfully!');
console.log('📁 PNG files written to public/icons/');
console.log('🎨 Run again any time: node scripts/generate-icons.js');
