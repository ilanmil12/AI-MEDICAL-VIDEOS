"""Sintetiza música (cumbia original) y efectos, y mezcla con la narración.
Todo el audio musical y los efectos se generan por código: sin muestras de terceros.
Uso: python3 audio.py → audio/mezcla.wav (48 kHz estéreo) + audio/stems/*.wav"""
import json
import subprocess
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
SR = 48000
TL = json.loads((HERE / 'timeline.json').read_text())
TOTAL = TL['total'] + 0.6
N = int(TOTAL * SR)
ESC = {e['n']: e for e in TL['escenas']}
rng = np.random.default_rng(7)


def t_arr(d):
    return np.arange(int(d * SR)) / SR


def env_adsr(n, a=0.005, d=0.05, s=0.6, r=0.08):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n); e[:na] = np.linspace(0, 1, na)
    nd = min(nd, n - na); e[na:na + nd] = np.linspace(1, s, nd)
    if nr < n: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lp_fast(x, cutoff):  # filtro paso bajo en bloque vía FFT (rápido para señales largas)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))


def hp_fast(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (cutoff / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, len(x))


def place(buf, sig, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf) or i + len(sig) <= 0: return
    s0 = max(0, -i); i = max(0, i)
    seg = sig[s0:s0 + len(buf) - i]
    buf[i:i + len(seg)] += gain * seg


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---------- Instrumentos ----------
def saw(f, d, voices=3, det=0.006, vib=5.0, vibd=0.004):
    t = t_arr(d); out = np.zeros_like(t)
    for k in range(voices):
        ff = f * (1 + det * (k - (voices - 1) / 2)) * (1 + vibd * np.sin(2 * np.pi * vib * t))
        ph = np.cumsum(ff) / SR
        out += 2 * (ph % 1) - 1
    return out / voices


def accordion(f, d):
    x = saw(f, d) * 0.6 + saw(f * 2, d, 2) * 0.25
    return lp_fast(x, 2600) * env_adsr(len(x), 0.012, 0.08, 0.75, 0.05)


def bass(f, d):
    t = t_arr(d)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.12 * (2 * ((f * t) % 1) - 1)
    return x * env_adsr(len(t), 0.004, 0.12, 0.55, 0.05)


def guiro(d, long=True):
    t = t_arr(d)
    noise = hp_fast(rng.standard_normal(len(t)), 3500)
    rate = 38 if long else 55
    teeth = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * rate * t))
    e = np.minimum(1, t / (d * 0.7)) ** 0.6 * np.exp(-np.maximum(0, t - d * 0.7) * 60)
    return noise * teeth * e * 0.35


def conga(f, d=0.25):
    t = t_arr(d)
    fr = f * (1 + 0.6 * np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 18)


def pluck(f, d=0.35):  # pizzicato (Karplus-Strong)
    n = int(d * SR); p = int(SR / f)
    buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.994
    return out * np.exp(-np.arange(n) / SR * 6)


def tuba(f, d):
    x = saw(f, d, 2, 0.003, 4.5, 0.01)
    x = lp_fast(x, 700) * env_adsr(len(x), 0.03, 0.1, 0.8, 0.08)
    return x * (1 + 0.4 * np.sin(2 * np.pi * 6 * t_arr(d)))


def bell(f, d=1.0, dec=4.0):
    t = t_arr(d)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * dec)


def whoosh(d=0.45, up=True):
    t = t_arr(d)
    x = rng.standard_normal(len(t))
    sweep = np.linspace(400, 5000, len(t)) if up else np.linspace(5000, 400, len(t))
    # banda móvil aproximada: mezcla de paso bajo y paso alto en bloques
    out = np.zeros_like(x); B = 2048
    for i in range(0, len(x), B):
        seg = x[i:i + B]; c = sweep[min(i, len(sweep) - 1)]
        out[i:i + B] = lp_fast(hp_fast(seg, c * 0.5), c * 1.6)[:len(seg)]
    return out * np.sin(np.pi * t / d) ** 2 * 0.8


def click(d=0.03, f=2500):
    t = t_arr(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 300) + 0.3 * rng.standard_normal(len(t)) * np.exp(-t * 500)


def thump(f=55, d=0.25):
    t = t_arr(d)
    return np.sin(2 * np.pi * f * (1 + np.exp(-t * 30)) * t) * np.exp(-t * 16)


def hiss(d):
    t = t_arr(d)
    return hp_fast(rng.standard_normal(len(t)), 4000) * np.sin(np.pi * t / d) * 0.4


# ---------- Música ----------
BPM = 96
BEAT = 60 / BPM
musica = np.zeros(N)
G, D, C = 55, 50, 48  # raíces (G3, D3, C3)
prog = [(G, 'M'), (D, 'M'), (D, 'M'), (G, 'M'), (C, 'M'), (G, 'M'), (D, 'M'), (G, 'M')]
mel = [74, 76, 78, 79, 78, 76, 74, None, 71, 74, 76, 74, 71, 69, 67, None]  # motivo alegre en G


