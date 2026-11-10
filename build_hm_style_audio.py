from __future__ import annotations
import ctypes, ctypes.util, math, os, subprocess, tempfile
from dataclasses import dataclass
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

ROOT = Path('/mnt/data/hm_audio_work')
MUSIC_DIR = ROOT / 'public/audio/music'
SFX_DIR = ROOT / 'public/audio/effects'
MUSIC_DIR.mkdir(parents=True, exist_ok=True)
SFX_DIR.mkdir(parents=True, exist_ok=True)
SR = 44100
SF2 = b'/usr/share/sounds/sf2/TimGM6mb.sf2'

# FluidSynth C API: render MIDI-style arrangements through a sampled GM soundfont.
lib = ctypes.CDLL(ctypes.util.find_library('fluidsynth'))
P = ctypes.c_void_p
lib.new_fluid_settings.restype = P
lib.fluid_settings_setnum.argtypes = [P, ctypes.c_char_p, ctypes.c_double]
lib.fluid_settings_setnum.restype = ctypes.c_int
lib.fluid_settings_setint.argtypes = [P, ctypes.c_char_p, ctypes.c_int]
lib.fluid_settings_setint.restype = ctypes.c_int
lib.new_fluid_synth.argtypes = [P]
lib.new_fluid_synth.restype = P
lib.fluid_synth_sfload.argtypes = [P, ctypes.c_char_p, ctypes.c_int]
lib.fluid_synth_sfload.restype = ctypes.c_int
lib.fluid_synth_program_select.argtypes = [P, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int]
lib.fluid_synth_program_select.restype = ctypes.c_int
lib.fluid_synth_cc.argtypes = [P, ctypes.c_int, ctypes.c_int, ctypes.c_int]
lib.fluid_synth_cc.restype = ctypes.c_int
lib.fluid_synth_noteon.argtypes = [P, ctypes.c_int, ctypes.c_int, ctypes.c_int]
lib.fluid_synth_noteon.restype = ctypes.c_int
lib.fluid_synth_noteoff.argtypes = [P, ctypes.c_int, ctypes.c_int]
lib.fluid_synth_noteoff.restype = ctypes.c_int
lib.fluid_synth_write_float.argtypes = [P, ctypes.c_int, P, ctypes.c_int, ctypes.c_int, P, ctypes.c_int, ctypes.c_int]
lib.fluid_synth_write_float.restype = ctypes.c_int
lib.delete_fluid_synth.argtypes = [P]
lib.delete_fluid_settings.argtypes = [P]


def new_synth(gain=0.55):
    settings = lib.new_fluid_settings()
    lib.fluid_settings_setnum(settings, b'synth.sample-rate', SR)
    lib.fluid_settings_setnum(settings, b'synth.gain', gain)
    lib.fluid_settings_setnum(settings, b'synth.reverb.room-size', 0.22)
    lib.fluid_settings_setnum(settings, b'synth.reverb.damp', 0.55)
    lib.fluid_settings_setnum(settings, b'synth.reverb.width', 65.0)
    lib.fluid_settings_setnum(settings, b'synth.reverb.level', 0.22)
    lib.fluid_settings_setnum(settings, b'synth.chorus.level', 0.28)
    lib.fluid_settings_setint(settings, b'synth.reverb.active', 1)
    lib.fluid_settings_setint(settings, b'synth.chorus.active', 1)
    synth = lib.new_fluid_synth(settings)
    sfid = lib.fluid_synth_sfload(synth, SF2, 1)
    if sfid < 0:
        raise RuntimeError('Could not load system GM soundfont')
    return settings, synth, sfid


