# Thai Toon Diorama · การ์ตูนไทยในฉาก 3D — Style Prompt

Made from a blank page; techniques from 2.5D Pixel Art (hd-2d) in Lemo-Opuscar.
Default size: 1080×1920.

> Thick-outlined, big-headed vector cartoon people standing as flat cut-outs inside a small, lit 3D Thai village set: a vertical comedy-horror short where a lamp, a fire or a ghost's smoke is the light that tells the joke.

## 1. Essence, and what it is not

A **3D set built from flat-coloured, ink-outlined shapes** (stilt hut with a thatched roof, paddy, dirt path, palms, ladder, water jars) with **flat 2D vector characters that receive light and cast shadows**. The characters are drawn like a Thai webtoon sticker: round oversized head, dot eyes with a white glint, tiny mouth, a hoodie with drawstrings and a kangaroo pocket, tube limbs with no elbows, round mitten hands and egg feet, all in one heavy dark-brown ink line.

**Light is the punchline.** A practical (oil lamp, cooking fire, window, torch) throws a hard shadow across the ground, and the story turns on what that light reveals or what its shadow does. The ghost is the one character that brings its own darkness: dark smoke rising from the head that dims what it crosses.

Key contrast (kept from hd-2d): **characters change pose instantly, like stickers swapped; camera, light, smoke and focus glide every frame.**

On top, a small **episode grammar**: a cover at the start (huge bold Thai title with a thick black outline, a red pill tag "EP n"), cartoon speech bubbles, and bold outlined subtitles.

Not a flat 2D cartoon (the set is real 3D with real light, real shadows and real camera moves), not pixel art (no pixels anywhere), not a 3D-modelled character film (characters are always flat drawings), not anime (no detailed faces, no cel-shaded rendered heads).

## 2. Materials & rendering

- **Characters**: drawn per pose in Canvas2D at high resolution (≈ 640×1000 px per frame, ~1.25 m tall in the world), a **dark-brown ink outline ~3.5 % of head width**, flat fills, at most one soft shade band (a darker tint on the side away from the camera) and one white highlight on the head. Uploaded with linear filtering and mipmaps, `alphaTest .5`, on a Lambert plane so set lights tint them flatly; custom depth materials so they cast **cut-out shadows**.
- **Set**: boxes, cylinders and cones with a **3-step toon ramp** (`MeshToonMaterial`, nearest-filtered 3-texel gradient). Surface detail is **drawn lines, not texture noise**: straight strokes on thatch, plank seams on wood, a few ruled furrows in the paddy. Line colour = the ink.
- **Ink outlines on everything** from a post pass: edges found from depth jumps and normal changes (normals reconstructed from depth), drawn ~3 px at 1080 width in the ink colour; the character's own drawn line merges with it.
- **Light rig per set**: one warm or cool key that casts **crisp** shadows (`PCFShadowMap`, not soft), a hemisphere fill strong enough that faces stay readable, **practical point lights with shadows** (lamp, fire, window), and a front fill ~2 m before the main characters (a billboard lit from behind stays black). An additive glow on every practical.
- **Smoke**: flat dark discs of a few sizes, semi-transparent (opacity ~.55), rising in a gently swaying column, overlapping; no gradients inside a puff.
- **Post chain**: supersampled render → ink-edge pass → light depth of field (background only, small aperture) → mild bloom on practicals → light vignette → ACES tone map. No film grain. No tilt-shift.

## 3. Colour logic