def cumbia(t0, t1, energia=1.0, melodia=True):
    bar = 4 * BEAT; nb = int(np.ceil((t1 - t0) / bar))
    for b in range(nb):
        tb = t0 + b * bar
        root, _ = prog[b % len(prog)]
        third, fifth = root + 4, root + 7
        for k in range(4):  # güiro: largo-corto-corto
            tk = tb + k * BEAT
            if tk >= t1: break
            place(musica, guiro(BEAT * 0.5, True), tk, 0.5 * energia)
            place(musica, guiro(BEAT * 0.22, False), tk + BEAT * 0.5, 0.35 * energia)
            place(musica, guiro(BEAT * 0.22, False), tk + BEAT * 0.75, 0.3 * energia)
        for tt, m in [(0, root - 12), (1.5, fifth - 12), (2, root - 12), (3, fifth - 12)]:  # bajo tumbao
            if tb + tt * BEAT < t1: place(musica, bass(midi(m), BEAT * 0.9), tb + tt * BEAT, 0.55)
        for k in range(4):  # acordeón en contratiempo
            tk = tb + (k + 0.5) * BEAT
            if tk < t1:
                for m in (root + 12, third + 12, fifth + 12): place(musica, accordion(midi(m), BEAT * 0.35), tk, 0.09 * energia)
        for tt, f in [(0.5, 330), (1.5, 260), (2.5, 330), (3.25, 390), (3.5, 260)]:  # conga
            if tb + tt * BEAT < t1: place(musica, conga(f), tb + tt * BEAT, 0.22 * energia)
        if melodia:
            for i in range(4):
                m = mel[(b * 4 + i) % len(mel)]
                tk = tb + i * BEAT
                if m and tk < t1: place(musica, accordion(midi(m), BEAT * 0.85), tk, 0.13 * energia)


def villano(t0, t1):
    notes = [43, 42, 41, 40]  # tuba descendente cómica
    k = 0; tk = t0 + 0.15
    while tk < t1 - 0.2:
        place(musica, tuba(midi(notes[k % 4]), 0.42), tk, 0.6); tk += 0.5; k += 1
        if k % 4 == 0: tk += 0.5
    tb = t0
    while tb < t1:
        place(musica, conga(110, 0.3), tb, 0.35); tb += BEAT * 2


def investigacion(t0, t1):
    seq = [67, 71, 74, 71, 69, 72, 76, 72]
    tk = t0 + 0.05; k = 0
    while tk < t1 - 0.1:
        place(musica, pluck(midi(seq[k % 8])), tk, 0.45); tk += BEAT / 2; k += 1
    tb = t0
    while tb < t1:
        place(musica, bass(midi(43 if int((tb - t0) / (BEAT * 4)) % 2 == 0 else 45), BEAT * 0.8), tb, 0.35); tb += BEAT


e = ESC
cumbia(0, e[1]['inicio'] + 1.1)                                  # gancho (se corta al foco rojo)
cumbia(e[1]['inicio'] + 1.7, e[3]['inicio'], 0.8)
cumbia(e[3]['inicio'], e[4]['inicio'], 0.55, melodia=False)       # más tenue: "en silencio"
villano(e[4]['inicio'], e[5]['inicio'])
investigacion(e[5]['inicio'], e[6]['inicio'])
fin = e[8]['voz_inicio'] + e[8]['voz_dur'] + 0.35                # cierre musical al terminar la voz
cumbia(e[6]['inicio'], fin, 1.1)                                 # regresa con energía
for m in (55, 59, 62, 67, 71):                                   # acorde final que se desvanece (sin corte seco)
    place(musica, accordion(midi(m), 2.8) * np.exp(-t_arr(2.8) * 1.3), fin, 0.13)
place(musica, bass(midi(43), 2.0) * np.exp(-t_arr(2.0) * 1.5), fin, 0.6)
for k, m in enumerate((79, 83, 86, 91)):                         # arpegio de campanitas de despedida
    place(musica, bell(midi(m), 1.6, 3.5), fin + 0.25 + k * 0.14, 0.06)

# ---------- Efectos ----------
sfx = np.zeros(N)
s1 = e[1]['inicio']
place(sfx, bell(1568, 0.6, 7) + 0.6 * bell(2093, 0.6, 8), s1 + 0.25, 0.25)        # ding del pulgar
t = t_arr(1.6); place(sfx, np.sin(2 * np.pi * 110 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t)) * np.sin(np.pi * t / 1.6), s1 + 0.6, 0.12)  # escáner
place(sfx, whoosh(0.5), e[2]['inicio'] - 0.3, 0.35)                                 # zoom al interior
for k in range(10): place(sfx, click(0.03, 1800 + 300 * (k % 3)), e[2]['inicio'] + 0.6 + k * 0.7, 0.12)  # maquinaria
# escena 3: "click" mudo por filtro apagado (mismo cálculo que scenes.js) + tic-tac que se acelera
pat = ['10110', '01101', '11010', '10011', '01110', '10101']
zeros = [1 for r in pat for c in r if c == '0']
for i in range(len(zeros)):
    toff = 0.8 + i * 5.2 / len(zeros) + ((i * 7) % 3) * 0.15
    place(sfx, click(0.04, 900), e[3]['inicio'] + toff, 0.18)
