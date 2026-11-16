// Wardrobe catalogue: pure data + the seeded outfit picker. No imports, so `scripts/dress.mjs` can load this
// file directly with Node (type stripping). Drawing lives in Wardrobe.tsx.

export type WEra = "old" | "rural" | "city";
export type WAge = "child" | "teen" | "adult" | "elder";
export type Sex = "f" | "m" | "any";
export type PatternId = "plain" | "stripes" | "check" | "floral" | "plaid";
export const PATTERNS: PatternId[] = ["plain", "stripes", "check", "floral", "plaid"];
export const PATTERN_TH: Record<PatternId, string> = { plain: "สีพื้น", stripes: "ลายทาง", check: "ลายตาราง", floral: "ลายดอกเล็ก", plaid: "ลายผ้าขาวม้า" };

/** Colour slots of an outfit. top2 = pattern ink / trim / inner tee, bottom2 = hem band or print. */
export type ColorSlot = "top" | "top2" | "bottom" | "bottom2" | "outer" | "head" | "acc" | "feet";
export type Colors = Record<ColorSlot, string>;

type Base = {
  id: string;
  th: string; // Thai label
  short?: string; // shorter label for review sheets
  eras: WEra[];
  sex?: Sex; // default any
  ages?: WAge[]; // default all
  w?: number; // pick weight, default 1
  palette?: string[]; // fixed colours for this piece (else the era palette)
  palette2?: string[]; // fixed colours for its second slot
};
export type Neck = "round" | "v" | "scoop" | "collar" | "polo" | "stand" | "slit" | "hood" | "lapel" | "softcollar";
export type TopPiece = Base & {
  sleeve: number; // 0 none .. 0.5 to the elbow .. 0.92 long
  sleeveW?: number; // sleeve width factor (fitted < 1 < loose)
  neck: Neck;
  buttons?: "plain" | "knot" | "gold";
  pockets?: "chest" | "two" | "lower" | "kangaroo";
  sabai?: boolean; // breast cloth over one shoulder, other shoulder bare
  straps?: boolean; // sleeveless with wide armholes
  print?: boolean; // graphic on the chest
  jersey?: boolean; // number front and back, trim on neck and sleeves
  inner?: boolean; // blazer: top2 is the tee seen between the lapels
  bow?: boolean; // school blouse bow (female only)
  lace?: boolean; // lace trim on the neckline
  patterns?: PatternId[];
  noOuter?: boolean;
  pair?: { f?: string[]; m?: string[] }; // allowed bottoms
  feet?: string[]; // allowed feet
};
export type BottomShape = "pants" | "tube" | "skirt";
export type BottomPiece = Base & {
  shape: BottomShape;
  len: number; // pants: fraction of the leg covered (1 = ankle); tube/skirt: fraction of leg length
  wide: number; // pants leg width / skirt flare
  jong?: boolean; // draped front fold + tail tucked up at the back
  hemBand?: boolean; // tube skirt with a patterned hem band (ตีนซิ่น)
  bands?: boolean; // woven horizontal bands on the body
  batik?: boolean; // small print in bottom2
  checks?: boolean; // checked sarong
  seams?: boolean; // jeans stitching and pockets
  stripe?: boolean; // side stripe (track pants)
  crease?: boolean;
  pleats?: boolean;
};
export type OuterPiece = Base & {
  len: "waist" | "hip" | "knee";
  sleeve: number;
  open: boolean;
  collar: "none" | "denim" | "hood" | "v";
  pockets?: "two" | "four" | "chest";
  apron?: boolean;
};
export type HeadPiece = Base & { kind: "ngob" | "cap" | "bucket" | "scarf" | "band" };
export type AccPiece = Base & { kind: "waistcloth" | "bag" | "glasses" | "watch" | "necklace" | "backpack" };
export type FeetPiece = Base & { kind: "bare" | "sandals" | "flipflops" | "sneakers" | "leather" };

const ALL: WEra[] = ["old", "rural", "city"];
const KIDS: WAge[] = ["child", "teen"];
const GROWN: WAge[] = ["teen", "adult", "elder"];
const INDIGO = ["#2c3a5e", "#26304d", "#34466e"];
const PAKHAOMA = ["#b8332e", "#2f5fa8", "#3f8f4a", "#7a3b8f", "#c9622e"];