- **Dusk is the home key**: a sky from dusty mauve at the top to peach-orange at the horizon, the set lit by a low warm sun; the lamp and fire carry the warm yellow `#ffcf5a`–`#ff9d3a`.
- **Each character owns one hoodie colour no set uses**: grandma purple `#6b4a9e` (dark purple pha-sin skirt `#3a2a5a` with a gold hem), the kid blue `#2f6db3`, the ghost off-white `#e9e4dc` with grey-green skin `#c9d0c2`. Human skin is a warm off-white `#f4e8df`.
- **When the ghost shows itself the set cools and dims**: the sun drops, the fill turns lilac-grey, and the smoke is the darkest value on screen.
- The ink is a warm dark brown `#22160f`, never pure black; the brightest value is a lit lamp flame, bloomed.
- Set colours are earthy and muted (thatch `#b38a52`, wood `#6b4528`, dirt path `#c9894f`, paddy `#9aab5a`), so the costumes pop.
- UI: bright yellow `#ffd23a` and white for type, signal red `#c4252a` for tags, all with the ink as outline.

## 4. Type & subtitles

- **Kanit** (Black 900 for titles, Bold 700 for subtitles and bubbles) and **Mitr** 500 for small lines; OFL, self-hosted. Thai first; Latin only for "EP 3" and numbers.
- **Cover / title**: Kanit Black, huge (title word ≈ 170–200 px at 1080 width), fill white or yellow, **outline ≈ 14 % of the font size in the ink**, plus a hard offset shadow. A red pill tag (white Kanit Bold, white 6 px border) under it. Cover lasts ≥ 1.8 s.
- **Speech bubbles** for on-screen speech: white round bubble, ink outline 6 px, tail to the speaker's head, Kanit Bold 54–64 px in the ink; pops in with a 0.15 s overshoot, out with a 0.1 s shrink. Hold ≥ max(1.8 s, characters ÷ 4.5 + 1.5 s).
- **Narration subtitles**: Kanit Bold 56 px, white with an ink outline, centred in the lower third above the platform's safe area (y ≈ 1500–1650 on 1920), no band.
- Keep all text inside the 9:16 safe area: 90 px from the sides, 220 px from the top, 380 px from the bottom.

## 5. Motion quality

- **Characters pose-to-pose.** A pose is a parameter object (arm angles, head tilt, eye shape, mouth shape, body lean, prop); a change of pose is an instant swap, with at most a 2-frame squash (scale .94/1.06) on big reactions. Blinks every 2–5 s. A breathing bob of ±1.5 % at ~0.5 Hz. Walks: 4 drawings at 8 fps with a ±3 cm hop.
- **Mouths flap with speech**: 3 shapes (closed, small, open) chosen from the voice envelope or a fixed 9 Hz pattern when there is no voice.
- **Everything else glides at the output rate**: camera, light levels, smoke, glows, bubbles.
- **Lights breathe**: every flame flickers (summed sines, ±15 %). One `level` value drives the flame drawing, the point light (intensity ∝ level^1.3), the glow and its size together.
- **Comedy timing**: a hold of ≥ 0.6 s on the reaction face before the punchline; snap zoom or push-in lands on the frame the face changes.

## 6. Camera grammar

A vocabulary, not a route. Mostly at **eye level of the characters or slightly above** (looking down 5–15°); characters fill 1/4–1/3 of the frame height so faces read on a phone.

| Move | Expresses | Can serve |
|---|---|---|
| Locked two/three-shot, slight drift | A stage for a conversation | setup; banter; a reveal behind someone |
| Slow push-in on a face | Dread building | "did you hear that?"; a realisation |
| Snap push-in (0.2 s, ease-out) | The punchline lands | a scare; a gag; a double take |
| Lateral dolly with a character walking, foreground posts passing | A path through the village | going to the hut; fleeing |
| Low angle from the ground, the shadow large in frame | The shadow is the subject | a shadow that doesn't match its owner |
| Rising crane to a high wide | The village goes quiet | an ending; night falls |
| Rack focus between two characters | Attention changes hands | one notices, the other doesn't |

Every path is a monotone spline of a few keys, no overshoot except the snap push. Cuts are hard; a short dip to black only between episodes or at the end. No wipes, no spins.

## 7. Sound palette