tk, per = e[3]['inicio'] + 0.3, 0.55
while tk < e[4]['inicio'] - 0.2:
    place(sfx, click(0.025, 3200 if int((tk - e[3]['inicio']) / per) % 2 else 2400), tk, 0.14); tk += per; per = max(0.22, per * 0.95)
place(sfx, hiss(e[4]['dur'] - 0.6), e[4]['inicio'] + 0.4, 0.12)                       # chorros de presión
place(sfx, whoosh(0.35, False), e[5]['inicio'] - 0.2, 0.4)                           # paneo rápido
for k, tt in enumerate((0.45, 0.95)):                                                 # "ta-dá" de los detectives
    for m in (72 + 4 * k, 76 + 4 * k, 79 + 4 * k): place(sfx, bell(midi(m), 0.8, 5), e[5]['inicio'] + tt, 0.1)
place(sfx, whoosh(0.5), e[6]['inicio'] - 0.3, 0.3)
for i in range(6): place(sfx, bell(1200 + 90 * i, 0.4, 9), e[6]['inicio'] + 0.35 + i * 0.25, 0.08)  # escudos
place(sfx, rng.standard_normal(int(0.06 * SR)) * np.exp(-t_arr(0.06) * 60), e[6]['inicio'] + 2.15, 0.35)  # choque de manos
# escena 7: "check" sincronizados con la lista en pantalla (ver video.py: CHECKS) + latidos
from cues import CHECKS  # noqa: E402
for tt in CHECKS: place(sfx, bell(1760, 0.3, 12) + bell(2637, 0.3, 14), tt, 0.16)
place(sfx, whoosh(0.4), e[7]['inicio'] + 2.2, 0.12)                                  # salero
place(sfx, whoosh(0.5, False), e[7]['inicio'] + 4.2, 0.18)                            # pastillas fuera
tb = e[7]['inicio']
while tb < e[8]['inicio']:
    place(sfx, thump(55), tb, 0.35); place(sfx, thump(50), tb + 0.18, 0.25); tb += 0.8
place(sfx, rng.standard_normal(int(0.25 * SR)) * np.exp(-t_arr(0.25) * 12) * 0.5, e[8]['inicio'] - 0.1, 0.25)  # destello
place(sfx, bell(1318, 0.8, 6) + 0.7 * bell(1976, 0.8, 7), e[8]['inicio'] + 0.5, 0.22)   # ding foco verde

# ---------- Voz ----------
voz = np.zeros(N)
for n, sc in ESC.items():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(HERE / 'audio' / f'voz-{n}.mp3'), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    place(voz, np.frombuffer(raw, dtype=np.float32).astype(np.float64), sc['voz_inicio'], 1.0)

# ---------- Mezcla con "ducking" de la música bajo la voz ----------
env = np.abs(voz)
k = int(0.25 * SR); env = np.convolve(env, np.ones(k) / k, mode='same')
duck = 1 - 0.55 * np.clip(env / (env.max() * 0.15 + 1e-9), 0, 1)
musica *= 0.55 / (np.abs(musica).max() + 1e-9)
sfx *= 0.6 / (np.abs(sfx).max() + 1e-9)
voz *= 0.9 / (np.abs(voz).max() + 1e-9)
mezcla_l = voz + musica * duck * 0.42 + sfx * 0.55
mezcla_r = voz + musica * duck * 0.42 + sfx * 0.55
# ligera amplitud estéreo para música y efectos
d = int(0.012 * SR)
mezcla_r[d:] += (musica[:-d] * duck[:-d]) * 0.06
st = np.stack([mezcla_l, mezcla_r], 1)
st *= 0.95 / np.abs(st).max()
nf = int(1.2 * SR); fin_v = int(TL['total'] * SR)                # fundido de salida del audio
st[fin_v - nf:fin_v] *= np.linspace(1, 0, nf)[:, None] ** 2; st[fin_v:] = 0


def wav(path, x):
    x = np.clip(x, -1, 1); x16 = (x * 32767).astype(np.int16)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1 if x.ndim == 1 else 2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(x16.tobytes())


(HERE / 'audio' / 'stems').mkdir(parents=True, exist_ok=True)
wav(HERE / 'audio' / 'stems' / 'musica.wav', musica)
wav(HERE / 'audio' / 'stems' / 'efectos.wav', sfx)
wav(HERE / 'audio' / 'stems' / 'voz.wav', voz)
wav(HERE / 'audio' / 'mezcla.wav', st)
print(f'mezcla: {TOTAL:.2f} s')
