// Dresses the leads of a clip so the main character never wears the same outfit twice.
// Usage: node scripts/dress.mjs <clip-id>
//
// For every cast entry with "lead": true and no "wear", picks a seeded outfit for its era (clip seed + cast seed,
// re-rolled until its signature is not in wardrobe/used.json), writes it into clips/<id>.json and appends
// { clip, who, signature, wear, date } to the log. Re-running keeps the same outfit. Rendering never reads the log.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

process.removeAllListeners("warning"); // Node notes that it type-strips the .ts file below; nothing to act on
const W = await import("../src/wardrobe-data.ts");

const id = process.argv[2];
if (!id) {
  console.error("usage: node scripts/dress.mjs <clip-id>");
  process.exit(1);
}
const file = `clips/${id}.json`;
if (!existsSync(file)) {
  console.error(`no such clip: ${file}`);
  process.exit(1);
}
const LOG = "wardrobe/used.json";
let text = readFileSync(file, "utf8");
const clip = JSON.parse(text);
const used = existsSync(LOG) ? JSON.parse(readFileSync(LOG, "utf8")) : [];

/** The same age / sex / era draws as makePerson() in src/People.tsx, for entries that leave them out. */
const who = (c) => {
  const r = W.wrng(c.seed * 7919 + 13);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const age = c.age ?? pick(["child", "teen", "adult", "adult", "adult", "elder"]);
  const female = c.female ?? r() < 0.5;
  const era = c.era ?? pick(["old", "rural", "city"]);
  return { age, female, era };
};

/** Insert `"wear": {...}` as the last field of cast.<name> in the file text, keeping the rest of the formatting. */
const insertWear = (src, name, wear) => {
  const castAt = src.indexOf('"cast"');
  const keyAt = src.indexOf(`"${name}"`, castAt);
  if (castAt < 0 || keyAt < 0) throw new Error(`cannot find cast "${name}" in ${file}`);
  const open = src.indexOf("{", keyAt);
  let depth = 0, inStr = false, close = -1;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (inStr) { if (ch === "\\") i++; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) { close = i; break; }
  }
  const body = src.slice(open, close);
  const json = JSON.stringify(wear).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/^\{/, "{ ").replace(/\}$/, " }").replace(/\{"/g, '{ "').replace(/"\}/g, '" }');
  if (!body.includes("\n")) {
    const trimmed = src.slice(0, close).replace(/\s*$/, "");
    return `${trimmed}, "wear": ${json} ${src.slice(close)}`;
  }
  // multi-line object: new line with the same indent as its last field
  const lastLine = body.slice(0, body.trimEnd().length).split("\n").pop();
  const indent = lastLine.match(/^\s*/)[0];
  const trimmed = src.slice(0, close).replace(/\s*$/, "");
  const closeIndent = src.slice(src.lastIndexOf("\n", close) + 1, close);
  return `${trimmed},\n${indent}"wear": ${json}\n${closeIndent}${src.slice(close)}`;
};

const today = new Date().toISOString().slice(0, 10);
let changed = false, logged = false;
const leads = Object.entries(clip.cast).filter(([, c]) => c.lead);
if (!leads.length) console.log(`${id}: no cast entry has "lead": true, nothing to do`);
for (const [name, c] of leads) {
  const prior = used.find((e) => e.clip === id && e.who === name);
  const others = new Set(used.filter((e) => !(e.clip === id && e.who === name)).map((e) => e.signature));
  const { age, female, era } = who(c);
  let wear = c.wear;
  if (!wear && prior) {
    wear = prior.wear; // same clip, same lead: keep the outfit it already had
    console.log(`${id}/${name}: restored the logged outfit`);
  }
  if (!wear) {
    for (let roll = 0; roll < 5000; roll++) {
      const w = W.pickWear(clip.seed * 100003 + c.seed * 7919 + roll * 104729, era, female, age);
      // a lab coat or gown covers the outer layer and hat, so do not let hidden pieces make an outfit "new"
      if (c.outfit && (w.outer || w.head)) continue;
      if (!others.has(W.wearSignature(w))) { wear = W.compactWear(w); break; }
    }
    if (!wear) throw new Error(`${id}/${name}: no unused outfit left for era ${era}`);
    console.log(`${id}/${name}: dressed in ${[wear.top, wear.bottom, wear.outer, wear.head, ...(wear.acc ?? []), wear.feet].filter(Boolean).join(" + ")}`);
  }
  const problems = W.checkWear(wear, era);
  if (problems.length) throw new Error(`${id}/${name}: ${problems.join("; ")}`);
  const signature = W.wearSignature(wear);
  if (others.has(signature)) {
    const by = used.find((e) => e.signature === signature);
    throw new Error(`${id}/${name}: this outfit was already worn by ${by.who} in clip ${by.clip}; remove "wear" and run again for a new one`);
  }
  if (!c.wear) {
    text = insertWear(text, name, wear);
    changed = true;
  }
  if (!prior) {
    used.push({ clip: id, who: name, signature, wear, date: today });
    logged = true;
  } else if (prior.signature !== signature) {
    Object.assign(prior, { signature, wear, date: today }); // the script's wear was edited by hand
    logged = true;
  } else console.log(`${id}/${name}: already dressed and logged (${signature})`);
}
if (changed) {
  JSON.parse(text); // never write a broken script
  writeFileSync(file, text);
}
if (logged) {
  mkdirSync("wardrobe", { recursive: true });
  writeFileSync(LOG, JSON.stringify(used, null, 2) + "\n");
}