export const TOPS: TopPiece[] = [
  { id: "kokrachao", th: "เสื้อคอกระเช้า", short: "เสื้อคอกระเช้า", eras: ["old", "rural"], sex: "f", ages: GROWN, sleeve: 0.12, neck: "scoop", lace: true, buttons: "plain", palette: ["#e8dcc6", "#f0e2d0", "#d9a8a0", "#c9d4c0", "#e6cfa8", "#b9c6d6"], palette2: ["#fbf6ec"], patterns: ["plain", "plain", "floral"], pair: { f: ["sin", "phathung", "jong"] } },
  { id: "khaenkrabok", th: "เสื้อแขนกระบอก", short: "เสื้อแขนกระบอก", eras: ["old"], sex: "f", sleeve: 0.92, sleeveW: 0.8, neck: "stand", buttons: "plain", palette: ["#e8dcc6", "#d9a8a0", "#c9d4c0", "#7a3b3b", "#34466e", "#c9a56a"], patterns: ["plain", "plain", "floral"], pair: { f: ["sin", "jong"] } },
  { id: "mohom", th: "เสื้อม่อฮ่อม", eras: ["old", "rural"], sleeve: 0.92, sleeveW: 1.08, neck: "slit", pockets: "lower", palette: INDIGO, palette2: ["#d9c9a8"], noOuter: false },
  { id: "sabai", th: "สไบ", eras: ["old"], sex: "f", ages: GROWN, sleeve: 0, neck: "round", sabai: true, palette: ["#b5463e", "#c9a56a", "#5a4a6e", "#7a3b3b", "#3d6b5a", "#a86a3a"], palette2: ["#e3c57c", "#f0e2d0"], patterns: ["plain", "stripes"], noOuter: true, pair: { f: ["sin", "jong"] }, feet: ["bare"] },
  { id: "kuiheng", th: "เสื้อกุยเฮง", eras: ["old", "rural"], sex: "m", sleeve: 0.55, sleeveW: 1.1, neck: "stand", buttons: "knot", pockets: "lower", palette: ["#e8dcc6", "#f0ebe0", "#34466e", "#6a5a48", "#8a7a5a"] },
  { id: "raj", th: "เสื้อราชปะแตน", short: "เสื้อราชปะแตน", eras: ["old"], sex: "m", ages: ["adult", "elder"], w: 0.6, sleeve: 0.92, neck: "stand", buttons: "gold", pockets: "lower", palette: ["#f2efe6", "#ece4d0"], noOuter: true, pair: { m: ["jong"] }, feet: ["leather"] },
  { id: "singlet", th: "เสื้อกล้าม", eras: ["old", "rural"], sex: "m", sleeve: 0, neck: "scoop", straps: true, palette: ["#f2efe6", "#e8e2d2", "#9fb3c8", "#d8d0c0"] },
  { id: "tee", th: "เสื้อยืด", eras: ["rural", "city"], sleeve: 0.28, neck: "round", patterns: ["plain", "plain", "stripes"] },
  { id: "polo", th: "เสื้อโปโล", eras: ["rural", "city"], ages: GROWN, sleeve: 0.28, neck: "polo", buttons: "plain", patterns: ["plain", "plain", "stripes"] },
  { id: "floral", th: "เสื้อลายดอก", eras: ["rural", "city"], w: 0.8, sleeve: 0.28, sleeveW: 1.1, neck: "collar", buttons: "plain", patterns: ["floral"] },
  { id: "jersey", th: "เสื้อกีฬา", eras: ["rural", "city"], sleeve: 0.28, neck: "v", jersey: true },
  { id: "workshirt", th: "เสื้อเชิ้ตแขนยาวทำงาน", short: "เสื้อเชิ้ตทำงาน", eras: ["rural"], sleeve: 0.92, sleeveW: 1.08, neck: "collar", buttons: "plain", pockets: "two", patterns: ["plain", "check", "check"] },
  { id: "shirt", th: "เสื้อเชิ้ตมีปก", eras: ["city"], ages: GROWN, sleeve: 0.92, neck: "collar", buttons: "plain", pockets: "chest", patterns: ["plain", "plain", "stripes", "check"] },
  { id: "hoodie", th: "เสื้อฮู้ด", eras: ["city"], ages: ["child", "teen", "adult"], sleeve: 0.92, sleeveW: 1.12, neck: "hood", pockets: "kangaroo" },
  { id: "blazer", th: "เบลเซอร์ทับเสื้อยืด", short: "เบลเซอร์", eras: ["city"], ages: ["adult"], sleeve: 0.92, neck: "lapel", inner: true, pockets: "lower", buttons: "plain", noOuter: true },
  { id: "graphic", th: "เสื้อยืดลายสกรีน", short: "เสื้อสกรีน", eras: ["city"], ages: ["child", "teen", "adult"], sleeve: 0.28, neck: "round", print: true },
  { id: "blouse", th: "เสื้อเบลาส์", eras: ["city"], sex: "f", ages: GROWN, sleeve: 0.34, sleeveW: 1.15, neck: "softcollar", buttons: "plain", patterns: ["plain", "plain", "floral", "stripes"] },
  { id: "school", th: "เสื้อนักเรียน", eras: ["rural", "city"], ages: KIDS, sleeve: 0.3, neck: "collar", pockets: "chest", bow: true, palette: ["#f7f7f4"], palette2: ["#1f2d5a"], pair: { f: ["pleated"], m: ["shorts", "slacks"] }, feet: ["sneakers", "leather"] },
];

