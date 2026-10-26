"""Monta el video: cuadros 3D + ventana de rayos X + pantalla dividida + transiciones
+ rótulos + subtítulos sincronizados, y lo une con la mezcla de audio.
Uso: python3 video.py [--preview SEG] → salida/borrador-<VERSION>.mp4"""
import json
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from cues import ROTULOS, TL, subtitulos

HERE = Path(__file__).parent
FRAMES = HERE.parent / 'render3d' / 'frames'
OUT = HERE / 'salida'
W, H, FPS = 1080, 1920, TL['fps']
ESC = TL['escenas']
FONT = str(HERE / 'fuentes' / 'Baloo2.ttf')
VERSION = 'v2'

AMARILLO, CIRUELA, MENTA, CIAN = (242, 182, 50), (168, 50, 74), (107, 227, 138), (95, 211, 255)
# Transición en el corte que inicia la escena n (duración en s)
TRANS = {2: ('zoom', 0.5), 3: ('fundido', 0.3), 4: ('corte', 0), 5: ('barrido', 0.4), 6: ('zoom', 0.5), 7: ('corte', 0), 8: ('destello', 0.35)}


def font(size, weight='ExtraBold'):
    f = ImageFont.truetype(FONT, size); f.set_variation_by_name(weight); return f


ease = lambda x: (lambda c: c * c * (3 - 2 * c))(min(1, max(0, x)))


def ease_back(x):
    x = min(1, max(0, x)); c = 1.7
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


# ---------- Cuadros 3D ----------
@lru_cache(maxsize=48)
def cuadro(n, capa, i):
    d = FRAMES / f'escena-{n}-{capa}'
    total = len(list(d.glob('*.jpg')))
    return Image.open(d / f'{min(max(i, 0), total - 1):05d}.jpg').convert('RGB')


@lru_cache(maxsize=16)
def meta(n, capa):
    return json.loads((FRAMES / f'escena-{n}-{capa}' / 'meta.json').read_text())


def escena(n, ts):
    """Imagen 1080x1920 de la escena n en el segundo ts (puede salirse del rango: se fija al borde)."""
    fps3d = meta(n, 'top' if n == 3 else 'main')['fps']
    i = int(round(ts * fps3d))
    if n == 3:
        img = Image.new('RGB', (W, H), 'white')
        img.paste(cuadro(3, 'top', i), (0, 0)); img.paste(cuadro(3, 'bottom', i), (0, 960))
        ImageDraw.Draw(img).rectangle([0, 954, W, 966], fill='white')
        return img
    img = cuadro(n, 'main', i).copy()
    if n in (1, 8):
        m = meta(n, 'main')['meta']; x0, y0, x1, y1 = m[min(max(i, 0), len(m) - 1)]['xrayRect']
        pad = 20; x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
        abre = ease((ts - (0.55 if n == 1 else 0.25)) / 0.4)  # la ventana se abre desde el centro
        if abre > 0:
            cy, hh = (y0 + y1) / 2, (y1 - y0) / 2 * abre
            y0, y1 = int(cy - hh), int(cy + hh)
            mask = Image.new('L', (W, H), 0)
            ImageDraw.Draw(mask).rounded_rectangle([x0, y0, x1, y1], radius=36, fill=255)
            img.paste(cuadro(n, 'xray', i), (0, 0), mask)
            col = CIAN if n == 1 else MENTA
            capa = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
            d.rounded_rectangle([x0, y0, x1, y1], radius=36, outline=col + (255,), width=10)
            capa = capa.filter(ImageFilter.GaussianBlur(9)); d = ImageDraw.Draw(capa)
            d.rounded_rectangle([x0, y0, x1, y1], radius=36, outline=col + (255,), width=5)
            sy = y0 + int((y1 - y0) * (0.5 + 0.45 * np.sin(ts * 2.4)))  # línea de escaneo
            d.line([x0 + 10, sy, x1 - 10, sy], fill=col + (150,), width=4)
            img = Image.alpha_composite(img.convert('RGBA'), capa).convert('RGB')
    return img