def render_events(events, programs, duration, gain=0.55, pans=None):
    settings, synth, sfid = new_synth(gain)
    for ch, program in programs.items():
        lib.fluid_synth_program_select(synth, ch, sfid, 0, program)
        pan = (pans or {}).get(ch, 64)
        lib.fluid_synth_cc(synth, ch, 10, pan)
        lib.fluid_synth_cc(synth, ch, 7, 100)
        lib.fluid_synth_cc(synth, ch, 91, 32)
        lib.fluid_synth_cc(synth, ch, 93, 22)
    events = sorted(events, key=lambda e: (e[0], 0 if e[1] == 'off' else 1))
    total = int(round(duration * SR))
    left = np.zeros(total, dtype=np.float32)
    right = np.zeros(total, dtype=np.float32)
    cursor = 0
    for time_s, kind, ch, note, velocity in events:
        pos = max(cursor, min(total, int(round(time_s * SR))))
        n = pos - cursor
        if n > 0:
            lib.fluid_synth_write_float(
                synth, n,
                left[cursor:pos].ctypes.data, 0, 1,
                right[cursor:pos].ctypes.data, 0, 1
            )
            cursor = pos
        if kind == 'on':
            lib.fluid_synth_noteon(synth, ch, note, velocity)
        else:
            lib.fluid_synth_noteoff(synth, ch, note)
    if cursor < total:
        lib.fluid_synth_write_float(
            synth, total - cursor,
            left[cursor:].ctypes.data, 0, 1,
            right[cursor:].ctypes.data, 0, 1
        )
    audio = np.column_stack([left, right])
    lib.delete_fluid_synth(synth)
    lib.delete_fluid_settings(settings)
    return audio


def midi_pitch(root, scale_degree, mode='major'):
    scale = [0, 2, 3, 5, 7, 8, 10] if mode == 'minor' else [0, 2, 4, 5, 7, 9, 11]
    octave, degree = divmod(scale_degree, 7)
    return root + scale[degree] + octave * 12