export const BOTTOMS: BottomPiece[] = [
  { id: "jong", th: "โจงกระเบน", eras: ["old"], shape: "pants", len: 0.62, wide: 1.5, jong: true, palette: ["#5a2f3a", "#3d4a36", "#26304a", "#7a5a2a", "#6a3a2e", "#4a3a5a"] },
  { id: "sin", th: "ผ้าซิ่น", eras: ["old", "rural"], sex: "f", shape: "tube", len: 0.9, wide: 1.1, hemBand: true, bands: true, palette: ["#5a2f3a", "#3d4a36", "#26304a", "#6a3a2e", "#7a3b3b"], palette2: ["#c9a56a", "#d9b45a", "#a8443f"] },
  { id: "kuay", th: "กางเกงขาก๊วย", eras: ["old", "rural"], shape: "pants", len: 0.84, wide: 1.42, palette: ["#2b2f3f", "#26304d", "#34466e", "#4a3a2a", "#1f1f24"] },
  { id: "sarong", th: "ผ้าโสร่ง", eras: ["old", "rural"], sex: "m", ages: GROWN, shape: "tube", len: 0.88, wide: 1.12, checks: true, palette: ["#2f4a6a", "#5a2f3a", "#3d4a36", "#4a3a5a"], palette2: ["#d9c9a8", "#e8dcc6"] },
  { id: "shorts", th: "กางเกงขาสั้น", eras: ["rural", "city"], shape: "pants", len: 0.42, wide: 1.28 },
  { id: "jeans", th: "กางเกงยีนส์", eras: ["rural", "city"], shape: "pants", len: 1, wide: 1.02, seams: true, palette: ["#33507c", "#2b3f63", "#4a6a9a", "#23304a", "#5a7aa8"] },
  { id: "phathung", th: "ผ้าถุง", eras: ["rural"], sex: "f", shape: "tube", len: 0.9, wide: 1.1, batik: true, palette: ["#7b4fa3", "#2f6f5a", "#8a5a3a", "#2b3f63", "#a8443f"], palette2: ["#f3c044", "#f4e4c6", "#f08fa8"] },
  { id: "track", th: "กางเกงวอร์ม", eras: ["rural", "city"], shape: "pants", len: 1, wide: 1.12, stripe: true, palette: ["#1f2530", "#2b3f63", "#3a3a3a", "#5a2f3a"], palette2: ["#f4f4f4", "#f3c044"] },
  { id: "slacks", th: "กางเกงสแล็ค", eras: ["city"], ages: ["child", "teen", "adult", "elder"], shape: "pants", len: 1, wide: 1.06, crease: true },
  { id: "pleated", th: "กระโปรงพลีท", eras: ["rural", "city"], sex: "f", shape: "skirt", len: 0.52, wide: 1.55, pleats: true },
  { id: "wide", th: "กางเกงขากว้าง", eras: ["city"], ages: GROWN, shape: "pants", len: 1, wide: 1.5 },
];

