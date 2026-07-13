#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
consulta_externa.py - Script AGI (IL 1.4 EP1 CUY5132)
------------------------------------------------------
Controla el flujo de una llamada (ANSWER, STREAM FILE, GET DATA, EXEC Dial,
HANGUP) y consulta una fuente externa (CSV de clientes) para modificar el
flujo segun el codigo DTMF ingresado.

Implementacion AGI via stdio (sin dependencias externas).
"""

import csv
import os
import sys

CSV_PATH = "/var/lib/asterisk/agi-bin/clientes.csv"
LOG_PATH = "/tmp/agi_consulta_externa.log"


def log(msg):
    try:
        with open(LOG_PATH, "a") as f:
            f.write(f"{msg}\n")
    except Exception:
        pass


def send(cmd):
    """Envia un comando AGI y devuelve la linea de respuesta."""
    sys.stdout.write(cmd + "\n")
    sys.stdout.flush()
    line = sys.stdin.readline().strip()
    log(f">>> {cmd}")
    log(f"<<< {line}")
    return line


def parse_result(resp):
    """De '200 result=1001 (timeout)' devuelve '1001'."""
    try:
        part = resp.split("result=", 1)[1].split()[0]
        return part.strip("()")
    except Exception:
        return ""


def verbose(msg, level=1):
    send(f'VERBOSE "{msg}" {level}')


def answer():
    send("ANSWER")


def stream_file(fname, escape="\"#\""):
    send(f'STREAM FILE {fname} {escape}')


def get_data(fname, timeout=5000, max_digits=4):
    resp = send(f'GET DATA {fname} {timeout} {max_digits}')
    return parse_result(resp)


def exec_app(app, args):
    send(f'EXEC {app} "{args}"')


def hangup():
    send("HANGUP")


def leer_env():
    env = {}
    while True:
        line = sys.stdin.readline()
        if not line or line.strip() == "":
            break
        k, _, v = line.partition(":")
        env[k.strip()] = v.strip()
    return env


def buscar_cliente(codigo):
    if not os.path.isfile(CSV_PATH):
        log(f"CSV no encontrado: {CSV_PATH}")
        return None, None
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["codigo"].strip() == codigo.strip():
                return row["tipo"].strip().upper(), row["nombre"].strip()
    return None, None


def main():
    log("=" * 50)
    log("AGI consulta_externa iniciado")
    env = leer_env()
    log(f"env channel={env.get('agi_channel')} callerid={env.get('agi_callerid')}")

    callerid = sys.argv[1] if len(sys.argv) > 1 else env.get("agi_callerid", "?")
    verbose(f"AGI iniciado - caller {callerid}", 1)

    answer()
    # Saludo en ES (hello-world viene en el paquete core-es)
    stream_file("hello-world")

    # Pide codigo de cliente (4 digitos, termina con # o timeout 8s).
    # Usamos 'beep' que existe en core y senaliza al usuario que marque.
    codigo = get_data("beep", 8000, 4)
    verbose(f"Codigo DTMF recibido: [{codigo}]", 1)
    log(f"Codigo DTMF: [{codigo}]")

    if not codigo:
        verbose("Sin codigo ingresado - reproduciendo invalid", 1)
        stream_file("invalid")
        hangup()
        return

    tipo, nombre = buscar_cliente(codigo)
    verbose(f"Consulta externa -> tipo={tipo} nombre={nombre}", 1)
    log(f"Resultado CSV: tipo={tipo} nombre={nombre}")

    if tipo == "VIP":
        verbose(f"Cliente VIP {nombre} - prompt VIP + Dial 1002", 1)
        stream_file("pls-hold-while-try")
        exec_app("Dial", "PJSIP/1002,20")
    elif tipo == "STD":
        verbose(f"Cliente STD {nombre} - prompt STD + Dial 1002", 1)
        stream_file("one-moment-please")
        exec_app("Dial", "PJSIP/1002,20")
    else:
        verbose(f"Codigo {codigo} no encontrado en CSV - invalid", 1)
        stream_file("invalid")

    hangup()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"ERROR: {e!r}")
        sys.exit(1)
