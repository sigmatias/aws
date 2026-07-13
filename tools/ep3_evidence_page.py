"""Genera una pagina local de evidencia para capturas EP3.

La pagina se usa como tablero visible en la segunda pantalla: muestra el paso
actual, resultados saneados y el historial de hitos. No guarda secretos.
"""
import argparse
import html
import json
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "informe"
STATE_PATH = OUT_DIR / "ep3_evidence_state.json"
HTML_PATH = OUT_DIR / "ep3_evidence.html"


def load_state():
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    return {"steps": []}


def save_state(state):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps(state, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def render(state):
    steps = state.get("steps", [])
    current = steps[-1] if steps else {"title": "EP3 CUY5132", "body": ""}
    rows = []
    for step in reversed(steps):
        rows.append(
            "<article>"
            f"<h3>{html.escape(step['number'])}. {html.escape(step['title'])}</h3>"
            f"<p class='time'>{html.escape(step['time'])}</p>"
            f"<pre>{html.escape(step['body'])}</pre>"
            "</article>"
        )

    content = f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>EP3 CUY5132 - Evidencia</title>
  <style>
    :root {{ color-scheme: light; }}
    body {{
      margin: 0;
      padding: 24px 410px 28px 28px;
      font-family: "Segoe UI", Arial, sans-serif;
      background: #f5f7fb;
      color: #101828;
    }}
    header {{
      background: linear-gradient(135deg, #123c69, #1d70b8);
      color: white;
      border-radius: 18px;
      padding: 24px 28px;
      box-shadow: 0 12px 30px rgba(16, 24, 40, .16);
    }}
    h1 {{ margin: 0 0 8px; font-size: 32px; }}
    h2 {{ margin: 0; font-size: 20px; font-weight: 500; }}
    .card {{
      background: white;
      border: 1px solid #d0d5dd;
      border-radius: 16px;
      margin-top: 22px;
      padding: 20px 24px;
      box-shadow: 0 8px 20px rgba(16, 24, 40, .08);
    }}
    .current h2 {{ color: #123c69; font-size: 24px; font-weight: 750; }}
    pre {{
      white-space: pre-wrap;
      word-break: break-word;
      font: 15px/1.45 Consolas, "Courier New", monospace;
      background: #101828;
      color: #e7f0ff;
      padding: 16px;
      border-radius: 12px;
      overflow: hidden;
    }}
    article {{
      background: white;
      border-left: 6px solid #1d70b8;
      border-radius: 12px;
      margin: 16px 0;
      padding: 12px 16px;
      box-shadow: 0 4px 14px rgba(16, 24, 40, .06);
    }}
    article h3 {{ margin: 0 0 3px; }}
    .time {{ margin: 0 0 8px; color: #667085; }}
    .pill {{
      display: inline-block;
      margin-top: 12px;
      background: #e7f0ff;
      color: #123c69;
      border-radius: 999px;
      padding: 6px 12px;
      font-weight: 700;
    }}
  </style>
</head>
<body>
  <header>
    <h1>EP3 CUY5132 - Comunicaciones Unificadas</h1>
    <h2>Matias Oyanedel | Seccion CUY1532-001D | Evidencia paso a paso</h2>
    <span class="pill">TXT visible a la derecha en cada captura</span>
  </header>
  <section class="card current">
    <h2>Paso actual: {html.escape(current['number'])}. {html.escape(current['title'])}</h2>
    <pre>{html.escape(current['body'])}</pre>
  </section>
  <section class="card">
    <h2>Historial de evidencia</h2>
    {''.join(rows)}
  </section>
</body>
</html>
"""
    HTML_PATH.write_text(content, encoding="utf-8")


def add_step(number, title, body):
    state = load_state()
    state.setdefault("steps", []).append(
        {
            "number": str(number),
            "title": title,
            "body": body.strip(),
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
    )
    save_state(state)
    render(state)
    print(HTML_PATH)


def main():
    parser = argparse.ArgumentParser(description="Tablero de evidencia EP3")
    parser.add_argument("number")
    parser.add_argument("title")
    parser.add_argument("body")
    args = parser.parse_args()
    add_step(args.number, args.title, args.body)


if __name__ == "__main__":
    main()