export const OUTERS: OuterPiece[] = [
  { id: "cardigan", th: "เสื้อคลุมไหมพรม", short: "เสื้อไหมพรม", eras: ["rural", "city"], len: "hip", sleeve: 0.92, open: true, collar: "v" },
  { id: "apron", th: "ผ้ากันเปื้อน", eras: ALL, ages: GROWN, len: "knee", sleeve: 0, open: false, collar: "none", apron: true, pockets: "two" },
  { id: "denim", th: "แจ็กเก็ตยีนส์", eras: ["rural", "city"], ages: GROWN, len: "waist", sleeve: 0.92, open: true, collar: "denim", pockets: "chest", palette: ["#4a6a9a", "#33507c", "#6a88b8"] },
  { id: "raincoat", th: "เสื้อกันฝน", eras: ["rural", "city"], w: 0.6, len: "knee", sleeve: 0.92, open: false, collar: "hood", palette: ["#f3c044", "#3f7fd0", "#e4573f", "#3aa57c"] },
  { id: "vest", th: "เสื้อกั๊ก", eras: ALL, len: "hip", sleeve: 0, open: true, collar: "v", pockets: "four" },
];

export const HEADS: HeadPiece[] = [
  { id: "ngob", th: "งอบ", eras: ["old", "rural"], kind: "ngob", palette: ["#d9b56a", "#cfa95a", "#e0c27c"] },
  { id: "cap", th: "หมวกแก๊ป", eras: ["rural", "city"], kind: "cap" },
  { id: "bucket", th: "หมวกบักเก็ต", eras: ["rural", "city"], kind: "bucket" },
  { id: "scarf", th: "ผ้าโพกศีรษะ", eras: ALL, sex: "f", ages: GROWN, kind: "scarf" },
  { id: "pakhaoma_head", th: "ผ้าขาวม้าโพกหัว", short: "โพกผ้าขาวม้า", eras: ["old", "rural"], ages: GROWN, kind: "band", palette: PAKHAOMA },
];

export const ACCS: AccPiece[] = [
  { id: "pakhaoma", th: "ผ้าขาวม้าคาดเอว", short: "คาดผ้าขาวม้า", eras: ["old", "rural"], kind: "waistcloth", palette: PAKHAOMA },
  { id: "bag", th: "กระเป๋าสะพาย", short: "กระเป๋าสะพาย", eras: ALL, kind: "bag", palette: ["#8a5a3a", "#b5653a", "#5a4a3a", "#7a3b3b", "#2f4a6a"] },
  { id: "glasses", th: "แว่นตา", eras: ALL, ages: GROWN, kind: "glasses", w: 0.7 },
  { id: "watch", th: "นาฬิกาข้อมือ", short: "นาฬิกา", eras: ["rural", "city"], ages: GROWN, kind: "watch" },
  { id: "necklace", th: "สร้อยคอ", eras: ALL, kind: "necklace", palette: ["#d9b45a", "#c9c9c9"] },
  { id: "backpack", th: "เป้", eras: ["rural", "city"], ages: ["child", "teen", "adult"], kind: "backpack" },
];

export const FEET: FeetPiece[] = [
  { id: "barefoot", th: "เท้าเปล่า", eras: ["old", "rural"], kind: "bare" },
  { id: "sandals", th: "รองเท้าแตะรัดส้น", short: "แตะรัดส้น", eras: ALL, kind: "sandals", palette: ["#7a4a2a", "#2b2b2b", "#5a3a22"] },
  { id: "flipflops", th: "รองเท้าแตะหูคีบ", short: "แตะหูคีบ", eras: ["rural", "city"], kind: "flipflops", palette: ["#2f6fd0", "#e4573f", "#2b2b2b", "#3aa57c", "#f3c044"] },
  { id: "sneakers", th: "รองเท้าผ้าใบ", eras: ["rural", "city"], kind: "sneakers", palette: ["#f4f4f4", "#2b2b2b", "#c44536", "#2f6f8f"] },
  { id: "leather", th: "รองเท้าหนัง", eras: ["old", "city"], kind: "leather", palette: ["#3a2a20", "#1f1f1f", "#5a3a22"] },
];

