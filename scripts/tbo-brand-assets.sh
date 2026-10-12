#!/usr/bin/env bash
# Regenerates TBO's PWA icons, favicon and iOS splash screens in
# crm/public/tbo/manifest/ from crm/public/tbo/tbo-mark.svg. The files keep
# the names of upstream's crm/public/manifest/ ones, so the build only swaps
# the directory (frontend/tbo-brand.vite.js). See docs/tbo-theme.md.
# Needs rsvg-convert (brew install librsvg) and Python with Pillow for the
# JPEGs (PYTHON=/path/to/python to pick one; the bench env has Pillow).
set -euo pipefail
cd "$(dirname "$0")/../crm/public"

MARK=tbo/tbo-mark.svg
OUT=tbo/manifest
VIEWBOX=$(sed -n 's/.*viewBox="\([^"]*\)".*/\1/p' "$MARK" | head -1)
BODY=$(tr '\n' ' ' < "$MARK" | sed -e 's/^.*<svg[^>]*>//' -e 's#</svg>.*$##')

# render OUT_PNG WIDTH HEIGHT MARK_BOX (the mark's viewBox is drawn in a
# MARK_BOX-sized square in the centre, on white)
render() {
  local out=$1 w=$2 h=$3 box=$4
  local x y
  x=$(awk -v w="$w" -v b="$box" 'BEGIN{printf "%.2f", (w-b)/2}')
  y=$(awk -v h="$h" -v b="$box" 'BEGIN{printf "%.2f", (h-b)/2}')
  printf '<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s"><rect width="%s" height="%s" fill="#FFFFFF"/><svg x="%s" y="%s" width="%s" height="%s" viewBox="%s" preserveAspectRatio="xMidYMid meet">%s</svg></svg>' \
    "$w" "$h" "$w" "$h" "$x" "$y" "$box" "$box" "$VIEWBOX" "$BODY" \
    | rsvg-convert -f png -o "$out"
}

# Favicon and apple-touch-icon: the mark about 70% of the height.
render "$OUT/apple-icon-180.png" 180 180 137
# Maskable PWA icons: the mark stays inside the 80% safe circle.
render "$OUT/manifest-icon-192.maskable.png" 192 192 138
render "$OUT/manifest-icon-512.maskable.png" 512 512 368

# iOS startup images, one per size upstream ships (apple-splash-WxH.jpg).
for f in manifest/apple-splash-*.jpg; do
  size=$(basename "$f" .jpg | sed 's/apple-splash-//')
  w=${size%-*}
  h=${size#*-}
  short=$((w < h ? w : h))
  png="$OUT/apple-splash-$size.png"
  render "$png" "$w" "$h" $((short / 4))
  "${PYTHON:-python3}" -c 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], quality=85, optimize=True)' \
    "$png" "$OUT/apple-splash-$size.jpg"
  rm "$png"
done
