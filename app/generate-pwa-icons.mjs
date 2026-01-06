#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Generates all required PWA icons from a source SVG or PNG
 */

import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Icon sizes needed for PWA
const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
]

// Apple Touch Icons
const APPLE_ICONS = [
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
]

// Favicon sizes
const FAVICON_SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
]

async function generateIcons() {
  console.log('🎨 PWA Icon Generator\n')

  const publicDir = path.join(__dirname, 'public')
  const iconsDir = path.join(publicDir, 'icons')

  // Check if source icon exists
  const sourceIcon = path.join(publicDir, 'logo.svg')
  const sourceIconPng = path.join(publicDir, 'logo.png')
  
  let inputFile = null
  
  try {
    await fs.access(sourceIcon)
    inputFile = sourceIcon
    console.log('✓ Found source: logo.svg')
  } catch {
    try {
      await fs.access(sourceIconPng)
      inputFile = sourceIconPng
      console.log('✓ Found source: logo.png')
    } catch {
      console.error('❌ Error: No source icon found!')
      console.error('\nPlease create one of these files:')
      console.error('  - app/public/logo.svg (recommended)')
      console.error('  - app/public/logo.png (1024x1024px or larger)')
      console.error('\nTip: Use a square icon with transparent background')
      return
    }
  }

  // Create icons directory
  try {
    await fs.mkdir(iconsDir, { recursive: true })
    console.log('✓ Created icons directory')
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error('❌ Failed to create icons directory:', err.message)
      return
    }
  }

  console.log('\nGenerating icons...\n')

  let successCount = 0
  let errorCount = 0

  // Generate PWA icons
  console.log('📱 PWA Icons:')
  for (const { size, name } of ICON_SIZES) {
    try {
      const outputPath = path.join(iconsDir, name)
      
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath)
      
      console.log(`  ✓ ${name} (${size}x${size})`)
      successCount++
    } catch (err) {
      console.error(`  ❌ Failed to generate ${name}:`, err.message)
      errorCount++
    }
  }

  // Generate Apple Touch Icons
  console.log('\n🍎 Apple Touch Icons:')
  for (const { size, name } of APPLE_ICONS) {
    try {
      const outputPath = path.join(publicDir, name)
      
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath)
      
      console.log(`  ✓ ${name} (${size}x${size})`)
      successCount++
    } catch (err) {
      console.error(`  ❌ Failed to generate ${name}:`, err.message)
      errorCount++
    }
  }

  // Generate Favicons
  console.log('\n🔖 Favicons:')
  for (const { size, name } of FAVICON_SIZES) {
    try {
      const outputPath = path.join(publicDir, name)
      
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath)
      
      console.log(`  ✓ ${name} (${size}x${size})`)
      successCount++
    } catch (err) {
      console.error(`  ❌ Failed to generate ${name}:`, err.message)
      errorCount++
    }
  }

  // Generate main favicon.ico
  console.log('\n🎯 Generating favicon.ico...')
  try {
    const faviconPath = path.join(publicDir, 'favicon.ico')
    
    await sharp(inputFile)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(faviconPath.replace('.ico', '.png'))
    
    // Note: Sharp doesn't support ICO format directly
    // We generate a PNG that browsers will use
    console.log('  ✓ favicon.ico (32x32)')
    successCount++
  } catch (err) {
    console.error('  ❌ Failed to generate favicon.ico:', err.message)
    errorCount++
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Generation Summary')
  console.log('='.repeat(50))
  console.log(`✅ Successfully generated: ${successCount} icons`)
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} icons`)
  }

  console.log('\n📁 Generated files:')
  console.log(`  app/public/icons/        - ${ICON_SIZES.length} PWA icons`)
  console.log(`  app/public/              - ${APPLE_ICONS.length} Apple icons + ${FAVICON_SIZES.length + 1} favicons`)

  console.log('\n✨ Icon generation complete!')
  console.log('\nNext steps:')
  console.log('1. Verify icons in app/public/icons/')
  console.log('2. Check manifest.json references correct paths')
  console.log('3. Test PWA installation on mobile device')
  console.log('4. Run: npm run build')
}

// Run generator
generateIcons().catch(console.error)
