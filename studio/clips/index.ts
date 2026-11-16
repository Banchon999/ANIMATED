import type { ClipScript } from "../src/Clip";
import sample from "./sample.json";
import bugorski from "./bugorski.json";
import posetest from "./posetest.json";
import settest2 from "./settest2.json";
import settest3 from "./settest3.json";
import moodtest from "./moodtest.json";

// Add every new clip script here; each one becomes a composition called "Clip-<id>".
export const CLIPS = [sample, bugorski, posetest, settest2, settest3, moodtest] as unknown as ClipScript[];
