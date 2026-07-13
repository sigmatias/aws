"""snap.py - Captura una pantalla y la guarda en informe/capturas_ep2/captura_NN.png

Uso (desde Claude Code o terminal):
    python tools/snap.py 2
    python tools/snap.py 7 --delay 2
    python tools/snap.py 5 --bbox 0,0,1920,1080
"""
import argparse
import ctypes
import sys
import time
import winsound
from pathlib import Path

from PIL import ImageGrab


DEST = Path(__file__).resolve().parent.parent / "informe" / "capturas_ep2"


def beep_pre():
    winsound.Beep(900, 80)


def beep_post():
    winsound.Beep(2600, 40)
    winsound.Beep(2200, 40)


def parse_bbox(text):
    parts = [int(x.strip()) for x in text.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("bbox debe ser x1,y1,x2,y2")
    return tuple(parts)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("numero", type=int, help="numero de captura (1..9)")
    p.add_argument("--delay", type=float, default=0.0,
                   help="segundos a esperar antes de disparar (para que cambies de ventana)")
    p.add_argument("--bbox", type=parse_bbox, default=None,
                   help="region 'x1,y1,x2,y2'. Default: todos los monitores")
    p.add_argument("--right", action="store_true",
                   help="recortar al monitor primario derecho (QHD 2560x1440 en x>=1366)")
    p.add_argument("--all-screens", action="store_true", default=True,
                   help="capturar todos los monitores (default true)")
    args = p.parse_args()
    if args.right and not args.bbox:
        args.bbox = (1366, 0, 3926, 1440)

    ctypes.windll.user32.SetProcessDPIAware()
    DEST.mkdir(parents=True, exist_ok=True)

    if args.delay > 0:
        print(f"Esperando {args.delay}s antes de disparar...", flush=True)
        time.sleep(args.delay)

    beep_pre()
    img = ImageGrab.grab(bbox=args.bbox, all_screens=args.all_screens)
    original_size = img.size
    # Claude API: en modo "many-image" rechaza imagenes >2000px en cualquier lado.
    # Margen a 1900 para no quedar al borde y bloquear la sesion.
    SAFE_MAX = 1900
    if max(img.size) > SAFE_MAX:
        img.thumbnail((SAFE_MAX, SAFE_MAX))
    destino = DEST / f"captura_{args.numero:02d}.png"
    img.save(destino, "PNG", optimize=True)
    beep_post()

    if img.size != original_size:
        print(f"[OK] {destino} ({original_size[0]}x{original_size[1]} -> {img.size[0]}x{img.size[1]})")
    else:
        print(f"[OK] {destino} ({img.size[0]}x{img.size[1]})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