def loop_crossfade(audio, seconds=0.85):
    """Blend the loop tail into the opening so the repeated buffer has no hard seam."""
    n = min(int(seconds * SR), len(audio) // 5)
    if n < 8:
        return audio
    fade = np.linspace(0.0, 1.0, n, dtype=np.float32)[:, None]
    tail = audio[-n:]
    head = audio[:n]
    seam = tail * (1.0 - fade) + head * fade
    return np.concatenate([audio[n:-n], seam], axis=0)


def add_note(events, channel, pitch, beat, length, vel, spb, gate=0.94):
    start = max(0.0, beat * spb)
    end = min((beat + length * gate) * spb, 180.0)
    events.append((start, 'on', channel, int(pitch), int(vel)))
    events.append((max(start + 0.035, end), 'off', channel, int(pitch), 0))


def compose_music(name, bpm, key_root, progression, motif, lead_program, guitar_program=24,
                  bass_program=32, extra_program=None, extra_kind='none'):
    bars = 32
    beats_per_bar = 4
    spb = 60.0 / bpm
    total_seconds = bars * beats_per_bar * spb
    events = []
    programs = {0: lead_program, 1: guitar_program, 2: bass_program}
    pans = {0: 78, 1: 50, 2: 64}
    if extra_program is not None:
        programs[3] = extra_program
        pans[3] = 68

    for bar in range(bars):
        chord_root_offset, quality = progression[bar % len(progression)]
        chord_root = key_root + chord_root_offset
        third = 4 if quality == 'maj' else 3
        # Soft, staggered guitar arpeggio: the steady and recognizable farm-game pulse.
        arpeggio = [chord_root + 12, chord_root + 19, chord_root + 12 + third, chord_root + 19]
        for beat_idx, pitch in enumerate(arpeggio):
            add_note(events, 1, pitch, bar * 4 + beat_idx, 0.72, 42 if name != 'night' else 31, spb, 0.88)
        # A light chord brush on the first beat gives the loop a warm acoustic bed.
        for strum_i, interval in enumerate([0, third, 7]):
            add_note(events, 1, chord_root + 12 + interval, bar * 4 + 0.02 + strum_i * 0.035, 1.05,
                     25 if name != 'night' else 19, spb, 0.92)
        # Rounded bass notes; no heavy drum beat.
        add_note(events, 2, chord_root - 12, bar * 4, 1.55, 45 if name == 'day' else 38, spb, 0.90)
        add_note(events, 2, chord_root - 5, bar * 4 + 2.0, 0.82, 34 if name == 'day' else 27, spb, 0.88)

        # Occasional soft harmony accents help the arrangement feel like a sampled console OST.
        if extra_program is not None:
            if extra_kind == 'pad' and bar % 2 == 0:
                for interval in [0, third, 7]:
                    add_note(events, 3, chord_root + 24 + interval, bar * 4, 2.6, 19, spb, 0.93)
            elif extra_kind == 'sparkle' and bar % 2 == 1:
                pitch = chord_root + 31 if bar % 4 else chord_root + 28
                add_note(events, 3, pitch, bar * 4 + 2.5, 0.38, 28, spb, 0.9)
            elif extra_kind == 'pulse' and bar % 2 == 0:
                for b in [1.5, 3.5]:
                    add_note(events, 3, chord_root + 24 + third, bar * 4 + b, 0.22, 18, spb, 0.9)

    # An original eight-bar melodic theme is repeated with small phrase changes, not a copied game melody.
    for cycle in range(4):
        for bar_idx, notes in enumerate(motif):
            bar = cycle * 8 + bar_idx
            for beat, degree, length, velocity in notes:
                extra = 0
                if cycle == 1 and bar_idx in (3, 7) and degree >= 4:
                    extra = -1
                elif cycle == 3 and bar_idx in (6, 7) and degree in (0, 1, 2):
                    extra = 7 if bar_idx == 7 and degree == 0 else 0
                pitch = midi_pitch(key_root + 12, degree + extra, 'minor' if name == 'night' else 'major')
                vel = int(velocity * (0.92 if name == 'night' else 1.0) * (0.96 if cycle == 2 else 1.0))
                add_note(events, 0, pitch, bar * 4 + beat, length, vel, spb, 0.90)

    # A very soft answer phrase in the high register on selected bars, using a different patch.
    if extra_program is not None and extra_kind in ('sparkle', 'answer'):
        for cycle in range(4):
            for bar_idx in (1, 3, 5, 7):
                bar = cycle * 8 + bar_idx
                chord_root_offset, quality = progression[bar % len(progression)]
                pitch = chord_root + 24 + (7 if quality == 'maj' else 3) if (chord_root := key_root + chord_root_offset) else 0
                add_note(events, 3, pitch, bar * 4 + 3.0, 0.42, 21 if name != 'night' else 16, spb, 0.92)

    # Add a final resolving chord that releases just before the seam.
    final_root = key_root + progression[-1][0]
    final_third = 4 if progression[-1][1] == 'maj' else 3
    for ch, pitches, vel in [
        (1, [final_root + 12, final_root + 12 + final_third, final_root + 19], 26),
        (2, [final_root - 12], 22),
    ]:
        for pitch in pitches:
            add_note(events, ch, pitch, 31 * 4, 2.2, vel, spb, 0.87)

    audio = render_events(events, programs, total_seconds, gain=0.52 if name != 'night' else 0.46, pans=pans)
    # Gentle analog-style saturation and output level matching; preserve the transient shape.
    audio = np.tanh(audio * 1.12).astype(np.float32)
    audio = loop_crossfade(audio, 0.85)
    peak = float(np.max(np.abs(audio)))
    if peak > 0:
        audio *= 0.78 / peak
    path = MUSIC_DIR / f'{name}.ogg'
    write_ogg(path, audio)
    print(f'Music {name}: {total_seconds:.1f}s, peak={np.max(np.abs(audio)):.3f}, {path.stat().st_size} bytes')


def write_ogg(path: Path, audio: np.ndarray):
    if audio.ndim == 1:
        audio = np.column_stack([audio, audio])
    audio = np.clip(audio, -0.98, 0.98)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        wav_path = tmp.name
    sf.write(wav_path, audio, SR, subtype='PCM_16')
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', wav_path,
                    '-c:a', 'libvorbis', '-q:a', '5', str(path)], check=True)
    os.unlink(wav_path)


