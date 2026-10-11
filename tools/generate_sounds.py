#!/usr/bin/env python3
"""
Synthesises every sound used by Train Master Puzzle from scratch (no samples, no third-party audio),
so the files are original and free to ship. Run:  python3 tools/generate_sounds.py
Output: public/sounds/*.wav  (mono, 22.05 kHz, 16-bit)
"""
import os
import wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sounds")
rng = np.random.default_rng(42)


def t_axis(seconds):
    return np.arange(int(seconds * SR)) / SR


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lowpass(x, hi, order=2):
    return sosfilt(butter(order, hi, btype="low", fs=SR, output="sos"), x)


def highpass(x, lo, order=2):
    return sosfilt(butter(order, lo, btype="high", fs=SR, output="sos"), x)


def env_ar(n, attack, release):
    """Smooth attack/release envelope over n samples (seconds for attack/release)."""
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    env = np.ones(n)
    env[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    env[-r:] = np.minimum(env[-r:], np.cos(np.linspace(0, np.pi / 2, r)) ** 2)
    return env


def reverb(x, wet=0.25):
    """Tiny feedback-delay 'room' so nothing sounds dry or digital."""
    out = x.copy()
    for delay, gain in [(0.029, 0.35), (0.047, 0.28), (0.071, 0.22), (0.113, 0.15)]:
        d = int(delay * SR)
        tail = np.zeros_like(x)
        tail[d:] = x[:-d] * gain
        out += lowpass(tail, 4500) * wet
    return out


def normalise(x, peak):
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def save(name, x):
    x = np.clip(x, -1, 1)
    data = (x * 32767).astype(np.int16)
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f"{name}: {len(x) / SR:.2f}s, peak {np.max(np.abs(x)):.2f}")


# ---------------------------------------------------------------- birds (ambient loop)
def chirp(f0, f1, dur, vib_hz=0, vib_depth=0, harmonics=(1.0, 0.18)):
    t = t_axis(dur)
    f = f0 + (f1 - f0) * (t / dur) ** 1.4
    if vib_hz:
        f = f * (1 + vib_depth * np.sin(2 * np.pi * vib_hz * t))
    phase = 2 * np.pi * np.cumsum(f) / SR
    y = sum(a * np.sin(phase * (i + 1)) for i, a in enumerate(harmonics))
    return y * env_ar(len(t), min(0.012, dur / 3), min(0.05, dur / 2))


def bird_call(kind):
    if kind == "trill":      # quick bright trill, like a small finch
        parts = [chirp(rng.uniform(3300, 3800), rng.uniform(4300, 4900), 0.055) for _ in range(rng.integers(5, 9))]
        gap = np.zeros(int(0.045 * SR))
        return np.concatenate([np.concatenate([p, gap]) for p in parts])
    if kind == "whistle":    # two soft falling notes
        a = chirp(3000, 2500, 0.28, 5, 0.01, (1.0, 0.1))
        b = chirp(2700, 2100, 0.34, 4, 0.012, (1.0, 0.1))
        return np.concatenate([a, np.zeros(int(0.09 * SR)), b])
    if kind == "warble":     # chatty rising-and-falling phrase
        parts = []
        for _ in range(rng.integers(4, 7)):
            f = rng.uniform(2200, 3600)
            parts.append(chirp(f, f * rng.uniform(0.8, 1.3), rng.uniform(0.07, 0.14), 28, 0.03))
            parts.append(np.zeros(int(rng.uniform(0.02, 0.06) * SR)))
        return np.concatenate(parts)
    # "dove": low, gentle coo
    t = t_axis(0.5)
    y = np.sin(2 * np.pi * (480 + 40 * np.sin(np.pi * t / 0.5)) * t)
    return y * env_ar(len(t), 0.12, 0.2) * 0.8


