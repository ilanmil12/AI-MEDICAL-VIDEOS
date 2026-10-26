"""Calcula la línea de tiempo del video a partir de la duración real de la narración.
Uso: python3 timeline.py → timeline.json (inicio/duración de cada escena y de su voz)."""
import json
from pathlib import Path

HERE = Path(__file__).parent
FPS = 30
VOZ_OFFSET = 0.2      # la voz entra 0.2 s después del corte
COLA = 0.45           # respiro después de la última palabra
COLA_FINAL = 2.8      # cierre: despedida, acorde final y fundido (sin corte en seco)
MINIMO = {1: 3.5, 2: 8.0, 3: 8.0, 4: 6.2, 5: 7.5, 6: 5.0, 7: 9.0, 8: 7.2}

escenas, t = [], 0.0
for n in range(1, 9):
    palabras = json.loads((HERE / 'audio' / f'voz-{n}.json').read_text())
    fin_voz = palabras[-1]['inicio'] + palabras[-1]['dur']
    dur = max(MINIMO[n], VOZ_OFFSET + fin_voz + (COLA_FINAL if n == 8 else COLA))
    dur = round(dur * FPS) / FPS
    escenas.append({'n': n, 'inicio': round(t, 4), 'dur': dur, 'voz_inicio': round(t + VOZ_OFFSET, 4), 'voz_dur': round(fin_voz, 3)})
    t += dur

data = {'fps': FPS, 'total': round(t, 3), 'escenas': escenas}
(HERE / 'timeline.json').write_text(json.dumps(data, indent=1))
for e in escenas:
    print(f"escena {e['n']}: {e['inicio']:6.2f} s → {e['dur']:.2f} s")
print(f"TOTAL {t:.2f} s")
