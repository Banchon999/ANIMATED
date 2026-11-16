#!/usr/bin/env bash
# Builds out/PropSheet.jpg: renders the PropSheet frame (title, labels) and every PropCell one at a time
# (a still cannot hold 32 WebGL canvases, and parallel renders in one browser dropped layers), then
# stitches the cells into the frame with ffmpeg. Usage: bash scripts/propsheet.sh [bundle dir]
set -euo pipefail
cd "$(dirname "$0")/.."
B=${1:-}
if [ -z "$B" ]; then B=$(mktemp -d)/bundle; npx remotion bundle --out-dir "$B" >/dev/null; fi
D=out/propsheet; mkdir -p "$D"
N=$(grep -c ", Model: " src/Props.tsx)
npx remotion still "$B" PropSheet "$D/frame.png" --image-format=png >/dev/null
ins="-i $D/frame.png"; fl=""; last="0:v"
for i in $(seq 0 $((N - 1))); do
  npx remotion still "$B" PropCell "$D/cell$i.png" --props="{\"i\":$i}" --image-format=png >/dev/null
  ins="$ins -i $D/cell$i.png"
  # slots of PROP_SLOT in src/MoodSheet.tsx: 4 columns of 270, rows of 195 from y 160, image 240 x 160
  x=$(( (i % 4) * 270 + 15 )); y=$(( 160 + (i / 4) * 195 + 2 ))
  fl="$fl[$((i + 1)):v]scale=240:160[c$i];[$last][c$i]overlay=$x:$y[o$i];"; last="o$i"
done
ffmpeg -loglevel error -y $ins -filter_complex "${fl%;}" -map "[$last]" -q:v 2 out/PropSheet.jpg
echo "out/PropSheet.jpg"