MOTIFS = {
    'dawn': [
        [(0,4,.75,72),(1,2,.42,65),(1.5,1,.42,62),(2,0,1.05,68),(3.35,2,.45,63)],
        [(0,4,.72,70),(1,5,.48,67),(2,4,.50,65),(2.55,2,.45,62),(3.15,1,.65,63)],
        [(0,2,.48,64),(.55,4,.48,68),(1.2,5,.95,72),(2.55,4,.45,66),(3.15,2,.58,64)],
        [(0,1,.7,64),(1,0,.45,60),(1.55,1,.4,62),(2,2,.85,66),(3.1,4,.72,70)],
        [(0,5,.62,72),(1,4,.45,68),(2,2,.65,64),(3,1,.72,62)],
        [(0,2,.52,64),(.65,4,.52,68),(1.4,5,.7,71),(2.4,4,.5,66),(3,2,.72,64)],
        [(0,1,.58,62),(1,2,.5,65),(2,4,.82,70),(3.1,2,.62,65)],
        [(0,4,.68,70),(1,2,.48,65),(2,1,.5,62),(2.7,0,1.05,66)],
    ],
    'day': [
        [(0,0,.42,72),(.55,2,.42,67),(1,4,.58,76),(2,5,.42,73),(2.5,4,.4,69),(3,2,.75,70)],
        [(0,4,.48,76),(1,5,.45,78),(2,4,.42,73),(2.5,2,.4,68),(3,1,.72,67)],
        [(0,2,.42,70),(.5,4,.42,74),(1,5,.72,78),(2,4,.4,74),(2.5,2,.42,69),(3,4,.6,73)],
        [(0,5,.65,78),(1,4,.42,74),(2,2,.5,70),(3,1,.72,68)],
        [(0,0,.42,70),(.55,2,.42,67),(1,4,.65,76),(2,6,.42,79),(2.5,5,.42,75),(3,4,.7,73)],
        [(0,2,.48,70),(1,4,.42,74),(2,5,.72,77),(3,4,.72,73)],
        [(0,1,.45,68),(.55,2,.42,70),(1.5,4,.5,74),(2.25,5,.45,76),(3,4,.7,72)],
        [(0,2,.42,70),(1,1,.42,67),(2,0,.65,69),(3,4,.72,74)],
    ],
    'dusk': [
        [(0,4,1.25,67),(1.5,2,.65,62),(2.35,1,.7,60),(3.2,0,.7,59)],
        [(0,2,.9,62),(1.25,4,.85,66),(2.4,5,1.0,68)],
        [(0,4,1.1,67),(1.5,5,.65,68),(2.4,4,.75,65),(3.25,2,.65,62)],
        [(0,1,1.0,61),(1.4,0,.72,59),(2.4,2,.9,63)],
        [(0,5,1.15,68),(1.6,4,.72,66),(2.5,2,.75,62),(3.3,1,.65,60)],
        [(0,2,.9,62),(1.25,4,.8,66),(2.3,5,1.0,68)],
        [(0,4,.85,66),(1.2,2,.8,62),(2.35,1,.85,60),(3.3,2,.6,62)],
        [(0,1,.9,60),(1.25,2,.8,62),(2.4,0,1.2,60)],
    ],
    'night': [
        [(0,4,1.25,59),(1.8,2,.72,53),(2.75,0,.9,55)],
        [(0,2,1.1,55),(1.6,4,.72,58),(2.6,5,.95,60)],
        [(0,4,1.1,59),(1.5,5,.75,60),(2.5,4,.8,58)],
        [(0,2,1.0,55),(1.6,1,.7,53),(2.5,0,1.0,52)],
        [(0,5,1.2,60),(1.7,4,.75,58),(2.7,2,.85,55)],
        [(0,4,1.15,58),(1.7,2,.72,55),(2.7,0,.9,52)],
        [(0,1,1.0,53),(1.5,2,.78,55),(2.6,4,.9,59)],
        [(0,2,1.0,55),(1.5,1,.75,53),(2.7,0,1.15,52)],
    ],
}

# Progressions are expressed as semitone root offsets + major/minor quality.
compose_music('dawn', 94, 55, [(0,'maj'),(7,'maj'),(9,'min'),(5,'maj'),(0,'maj'),(2,'min'),(7,'maj'),(0,'maj')],
              MOTIFS['dawn'], lead_program=73, guitar_program=24, bass_program=32, extra_program=0, extra_kind='pad')
