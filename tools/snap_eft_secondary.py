"""Captura pantalla completa del monitor secundario para evidencias EFT.

Uso:
    python tools/snap_eft_secondary.py 1
    python tools/snap_eft_secondary.py 2 --delay 3
    python tools/snap_eft_secondary.py --list

Guarda en:
    informe/capturas_eft/captura_XX.png
"""
import argparse
import ctypes
import sys
import time
import winsound
from ctypes import wintypes
from pathlib import Path

from PIL import ImageGrab


DEST = Path(__file__).resolve().parent.parent / "informe" / "capturas_eft"
SAFE_MAX = 1900  # Claude API rechaza imagenes >2000px en modo many-image; margen de seguridad.


class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long),
    ]


MONITORENUMPROC = ctypes.WINFUNCTYPE(
    ctypes.c_int,
    wintypes.HMONITOR,
    wintypes.HDC,
    ctypes.POINTER(RECT),
    wintypes.LPARAM,
)


def beep_pre():
    winsound.Beep(900, 80)


def beep_post():
    winsound.Beep(2600, 45)
    winsound.Beep(2200, 45)


def enum_monitors():
    monitors = []
    def callback(_hmonitor, _hdc, lprc, _lparam):
        rect = lprc.contents
        width = rect.right - rect.left
        height = rect.bottom - rect.top
        bbox = (
            rect.left,
            rect.top,
            rect.right,
            rect.bottom,
        )
        monitors.append(
            {
                "index": len(monitors) + 1,
                "primary": rect.left == 0 and rect.top == 0,
                "bbox": bbox,
                "width": width,
                "height": height,
                "area": width * height,
            }
        )
        return 1

    # Do not call SetProcessDPIAware here. On this mixed-DPI Windows layout,
    # ImageGrab expects logical monitor coordinates. DPI-aware physical bounds
    # captured black padding around the secondary monitor.
    ctypes.windll.user32.EnumDisplayMonitors(0, 0, MONITORENUMPROC(callback), 0)
    return monitors


def pick_secondary(monitors):
    non_primary = [monitor for monitor in monitors if not monitor["primary"]]
    candidates = non_primary or monitors
    if not candidates:
        raise RuntimeError("No se detectaron monitores.")
    return sorted(candidates, key=lambda item: (item["area"], item["index"]))[0]


def main():
    parser = argparse.ArgumentParser(
        description="Captura el monitor secundario completo para EFT."
    )
    parser.add_argument("numero", type=int, nargs="?", help="numero de captura")
    parser.add_argument("--delay", type=float, default=0.0, help="segundos de espera")
    parser.add_argument("--list", action="store_true", help="mostrar monitores y salir")
    parser.add_argument(
        "--dest",
        type=Path,
        default=DEST,
        help="carpeta destino; default informe/capturas_eft",
    )
    args = parser.parse_args()

    monitors = enum_monitors()
    selected = pick_secondary(monitors)

    if args.list:
        for monitor in monitors:
            marker = " <= seleccionado" if monitor == selected else ""
            print(
                f"monitor {monitor['index']}: "
                f"{monitor['width']}x{monitor['height']} "
                f"bbox={monitor['bbox']} primary={monitor['primary']}{marker}"
            )
        return 0

    if args.numero is None:
        parser.error("falta numero de captura; usa --list para diagnostico")

    args.dest.mkdir(parents=True, exist_ok=True)

    if args.delay > 0:
        print(f"Esperando {args.delay}s antes de capturar monitor secundario...", flush=True)
        time.sleep(args.delay)

    beep_pre()
    image = ImageGrab.grab(bbox=selected["bbox"], all_screens=True)
    original_size = image.size
    if max(image.size) > SAFE_MAX:
        image.thumbnail((SAFE_MAX, SAFE_MAX))
    path = args.dest / f"captura_{args.numero:02d}.png"
    image.save(path, "PNG", optimize=True)
    beep_post()

    if image.size != original_size:
        print(
            f"[OK] {path} ({original_size[0]}x{original_size[1]} -> {image.size[0]}x{image.size[1]}) "
            f"bbox={selected['bbox']}"
        )
    else:
        print(
            f"[OK] {path} "
            f"({image.size[0]}x{image.size[1]}) "
            f"bbox={selected['bbox']}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
