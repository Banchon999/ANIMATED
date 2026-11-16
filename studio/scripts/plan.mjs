// Splits every queued composition into short frame ranges so each range renders in a fresh browser
// on its own runner, in parallel.
import { readFileSync, existsSync } from "node:fs";

const FPS = 30;
const CHUNK = Number(process.env.CHUNK_FRAMES ?? 240);
const queue = JSON.parse(readFileSync("render.json", "utf8"));
const parts = [];
const comps = [];
for (const comp of queue.compositions) {
  const id = comp.startsWith("Clip-") ? comp.slice(5) : null;
  const file = id ? `clips/${id}.json` : null;
  if (file && existsSync(file)) {
    const script = JSON.parse(readFileSync(file, "utf8"));
    // A part never crosses a change of set: switching sets inside one browser tab crashed it on CI
    // (frame 892 of Clip-bugorski, twice), so every tab only ever mounts one set. A change of time of day
    // ("time") swaps lights and textures too, so it also starts a new part.
    const runs = [];
    let at = 0;
    for (const shot of script.shots) {
      const n = Math.round(shot.dur * FPS);
      const last = runs[runs.length - 1];
      const key = `${shot.set}/${shot.time ?? ""}`;
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
