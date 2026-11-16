import type { ClipScript } from "../src/Clip";
import sample from "./sample.json";
import bugorski from "./bugorski.json";
import posetest from "./posetest.json";

// Add every new clip script here; each one becomes a composition called "Clip-<id>".
export const CLIPS = [sample, bugorski, posetest] as unknown as ClipScript[];