export const ERA_TH: Record<WEra, string> = { old: "สมัยก่อน", rural: "ชนบทปัจจุบัน", city: "เมืองปัจจุบัน" };

/** Era palettes. old: muted indigo, earth, faded red. rural: bright and sun-faded. city: neutrals with one accent. */
export const PALETTES: Record<WEra, { top: string[]; bottom: string[]; outer: string[]; head: string[]; ink: string[]; accent?: string[] }> = {
  old: {
    top: ["#e8dcc6", "#34466e", "#2c3a5e", "#7a3b3b", "#9c4a3a", "#566b4a", "#c9a56a", "#8a6a4a"],
    bottom: ["#2b2f3f", "#5a2f3a", "#3d4a36", "#4a3a2a", "#6a3a2e", "#26304a"],
    outer: ["#4a3a2a", "#34466e", "#6a5a48", "#8a6a4a"],
    head: ["#e8dcc6", "#7a3b3b", "#34466e", "#c9a56a"],
    ink: ["#e8dcc6", "#c9a56a", "#a8443f", "#2c3a5e"],
  },
  rural: {
    top: ["#e4573f", "#3aa57c", "#f3c044", "#5b8cf0", "#f08fa8", "#8a6fd0", "#f4f1ea", "#e98a3c", "#4fb3c9"],
    bottom: ["#33507c", "#4a4038", "#7b4fa3", "#2f6f5a", "#8a5a3a", "#2b3f63", "#1f2530"],
    outer: ["#e98a3c", "#5b8cf0", "#3aa57c", "#c9a56a", "#f08fa8", "#6a5a48"],
    head: ["#f3c044", "#e4573f", "#3aa57c", "#5b8cf0", "#f4f1ea", "#c9a56a"],
    ink: ["#ffffff", "#fff1d6", "#1f2530", "#ffd15c"],
  },
  city: {
    top: ["#22303c", "#f4f4f4", "#2b2b2b", "#d8c7a0", "#6b7a8f", "#e8e2d6", "#8a8f96", "#3a4660"],
    bottom: ["#1f2530", "#3a4660", "#6d5a4a", "#c9c2b4", "#2b2b2b", "#8a8f96"],
    outer: ["#2b2b2b", "#d8c7a0", "#6b7a8f", "#e8e2d6", "#3a4660"],
    head: ["#2b2b2b", "#f4f4f4", "#d8c7a0", "#3a4660"],
    ink: ["#f4f4f4", "#1f2530", "#d8c7a0"],
    accent: ["#c44536", "#e9a23b", "#2f6f8f", "#3f8f6a", "#d9668a", "#5560c9"],
  },
};

/** What a script (or dress.mjs) writes: piece ids, optional colours and pattern. */
export type WearSpec = { top: string; bottom: string; outer?: string; head?: string; acc?: string[]; feet: string; colors?: Partial<Colors>; pattern?: PatternId };
/** A fully resolved outfit: every colour and the pattern filled in. */
export type Wear = { top: string; bottom: string; outer?: string; head?: string; acc: string[]; feet: string; colors: Colors; pattern: PatternId };

const byId = <T extends Base>(list: T[]) => Object.fromEntries(list.map((p) => [p.id, p])) as Record<string, T>;
export const TOP = byId(TOPS), BOTTOM = byId(BOTTOMS), OUTER = byId(OUTERS), HEAD = byId(HEADS), ACC = byId(ACCS), FOOT = byId(FEET);
/** Thai label of any piece id. */
const pieceOf = (id: string): Base | undefined => TOP[id] ?? BOTTOM[id] ?? OUTER[id] ?? HEAD[id] ?? ACC[id] ?? FOOT[id];
export const pieceTh = (id: string) => pieceOf(id)?.th ?? id;
/** Short Thai label (review sheets). */
export const pieceShort = (id: string) => pieceOf(id)?.short ?? pieceTh(id);

