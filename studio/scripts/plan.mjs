// Splits every queued composition into short frame ranges so each range renders in a fresh browser
// on its own runner, in parallel.
import { readFileSync, existsSync } from "node:fs";

const FPS = 30;
const CHUNK = Number(process.env.CHUNK_FRAMES ?? 240);
// queue file: render.json, or another file given as the first argument (for checking a plan locally)
const queue = JSON.parse(readFileSync(process.argv[2] ?? "render.json", "utf8"));
const parts = [];
const comps = [];
for (const comp of queue.compositions) {
  const id = comp.startsWith("Clip-") ? comp.slice(5) : null;
  const file = id ? `clips/${id}.json` : null;
  if (file && existsSync(file)) {
    const script = JSON.parse(readFileSync(file, "utf8"));
    // A part never crosses a change of set: switching sets inside one browser tab crashed it on CI
    // (frame 892 of Clip-bugorski, twice), so every tab only ever mounts one set. A change of time of day
    // ("time") swaps lights and textures too, so it also starts a new part. So does a change of mood or of
    // flashback, so one tab never switches look mid-part. Time here is the one the shot renders at: its own,
    // else the mood's when the mood opts in with { "time": true } (horror -> night, see src/Mood.tsx).
    const runs = [];
    let at = 0;
    for (const shot of script.shots) {
      const n = Math.round(shot.dur * FPS);
      const last = runs[runs.length - 1];
      const cue = shot.mood ?? script.mood;
      const mood = typeof cue === "string" ? cue : cue?.kind ?? "";
      const time = shot.time ?? (typeof cue === "object" && cue?.time === true && cue.kind === "horror" ? "night" : "");
      const idx = script.shots.indexOf(shot) + 1;
      const fb = shot.flashback ?? (Array.isArray(script.flashback) && idx >= script.flashback[0] && idx <= script.flashback[1]);
      const key = `${shot.set}/${time}/${mood}/${fb ? "fb" : ""}`;
      if (last && last.key === key) last.to += n;
      else runs.push({ key, set: shot.set, from: at, to: at + n });
      at += n;
    }
    let i = 0;
    for (const run of runs) {
      const count = Math.ceil((run.to - run.from) / CHUNK);
      const size = Math.ceil((run.to - run.from) / count);
      for (let from = run.from; from < run.to; from += size, i++) {
        const to = Math.min(run.to, from + size) - 1;
        parts.push({ comp, part: String(i).padStart(3, "0"), range: `--frames=${from}-${to}` });
      }
    }
    comps.push({ comp, audio: script.audio ? `public/audio/${script.audio}` : "" });
  } else {
    parts.push({ comp, part: "000", range: "" });
    comps.push({ comp, audio: "" });
  }
}
console.log(`parts=${JSON.stringify(parts)}`);
console.log(`comps=${JSON.stringify(comps)}`);
