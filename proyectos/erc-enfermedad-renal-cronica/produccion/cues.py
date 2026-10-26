"""Rótulos en pantalla y subtítulos, sincronizados con las marcas de tiempo de la voz.
Lo usan audio.py (efectos "check") y video.py (dibujo)."""
import json
import re
import unicodedata
from pathlib import Path

HERE = Path(__file__).parent
TL = json.loads((HERE / 'timeline.json').read_text())
ESC = {e['n']: e for e in TL['escenas']}
from voz import NARRACION  # noqa: E402  (texto con puntuación del guion aprobado)


def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    return re.sub(r'[^a-z0-9ñ]', '', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))


def palabras(n):
    """Palabras de la escena n con tiempo absoluto y la puntuación del guion."""
    marcas = json.loads((HERE / 'audio' / f'voz-{n}.json').read_text())
    tokens = NARRACION[n].split()
    usar_guion = len(tokens) == len(marcas) and all(norm(a) == norm(b['texto']) for a, b in zip(tokens, marcas))
    base = ESC[n]['voz_inicio']
    return [{'texto': tokens[i] if usar_guion else m['texto'], 'ini': base + m['inicio'], 'fin': base + m['inicio'] + m['dur']} for i, m in enumerate(marcas)]


def en_palabra(n, prefijo, k=1, delta=0.0):
    """Tiempo absoluto de la k-ésima palabra de la escena n que empieza con `prefijo`."""
    c = 0
    for p in palabras(n):
        if norm(p['texto']).startswith(norm(prefijo)):
            c += 1
            if c == k: return p['ini'] + delta
    raise KeyError(f'escena {n}: no encontré "{prefijo}"')


def fin_escena(n):
    return ESC[n]['inicio'] + ESC[n]['dur']


def ini(n, d=0.0):
    return ESC[n]['inicio'] + d


# tipo: titulo (píldora amarilla grande) · chip (píldora blanca) · check / cruz (lista) · nota (texto pequeño) · pie
ROTULOS = [
    dict(t0=ini(1, 0.15), t1=ini(1, 1.9), tipo='titulo', texto='¿Te sientes bien?', y=235),
    dict(t0=ini(1, 1.9), t1=fin_escena(1), tipo='titulo', texto='Tus riñones podrían no estarlo', y=235),
    dict(t0=en_palabra(2, 'millón', delta=-0.25), t1=fin_escena(2), tipo='titulo', texto='≈ 1 millón de filtros por riñón', y=300),
    dict(t0=en_palabra(2, 'millón', delta=0.15), t1=fin_escena(2), tipo='nota', texto='(se llaman nefronas)', y=400),
    dict(t0=en_palabra(3, 'Por'), t1=fin_escena(3), tipo='titulo', texto='Sin dolor · Sin aviso', y=1010),
    dict(t0=en_palabra(4, 'azúcar'), t1=fin_escena(4), tipo='chip', texto='Diabetes', y=250),
    dict(t0=en_palabra(4, 'presión'), t1=fin_escena(4), tipo='chip', texto='Presión alta', y=360),
    dict(t0=en_palabra(4, 'controladas'), t1=fin_escena(4), tipo='chip', texto='Obesidad', y=470),
    dict(t0=en_palabra(5, 'creatinina'), t1=fin_escena(5), tipo='chip', texto='Creatinina en sangre (TFGe)', y=250),
    dict(t0=en_palabra(5, 'albúmina'), t1=fin_escena(5), tipo='chip', texto='Albúmina en orina', y=360),
    dict(t0=ini(6, 0.35), t1=fin_escena(6), tipo='titulo', texto='Detectarla a tiempo cambia la historia', y=300),
    dict(t0=en_palabra(7, 'controla'), t1=fin_escena(7), tipo='check', texto='Azúcar y presión controladas', y=250),
    dict(t0=en_palabra(7, 'sal'), t1=fin_escena(7), tipo='check', texto='Menos sal', y=360),
    dict(t0=en_palabra(7, 'automediques'), t1=fin_escena(7), tipo='cruz', texto='Antiinflamatorios sin receta', y=470),
    dict(t0=ini(8, 0.4), t1=fin_escena(8), tipo='titulo', texto='Sentirte bien no siempre significa estar bien', y=235),
    dict(t0=ini(8, 0.0), t1=fin_escena(8), tipo='pie', texto='Información educativa. No sustituye la consulta médica.', y=1850),
]

CHECKS = [r['t0'] for r in ROTULOS if r['tipo'] in ('check', 'cruz')]


def subtitulos(max_palabras=4, max_chars=24):
    """Bloques de subtítulos: lista de {ini, fin, palabras:[{texto, ini, fin}]}."""
    bloques = []
    for n in range(1, 9):
        ps, actual = palabras(n), []
        for p in ps:
            actual.append(p)
            largo = sum(len(x['texto']) + 1 for x in actual)
            if len(actual) >= max_palabras or largo >= max_chars or p['texto'][-1] in '.,:?…':
                bloques.append(actual); actual = []
        if actual: bloques.append(actual)
    out = []
    for i, b in enumerate(bloques):
        fin = b[-1]['fin'] + 0.25
        if i + 1 < len(bloques): fin = min(fin, bloques[i + 1][0]['ini'])
        out.append({'ini': b[0]['ini'], 'fin': fin, 'palabras': b})
    return out


if __name__ == '__main__':
    for r in ROTULOS: print(f"{r['t0']:6.2f}–{r['t1']:6.2f}  {r['tipo']:6s} {r['texto']}")
    print(len(subtitulos()), 'bloques de subtítulos')