// same generator as lib.ts rng(), copied so this file has no imports
export const wrng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const fits = (p: Base, era: WEra, female: boolean, age: WAge) =>
  p.eras.includes(era) && (!p.sex || p.sex === "any" || p.sex === (female ? "f" : "m")) && (!p.ages || p.ages.includes(age));

const weighted = <T extends Base>(r: () => number, list: T[]): T | undefined => {
  if (!list.length) return undefined;
  const sum = list.reduce((n, p) => n + (p.w ?? 1), 0);
  let x = r() * sum;
  for (const p of list) if ((x -= p.w ?? 1) < 0) return p;
  return list[list.length - 1];
};
const pickOf = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

/** Fill in every missing colour and the pattern of an outfit, deterministically from `r`. */
export const finishWear = (w: WearSpec, era: WEra, r: () => number): Wear => {
  const pal = PALETTES[era];
  const top = TOP[w.top], bottom = BOTTOM[w.bottom], outer = w.outer ? OUTER[w.outer] : undefined;
  const head = w.head ? HEAD[w.head] : undefined, foot = FOOT[w.feet];
  const acc = w.acc ?? [];
  const accPiece = acc.map((a) => ACC[a]).find((a) => a && (a.kind === "bag" || a.kind === "backpack" || a.kind === "waistcloth" || a.kind === "necklace"));
  // city: neutrals, then exactly one free slot gets the accent colour
  const accentSlot = pal.accent ? pickOf<ColorSlot>(r, ["top", "bottom", "outer", "head"].filter((k) => (k === "outer" ? outer && !outer.palette : k === "head" ? head && !head.palette : k === "top" ? !top?.palette : !bottom?.palette)) as ColorSlot[]) : undefined;
  const colour = (slot: ColorSlot, own: string[] | undefined, fallback: string[]) => (own ? pickOf(r, own) : slot === accentSlot && pal.accent ? pickOf(r, pal.accent) : pickOf(r, fallback));
  const c: Colors = {
    top: colour("top", top?.palette, pal.top),
    top2: colour("top2", top?.palette2, top?.inner ? PALETTES.city.top : pal.ink),
    bottom: colour("bottom", bottom?.palette, pal.bottom),
    bottom2: colour("bottom2", bottom?.palette2, pal.ink),
    outer: colour("outer", outer?.palette, pal.outer),
    head: colour("head", head?.palette, pal.head),
    acc: colour("acc", accPiece?.palette, ["#8a5a3a", "#2b2b2b", "#5a4a3a"]),
    feet: colour("feet", foot?.palette, ["#2b2b2b"]),
  };
  if (c.top2 === c.top) c.top2 = c.top === "#f4f4f4" || c.top === "#ffffff" ? "#1f2530" : "#f4f4f4";
  const patterns = top?.patterns ?? ["plain"];
  const pattern = w.pattern ?? pickOf(r, patterns);
  return { top: w.top, bottom: w.bottom, outer: w.outer, head: w.head, acc: [...acc], feet: w.feet, colors: { ...c, ...(w.colors ?? {}) }, pattern };
};

const OUTER_P: Record<WEra, number> = { old: 0.15, rural: 0.3, city: 0.32 };
const HEAD_P: Record<WEra, number> = { old: 0.4, rural: 0.38, city: 0.16 };

