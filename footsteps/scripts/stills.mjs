// usage: node scripts/stills.mjs <compId> <frame...>  -> /tmp/fs/<comp>-<frame>.jpg (half size)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [id, ...frames] = process.argv.slice(2);
fs.mkdirSync("/tmp/fs", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const opts = { serveUrl, browserExecutable: process.env.REMOTION_BROWSER ?? "/usr/bin/google-chrome", chromiumOptions: { gl: "angle" } };
const composition = await selectComposition({ ...opts, id });
for (const f of frames.map(Number)) {
  await renderStill({ ...opts, composition, frame: f, output: `/tmp/fs/${id}-${f}.jpg`, imageFormat: "jpeg", scale: 0.4 });
  console.log("done", f);
}
