"""Compone las capas renderizadas en las imágenes finales 1080x1920 de cada escena.
Uso: python3 compose.py  → ../assets/escenas/escena-N.png"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).parent
OUT = ROOT / 'out'
DEST = ROOT.parent / 'assets' / 'escenas'
DEST.mkdir(parents=True, exist_ok=True)
meta = json.loads((OUT / 'meta.json').read_text())


def xray_window(n, color):
    base = Image.open(OUT / f'escena-{n}-main.png').convert('RGB')
    xr = Image.open(OUT / f'escena-{n}-xray.png').convert('RGB')
    x0, y0, x1, y1 = meta[f'{n}-main']['xrayRect']
    pad = 20
    x0, y0, x1, y1 = max(x0 - pad, 0), max(y0 - pad, 0), min(x1 + pad, base.width), min(y1 + pad, base.height)
    mask = Image.new('L', base.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([x0, y0, x1, y1], radius=36, fill=255)
    base.paste(xr, (0, 0), mask)
    glow = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.rounded_rectangle([x0, y0, x1, y1], radius=36, outline=color + (255,), width=10)
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    d2 = ImageDraw.Draw(glow)
    d2.rounded_rectangle([x0, y0, x1, y1], radius=36, outline=color + (255,), width=5)
    sy = y0 + int((y1 - y0) * 0.22)
    d2.line([x0 + 8, sy, x1 - 8, sy], fill=color + (170,), width=4)
    out = base.convert('RGBA'); out.alpha_composite(glow)
    return out.convert('RGB')


def split(n):
    top = Image.open(OUT / f'escena-{n}-top.png').convert('RGB')
    bot = Image.open(OUT / f'escena-{n}-bottom.png').convert('RGB')
    out = Image.new('RGB', (1080, 1920), 'white')
    out.paste(top, (0, 0)); out.paste(bot, (0, 960))
    ImageDraw.Draw(out).rectangle([0, 954, 1080, 966], fill='white')
    return out


for n in range(1, 9):
    if n in (1, 8):
        img = xray_window(n, (95, 211, 255) if n == 1 else (107, 227, 138))
    elif n == 3:
        img = split(n)
    else:
        img = Image.open(OUT / f'escena-{n}-main.png').convert('RGB')
    img.save(DEST / f'escena-{n}.png')
    print('escena', n, img.size)
