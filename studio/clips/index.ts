import type { ClipScript } from "../src/Clip";
import sample from "./sample.json";
import bugorski from "./bugorski.json";

// Add every new clip script here; each one becomes a composition called "Clip-<id>".
export const CLIPS = [sample, bugorski] as unknown as ClipScript[];
