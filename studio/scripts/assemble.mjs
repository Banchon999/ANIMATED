// Joins the rendered parts of one composition without re-encoding, then adds the narration track.
// Usage: node scripts/assemble.mjs <composition> [audio file]
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [comp, audio] = process.argv.slice(2);
const dir = "out/parts";
const parts = readdirSync(dir).filter((f) => f.startsWith(`${comp}-`) && f.endsWith(".mp4")).sort();
if (!parts.length) throw new Error(`no parts found for ${comp}`);
mkdirSync("out/final", { recursive: true });
const list = `out/${comp}.txt`;
writeFileSync(list, parts.map((p) => `file 'parts/${p}'`).join("\n") + "\n");
const joined = audio ? `out/${comp}-video.mp4` : `out/final/${comp}.mp4`;
const run = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined]);
if (audio) {
  // pad the narration with silence so the video keeps its full length
  run(["-i", joined, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "apad", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", `out/final/${comp}.mp4`]);
}
console.log(`${comp}: ${parts.length} parts -> out/final/${comp}.mp4`);
