import type { ClipScript } from "../src/Clip";
import sample from "./sample.json";
import bugorski from "./bugorski.json";
import posetest from "./posetest.json";
import settest2 from "./settest2.json";

// Add every new clip script here; each one becomes a composition called "Clip-<id>".
export const CLIPS = [sample, bugorski, posetest, settest2] as unknown as ClipScript[];
