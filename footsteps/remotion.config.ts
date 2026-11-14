import { Config } from "@remotion/cli/config";

// Local: system Chrome + ANGLE. CI overrides with --gl=swangle.
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
Config.setChromiumOpenGlRenderer((process.env.REMOTION_GL as "angle" | "swangle") ?? "angle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
