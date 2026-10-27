"""Original background music for the guidebook films (synthesised here, so there are no rights to clear).

Warm and calm: soft chord pads, a plucked dutar-like arpeggio (Karplus-Strong), a round bass and a quiet
doira-style frame-drum groove. The music settles on a bright chord when the closing screen appears,
chimes softly for each tick on it, and can add a soft thud for stamps.

usage: python3 music.py OUT.wav --dur 32 --final 25.8 --ticks 27.0,27.6,28.3 --thuds 14.1 --key 2 --seed 1
"""
import argparse
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(1)


def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    e = np.full(n, s, dtype=np.float64)
    e[:a] = np.linspace(0, 1, a, endpoint=False) if a else e[:a]
    e[a:a + d] = np.linspace(1, s, d, endpoint=False)[: max(0, min(d, n - a))]
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pad(freqs, dur, vol=0.08):
    """A soft, slightly detuned pad: a few harmonics per voice, slow attack and release."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            for h, amp in ((1, 1.0), (2, 0.32), (3, 0.12), (4, 0.05)):
                out += amp * np.sin(2 * np.pi * ff * h * t + rng.uniform(0, 6.28))
    out *= env_adsr(n, min(0.9, dur * 0.3), 0.4, 0.85, min(1.2, dur * 0.35))
    out *= 1 + 0.06 * np.sin(2 * np.pi * 0.35 * t)
    return vol * out / (len(freqs) * 3)


def smooth(x, k):
    """Moving-average low-pass: takes the hiss off noise bursts."""
    return np.convolve(x, np.ones(k) / k, mode="same")


def pluck(f, dur, vol=0.22, bright=0.5):
    """Karplus-Strong string, a little like a dutar."""
    n = int(dur * SR)
    period = max(2, int(round(SR / f)))
    buf = smooth(rng.uniform(-1, 1, period), max(2, period // 6)) * 2.2
    out = np.empty(n)
    pos = 0
    decay = 0.996
    while pos < n:
        k = min(period, n - pos)
        out[pos:pos + k] = buf[:k]
        nxt = decay * 0.5 * (buf + np.roll(buf, -1))
        buf = bright * nxt + (1 - bright) * 0.5 * (nxt + np.roll(nxt, 1))
        pos += period
    out *= env_adsr(n, 0.006, 0.05, 0.9, min(0.25, dur * 0.5))
    return vol * out


def bass(f, dur, vol=0.18):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return vol * s * env_adsr(n, 0.01, 0.25, 0.55, min(0.3, dur * 0.4))


def dum(vol=0.30):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 55 + 70 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 11)
    thump = smooth(rng.normal(0, 1, n), 30) * np.exp(-t * 60) * 0.6
    return vol * (body + thump)


def tak(vol=0.10):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    noise = smooth(rng.normal(0, 1, n), 6)
    band = noise - smooth(noise, 24)  # a mid band: the dry slap of the skin's edge
    ring = np.sin(2 * np.pi * 620 * t) * 0.5
    return vol * (band * 0.8 + ring) * np.exp(-t * 38) * np.minimum(1, t / 0.003)


def chime(f, vol=0.16):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 3.2), (2.76, 0.35, 5), (5.4, 0.18, 8), (8.9, 0.08, 12)))
    return vol * s * np.minimum(1, t / 0.004)


def thud(vol=0.38):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 48 + 60 * np.exp(-t * 30)
    return vol * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + smooth(rng.normal(0, 0.2, n), 40) * np.exp(-t * 50)


def add(buf, sig, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def compose(dur, final, ticks, thuds, key, seed):
    global rng
    rng = np.random.default_rng(seed)
    n = int((dur + 0.05) * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    bpm = 92
    beat = 60 / bpm
    bar = 4 * beat
    root = 50 + key  # D3 + key shift
    # I – vi – IV – V(sus), in major; voicings as semitones from the root
    prog = [(0, [0, 4, 7, 11, 14]), (9, [0, 3, 7, 10]), (5, [0, 4, 7, 11]), (7, [0, 5, 7, 10])]
    scale = [0, 2, 4, 7, 9, 12, 14, 16, 19]  # major pentatonic, two octaves
    patterns = [[0, 2, 4, 2, 5, 4, 2, 1], [0, 4, 2, 5, 3, 6, 4, 2], [2, 0, 4, 2, 6, 4, 2, 4]]
    pat = patterns[seed % len(patterns)]
    t = 0.0
    k = 0
    while t < final:
        off, chord = prog[k % len(prog)]
        length = min(bar, final - t)
        freqs = [midi(root + 12 + off + c) for c in chord]
        p = pad(freqs, length + 0.6)
        add(L, p, t); add(R, p * 0.92, t)
        for b in (0, 2):
            if t + b * beat < final:
                bs = bass(midi(root - 12 + off), beat * 1.6, vol=0.075)
                add(L, bs, t + b * beat); add(R, bs, t + b * beat)
        # plucks start after the first bar, on eighths with a light swing
        if t >= bar * 0.99:
            for i in range(8):
                at = t + i * beat / 2 + (0.035 if i % 2 else 0)
                if at >= final - 0.1:
                    break
                deg = scale[pat[i] % len(scale)]
                f = midi(root + 24 + deg)  # the key's pentatonic: consonant over every chord
                pl = pluck(f, 0.9, vol=0.2 + 0.04 * (i % 4 == 0), bright=0.55)
                pan = 0.35 * np.sin(i)
                add(L, pl * (1 - pan), at); add(R, pl * (1 + pan), at)
        # doira groove from the second bar: dum . tak . dum dum tak .
        if t >= bar * 0.99:
            for i, hit in enumerate("d.t.ddt."):
                at = t + i * beat / 2
                if at >= final - 0.05:
                    break
                if hit == "d":
                    s = dum(0.10)
                    add(L, s, at); add(R, s, at)
                elif hit == "t":
                    s = tak(0.07)
                    add(L, s * 0.8, at); add(R, s * 1.1, at)
        t += bar
        k += 1
    # closing: a bright, resolved chord that swells and fades
    tail = dur - final + 0.05
    fin = [midi(root + 12 + c) for c in (0, 4, 7, 11, 14, 19)]
    p = pad(fin, tail, vol=0.11)
    add(L, p, final); add(R, p, final)
    bs = bass(midi(root - 12), min(tail, 3.0), vol=0.07)
    add(L, bs, final); add(R, bs, final)
    for i, at in enumerate(ticks):
        c = chime(midi(root + 36 + scale[min(i * 2, len(scale) - 1)]))
        add(L, c, at); add(R, c, at)
    for at in thuds:
        s = thud()
        add(L, s, at); add(R, s, at)
    # fades, gentle saturation, level
    fi = int(0.6 * SR); fo = int(1.6 * SR)
    for ch in (L, R):
        ch[:fi] *= np.linspace(0, 1, fi)
        ch[-fo:] *= np.linspace(1, 0, fo) ** 1.5
    st = np.stack([L, R], 1)
    st = np.tanh(st * 1.4) / np.tanh(1.4)
    st *= 0.89 / max(1e-6, np.abs(st).max())
    rms = np.sqrt((st ** 2).mean())
    st *= min(1.0, 0.12 / max(rms, 1e-6))  # about -18 dBFS RMS: background, not foreground
    return st


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--dur", type=float, required=True)
    ap.add_argument("--final", type=float, required=True)
    ap.add_argument("--ticks", default="")
    ap.add_argument("--thuds", default="")
    ap.add_argument("--key", type=int, default=0)
    ap.add_argument("--seed", type=int, default=1)
    a = ap.parse_args()
    nums = lambda s: [float(x) for x in s.split(",") if x.strip()]
    st = compose(a.dur, a.final, nums(a.ticks), nums(a.thuds), a.key, a.seed)
    pcm = (st * 32767).astype("<i2")
    with wave.open(a.out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
