# ฝีเท้า (Footsteps)

A 72-second vertical (1080×1920) thriller short made entirely in code with
**three.js + Remotion**, in a 2D flat-vector educational-cartoon style
(thick dark-brown ink line, round heads, dot eyes, muted warm palette).

> ชายคนหนึ่งเดินเล่นอยู่ในเมือง จู่ ๆ ก็ถูกจับตัวเข้ารถตู้ — ตื่นขึ้นมาในห้องที่ไม่รู้จัก
> รอบตัวเต็มไปด้วยคราบเลือด… เชือกที่มัดไม่แน่น เขาหลุดออกมาได้ แต่แล้วก็ได้ยินเสียงฝีเท้า

## Techniques

| Shot | Technique |
| --- | --- |
| Opening | Crane-down from the moon to street level, typewriter slug line |
| Walk | Side tracking shot with parallax foreground (defocused) |
| Van approaching | **Rack focus** — each depth plane is its own transparent WebGL canvas sharing one camera (multiplane camera), blurred independently |
| Abduction | Locked-off wide: the van *occludes* him; we only see the van rock, silhouettes behind the glass, the slam, and the empty pavement with his spilled ชาเย็น |
| Waking up | POV with eyelid mattes, focus pulling in, dutch roll settling |
| The room | Real-time **point light with shadow maps** on a swinging pendulum bulb (shadows sweep the walls), flicker, additive volumetric cone, dust motes |
| Realisation | **Dolly zoom** (Vertigo effect): camera pulls back while FOV narrows to keep the face the same size |
| Escape | 3D tube rope with an inverted-hull toon outline loosening off the wrists |
| Footsteps | Light leaking under the door, broken by the shadows of feet; each step jolts the camera |
| Sound | Fully procedural (`scripts/sound.py`): city bed, humming, van, stinger, slam, room tone, bulb buzz synced to the flicker, chain creak synced to the swing, heartbeat, reverb footsteps |

## Run

```bash
npm ci
pip install numpy scipy
npm run sound              # -> public/sound.wav
npm run dev                # Remotion Studio
npm run render             # -> out/footsteps.mp4
```

Pushing to GitHub renders automatically (`.github/workflows/render-footsteps.yml`):
the MP4 is uploaded as a workflow artifact and attached to a pre-release.

Code: `src/scenes/Act1.tsx` (city), `src/scenes/Act2.tsx` (room),
`src/chars/` (cut-out rig + faces), `src/sets/` (city, van, room),
`src/lib/Stage.tsx` (multiplane camera).
