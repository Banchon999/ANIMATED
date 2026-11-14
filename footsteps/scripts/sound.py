"""Procedural sound design for "ฝีเท้า" (Footsteps).

Everything is synthesised from noise and oscillators — no samples — so the
soundtrack is reproducible on CI. Event times are in film frames (30 fps) and
mirror the constants in src/scenes/Act1.tsx and Act2.tsx.

usage: python3 scripts/sound.py public/sound.wav
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
FPS = 30
TOTAL_FRAMES = 2160
N = int(TOTAL_FRAMES / FPS * SR) + SR
rng = np.random.default_rng(7)

A1 = 0          # act 1 start
A2 = 700        # act 2 start (frame offset)


def fr(f):
    return int(f / FPS * SR)


def t_arr(n):
    return np.arange(n) / SR


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def noise(n):
    return rng.standard_normal(n)


def brown(n):
    b = np.cumsum(noise(n))
    b = hp(b, 20)
    return b / (np.abs(b).max() + 1e-9)


def env_ad(n, attack, decay):
    t = t_arr(n)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def reverb(x, seconds=1.6, mix=0.35, bright=3000):
    n = int(seconds * SR)
    ir = noise(n) * np.exp(-t_arr(n) / (seconds / 5))
    ir = lp(ir, bright)
    ir /= np.sqrt((ir ** 2).sum())
    wet = fftconvolve(x, ir)[: len(x)]
    return x * (1 - mix) + wet * mix


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, sig, at_frame, gain=1.0, pan=0.0):
        s = fr(at_frame)
        if s >= N:
            return
        e = min(N, s + len(sig))
        sig = sig[: e - s] * gain
        self.L[s:e] += sig * np.sqrt(0.5 * (1 - pan))
        self.R[s:e] += sig * np.sqrt(0.5 * (1 + pan))

    def add_span(self, sig_fn, f0, f1, gain=1.0, pan=0.0, fade=0.5):
        n = fr(f1) - fr(f0)
        sig = sig_fn(n)
        k = int(fade * SR)
        if k and len(sig) > 2 * k:
            sig[:k] *= np.linspace(0, 1, k)
            sig[-k:] *= np.linspace(1, 0, k)
        self.add(sig, f0, gain, pan)


bus = Bus()

# ----------------------------------------------------------------- sound kit

def step_soft(n=None):
    n = int(0.12 * SR)
    s = bp(noise(n), 300, 2500) * env_ad(n, 0.002, 0.025)
    s += np.sin(2 * np.pi * 90 * t_arr(n)) * env_ad(n, 0.001, 0.03) * 0.6
    return s


def step_heavy():
    n = int(0.6 * SR)
    t = t_arr(n)
    thump = np.sin(2 * np.pi * (55 + 40 * np.exp(-t * 30)) * t) * env_ad(n, 0.002, 0.12)
    grit = bp(noise(n), 150, 1200) * env_ad(n, 0.001, 0.05) * 0.5
    heel = bp(noise(n), 1500, 5000) * env_ad(n, 0.0005, 0.012) * 0.25
    return reverb(thump + grit + heel, 2.2, 0.45, 1800)


def heartbeat(bpm, frames, gain=1.0):
    n = fr(frames)
    out = np.zeros(n)
    period = 60 / bpm
    beat_n = int(0.25 * SR)
    tb = t_arr(beat_n)
    beat = np.sin(2 * np.pi * (45 + 15 * np.exp(-tb * 25)) * tb) * env_ad(beat_n, 0.004, 0.06)
    beat = lp(beat, 160)
    t = 0.0
    while t < n / SR:
        for off, g in ((0, 1.0), (0.18, 0.7)):
            s = int((t + off) * SR)
            e = min(n, s + beat_n)
            if s < n:
                out[s:e] += beat[: e - s] * g
        t += period
    return out * gain


def whoosh(dur=0.5, lo=200, hi=3000):
    n = int(dur * SR)
    x = noise(n)
    k = np.sin(np.linspace(0, np.pi, n)) ** 2
    y = np.zeros(n)
    # sweep by blending two band passes
    a = bp(x, lo, lo * 3)
    b = bp(x, hi / 3, hi)
    m = np.linspace(0, 1, n)
    y = (a * (1 - m) + b * m) * k
    return y


def boom(dur=3.0, f=38):
    n = int(dur * SR)
    t = t_arr(n)
    s = np.sin(2 * np.pi * (f + 30 * np.exp(-t * 6)) * t) * env_ad(n, 0.005, 0.9)
    s += lp(noise(n), 200) * env_ad(n, 0.002, 0.3) * 0.4
    return reverb(s, 3.0, 0.35, 600)


def screech(dur=1.2, f=2200):
    n = int(dur * SR)
    t = t_arr(n)
    vib = f * (1 + 0.01 * np.sin(2 * np.pi * 7 * t))
    ph = 2 * np.pi * np.cumsum(vib) / SR
    s = (np.sin(ph) + 0.3 * np.sin(2 * ph + 0.4) + 0.2 * np.sin(3.01 * ph)) * env_ad(n, 0.02, dur / 2.5)
    return bp(s + bp(noise(n), f * 0.8, f * 1.3) * 0.4, 600, 6000)


def slam():
    n = int(1.5 * SR)
    t = t_arr(n)
    s = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 40)) * t) * env_ad(n, 0.001, 0.15)
    s += bp(noise(n), 200, 4000) * env_ad(n, 0.0005, 0.06) * 0.8
    s += bp(noise(n), 2000, 7000) * env_ad(n, 0.0005, 0.02) * 0.4
    return reverb(s, 1.4, 0.25, 4000)


def engine(n, rpm_curve, gain=1.0):
    """rpm_curve: array (len n) of base frequency in Hz"""
    ph = 2 * np.pi * np.cumsum(rpm_curve) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    s = saw * 0.5 + np.sin(ph * 0.5) * 0.6 + np.sin(ph * 2) * 0.15
    s += lp(noise(n), 400) * 0.25
    return lp(s, 700) * gain


def creak(dur=0.5, f=380):
    n = int(dur * SR)
    t = t_arr(n)
    fm = f * (1 + 0.15 * np.sin(2 * np.pi * 3 * t))
    ph = 2 * np.pi * np.cumsum(fm) / SR
    pulses = (np.sin(2 * np.pi * 55 * t) > 0.6).astype(float)
    s = np.sin(ph) * pulses * np.sin(np.linspace(0, np.pi, n)) ** 2
    return bp(s, 200, 2500)


def rope_rub(dur=0.35):
    n = int(dur * SR)
    s = bp(noise(n), 800, 4000) * (np.sin(np.linspace(0, np.pi, n)) ** 1.5)
    s *= 0.6 + 0.4 * np.sin(2 * np.pi * 37 * t_arr(n))
    return s


def hum_melody(f0, f1):
    """the hero humming a little tune (soft, nasal sine)"""
    notes = [0, 2, 4, 2, 0, -3, 0, None, 4, 5, 4, 2, 0, None, 2, 4, 7, 4, 2, 0, None, None]
    n = fr(f1) - fr(f0)
    out = np.zeros(n)
    nd = int(0.42 * SR)
    pos = 0
    i = 0
    while pos + nd < n:
        note = notes[i % len(notes)]
        if note is not None:
            f = 220 * 2 ** (note / 12)
            t = t_arr(nd)
            v = f * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t))
            ph = 2 * np.pi * np.cumsum(v) / SR
            tone = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
            out[pos : pos + nd] += tone * env_ad(nd, 0.04, 0.35)
        pos += nd
        i += 1
    return bp(out, 150, 2200)


def drone(n, f=55, rough=0.3):
    t = t_arr(n)
    s = sum(np.sin(2 * np.pi * f * k * (1 + 0.002 * j) * t + j) / k for j, k in enumerate((1, 1.5, 2, 3)))
    s *= 1 + rough * np.sin(2 * np.pi * 0.13 * t)
    s += lp(brown(n), 120) * 0.6
    return lp(s, 400)


def buzz(n, flick=None):
    t = t_arr(n)
    s = np.sin(2 * np.pi * 100 * t) * 0.5 + np.sin(2 * np.pi * 200 * t) * 0.3 + np.sign(np.sin(2 * np.pi * 100 * t)) * 0.08
    s = lp(s, 1500)
    if flick is not None:
        s *= flick
        crackle = (flick < 0.6).astype(float) * bp(noise(n), 2000, 8000) * 0.6
        s += crackle
    return s


# ------------------------------------------------------------------- act 1

# city ambience: distant traffic, wind, a far scooter, a dog
bus.add_span(lambda n: lp(brown(n), 500) * 0.9 + bp(noise(n), 200, 1200) * 0.05, A1, A1 + 650, gain=0.35, fade=1.5)
for f, pan in ((40, -0.6), (230, 0.5), (380, -0.3)):
    n = int(3.5 * SR)
    t = t_arr(n)
    sc = engine(n, 95 + 25 * np.sin(np.linspace(0, 3, n)), 0.5) * np.sin(np.linspace(0, np.pi, n)) ** 2
    bus.add(lp(sc, 900), f, 0.12, pan)
for f in (120, 190):
    n = int(0.35 * SR)
    bark = bp(noise(n), 500, 1400) * env_ad(n, 0.01, 0.08)
    bus.add(reverb(bark, 1.5, 0.6), f, 0.05, 0.7)

# hero footsteps — walk phase p = t*0.21, foot strikes at p = pi/2 + k*pi
k = 0
while True:
    f = (np.pi / 2 + k * np.pi) / 0.21
    if f > 500:
        break
    near = 150 <= f < 420
    bus.add(step_soft(), f, 0.35 if near else 0.15, -0.1 if k % 2 else 0.1)
    k += 1

# humming during the walk
bus.add(hum_melody(160, 420), 160, 0.12)

# the van: far rumble -> approach -> brake -> idle -> door -> slam -> drive off
n = fr(700) - fr(300)
tt = np.linspace(300, 700, n)
rpm = np.interp(tt, [300, 420, 470, 528, 600, 610, 650, 700], [38, 40, 52, 30, 26, 60, 75, 70])
vol = np.interp(tt, [300, 420, 470, 500, 528, 600, 640, 700], [0.05, 0.12, 0.35, 0.6, 0.5, 0.55, 0.35, 0.08])
bus.add(engine(n, rpm) * vol, 300, 0.9)
bus.add(screech(1.0, 1900), 498, 0.08, 0.2)
bus.add(whoosh(0.55, 300, 2500), 526, 0.5)                    # door slides open
bus.add(boom(2.5, 36), 528, 0.9)                              # stinger on the grab
bus.add(screech(0.9, 3100), 528, 0.06)
for f in (531, 537, 552, 560, 566, 574, 581):                 # muffled struggle
    n2 = int(0.25 * SR)
    th = lp(np.sin(2 * np.pi * 80 * t_arr(n2)) * env_ad(n2, 0.001, 0.05) + noise(n2) * env_ad(n2, 0.001, 0.02) * 0.4, 500)
    bus.add(th, f, 0.5, 0.1)
bus.add(slam(), 590, 1.0, 0.05)
bus.add(screech(0.6, 1500) * 0.4, 606, 0.06, 0.3)

# tension bed rising from the rack focus to the grab
n = fr(530) - fr(300)
bus.add(drone(n, 41, 0.6) * np.linspace(0, 1, n) ** 2, 300, 0.25)

# ------------------------------------------------------------------- black + act 2

bus.add(heartbeat(62, 140, 0.9), A2 + 0)                      # black, then waking
bus.add(lp(noise(fr(60)), 300) * np.linspace(0, 1, fr(60)) * 0.08, A2 + 0)

# room tone: drone + bulb buzz with flicker (mirrors lib/anim.ts flicker())
def flicker_curve(f0, f1, n):
    frames = np.arange(f0, f1)

    def hash1(nn):
        s = np.sin(nn * 127.1 + 311.7) * 43758.5453
        return (s - np.floor(s)) * 2 - 1

    def noise1(x, seed):
        i = np.floor(x)
        fr_ = x - i
        u = fr_ * fr_ * (3 - 2 * fr_)
        return hash1(i + seed * 57) * (1 - u) + hash1(i + 1 + seed * 57) * u

    burst = noise1(frames * 0.07, 1)
    kk = noise1(frames * 1.7, 3)
    v = np.where(burst < 0.45, 1.0, np.where(kk > 0.1, 1.0, 0.15 + 0.3 * (kk + 1)))
    return np.interp(np.arange(n) / SR * FPS + f0, frames, v)


ROOM0, ROOM1 = A2 + 60, A2 + 1303
n = fr(ROOM1) - fr(ROOM0)
room = drone(n, 49, 0.4) * 0.5
room[: fr(120)] *= np.linspace(0, 1, fr(120))
bus.add(room, ROOM0, 0.32)
bz = buzz(n, flicker_curve(ROOM0 - A2, ROOM1 - A2, n))
bz[: fr(60)] = lp(bz[: fr(60)], 300)  # muffled while still waking
bus.add(bz, ROOM0, 0.05, 0.15)
# dripping water somewhere
for f in range(ROOM0 + 40, ROOM1 - 30, 97):
    n2 = int(0.3 * SR)
    t = t_arr(n2)
    d = np.sin(2 * np.pi * (900 + 1400 * np.exp(-t * 60)) * t) * env_ad(n2, 0.001, 0.03)
    bus.add(reverb(d, 1.8, 0.6), f, 0.04, -0.4)
# chain creak at the extremes of the bulb's swing (period 2*pi/0.075 frames)
half = np.pi / 0.075
f = ROOM0 - A2
while f < ROOM1 - A2:
    bus.add(creak(0.45, 360 + (f % 3) * 40), A2 + f, 0.05, 0.2)
    f += half

# reveal of the empty chair: a low hit + rising strings
bus.add(boom(3.0, 33), A2 + 570, 0.55)
n = fr(A2 + 720) - fr(A2 + 450)
tt = t_arr(n)
strings = sum(np.sin(2 * np.pi * (330 * 2 ** (iv / 12)) * (1 + 0.003 * np.sin(2 * np.pi * (5 + iv) * tt)) * tt) for iv in (0, 1, 6))
strings *= np.linspace(0, 1, n) ** 3
bus.add(bp(strings, 200, 3000), A2 + 450, 0.05)
# dolly zoom: heartbeat speeds up + whine
bus.add(heartbeat(110, 90, 0.8), A2 + 630)
n = fr(90)
tt = t_arr(n)
whine = np.sin(2 * np.pi * np.cumsum(np.linspace(600, 2400, n)) / SR) * np.linspace(0, 1, n) ** 2
bus.add(whine, A2 + 630, 0.03)

# rope: rubbing while he wriggles, then release + drop
for f in range(A2 + 730, A2 + 820, 9):
    bus.add(rope_rub(0.3), f, 0.18, 0.1 * np.sin(f))
bus.add(whoosh(0.3, 400, 3000), A2 + 816, 0.25)
n2 = int(0.4 * SR)
bus.add(lp(noise(n2), 900) * env_ad(n2, 0.002, 0.07), A2 + 830, 0.35)  # rope hits the floor
# chair scrape + exhale of relief
n2 = int(0.7 * SR)
sc = bp(noise(n2), 300, 1800) * np.sin(np.linspace(0, np.pi, n2)) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t_arr(n2)))
bus.add(sc, A2 + 868, 0.25)
n2 = int(1.1 * SR)
bus.add(bp(noise(n2), 400, 2500) * np.sin(np.linspace(0, np.pi, n2)) ** 2, A2 + 905, 0.07)
# tiptoes: tiny taps
for i in range(7):
    bus.add(step_soft() * 0.5, A2 + 990 + i * 37, 0.08)

# the footsteps behind the door — heavier and closer each time
STEPS = [1150, 1178, 1204, 1228, 1250, 1300]
for i, s in enumerate(STEPS):
    g = 0.35 + i * 0.13
    bus.add(lp(step_heavy(), 600 + i * 400), A2 + s, min(g, 1.1), 0.1)
bus.add(heartbeat(128, 150, 0.7), A2 + 1150)
# light dies: electric pop, then nothing
n2 = int(0.25 * SR)
bus.add(bp(noise(n2), 1500, 9000) * env_ad(n2, 0.0005, 0.03), A2 + 1303, 0.5)
# end: silence... a door handle turns. Title hit.
n2 = int(0.9 * SR)
t = t_arr(n2)
handle = bp(noise(n2), 1200, 6000) * env_ad(n2, 0.003, 0.05) * 0.6
handle += np.sin(2 * np.pi * 1700 * t) * env_ad(n2, 0.001, 0.02) * 0.3
handle += np.roll(bp(noise(n2), 900, 4000) * env_ad(n2, 0.002, 0.08), int(0.35 * SR)) * 0.5
bus.add(reverb(handle, 1.6, 0.45), A2 + 1345, 0.6)
bus.add(boom(4.0, 30), A2 + 1362, 0.7)

# ---------------------------------------------------------------- master
mix_ = np.stack([bus.L, bus.R], axis=1)[: int(TOTAL_FRAMES / FPS * SR)]
mix_ = hp(mix_.T, 25).T
peak = np.abs(mix_).max()
mix_ = mix_ / peak * 0.89
mix_ = np.tanh(mix_ * 1.1) / np.tanh(1.1)
wavfile.write(sys.argv[1] if len(sys.argv) > 1 else "public/sound.wav", SR, (mix_ * 32767).astype(np.int16))
print("wrote", mix_.shape[0] / SR, "s")
