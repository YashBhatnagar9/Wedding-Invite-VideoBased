"""Generate public/wedding-song.mp3 — a gentle wedding-ambience loop.

Requires: pip install numpy lameenc
Usage:    python scripts/gen-wedding-song.py

A soft 32 s pad + bell motif in C major (C-F-G-C), mastered quiet for
background playback. The player loops the file; regenerate any time.
"""
from pathlib import Path

import numpy as np
import lameenc

SR = 44100
DUR = 32.0
N = int(SR * DUR)
OUT = Path(__file__).resolve().parent.parent / "public" / "wedding-song.mp3"

CHORDS = [  # (start_s, [root, fifth, third+octave...])
    (0.0, [130.81, 196.00, 261.63, 329.63]),  # C
    (8.0, [174.61, 220.00, 261.63, 349.23]),  # F
    (16.0, [196.00, 246.94, 293.66, 392.00]),  # G
    (24.0, [130.81, 196.00, 261.63, 329.63]),  # C
]
CHORD_DUR = 8.0

MELODY = [  # (start_s, freq_hz, dur_s) — pentatonic bell motif
    (0.5, 659.26, 2.0), (2.5, 783.99, 2.0), (5.0, 880.00, 2.5),
    (8.5, 783.99, 2.0), (10.5, 659.26, 2.0), (13.0, 587.33, 3.0),
    (16.5, 659.26, 2.0), (19.0, 783.99, 2.0), (21.5, 1046.50, 3.0),
    (25.0, 880.00, 2.0), (27.5, 783.99, 2.0), (29.5, 659.26, 2.4),
]

mix = np.zeros(N, dtype=np.float64)


def _fade(n: int, attack: int, release: int) -> np.ndarray:
    env = np.ones(n)
    if attack > 0:
        env[:attack] = 0.5 - 0.5 * np.cos(np.pi * np.arange(attack) / attack)
    if release > 0:
        env[-release:] = 0.5 + 0.5 * np.cos(np.pi * np.arange(release) / release)
    return env


def add_pad(start: float, dur: float, freqs: list) -> None:
    i0 = int(start * SR)
    i1 = min(N, int((start + dur) * SR))
    n = i1 - i0
    tt = np.arange(n) / SR
    sig = np.zeros(n)
    for j, f in enumerate(freqs):
        sig += np.sin(2 * np.pi * f * tt + 0.7 * j) * (1.0 - 0.08 * j)
        sig += 0.22 * np.sin(2 * np.pi * 2 * f * tt + 0.3 * j)
    sig /= len(freqs) * 1.2
    env = _fade(n, int(2.0 * SR), int(2.0 * SR))
    mix[i0:i1] += 0.055 * len(freqs) * sig * env


def add_bass(start: float, dur: float, freq: float) -> None:
    i0 = int(start * SR)
    i1 = min(N, int((start + dur) * SR))
    n = i1 - i0
    tt = np.arange(n) / SR
    env = _fade(n, int(1.0 * SR), int(1.0 * SR))
    mix[i0:i1] += 0.075 * np.sin(2 * np.pi * (freq / 2) * tt) * env


def add_bell(start: float, freq: float, dur: float = 2.5) -> None:
    i0 = int(start * SR)
    i1 = min(N, int((start + dur) * SR))
    n = i1 - i0
    if n <= 0:
        return
    tt = np.arange(n) / SR
    atk = max(1, int(0.008 * SR))
    env = np.exp(-tt / (dur / 3.0))
    env[:atk] *= np.linspace(0.0, 1.0, atk)
    sig = (
        np.sin(2 * np.pi * freq * tt)
        + 0.32 * np.sin(2 * np.pi * 2.76 * freq * tt) * np.exp(-tt * 2.5)
        + 0.12 * np.sin(2 * np.pi * 5.10 * freq * tt) * np.exp(-tt * 4.0)
    )
    sig /= 1.44
    mix[i0:i1] += 0.17 * sig * env


for _start, _freqs in CHORDS:
    add_pad(_start, CHORD_DUR, _freqs)
    add_bass(_start, CHORD_DUR, _freqs[0])
for _start, _freq, _dur in MELODY:
    add_bell(_start, _freq, _dur)

# Cheap ambience: 3-tap echo (0.31 s) folded back into the mix.
_d = int(0.31 * SR)
for _k in (1, 2, 3):
    mix[_d * _k :] += (0.20**_k) * mix[: N - _d * _k]

# Master quietly for background use; gentle in/out to avoid loop clicks.
peak = float(np.max(np.abs(mix)))
mix *= 0.72 / max(peak, 1e-6)
_fi, _fo = int(0.5 * SR), int(0.05 * SR)
mix[:_fi] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(_fi) / _fi)
mix[-_fo:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(_fo) / _fo)

stereo = np.stack([mix, mix], axis=1)
pcm = (np.clip(stereo, -1.0, 1.0) * 32767).astype("<i2").tobytes()

enc = lameenc.Encoder()
enc.set_bit_rate(128)
enc.set_in_sample_rate(SR)
enc.set_channels(2)
enc.set_quality(2)
data = enc.encode(pcm) + enc.flush()
OUT.write_bytes(data)
print(f"wrote {OUT} ({len(data) / 1024:.0f} KB, {DUR:.0f}s)")
print("head:", data[:4].hex())
