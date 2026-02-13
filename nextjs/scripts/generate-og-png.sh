#!/bin/bash
# Generate PNG versions of OG images from SVG sources
# Run this before deploying to ensure social platforms can render OG images

# Requires: Inkscape, ImageMagick, or similar SVG-to-PNG tool

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$(dirname "$SCRIPT_DIR")/public/images"

echo "Converting SVG to PNG for OG images..."

# Check for inkscape
if command -v inkscape &> /dev/null; then
    inkscape "$PUBLIC_DIR/og-home.svg" --export-filename="$PUBLIC_DIR/og-home.png" --export-width=1200 --export-height=630
    inkscape "$PUBLIC_DIR/og-tech.svg" --export-filename="$PUBLIC_DIR/og-tech.png" --export-width=1200 --export-height=630
    inkscape "$PUBLIC_DIR/og-spirituality.svg" --export-filename="$PUBLIC_DIR/og-spirituality.png" --export-width=1200 --export-height=630
    echo "✅ PNGs generated with Inkscape"
# Check for convert (ImageMagick)
elif command -v convert &> /dev/null; then
    convert -background none -size 1200x630 "$PUBLIC_DIR/og-home.svg" "$PUBLIC_DIR/og-home.png"
    convert -background none -size 1200x630 "$PUBLIC_DIR/og-tech.svg" "$PUBLIC_DIR/og-tech.png"
    convert -background none -size 1200x630 "$PUBLIC_DIR/og-spirituality.svg" "$PUBLIC_DIR/og-spirituality.png"
    echo "✅ PNGs generated with ImageMagick"
# Check for rsvg-convert
elif command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w 1200 -h 630 "$PUBLIC_DIR/og-home.svg" > "$PUBLIC_DIR/og-home.png"
    rsvg-convert -w 1200 -h 630 "$PUBLIC_DIR/og-tech.svg" > "$PUBLIC_DIR/og-tech.png"
    rsvg-convert -w 1200 -h 630 "$PUBLIC_DIR/og-spirituality.svg" > "$PUBLIC_DIR/og-spirituality.png"
    echo "✅ PNGs generated with rsvg-convert"
else
    echo "❌ No SVG-to-PNG converter found."
    echo "Install one of: inkscape, imagemagick, or librsvg"
    echo ""
    echo "Manual fallback:"
    echo "1. Open SVG files in a browser or design tool"
    echo "2. Export as PNG at 1200x630px"
    echo "3. Save to: $PUBLIC_DIR/"
    exit 1
fi

echo ""
echo "OG images ready:"
ls -la "$PUBLIC_DIR"/og-*.png 2>/dev/null || echo "No PNGs found"
