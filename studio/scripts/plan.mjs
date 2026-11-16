// Splits every queued composition into short frame ranges so each range renders in a fresh browser
// on its own runner. Long single renders crashed the browser ("Target closed") part-way through.
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
    const frames = script.shots.reduce((n, s) => n + Math.round(s.dur * FPS), 0);
    let i = 0;
    for (let from = 0; from < frames; from += CHUNK, i++) {
      const to = Math.min(frames, from + CHUNK) - 1;
      parts.push({ comp, part: String(i).padStart(3, "0"), range: `--frames=${from}-${to}` });
    }
    comps.push({ comp, audio: script.audio ? `public/audio/${script.audio}` : "" });
  } else {
    parts.push({ comp, part: "000", range: "" });
    comps.push({ comp, audio: "" });
  }
}
console.log(`parts=${JSON.stringify(parts)}`);
console.log(`comps=${JSON.stringify(comps)}`);
