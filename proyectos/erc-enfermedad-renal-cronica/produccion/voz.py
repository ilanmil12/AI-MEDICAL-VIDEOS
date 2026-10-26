"""Genera la narración por escena (voz neural es-MX) con marcas de tiempo por palabra.
Uso: python3 voz.py [voz] [velocidad]   → audio/voz-N.mp3 + audio/voz-N.json
La lista de narraciones sale del guion aprobado (guion-v1.md)."""
import asyncio
import json
import os
import ssl
import sys
from pathlib import Path

import edge_tts
import edge_tts.communicate as ec

# Confiar en el CA del proxy del entorno (edge-tts trae fijo el de certifi).
CA = os.environ.get('SSL_CERT_FILE', '/root/.ccr/ca-bundle.crt')
if Path(CA).exists():
    ec._SSL_CTX = ssl.create_default_context(cafile=CA)

NARRACION = {
    1: 'Tus riñones pueden estar fallando… y sentirte perfectamente bien.',
    2: 'Tranquilo: no significa que estés enfermo. Pero mira: cada riñón tiene cerca de un millón de filtros diminutos que limpian tu sangre.',
    3: 'Cuando algunos se dañan, los demás trabajan horas extra para compensar. Por eso, al principio, casi nunca hay síntomas.',
    4: '¿Quién los daña más? El azúcar alta y la presión alta, sobre todo si no están controladas.',
    5: 'La forma de saberlo es con dos estudios sencillos: creatinina en sangre y albúmina en orina. Pídelos a tu médico.',
    6: 'Si se detecta a tiempo, hay tratamientos que pueden frenar su avance.',
    7: 'Y tú puedes ayudar: controla tu azúcar y tu presión, come con menos sal y no te automediques con antiinflamatorios. Tu corazón también lo agradecerá.',
    8: '¿Tienes diabetes, presión alta, obesidad o familiares con enfermedad renal? Pide hoy tus estudios de riñón.',
}

OUT = Path(__file__).parent / 'audio'


async def sintetizar(n, texto, voz, rate):
    com = edge_tts.Communicate(texto, voz, rate=rate, boundary='WordBoundary')
    audio, palabras = bytearray(), []
    async for chunk in com.stream():
        if chunk['type'] == 'audio':
            audio += chunk['data']
        elif chunk['type'] == 'WordBoundary':
            palabras.append({'texto': chunk['text'], 'inicio': chunk['offset'] / 1e7, 'dur': chunk['duration'] / 1e7})
    (OUT / f'voz-{n}.mp3').write_bytes(audio)
    (OUT / f'voz-{n}.json').write_text(json.dumps(palabras, ensure_ascii=False, indent=1))
    fin = palabras[-1]['inicio'] + palabras[-1]['dur'] if palabras else 0
    print(f'escena {n}: {len(palabras)} palabras, {fin:.2f} s')


async def main():
    voz = sys.argv[1] if len(sys.argv) > 1 else 'es-MX-JorgeNeural'
    rate = sys.argv[2] if len(sys.argv) > 2 else '+0%'
    OUT.mkdir(parents=True, exist_ok=True)
    for n, t in NARRACION.items():
        await sintetizar(n, t, voz, rate)

if __name__ == '__main__':
    asyncio.run(main())
