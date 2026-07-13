"""Ventana TXT siempre visible para las capturas EFT.

La ventana lee `informe/EFT_TXT_VISIBLE.txt` cada segundo y se mantiene
encima de las demas ventanas en el monitor secundario. Asi las capturas de
`snap_eft_secondary.py` siempre incluyen los datos exigidos por la evaluacion.

Uso:
    python tools/eft_evidence_overlay.py --write "Validacion AWS"
    python tools/eft_evidence_overlay.py --show
"""
import argparse
import ctypes
import sys
import tkinter as tk
from ctypes import wintypes
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
TXT_PATH = ROOT / "informe" / "EFT_TXT_VISIBLE.txt"


BASE_LINES = [
    "Integrante: Matias Felipe Andres Oyanedel Gomez",
    "Seccion: CUY1532-001D",
    "Asignatura: Comunicaciones Unificadas",
    "Evaluacion: EFT CUY5132 - Clinica Salud Integral",
]


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


def enum_monitors():
    monitors = []

    def callback(_hmonitor, _hdc, lprc, _lparam):
        rect = lprc.contents
        width = rect.right - rect.left
        height = rect.bottom - rect.top
        monitors.append(
            {
                "index": len(monitors) + 1,
                "primary": rect.left == 0 and rect.top == 0,
                "bbox": (rect.left, rect.top, rect.right, rect.bottom),
                "width": width,
                "height": height,
                "area": width * height,
            }
        )
        return 1

    ctypes.windll.user32.EnumDisplayMonitors(0, 0, MONITORENUMPROC(callback), 0)
    return monitors


def pick_secondary(monitors):
    non_primary = [monitor for monitor in monitors if not monitor["primary"]]
    candidates = non_primary or monitors
    if not candidates:
        raise RuntimeError("No se detectaron monitores.")
    return sorted(candidates, key=lambda item: (item["area"], item["index"]))[0]


def write_txt(step):
    TXT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = BASE_LINES + ["", f"Paso actual: {step}"]
    TXT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(TXT_PATH)


def show_overlay():
    TXT_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not TXT_PATH.exists():
        write_txt("Preparacion de evidencia")

    monitor = pick_secondary(enum_monitors())
    left, top, right, bottom = monitor["bbox"]
    width = min(390, monitor["width"] - 40)
    height = 250
    x = right - width - 10
    y = top + 20

    root = tk.Tk()
    root.title("EFT_TXT_VISIBLE.txt")
    root.geometry(f"{width}x{height}+{x}+{y}")
    root.attributes("-topmost", True)
    root.configure(bg="#fff7cc")

    label = tk.Label(
        root,
        text="TXT visible obligatorio",
        bg="#ffe680",
        fg="#000000",
        font=("Consolas", 12, "bold"),
        anchor="w",
        padx=8,
        pady=4,
    )
    label.pack(fill="x")

    text = tk.Text(
        root,
        bg="#fffce6",
        fg="#111111",
        font=("Consolas", 11),
        wrap="word",
        relief="solid",
        borderwidth=1,
    )
    text.pack(fill="both", expand=True, padx=8, pady=8)

    last = None

    def refresh():
        nonlocal last
        try:
            content = TXT_PATH.read_text(encoding="utf-8")
        except FileNotFoundError:
            content = ""
        if content != last:
            text.configure(state="normal")
            text.delete("1.0", "end")
            text.insert("1.0", content)
            text.configure(state="disabled")
            last = content
        root.lift()
        root.attributes("-topmost", True)
        root.after(700, refresh)

    refresh()
    root.mainloop()


def main():
    parser = argparse.ArgumentParser(description="TXT visible para evidencias EFT")
    parser.add_argument("--write", help="actualizar paso actual y salir")
    parser.add_argument("--show", action="store_true", help="mostrar overlay")
    args = parser.parse_args()

    if args.write:
        write_txt(args.write)
        return 0
    if args.show:
        show_overlay()
        return 0

    parser.error("usa --write o --show")
    return 2


if __name__ == "__main__":
    sys.exit(main())
