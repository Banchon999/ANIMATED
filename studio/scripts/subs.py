"""Subtitles from the narration script, timed by whisper word timings.

python3 scripts/subs.py <clip-id>   (whisper ran on public/audio/<audio>, so its times are clip times)
  reads clips/<id>.json, clips/drafts/<id>.narration.txt, clips/words/<id>.json
  writes "subs" into clips/<id>.json
The text shown is always the script (correct spelling); whisper only gives the timing.
"""
import json, re, sys, difflib
from pythainlp.tokenize import word_tokenize

cid = sys.argv[1]
MAXC = 22  # characters per subtitle line (Thai, without combining marks counted)
clip = json.load(open(f'clips/{cid}.json'))
lines = [l.strip() for l in open(f'clips/drafts/{cid}.narration.txt', encoding='utf-8') if l.strip()]
words = json.load(open(f'clips/words/{cid}.json'))['words']

norm = lambda s: re.sub(r'[\s“”"\'.,!?…ๆ\-]', '', s)
# whisper characters with times
wc, wt = [], []
for w in words:
    t = norm(w['w'])
    for i, ch in enumerate(t):
        wc.append(ch); wt.append(w['s'] + (w['e'] - w['s']) * (i + 0.5) / max(1, len(t)))
W = ''.join(wc)

# script characters, remembering which line / token they belong to
toks = []  # (line idx, token text)
for li, l in enumerate(lines):
    for tk in word_tokenize(l, engine='newmm', keep_whitespace=True):
        toks.append((li, tk))
sc, sowner = [], []
for ti, (li, tk) in enumerate(toks):
    for ch in norm(tk):
        sc.append(ch); sowner.append(ti)
S = ''.join(sc)

st = [None] * len(S)
for a, b, n in difflib.SequenceMatcher(None, S, W, autojunk=False).get_matching_blocks():
    for k in range(n): st[a + k] = wt[b + k]
# fill the gaps by interpolation
known = [i for i, v in enumerate(st) if v is not None]
for i in range(len(st)):
    if st[i] is None:
        lo = max([k for k in known if k < i], default=None); hi = min([k for k in known if k > i], default=None)
        if lo is None: st[i] = st[hi]
        elif hi is None: st[i] = st[lo]
        else: st[i] = st[lo] + (st[hi] - st[lo]) * (i - lo) / (hi - lo)
cover = len(known) / max(1, len(S))

# token start / end times
tstart, tend = {}, {}
for i, ti in enumerate(sowner):
    tstart.setdefault(ti, st[i]); tend[ti] = st[i]

# chunk each line into short phrases: break at spaces first, then at word boundaries
vis = lambda s: len(re.sub(r'[ัิ-ฺ็-๎]', '', s))
chunks = []  # (text, start, end)
for li in range(len(lines)):
    ids = [i for i, (l, _) in enumerate(toks) if l == li]
    lens = [vis(toks[i][1]) for i in ids]
    total = sum(lens)
    n = max(1, -(-total // MAXC))  # parts, balanced in length
    cuts, acc, want = [], 0, [total * (k + 1) / n for k in range(n - 1)]
    # candidate break before token k: cost = distance from the wanted point, spaces are cheap, never split a quote
    cands = []
    for k in range(1, len(ids)):
        acc = sum(lens[:k])
        inq = toks[ids[k]][1] in '"”' or ''.join(toks[i][1] for i in ids[:k]).count('“') > ''.join(toks[i][1] for i in ids[:k]).count('”')
        cands.append((k, acc, toks[ids[k - 1]][1].isspace() or toks[ids[k]][1].isspace(), inq))
    for w in want:
        best = min((c for c in cands if not cuts or c[0] > cuts[-1]), key=lambda c: abs(c[1] - w) - (4 if c[2] else 0) + (6 if c[3] else 0), default=None)
        if best: cuts.append(best[0])
    bounds = [0] + cuts + [len(ids)]
    for a_, b_ in zip(bounds, bounds[1:]):
        part = ids[a_:b_]
        text = ''.join(toks[i][1] for i in part).strip()
        timed = [i for i in part if i in tstart]
        if not text or not timed: continue
        chunks.append([text, tstart[timed[0]], tend[timed[-1]]])

# highlight: words the old shot captions marked with *...*
marks = sorted({m for s in clip['shots'] for c in s.get('caption', []) for m in re.findall(r'\*([^*]+)\*', c) if vis(m) >= 4}, key=len, reverse=True)
subs = []
for i, (text, s, e) in enumerate(chunks):
    nxt = chunks[i + 1][1] if i + 1 < len(chunks) else None
    end = e + 0.45 if nxt is None else min(nxt, max(e + 0.45, s + 0.8))
    for m in marks:
        if m in text and '*' not in text:
            text = text.replace(m, f'*{m}*', 1); break
    subs.append({'s': round(s - 0.05, 3), 'e': round(end, 3), 'text': text.replace('“', '"').replace('”', '"')})

clip['subs'] = subs
json.dump(clip, open(f'clips/{cid}.json', 'w'), ensure_ascii=False, indent=2)
print(f'{cid}: {len(subs)} subtitles, whisper matched {cover:.0%} of script characters')