compose_music('day', 104, 50, [(0,'maj'),(7,'maj'),(9,'min'),(4,'min'),(5,'maj'),(0,'maj'),(2,'min'),(7,'maj')],
              MOTIFS['day'], lead_program=73, guitar_program=25, bass_program=33, extra_program=12, extra_kind='sparkle')
compose_music('dusk', 84, 48, [(0,'maj'),(7,'maj'),(9,'min'),(4,'min'),(5,'maj'),(0,'maj'),(2,'min'),(7,'maj')],
              MOTIFS['dusk'], lead_program=40, guitar_program=24, bass_program=42, extra_program=0, extra_kind='pad')
compose_music('night', 78, 52, [(0,'min'),(8,'maj'),(3,'maj'),(10,'maj'),(0,'min'),(5,'min'),(7,'maj'),(0,'min')],
              MOTIFS['night'], lead_program=10, guitar_program=24, bass_program=32, extra_program=48, extra_kind='pad')

# Naturalistic short foley layers. All effects are custom original synthesis and sampled-instrument accents.
def band_noise(rng, n, low, high, amp=1.0):
    x = rng.normal(0, 1, n).astype(np.float32)
    lo = max(30.0, low); hi = min(SR * 0.48, high)
    sos = butter(3, [lo, hi], btype='bandpass', fs=SR, output='sos')
    y = sosfilt(sos, x).astype(np.float32)
    m = np.max(np.abs(y)) + 1e-8
    return y * (amp / m)


def add_noise(audio, rng, start, dur, low, high, amp, decay=7.0, attack=0.008, pan=0.0, pulses=None):
    n = int(dur * SR)
    if n <= 1: return
    x = band_noise(rng, n, low, high, amp)
    t = np.arange(n, dtype=np.float32) / SR
    env = np.minimum(1.0, t / max(attack, 0.001)) * np.exp(-decay * t / max(dur, 0.01))
    if pulses:
        pulse_env = np.zeros(n, dtype=np.float32)
        for at, width, strength in pulses:
            a = max(0, int(at * SR)); b = min(n, a + int(width * SR))
            if b > a:
                pulse_env[a:b] = np.maximum(pulse_env[a:b], strength * np.exp(-np.linspace(0, 4, b-a, dtype=np.float32)))
        env *= np.maximum(0.08, pulse_env)
    x *= env
    idx = int(start * SR)
    if idx >= len(audio): return
    end = min(len(audio), idx+n)
    x = x[:end-idx]
    left_gain = math.sqrt((1-pan)/2) * 1.414
    right_gain = math.sqrt((1+pan)/2) * 1.414
    audio[idx:end, 0] += x * left_gain
    audio[idx:end, 1] += x * right_gain


def add_thump(audio, start, dur, f0, f1, amp, pan=0.0, harmonics=0.18):
    n = int(dur * SR)
    if n <= 1: return
    t = np.arange(n, dtype=np.float32) / SR
    # Falling pitch plus an uneven second harmonic creates a soft physical impact.
    freq = f0 + (f1-f0) * (t / max(dur, 0.001))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    env = np.exp(-t * (9.5 / max(dur, 0.02))) * np.minimum(1.0, t / 0.002)
    x = (np.sin(phase) + harmonics * np.sin(2.02*phase + .2)) * env * amp
    idx = int(start * SR); end = min(len(audio), idx+n)
    if idx >= len(audio): return
    x = x[:end-idx]
    audio[idx:end, 0] += x * math.sqrt((1-pan)/2) * 1.414
    audio[idx:end, 1] += x * math.sqrt((1+pan)/2) * 1.414


