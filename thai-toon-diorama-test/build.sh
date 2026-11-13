#!/bin/sh
# Build the demo film: events → picture → score/foley mix → mux.  Env: LIB (library folder), FPS, SS (supersampling), WORKERS, LEMO_ANGLE
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/user/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
OUT=${OUT:-$HERE/out}; mkdir -p "$OUT"
FPS=${FPS:-24}; SS=${SS:-1.5}; WORKERS=${WORKERS:-3}
cd "$LIB"
node core/render/events.mjs "$HERE" --size 1080x1920 --q "ss=1"
node core/render/readcheck.mjs "$HERE" --size 1080x1920 --q "ss=1" || echo "readcheck: some text too short (see above)"
node core/render/still.mjs "$HERE" 1.5 5.0 6.5 9 12 16.5 19.6 22.5 --size 1080x1920 --q "ss=$SS" --out "$OUT/stills"
"$LIB/.venv/bin/python" core/render/sheet.py "$OUT/contact.jpg" "$OUT"/stills/*.jpg --cols 4 --w 360
node core/render/video.mjs "$HERE" --fps "$FPS" --workers "$WORKERS" --size 1080x1920 --q "ss=$SS" --out "$OUT/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
cp "$HERE/out/mix.wav" "$OUT/mix.wav" 2>/dev/null || true
sh core/render/mux.sh "$OUT/video.mp4" "$OUT/mix.wav" "$OUT/thai-toon-diorama-test.mp4" "$FPS" 0
cp "$OUT/stills/t_9.jpg" "$OUT/styleframe.jpg"
echo "done → $OUT"
