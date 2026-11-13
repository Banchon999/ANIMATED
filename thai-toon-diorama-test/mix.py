"""Score + foley for ตะเกียงยาย, synthesized (no samples): phin plucks, khaen drone, ranat runs, ching,
crickets, cartoon foley. Reads events.json (window.EV, exported by core/render/events.mjs) → out/mix.wav"""
import json, os, sys
import numpy as np
import soundfile as sf
sys.path.insert(0, os.path.join(os.environ['LIB'], 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, whoosh, pop, thump, add, compress, limit

HERE = os.path.dirname(os.path.abspath(__file__))
EVJ = json.load(open(os.path.join(HERE, 'events.json')))
DUR = EVJ['dur']; EV = EVJ['ev']
N = int(DUR * SR) + SR
mus = np.zeros((N, 2)); amb = np.zeros((N, 2)); fol = np.zeros((N, 2))
rng = np.random.default_rng(3)
mid = lambda m: 440 * 2 ** ((m - 69) / 12)

def phin(f, d=.9, v=1.):   # plucked lute: bright attack, harmonics fading faster than the fundamental
    tt = t_(d); x = sum((.7 ** k) * np.sin(2 * np.pi * f * k * tt * (1 + .0007 * k)) * np.exp(-tt / (.55 / k ** .7)) for k in range(1, 9))
    x += hp(noise(d), 3000) * np.exp(-tt / .004) * .3
    return norm(x) * v * .8

def ranat(f, v=1.):        # bamboo xylophone: fundamental + 4th partial, short wooden decay
    d = .45; tt = t_(d); x = np.sin(2 * np.pi * f * tt) * np.exp(-tt / .12) + .35 * np.sin(2 * np.pi * f * 3.9 * tt) * np.exp(-tt / .03)
    return norm(x) * v

def ching(v=1.):           # small finger cymbals: inharmonic partials, long ring
    d = 1.2; tt = t_(d); x = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / tau) for f, a, tau in [(3120, 1, .5), (4410, .6, .35), (5980, .4, .25), (7730, .3, .2)])
    return norm(x + hp(noise(d), 6000) * np.exp(-tt / .01) * .4) * v

def khaen(fs, d, v=1.):    # free-reed mouth organ drone: reedy harmonics with slow swell and a breathing tremolo
    tt = t_(d); x = np.zeros_like(tt)
    for f in fs:
        for k in range(1, 12): x += (1 / k ** 1.1) * np.sin(2 * np.pi * f * k * tt + k)
    x = lp(x, 2600) * (1 + .12 * np.sin(2 * np.pi * 4.6 * tt)) * np.minimum(1, tt / .5) * np.minimum(1, (d - tt) / .4)
    return norm(x) * v

PENT = [55, 57, 59, 62, 64, 67, 69, 71, 74, 76]   # G-major pentatonic, Thai lai-style colour
BEAT = 60 / 104

# —— cover sting 0–3.4: ranat run up + ching ——
for i, m in enumerate([62, 64, 67, 69, 71, 74, 76, 79]): add(mus, ranat(mid(m), .5), .15 + i * .07, .5, -.3 + i * .08)
add(mus, ching(.5), .75, .4, .2); add(mus, khaen([mid(43), mid(50)], 2.7), .6, .18)
# —— 3.4–13.8: light phin riff over khaen drone, ching on the off-beats ——
riff = [0, 2, 4, 2, 5, 4, 2, 0, 1, 2, 4, 6, 5, 4, 2, 4]
t = 3.45; i = 0
while t < 13.6:
    m = PENT[riff[i % 16]] + (12 if (i // 16) % 2 and riff[i % 16] < 3 else 0)
    add(mus, phin(mid(m), .8, .55 if i % 2 else .7), t, .55, -.2 if i % 4 < 2 else .2)
    if i % 2 == 1: add(mus, ching(.25), t, .18, .4)
    t += BEAT / 2; i += 1
add(mus, khaen([mid(43), mid(50), mid(55)], 10.2), 3.45, .16)
# —— silence 13.8–14.4, then the ghost: low drone with a minor second, reverse swell, sparse phin ——
add(mus, khaen([mid(31), mid(32)], 4.4), 14.2, .2)
sw = noise(1.2) * np.linspace(0, 1, int(1.2 * SR)) ** 3; add(mus, norm(bp(sw, 300, 2500)) * .5, 13.0, .25)
for k, (tt, m) in enumerate([(15.0, 67), (15.9, 66), (16.8, 62), (17.7, 61)]): add(mus, phin(mid(m), 1.2, .5), tt, .4, .3 * (-1) ** k)
# —— snap 19.2: hit + fast panic riff on ranat ——
add(mus, thump(1, 55), 19.2, .7)
for k in range(18): add(mus, ranat(mid(PENT[(k * 3) % 10] + 12), .6), 19.25 + k * .12, .35, .5 * np.sin(k))
# —— end card 21.6: sting ——
for k, m in enumerate([79, 76, 74, 67]): add(mus, ranat(mid(m), .7), 21.6 + k * .09, .5)
add(mus, ching(1), 21.95, .5); add(mus, khaen([mid(43), mid(50), mid(59)], 2.3), 21.9, .2)

# —— ambience: crickets at dusk (pulsed narrow-band noise), wind when the ghost comes ——
tt = np.arange(N) / SR
cr = bp(rng.standard_normal(N), 4200, 4700) * (np.sin(2 * np.pi * 28 * tt) > .2) * (.5 + .5 * np.sin(2 * np.pi * .7 * tt) ** 2)
cr2 = bp(rng.standard_normal(N), 3600, 3900) * (np.sin(2 * np.pi * 22 * tt + 1) > .4) * (.5 + .5 * np.cos(2 * np.pi * .43 * tt) ** 2)
amb[:, 0] += norm(cr) * .05 + norm(cr2) * .03; amb[:, 1] += norm(cr) * .035 + norm(cr2) * .045
wind = lp(rng.standard_normal(N), 500) * np.clip((tt - 14.2) / 1.5, 0, 1) * np.clip((21.6 - tt) / 1, 0, 1)
amb[:, 0] += norm(wind) * .12; amb[:, 1] += norm(wind) * .12

# —— foley from the page's events ——
for e in EV:
    ty, at = e['type'], e['t']
    if ty == 'match': d = .35; x = bp(noise(d), 1500, 7000) * env_exp(d, .08) * (1 + np.sin(2 * np.pi * 40 * t_(d))); add(fol, norm(x) * .6, at, .5, -.2)
    elif ty == 'flame': d = .8; x = lp(noise(d), 900) * np.minimum(1, t_(d) / .05) * env_exp(d, .3); add(fol, norm(x), at, .45, -.2)
    elif ty == 'pop': add(fol, pop(1), at, .5)
    elif ty == 'whoosh': add(fol, whoosh(.3, 1), at - .15, .6)
    elif ty == 'wind': pass

mix = mus * .9 + amb + fol
mix = np.stack([compress(mix[:, 0]), compress(mix[:, 1])], 1)
fade = np.clip((DUR - tt) / .6, 0, 1)[:, None]
mix = norm(mix * fade, .7); mix = np.stack([limit(mix[:, 0], .9), limit(mix[:, 1], .9)], 1)[: int(DUR * SR)]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix.wav', mix.shape[0] / SR, 's')