def add_droplet(audio, start, freq, amp=0.12, dur=0.16, pan=0.0):
    n = int(dur*SR); t = np.arange(n, dtype=np.float32)/SR
    f = freq * (1 - 0.23*t/dur)
    phase = 2*np.pi*np.cumsum(f)/SR
    env = np.exp(-t*22) * np.minimum(1, t/0.004)
    x = (np.sin(phase) + 0.20*np.sin(phase*2.7)) * env * amp
    idx=int(start*SR); end=min(len(audio),idx+n)
    if idx>=len(audio): return
    x=x[:end-idx]
    audio[idx:end,0]+=x*math.sqrt((1-pan)/2)*1.414
    audio[idx:end,1]+=x*math.sqrt((1+pan)/2)*1.414


def sfx_base(name, duration, seed):
    rng = np.random.default_rng(seed)
    audio = np.zeros((int(duration*SR), 2), dtype=np.float32)
    if name == 'hoe':
        add_thump(audio,.015,.23,116,48,.42,-.08)
        add_noise(audio,rng,.015,.19,120,1800,.24,decay=14,attack=.002,pan=-.08)
        add_noise(audio,rng,.21,.22,450,3500,.12,decay=8,attack=.006,pan=.08)
    elif name == 'plant':
        add_noise(audio,rng,.02,.19,450,3000,.15,decay=13,attack=.004,pan=.08)
        add_thump(audio,.035,.12,260,150,.10,.08)
        for i,f in enumerate([2100,2850,1750]): add_droplet(audio,.13+i*.035,f,.023,.09,(-.2+i*.2))
    elif name == 'water':
        add_noise(audio,rng,.015,.70,500,8500,.33,decay=2.1,attack=.015,pan=-.04,
                  pulses=[(.0,.25,.9),(.18,.28,.65),(.39,.23,.55)])
        for at,f,a in [(.08,2450,.11),(.22,3100,.10),(.43,1950,.09),(.59,2650,.075)]: add_droplet(audio,at,f,a,.17,(-.3 if at<.3 else .25))
    elif name == 'harvest':
        add_noise(audio,rng,.015,.45,900,9000,.31,decay=2.5,attack=.025,pan=.05)
        add_noise(audio,rng,.06,.25,240,1800,.14,decay=9,attack=.003,pan=-.08)
        add_thump(audio,.03,.10,180,100,.11,.10)
    elif name == 'dead':
        add_thump(audio,.02,.35,170,58,.26)
        add_noise(audio,rng,.05,.25,130,1000,.13,decay=10,attack=.002)
    elif name == 'request':
        add_noise(audio,rng,.02,.24,700,7000,.21,decay=9,attack=.006,pan=-.06)
        add_thump(audio,.13,.12,280,160,.12,.06)
    elif name == 'talk':
        add_thump(audio,.015,.075,340,210,.10,-.1)
        add_thump(audio,.105,.075,285,170,.085,.1)
    elif name == 'error':
        add_thump(audio,.015,.17,220,95,.20)
        add_thump(audio,.18,.14,165,80,.14)
    elif name == 'cast':
        add_noise(audio,rng,.04,.62,350,7500,.25,decay=2.3,attack=.04,pan=-.2)
        add_noise(audio,rng,.48,.40,400,6500,.20,decay=3.2,attack=.02,pan=.2)
        add_thump(audio,.70,.15,185,92,.13,.2)
        for i,f in enumerate([2200,1650,2550]): add_droplet(audio,.72+i*.045,f,.05,.12,.18)
    elif name == 'bite':
        add_noise(audio,rng,.015,.18,500,4500,.24,decay=11,attack=.002)
        add_thump(audio,.025,.12,190,105,.13)
    elif name == 'miss':
        add_noise(audio,rng,.03,.31,500,6500,.19,decay=7,attack=.01)
        add_droplet(audio,.07,1700,.10,.20)
    elif name == 'cook':
        add_noise(audio,rng,.015,.67,160,1800,.20,decay=1.8,attack=.03,pulses=[(.05,.17,.7),(.25,.20,.55),(.47,.16,.52)])
        for at,f,a in [(.13,520,.055),(.34,720,.05),(.55,430,.045)]: add_droplet(audio,at,f,a,.13)
        add_noise(audio,rng,.1,.55,2200,7000,.08,decay=2.2,attack=.04)
    elif name == 'eat':
        add_noise(audio,rng,.015,.21,450,3600,.22,decay=10,attack=.004)
        add_thump(audio,.04,.10,155,85,.10)
    elif name == 'footstep':
        add_thump(audio,.008,.18,100,42,.28,pan=-.08)
        add_noise(audio,rng,.008,.18,120,1800,.16,decay=11,attack=.003,pan=-.08)
        add_noise(audio,rng,.08,.13,700,3500,.07,decay=14,attack=.004,pan=.12)

    # Light source-filtered tonal accents; deliberately quiet under the physical texture.
    if name == 'buy':
        pass
    elif name == 'sell':
        pass
    elif name == 'catch':
        add_noise(audio,rng,.015,.34,450,7800,.28,decay=5,attack=.01,pan=.1)
        for at,f,a in [(.08,2550,.09),(.18,2150,.08),(.29,2900,.06)]: add_droplet(audio,at,f,a,.15,.1)
    elif name == 'sleep':
        add_noise(audio,rng,.10,.85,180,950,.08,decay=1.8,attack=.15)
    return audio