/** A seeded outfit for a person of this era / sex / age. */
export const pickWear = (seed: number, era: WEra, female: boolean, age: WAge): Wear => {
  const r = wrng(seed * 2654435761 + 977);
  const ok = <T extends Base>(list: T[]) => list.filter((p) => fits(p, era, female, age));
  const top = weighted(r, ok(TOPS))!;
  const allowed = top.pair?.[female ? "f" : "m"];
  let bottoms = ok(BOTTOMS).filter((b) => !allowed || allowed.includes(b.id));
  if (!bottoms.length) bottoms = ok(BOTTOMS);
  const bottom = weighted(r, bottoms)!;
  const outer = !top.noOuter && r() < OUTER_P[era] ? weighted(r, ok(OUTERS)) : undefined;
  const head = r() < HEAD_P[era] && !(outer?.collar === "hood" && r() < 0.5) ? weighted(r, ok(HEADS)) : undefined;
  const n = r() < 0.45 ? 0 : r() < 0.75 ? 1 : 2;
  const acc: string[] = [];
  for (let i = 0; i < n; i++) {
    const carry = acc.some((a) => ACC[a].kind === "bag" || ACC[a].kind === "backpack");
    const a = weighted(r, ok(ACCS).filter((p) => !acc.includes(p.id) && !(carry && (p.kind === "bag" || p.kind === "backpack")) && !(p.kind === "waistcloth" && (bottom.shape !== "pants" || outer?.apron))));
    if (a) acc.push(a.id);
  }
  let feet = ok(FEET).filter((f) => !top.feet || top.feet.includes(f.id));
  if (!feet.length) feet = ok(FEET);
  if (era === "old") feet = feet.flatMap((f) => (f.kind === "bare" ? [f, f, f] : [f]));
  const foot = weighted(r, feet)!;
  return finishWear({ top: top.id, bottom: bottom.id, outer: outer?.id, head: head?.id, acc, feet: foot.id }, era, r);
};

/** The same outfit with only the colours its pieces use (what dress.mjs writes into a script). */
export const compactWear = (w: Wear): WearSpec => {
  const keep: ColorSlot[] = ["top", "top2", "bottom", "bottom2"];
  if (w.outer) keep.push("outer");
  if (w.head) keep.push("head");
  if (w.acc.length) keep.push("acc");
  if (FOOT[w.feet]?.kind !== "bare") keep.push("feet");
  const colors = Object.fromEntries(keep.map((k) => [k, w.colors[k]])) as Partial<Colors>;
  return { top: w.top, bottom: w.bottom, ...(w.outer ? { outer: w.outer } : {}), ...(w.head ? { head: w.head } : {}), ...(w.acc.length ? { acc: w.acc } : {}), feet: w.feet, colors, pattern: w.pattern };
};

/** Sorted piece ids + main colours (top, bottom, outer). Two outfits with the same signature look the same. */
export const wearSignature = (w: Wear | WearSpec) => {
  const ids = [w.top, w.bottom, w.outer, w.head, ...(w.acc ?? []), w.feet].filter(Boolean).sort();
  const c = w.colors ?? {};
  return `${ids.join("+")}|${[c.top, c.bottom, w.outer ? c.outer : ""].map((x) => (x ?? "").toLowerCase()).join(",")}`;
};

/** Problems with a script's `wear` for a person of this era (empty = fine). */
export const checkWear = (w: WearSpec, era: WEra): string[] => {
  const out: string[] = [];
  const slot = (name: string, id: string | undefined, table: Record<string, Base>, need: boolean) => {
    if (id === undefined) { if (need) out.push(`wear.${name} is required`); return; }
    const p = table[id];
    if (!p) out.push(`wear.${name}: unknown piece "${id}" (have: ${Object.keys(table).join(", ")})`);
    else if (!p.eras.includes(era)) out.push(`wear.${name}: "${id}" does not fit era "${era}" (fits: ${p.eras.join(", ")})`);
  };
  slot("top", w.top, TOP, true);
  slot("bottom", w.bottom, BOTTOM, true);
  slot("outer", w.outer, OUTER, false);
  slot("head", w.head, HEAD, false);
  slot("feet", w.feet, FOOT, true);
  if (w.acc !== undefined && !Array.isArray(w.acc)) out.push(`wear.acc must be a list of ids`);
  for (const a of w.acc ?? []) slot("acc", a, ACC, true);
  if (w.pattern !== undefined && !PATTERNS.includes(w.pattern)) out.push(`wear.pattern: unknown "${w.pattern}" (have: ${PATTERNS.join(", ")})`);
  for (const [k, v] of Object.entries(w.colors ?? {})) {
    if (!["top", "top2", "bottom", "bottom2", "outer", "head", "acc", "feet"].includes(k)) out.push(`wear.colors.${k}: unknown slot`);
    else if (typeof v !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v)) out.push(`wear.colors.${k}: must be a colour like "#a8443f"`);
  }
  return out;
};