def zoom(img, s):
    if abs(s - 1) < 1e-3: return img
    w, h = int(W * s), int(H * s)
    big = img.resize((w, h), Image.BILINEAR)
    return big.crop(((w - W) // 2, (h - H) // 2, (w - W) // 2 + W, (h - H) // 2 + H))


def base(t):
    """Fotograma base con transiciones entre escenas."""
    idx = next((k for k, e in enumerate(ESC) if t < e['inicio'] + e['dur']), len(ESC) - 1)
    e = ESC[idx]
    # ¿estamos cerca de un corte con transición?
    for k in (idx, idx + 1):
        if 0 < k < len(ESC):
            tipo, dur = TRANS[ESC[k]['n']]
            corte = ESC[k]['inicio']
            if dur and abs(t - corte) < dur / 2:
                a, b = ESC[k - 1], ESC[k]
                p = (t - (corte - dur / 2)) / dur
                A, B = escena(a['n'], t - a['inicio']), escena(b['n'], t - b['inicio'])
                if tipo == 'zoom':
                    A = zoom(A, 1 + 0.9 * ease(p)); B = zoom(B, 1.3 - 0.3 * ease(p))
                    return Image.blend(A, B, ease(p))
                if tipo == 'fundido':
                    oscuro = Image.new('RGB', (W, H), (8, 20, 32))
                    return Image.blend(A, oscuro, p * 2) if p < 0.5 else Image.blend(oscuro, B, (p - 0.5) * 2)
                if tipo == 'barrido':
                    off = int(W * ease(p)); lienzo = Image.new('RGB', (W, H))
                    lienzo.paste(A, (-off, 0)); lienzo.paste(B, (W - off, 0))
                    return lienzo.filter(ImageFilter.BoxBlur(int(18 * np.sin(np.pi * p)))) if 0.05 < p < 0.95 else lienzo
                if tipo == 'destello':
                    blanco = Image.new('RGB', (W, H), (255, 255, 255))
                    return Image.blend(A, blanco, p * 2) if p < 0.5 else Image.blend(blanco, B, (p - 0.5) * 2)
    return escena(e['n'], t - e['inicio'])


# ---------- Rótulos ----------
@lru_cache(maxsize=64)
def rotulo_img(tipo, texto):
    if tipo == 'pie':
        f = font(30, 'Bold'); bb = f.getbbox(texto)
        im = Image.new('RGBA', (bb[2] + 24, bb[3] + 24), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((12, 6), texto, font=f, fill='white', stroke_width=4, stroke_fill=(0, 0, 0, 200))
        return im
    if tipo == 'nota':
        f = font(42, 'Bold'); bb = f.getbbox(texto)
        im = Image.new('RGBA', (bb[2] + 30, bb[3] + 30), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((15, 8), texto, font=f, fill='white', stroke_width=6, stroke_fill=(10, 30, 45))
        return im
    size = 64 if tipo == 'titulo' else 54
    f = font(size)
    lineas = [texto]
    if f.getlength(texto) > W - 200:  # partir en dos líneas equilibradas
        pal = texto.split(); mejor = None
        for k in range(1, len(pal)):
            a, b = ' '.join(pal[:k]), ' '.join(pal[k:])
            m = max(f.getlength(a), f.getlength(b))
            if mejor is None or m < mejor[0]: mejor = (m, [a, b])
        lineas = mejor[1]
    icono = 70 if tipo in ('check', 'cruz') else 0
    tw = int(max(f.getlength(l) for l in lineas)); lh = int(size * 1.12)
    pw, ph = tw + 70 + icono, lh * len(lineas) + 34
    im = Image.new('RGBA', (pw + 20, ph + 20), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    sombra = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).rounded_rectangle([10, 16, pw + 10, ph + 16], radius=ph // 2 if len(lineas) == 1 else 40, fill=(0, 0, 0, 110))
    im = Image.alpha_composite(im, sombra.filter(ImageFilter.GaussianBlur(8))); d = ImageDraw.Draw(im)
    fondo = AMARILLO if tipo == 'titulo' else (255, 255, 255)
    d.rounded_rectangle([10, 10, pw + 10, ph + 10], radius=ph // 2 if len(lineas) == 1 else 40, fill=fondo + (245,))
    for k, l in enumerate(lineas):
        x = 10 + 35 + icono + (tw - f.getlength(l)) / 2
        d.text((x, 10 + 12 + k * lh), l, font=f, fill=(35, 22, 30))
    if icono:  # palomita verde / tache rojo dibujados
        cx, cy, r = 10 + 35 + 26, 10 + ph / 2, 26
        col = (46, 170, 90) if tipo == 'check' else (210, 50, 50)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
        if tipo == 'check': d.line([(cx - 13, cy + 1), (cx - 3, cy + 11), (cx + 14, cy - 10)], fill='white', width=8, joint='curve')
        else:
            d.line([(cx - 11, cy - 11), (cx + 11, cy + 11)], fill='white', width=8); d.line([(cx - 11, cy + 11), (cx + 11, cy - 11)], fill='white', width=8)
    return im


def pegar(lienzo, im, cx, cy, escala=1.0, alfa=1.0):
    if escala <= 0.01 or alfa <= 0.01: return
    if abs(escala - 1) > 1e-3: im = im.resize((max(1, int(im.width * escala)), max(1, int(im.height * escala))), Image.BICUBIC)
    if alfa < 1:
        a = im.getchannel('A').point(lambda v: int(v * alfa)); im = im.copy(); im.putalpha(a)
    lienzo.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


# ---------- Subtítulos ----------
SUBS = subtitulos()
F_SUB = font(62)


def subtitulo(lienzo, t):
    b = next((s for s in SUBS if s['ini'] <= t < s['fin']), None)
    if not b: return
    palabras = b['palabras']; esp = F_SUB.getlength(' ')
    anchos = [F_SUB.getlength(p['texto']) for p in palabras]
    total = sum(anchos) + esp * (len(palabras) - 1)
    cy = 1560; x = (W - total) / 2
    caja = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(caja).rounded_rectangle([x - 34, cy - 58, x + total + 34, cy + 58], radius=30, fill=(10, 18, 28, 150))
    lienzo.alpha_composite(caja)
    d = ImageDraw.Draw(lienzo)
    for p, w in zip(palabras, anchos):
        activa = p['ini'] <= t < p['fin'] + 0.05
        d.text((x, cy - 44), p['texto'], font=F_SUB, fill=(255, 210, 63) if activa else (255, 255, 255), stroke_width=5, stroke_fill=(0, 0, 0))
        x += w + esp


def fotograma(t):
    img = base(t).convert('RGBA')
    fundido = ease((t - (TL['total'] - 0.9)) / 0.9)  # cierre: fundido a negro en el último segundo
    for r in ROTULOS:
        if r['t0'] <= t < r['t1']:
            im = rotulo_img(r['tipo'], r['texto'])
            entra = (t - r['t0']) / 0.28; sale = (r['t1'] - t) / 0.15
            escala = ease_back(entra) if r['tipo'] not in ('pie', 'nota') else 1.0
            pegar(img, im, W / 2, r['y'], escala, min(1, ease(entra * 1.5), ease(sale)))
    subtitulo(img, t)
    if fundido > 0: img = Image.blend(img, Image.new('RGBA', (W, H), (0, 0, 0, 255)), fundido)
    return img.convert('RGB')


def main():
    OUT.mkdir(exist_ok=True)
    preview = '--preview' in sys.argv
    if preview:  # fotogramas sueltos para revisión
        for t in map(float, sys.argv[sys.argv.index('--preview') + 1].split(',')):
            fotograma(t).save(OUT / f'preview-{t:05.2f}.png')
        return
    total = TL['total']; n = int(round(total * FPS))
    video = OUT / 'video-sin-audio.mp4'
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(video)], stdin=subprocess.PIPE)
    for f in range(n):
        ff.stdin.write(fotograma(f / FPS).tobytes())
        if f % 150 == 0: print(f'  cuadro {f}/{n}', flush=True)
    ff.stdin.close(); ff.wait()
    final = OUT / f'borrador-{VERSION}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(video), '-i', str(HERE / 'audio' / 'mezcla.wav'),
                    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-shortest', '-movflags', '+faststart', str(final)], check=True)
    print('listo:', final)


if __name__ == '__main__':
    main()