def mix_synth(audio, events, programs, gain=0.32, pans=None):
    dur = len(audio)/SR
    synth_audio = render_events(events, programs, dur, gain=gain, pans=pans)
    # Soundfont notes sit behind the dry foley, like gentle console-era cueing.
    audio += synth_audio * 0.46
    return audio


def note_events(sequence):
    out=[]
    for channel, pitch, start, length, velocity in sequence:
        out.append((start,'on',channel,pitch,velocity))
        out.append((start+length,'off',channel,pitch,0))
    return out

SFX_SPECS = {
    'hoe': (0.58, []),
    'plant': (0.46, []),
    'water': (0.90, []),
    'harvest': (0.66, []),
    'dead': (0.72, [(0,48,.04,.58,38),(0,43,.42,.48,30)]),
    'request': (0.48, [(0,76,.05,.18,36)]),
    'buy': (0.74, [(0,79,.02,.22,50),(0,84,.12,.24,48),(0,88,.24,.35,55)]),
    'sell': (0.72, [(0,88,.02,.22,48),(0,84,.14,.22,44),(0,79,.27,.30,45)]),
    'talk': (0.28, [(0,72,.02,.09,22),(0,76,.12,.08,20)]),
    'error': (0.38, [(0,55,.02,.13,26),(0,52,.17,.14,22)]),
    'cast': (1.02, []),
    'bite': (0.31, []),
    'catch': (0.83, [(0,76,.32,.18,35),(0,79,.40,.18,38),(0,83,.48,.26,43)]),
    'miss': (0.45, []),
    'cook': (0.86, []),
    'eat': (0.36, []),
    'sleep': (1.18, [(0,83,.16,.28,23),(0,79,.35,.33,21),(0,76,.58,.40,19)]),
    'footstep': (0.27, []),
}
SFX_PROGRAMS = {'dead': {0:42}, 'request': {0:10}, 'buy': {0:8}, 'sell': {0:8},
                'talk': {0:10}, 'error': {0:11}, 'catch': {0:8}, 'sleep': {0:10}}

for idx, (name, (duration, seq)) in enumerate(SFX_SPECS.items()):
    audio = sfx_base(name, duration, 1000+idx)
    if seq:
        events = note_events(seq)
        audio = mix_synth(audio, events, SFX_PROGRAMS[name], gain=0.30)
    # Short soft fade to avoid clicks; effects retain their onset/transient.
    fade_n = min(int(.025*SR), len(audio)//3)
    if fade_n:
        audio[:fade_n] *= np.linspace(0,1,fade_n,dtype=np.float32)[:,None]
        audio[-fade_n:] *= np.linspace(1,0,fade_n,dtype=np.float32)[:,None]
    # Consistent effects headroom, avoiding harsh clipping at full SFX slider.
    peak = float(np.max(np.abs(audio)))
    if peak > 0:
        audio *= 0.68 / peak
    path = SFX_DIR / f'{name}.ogg'
    write_ogg(path, audio)
    print(f'SFX {name}: {duration:.2f}s, peak={np.max(np.abs(audio)):.3f}, {path.stat().st_size} bytes')
