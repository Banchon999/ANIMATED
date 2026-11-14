/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
Config.setChromiumOpenGlRenderer("swangle");
if (existsSync("/usr/bin/google-chrome")) {
  Config.setBrowserExecutable("/usr/bin/google-chrome");
}
Config.setConcurrency(Number(process.env.RENDER_CONCURRENCY ?? 2));
