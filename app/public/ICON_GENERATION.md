# PWA Icon Generation Instructions

The WorkHub PWA requires icons in multiple sizes. You can generate these from icon.svg:

## Required Icon Sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

## Option 1: Use Online Tool
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload `icon.svg`
3. Download all generated sizes
4. Place in `/app/public/` directory

## Option 2: Use ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Then run:

convert icon.svg -resize 72x72 icon-72x72.png
convert icon.svg -resize 96x96 icon-96x96.png
convert icon.svg -resize 128x128 icon-128x128.png
convert icon.svg -resize 144x144 icon-144x144.png
convert icon.svg -resize 152x152 icon-152x152.png
convert icon.svg -resize 192x192 icon-192x192.png
convert icon.svg -resize 384x384 icon-384x384.png
convert icon.svg -resize 512x512 icon-512x512.png
```

## Option 3: Use Node Script
```bash
npm install sharp
node generate-icons.js
```

## Temporary Placeholder
For now, the app will use the SVG as a fallback. Generate proper PNG icons before production deployment.

## Screenshots
Create screenshots of:
1. Task management dashboard (1280x720)
2. Kanban board view (1280x720)

Save as `screenshot1.png` and `screenshot2.png` in `/app/public/`
