"""Narration from a beat script with edge-tts (free Microsoft voices), timed per line and per word.

python3 scripts/tts.py <clip-id>
  reads  clips/drafts/<id>.script.json   (beats[].lines, voices)
  writes public/audio/<id>.mp3           (whole episode, loudness -16 LUFS)
         clips/words/<id>.json           ({audio, words: [{w, s, e}], lines: [{beat, i, who, text, s, e}]})

Runs on GitHub Actions (workflow tts-studio.yml): the workspace cannot reach the edge-tts servers.
A line "[who] text" is spoken by voices[who]; any other line by voices.narrator.
voices[who] = {voice, rate, pitch, fx}; fx "phone" = thin phone speaker, "door" = muffled through a door.
Gaps: GAP_LINE between lines of a beat, GAP_BEAT between beats, so the cuts land in silence.
Times are exact for lines (each line is its own file); word times come from edge-tts WordBoundary
events when the voice sends them (Thai voices may send none: then words stays empty and scripts/subs.py
can still time words from the whisper workflow).
"""
import asyncio, json, os, re, subprocess, sys, tempfile

import edge_tts

GAP_LINE, GAP_BEAT, LEAD = 0.35, 0.9, 0.4
SR = 44100
FX = {
    "phone": "highpass=f=380,lowpass=f=3400,acompressor=threshold=-20dB:ratio=4,volume=1.4",
    "door": "lowpass=f=1500,aecho=0.8:0.55:45|90:0.35|0.2,volume=1.6",
}

cid = sys.argv[1]
src = json.load(open(f"clips/drafts/{cid}.script.json", encoding="utf-8"))
voices = src["voices"]
tmp = tempfile.mkdtemp()


def run(*a):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)


def dur(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


async def speak(text, v, out):
    words = []
    com = edge_tts.Communicate(text, v["voice"], rate=v.get("rate", "+0%"), pitch=v.get("pitch", "+0Hz"), boundary="WordBoundary")
    with open(out, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"], "s": ch["offset"] / 1e7, "e": (ch["offset"] + ch["duration"]) / 1e7})
    return words


async def main():
    parts, lines, words = [], [], []
    t = LEAD
    silence = lambda s, name: (run("-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{s:.3f}", "-c:a", "pcm_s16le", name), name)[1]
    parts.append(silence(LEAD, f"{tmp}/lead.wav"))
    n = 0
    for bi, b in enumerate(src["beats"]):
        for li, raw in enumerate(b["lines"]):
            m = re.match(r"^\[([^\]]+)\]\s*(.*)$", raw)
            who, text = (m.group(1), m.group(2)) if m else ("narrator", raw)
            v = voices.get(who) or voices["narrator"]
            mp3 = f"{tmp}/{n:04d}.mp3"
            for attempt in range(4):
                try:
                    ws = await speak(text, v, mp3)
                    if os.path.getsize(mp3) > 0:
                        break
                except Exception as e:  # network hiccups on the runner
                    print(f"retry {attempt + 1} {b['id']}:{li}: {e}", flush=True)
                    await asyncio.sleep(3 + attempt * 3)
            else:
                raise SystemExit(f"edge-tts failed on {b['id']} line {li}: {text}")
            wav = f"{tmp}/{n:04d}.wav"
            af = FX.get(v.get("fx", ""), "anull")
            run("-i", mp3, "-af", f"{af},aresample={SR}", "-ac", "1", "-c:a", "pcm_s16le", wav)
            d = dur(wav)
            lines.append({"beat": b["id"], "i": li, "who": who, "text": text, "s": round(t, 3), "e": round(t + d, 3)})
            words += [{"w": w["w"], "s": round(t + w["s"], 3), "e": round(t + w["e"], 3), "beat": b["id"], "i": li} for w in ws]
            parts.append(wav)
            t += d
            last = li == len(b["lines"]) - 1
            gap = GAP_BEAT if last else GAP_LINE
            parts.append(silence(gap, f"{tmp}/{n:04d}g.wav"))
            t += gap
            n += 1
            print(f"{b['id']} {li:2d} {who:10s} {d:5.2f}s  {text[:40]}", flush=True)
    listf = f"{tmp}/list.txt"
    open(listf, "w").write("".join(f"file '{p}'\n" for p in parts))
    os.makedirs("public/audio", exist_ok=True)
    os.makedirs("clips/words", exist_ok=True)
    run("-f", "concat", "-safe", "0", "-i", listf, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "160k", f"public/audio/{cid}.mp3")
    json.dump({"audio": f"{cid}.mp3", "source": "edge-tts", "words": words, "lines": lines}, open(f"clips/words/{cid}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"{cid}: {len(lines)} lines, {len(words)} words, {t:.1f}s")


asyncio.run(main())
