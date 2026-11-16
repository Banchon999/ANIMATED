import type { ClipScript } from "../src/Clip";
import maeEp1 from "./mae-ep1.json";
import maeEp2 from "./mae-ep2.json";
import maeEp3 from "./mae-ep3.json";
import sample from "./sample.json";
import bugorski from "./bugorski.json";
import posetest from "./posetest.json";
import settest2 from "./settest2.json";
import settest3 from "./settest3.json";
import moodtest from "./moodtest.json";
import holdtest from "./holdtest.json";

// Add every new clip script here; each one becomes a composition called "Clip-<id>".
export const CLIPS = [sample, bugorski, posetest, settest2, settest3, moodtest, holdtest, maeEp1, maeEp2, maeEp3] as unknown as ClipScript[];