def make_birds(seconds=32.0):
    n = int(seconds * SR)
    mix = np.zeros(n)

    # distant breeze: very quiet, slowly breathing
    wind = lowpass(rng.standard_normal(n), 600)
    t = np.arange(n) / SR
    breath = 0.55 + 0.45 * np.sin(2 * np.pi * t / 8.0 + 1.0)
    mix += normalise(wind, 0.05) * breath

    # sparse calls scattered around the loop; positions wrap so the loop has no seam
    kinds = ["trill", "whistle", "warble", "whistle", "trill", "dove", "warble", "trill", "whistle"]
    starts = np.sort(rng.uniform(0.5, seconds - 0.5, len(kinds)))
    for start, kind in zip(starts, kinds):
        call = bird_call(kind)
        call = call * rng.uniform(0.35, 1.0)
        call = reverb(np.concatenate([call, np.zeros(int(0.5 * SR))]), 0.45)
        # a gentle echo that mimics distance
        i = int(start * SR)
        idx = (np.arange(len(call)) + i) % n          # wrap-around keeps the loop seamless
        np.add.at(mix, idx, lowpass(call, 5200) * 0.28)

    return normalise(mix, 0.85)


# ---------------------------------------------------------------- soft chuff-chuff
def make_depart():
    dur = 1.5
    n = int(dur * SR)
    out = np.zeros(n)
    beats = [0.05, 0.36, 0.62, 0.84, 1.03, 1.19]       # chuffs speed up slightly, like a train pulling away
    for i, b in enumerate(beats):
        d = int(0.16 * SR)
        noise = bandpass(rng.standard_normal(d), 350, 1500)
        shape = np.exp(-np.linspace(0, 7, d))
        thump = np.sin(2 * np.pi * 85 * np.arange(d) / SR) * np.exp(-np.linspace(0, 9, d)) * 0.7
        chuff = (noise * shape + thump) * (0.7 + 0.3 * (i % 2 == 0))
        s = int(b * SR)
        out[s:s + d] += chuff[: max(0, min(d, n - s))]
    out = reverb(lowpass(out, 3000), 0.3)
    return normalise(out * env_ar(len(out), 0.005, 0.25), 0.8)


# ---------------------------------------------------------------- steam release (psssh)
def make_brake():
    dur = 1.7
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # the band narrows and drops as the pressure bleeds off
    out = np.zeros(n)
    chunk = n // 8
    for i in range(8):
        lo = 2600 - i * 180
        hi = 8500 - i * 650
        sl = slice(i * chunk, (i + 1) * chunk if i < 7 else n)
        out[sl] = bandpass(noise[sl], lo, hi, 2)
    env = (1 - np.exp(-t / 0.05)) * np.exp(-t / 0.55)
    out = out * env
    out = reverb(out, 0.2)
    return normalise(out * env_ar(len(out), 0.01, 0.3), 0.7)


# ---------------------------------------------------------------- gentle alarm
def make_alarm():
    notes = [(587.0, 0.20), (440.0, 0.26), (587.0, 0.20), (440.0, 0.34)]
    chunks = []
    for f, d in notes:
        t = t_axis(d)
        y = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) + 0.1 * np.sin(2 * np.pi * 3 * f * t)
        chunks.append(y * env_ar(len(t), 0.02, 0.09))
        chunks.append(np.zeros(int(0.07 * SR)))
    out = reverb(np.concatenate(chunks + [np.zeros(int(0.4 * SR))]), 0.25)
    return normalise(lowpass(out, 3500), 0.7)


# ---------------------------------------------------------------- little bell
def bell_note(freq, dur):
    t = t_axis(dur)
    out = np.zeros_like(t)
    # inharmonic partials of a small hand bell, each decaying at its own rate
    for ratio, amp, decay in [(1.0, 1.0, 2.6), (2.76, 0.45, 3.6), (5.4, 0.22, 5.2), (8.93, 0.1, 8.0)]:
        out += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t * decay)
    out *= 1 - np.exp(-t / 0.003)
    return out


def make_bell():
    n = int(2.4 * SR)
    out = np.zeros(n)
    for start, f in [(0.0, 1318.5), (0.17, 1760.0), (0.36, 2093.0)]:      # E6, A6, C7
        note = bell_note(f, 2.0)
        s = int(start * SR)
        out[s:s + len(note)] += note[: n - s]
    out = reverb(out, 0.3)
    return normalise(out, 0.7)


if __name__ == "__main__":
    save("ambient-birds.wav", make_birds())
    save("depart-chuff.wav", make_depart())
    save("arrive-steam.wav", make_brake())
    save("fail-alarm.wav", make_alarm())
    save("success-bell.wav", make_bell())