- **Music**: small Thai rural colours, light and comic: phin (plucked lute) riffs, khaen drones, ranat (xylophone) runs, ching (small cymbals) on the beat; for scares a low drone and a reverse swell. Original score, cut on downbeats.
- **Cartoon foley, clear and dry**: pops for bubbles, boing for jumps, whoosh for snap zooms, a thump for falls, a wooden clack for the ladder, match strike and flame whoosh, crickets and frogs for dusk, a long wind for the ghost.
- **Silence as a tool**: the music stops dead for ≤ 1 s just before a scare or a punchline.
- **Voice**: Thai, natural and lively; each character has its own voice (grandma slow and creaky, kid high and fast, ghost low with slight reverb). Optional: the style also works with bubbles and no voice.
- **Mix**: voice compressed and RMS-matched, ducking ~10 dB under voice, −14 LUFS via `core/render/mux.sh`, grain 0.

## 8. Native moves

A menu: use the ones your story needs.

- **Light on, shadows jump** (from hd-2d). A lamp or fire comes on next to the characters and their shadows swing across the ground. *Fits:* a scare revealed by a lamp; a shop opening; a power cut ending.
- **The shadow that lies.** A character's shadow does something its owner doesn't (grows horns, waves back, has a second head). *Fits:* a ghost story; a hidden feeling; a secret plan.
- **Ghost smoke.** Dark smoke rises from the ghost's head, crosses the light and dims it; the set's key cools while it rises. *Fits:* a ghost reveal; anger; a bad smell gag.
- **The cover card.** Big outlined Thai title + red EP pill over a held frame of the episode's key image. *Fits:* every episode opening; a cliffhanger end card.
- **Snap reaction.** A hold on two faces, then a 0.2 s push-in on the one whose face changes, with a whoosh. *Fits:* a punchline; a scare; a realisation.

## 9. Pitfalls of the medium

- **Faces lost in dusk** → keep the hemisphere fill ≥ 1.0 and a warm front fill; only the one scare beat may go dark.
- **Lights behind a billboard don't light it** (front normal only) → always the front fill.
- **A lamp burns out the character holding it** → move the point light ~0.4 m toward the camera; cap billboard lighting (`min(outgoingLight, diffuse * 1.3 + emissive)`).
- **Ink edges doubling into a grey halo around characters** → keep the edge threshold on depth relative (Δz / z), and use the same ink colour for the drawn and the post outlines.
- **Edges on the sky or far distance flicker** → fade the edge pass with distance (no edges past ~60 m).
- **Soft shadows look 3D-render, not cartoon** → `PCFShadowMap`, small radius, shadow bias tuned per light.
- **Thai vowels and tone marks clipped** by tight text boxes → measure with `actualBoundingBoxAscent/Descent`, pad 25 % above.
- **Text under platform UI** → respect the safe area in §4.
- **No GPU in the render machine** → `LEMO_ANGLE=swiftshader`, `ss=1.5` for previews.

## 10. Engine

In `demo/`: `toon.js` (vector character drawing, pose tables, `makeToon`), `set.js` (toon materials, hut, palms, paddy, props, lamp, smoke), `post.js` (`makePost`: ink edges + DOF + bloom + grade; adapted from hd-2d's `post_ts.js`), `ui.js` (cover card, speech bubbles, subtitles), `main.js` (page contract, 1080×1920). Techniques from `$LIB/styles/hd-2d/` (billboard shadows, light-level coupling, `flick`).

## 11. Variation space

You decide the story, the cast, the place and time of day, the light the joke turns on, the opening, the ending and the music.

- Structures: **the three-beat gag** (setup, hold, snap); **the episode cliffhanger** (cover, story, a reveal cut off by the end card); **the misunderstanding** (two characters read the same shadow differently).
- Openings: **the cover card** over the key frame; **in the middle of a line** (a bubble already open); **the empty set** (only the light and the crickets, then a character walks in).
- Endings: **the snap freeze** (a reaction push-in frozen with a sting); **the light goes out** (the lamp dies, only eyes remain); **the crane up** (the village from above, smoke rising).
