import { continueRender, delayRender, staticFile } from "remotion";

const faces: [string, string][] = [
  ["400", "kanit-thai-400-normal.woff2"],
  ["800", "kanit-thai-800-normal.woff2"],
  ["400", "kanit-latin-400-normal.woff2"],
  ["800", "kanit-latin-800-normal.woff2"],
];

if (typeof document !== "undefined") {
  const handle = delayRender("Loading Kanit");
  Promise.all(
    faces.map(([w, file]) => {
      const ff = new FontFace("Kanit", `url(${staticFile(file)}) format('woff2')`, { weight: w });
      document.fonts.add(ff);
      return ff.load();
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}
