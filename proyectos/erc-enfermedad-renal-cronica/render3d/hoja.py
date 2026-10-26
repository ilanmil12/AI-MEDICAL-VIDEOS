"""Hoja de contacto de las 8 escenas compuestas. Uso: python3 hoja.py <salida.png> [carpeta de escenas]"""
import sys
from pathlib import Path
from PIL import Image

SRC = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).parent / 'out' / 'compuestas'
sheet = Image.new('RGB', (4 * 405 + 50, 2 * 720 + 30), '#111')
for i in range(8):
    im = Image.open(SRC / f'escena-{i + 1}.png').resize((405, 720))
    sheet.paste(im, (10 + (i % 4) * 415, 10 + (i // 4) * 730))
sheet.save(sys.argv[1])
