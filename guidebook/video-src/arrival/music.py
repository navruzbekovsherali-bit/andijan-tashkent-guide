"""Original background music for the guidebook films (synthesised here, so there are no rights to clear).

Calm ambient bed: a soft electric-piano chord on each bar, a slow warm pad under it, a sparse bell melody of
chord tones and a round sub bass, all in a long, dark reverb. No drums and no repeating riff, so it stays in
the background. The music blooms into a resolved chord when the closing screen appears, rings a soft bell for
each tick on it, and can add a muted hit for stamps.

usage: python3 music.py OUT.wav --dur 32 --final 25.8 --ticks 27.0,27.6,28.3 --thuds 14.1 --key 2 --seed 1
"""
import argparse
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(1)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def ramp(n, a, r):
    """Linear attack and an exponential-ish release, in samples."""
    e = np.ones(n)
    a, r = min(a, n), min(r, n)
    if a:
        e[:a] = np.linspace(0, 1, a) ** 2
    if r:
        e[-r:] *= np.linspace(1, 0, r) ** 2
    return e


def epiano(f, dur, vol=0.05):
    """A soft Rhodes-like note: a sine with a little second harmonic, a quickly fading tine and slow tremolo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t + 0.4)
    tine = 0.12 * np.sin(2 * np.pi * 4.02 * f * t) * np.exp(-t * 9)
    s = (body * np.exp(-t * 0.9) + tine) * (1 + 0.08 * np.sin(2 * np.pi * 4.2 * t))
    return vol * s * ramp(n, int(0.012 * SR), int(min(0.8, dur * 0.4) * SR))


def pad(freqs, dur, vol=0.035):
    """A slow, warm pad: two gently detuned sines per voice with a soft swell."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for det in (-0.06, 0.06):
            ff = f * 2 ** (det / 12)
            out += np.sin(2 * np.pi * ff * t + rng.uniform(0, 6.28)) + 0.15 * np.sin(4 * np.pi * ff * t)
    out *= ramp(n, int(min(1.6, dur * 0.4) * SR), int(min(1.6, dur * 0.4) * SR))
    return vol * out / len(freqs)


def bell(f, vol=0.05, dur=2.4):
    """A soft glass bell: inharmonic partials with a slow decay, rounded attack."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1, 1.6), (2.0, 0.22, 2.8), (3.01, 0.08, 4.5)))
    return vol * s * np.minimum(1, t / 0.008)


def sub(f, dur, vol=0.045):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return vol * np.sin(2 * np.pi * f * t) * ramp(n, int(0.25 * SR), int(min(1.2, dur * 0.4) * SR))


def hit(vol=0.22):
    """A muted, low hit for stamps: no click, no noise."""
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = 70 + 40 * np.exp(-t * 25)
    return vol * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * np.minimum(1, t / 0.006)


def reverb(x, seed, secs=2.6):
    """Convolution with a dark, decaying noise tail."""
    r = np.random.default_rng(seed)
    n = int(secs * SR)
    t = np.arange(n) / SR
    ir = r.normal(0, 1, n) * np.exp(-t * 6.9 / secs)
    # darken it with two moving-average low-passes
    for k in (12, 24):
        ir = np.convolve(ir, np.ones(k) / k, mode="same")
    ir[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n
    size = 1 << (m - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return y


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
    # "air" goes through the reverb; "low" (bass, hits) stays dry so it doesn't get muddy
    airL, airR, low = np.zeros(n), np.zeros(n), np.zeros(n)
    bpm = 72
    beat = 60 / bpm
    bar = 4 * beat
    root = 50 + key  # D3 + key shift
    # Imaj9 – vi9 – IVmaj9 – V sus: soft, open voicings (semitones from the chord root)
    prog = [(0, [0, 7, 11, 14, 16]), (9, [0, 7, 10, 14, 15]), (5, [0, 7, 11, 14, 16]), (7, [0, 5, 7, 10, 14])]
    t = 0.0
    k = 0
    while t < final:
        off, chord = prog[k % len(prog)]
        length = min(bar, final - t)
        base = root + 12 + off if off < 7 else root + off
        freqs = [midi(base + c) for c in chord]
        p = pad(freqs, length + 1.2)
        add(airL, p, t); add(airR, p * 0.95, t)
        # the e-piano chord, gently strummed upward
        for i, f in enumerate(freqs[1:]):
            e = epiano(f, min(bar * 1.1, length + 0.8), vol=0.045)
            pan = 0.25 * (i - 1.5) / 1.5
            add(airL, e * (1 - pan), t + i * 0.035); add(airR, e * (1 + pan), t + i * 0.035)
        add(low, sub(midi(root - 12 + off), length + 0.4), t)
        # a few bell notes from the second bar on: chord tones an octave up, never on every slot
        if t >= bar * 0.99:
            for slot in (0, 1.5, 3):
                at = t + slot * beat
                if at >= final - 0.4 or rng.random() > 0.72:
                    continue
                note = base + 24 + chord[rng.integers(1, len(chord))]
                b = bell(midi(note), vol=0.04)
                pan = rng.uniform(-0.4, 0.4)
                add(airL, b * (1 - pan), at); add(airR, b * (1 + pan), at)
        t += bar
        k += 1
    # closing: a resolved chord blooms and rings out
    tail = dur - final + 0.05
    fin = [midi(root + 12 + c) for c in (0, 7, 11, 14, 16, 19)]
    p = pad(fin, tail, vol=0.05)
    add(airL, p, final); add(airR, p, final)
    for i, f in enumerate(fin[1:]):
        e = epiano(f, tail, vol=0.05)
        add(airL, e, final + i * 0.05); add(airR, e, final + i * 0.05)
    add(low, sub(midi(root - 12), tail, vol=0.04), final)
    tones = [0, 4, 7, 11, 14, 16]
    for i, at in enumerate(ticks):
        b = bell(midi(root + 36 + tones[min(i * 2, len(tones) - 1)]), vol=0.06)
        add(airL, b, at); add(airR, b, at)
    for at in thuds:
        add(low, hit(), at)
    # mix: dry + wet air, dry low end
    L = 0.72 * airL + 0.55 * reverb(airL, 1) + low
    R = 0.72 * airR + 0.55 * reverb(airR, 2) + low
    fi = int(1.0 * SR); fo = int(2.2 * SR)
    for ch in (L, R):
        ch[:fi] *= np.linspace(0, 1, fi) ** 2
        ch[-fo:] *= np.linspace(1, 0, fo) ** 2
    st = np.stack([L, R], 1)
    rms = np.sqrt((st ** 2).mean())
    st *= 0.075 / max(rms, 1e-6)  # about -20 LUFS: a bed under the picture, not a song
    peak = np.abs(st).max()
    if peak > 0.7:
        st *= 0.7 / peak
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
