"""Genera el diagrama de arquitectura cloud EP2 (estado final seguro)
y lo guarda como informe/capturas_ep2/captura_01.png para que
generar_informe_ep2.py lo inserte automaticamente.
"""
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as patches

OUT = Path(__file__).resolve().parent.parent / "informe" / "capturas_ep2" / "captura_01.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

fig, ax = plt.subplots(figsize=(13, 8), dpi=160)
ax.set_xlim(0, 13)
ax.set_ylim(0, 8)
ax.set_aspect("equal")
ax.axis("off")

# Colores corporativos sobrios
C_AWS_BG    = "#FFFAF0"
C_AWS_BORDER= "#FF9900"
C_SG_SBC    = "#E3F2FD"
C_SG_PBX    = "#E8F5E9"
C_BOX_BORDER= "#37474F"
C_DANGER    = "#C62828"
C_OK        = "#2E7D32"

# Internet (zona externa)
ax.add_patch(patches.FancyBboxPatch((0.3, 5.5), 2.6, 1.6,
    boxstyle="round,pad=0.05", linewidth=1.5, edgecolor=C_BOX_BORDER,
    facecolor="#ECEFF1"))
ax.text(1.6, 6.9, "Internet", ha="center", fontsize=11, weight="bold")
ax.text(1.6, 6.45, "Teletrabajador\n(MicroSIP)", ha="center", fontsize=9)
ax.text(1.6, 5.85, "TLS + SRTP\nMandatory", ha="center", fontsize=8, style="italic", color="#455A64")

# Envoltorio AWS VPC
ax.add_patch(patches.FancyBboxPatch((3.7, 0.6), 9.0, 7.0,
    boxstyle="round,pad=0.1", linewidth=2.5, edgecolor=C_AWS_BORDER,
    facecolor=C_AWS_BG))
ax.text(4.0, 7.2, "AWS VPC default — us-east-1   (172.31.0.0/16)",
        ha="left", fontsize=10, weight="bold", color="#E65100")

# Internet Gateway
ax.add_patch(patches.FancyBboxPatch((3.0, 5.85), 0.9, 0.9,
    boxstyle="round,pad=0.04", linewidth=1.2, edgecolor=C_BOX_BORDER,
    facecolor="#FFE0B2"))
ax.text(3.45, 6.55, "IGW", ha="center", fontsize=8, weight="bold")
ax.text(3.45, 6.05, "(gateway)", ha="center", fontsize=6.5, style="italic")

# Security Group SBC (rectangulo de fondo)
ax.add_patch(patches.FancyBboxPatch((4.2, 4.2), 3.9, 2.8,
    boxstyle="round,pad=0.08", linewidth=1.5, edgecolor="#1976D2",
    facecolor=C_SG_SBC, linestyle="--"))
ax.text(4.35, 6.78, "SG-SBC  (Ingress)", ha="left", fontsize=9, weight="bold", color="#0D47A1")
ax.text(4.35, 6.50, "• 5061/TCP (SIPS) ← 0.0.0.0/0", ha="left", fontsize=7.5, color="#0D47A1")
ax.text(4.35, 6.30, "• 30000-31000/UDP (RTP) ← 0.0.0.0/0", ha="left", fontsize=7.5, color="#0D47A1")
ax.text(4.35, 6.10, "• 22/TCP (SSH) ← Mi IP/32", ha="left", fontsize=7.5, color="#0D47A1")

# VM-SBC (dentro del SG-SBC)
ax.add_patch(patches.FancyBboxPatch((4.4, 4.4), 3.5, 1.5,
    boxstyle="round,pad=0.05", linewidth=1.8, edgecolor=C_BOX_BORDER,
    facecolor="white"))
ax.text(6.15, 5.55, "VM-SBC", ha="center", fontsize=11, weight="bold")
ax.text(6.15, 5.20, "Ubuntu 24.04 + Kamailio 5.x", ha="center", fontsize=8)
ax.text(6.15, 4.95, "RTPEngine (SRTP ↔ RTP bridge)", ha="center", fontsize=8)
ax.text(6.15, 4.65, "EIP pública: <SBC_PUBLIC_IP>", ha="center", fontsize=8, color=C_OK, weight="bold")
ax.text(6.15, 4.45, "Priv: <SBC_PRIVATE_IP>", ha="center", fontsize=7.5, color="#455A64")

# Security Group PBX (estricto)
ax.add_patch(patches.FancyBboxPatch((8.7, 2.1), 3.9, 2.8,
    boxstyle="round,pad=0.08", linewidth=1.5, edgecolor="#388E3C",
    facecolor=C_SG_PBX, linestyle="--"))
ax.text(8.85, 4.68, "SG-PBX  (Ingress)", ha="left", fontsize=9, weight="bold", color="#1B5E20")
ax.text(8.85, 4.40, "• 5060/UDP+TCP ← sg-sbc (GroupId)", ha="left", fontsize=7.5, color="#1B5E20")
ax.text(8.85, 4.20, "• 10000-20000/UDP ← sg-sbc (GroupId)", ha="left", fontsize=7.5, color="#1B5E20")
ax.text(8.85, 4.00, "• 22/TCP, 5038/TCP ← Mi IP/32", ha="left", fontsize=7.5, color="#1B5E20")
ax.text(8.85, 3.78, "  (NINGUNA regla 0.0.0.0/0)", ha="left", fontsize=7,
        color=C_OK, weight="bold", style="italic")

# VM-PBX (dentro del SG-PBX)
ax.add_patch(patches.FancyBboxPatch((8.9, 2.3), 3.5, 1.4,
    boxstyle="round,pad=0.05", linewidth=1.8, edgecolor=C_BOX_BORDER,
    facecolor="white"))
ax.text(10.65, 3.40, "VM-PBX", ha="center", fontsize=11, weight="bold")
ax.text(10.65, 3.10, "Ubuntu 24.04 + Asterisk 22", ha="center", fontsize=8)
ax.text(10.65, 2.85, "Ext: 1001, 1002 (PJSIP)", ha="center", fontsize=8)
ax.text(10.65, 2.55, "Priv: <PBX_PRIVATE_IP>", ha="center", fontsize=8, color=C_OK, weight="bold")
ax.text(10.65, 2.35, "(sin IP pública)", ha="center", fontsize=7.5, style="italic", color=C_DANGER)

# Conexion Teletrabajador -> IGW -> SBC (curva para no chocar con header VPC)
ax.annotate("", xy=(3.0, 6.3), xytext=(2.9, 6.3),
    arrowprops=dict(arrowstyle="->", lw=2.0, color="#1976D2"))
ax.annotate("", xy=(4.4, 5.55), xytext=(3.9, 6.2),
    arrowprops=dict(arrowstyle="->", lw=2.0, color="#1976D2",
                    connectionstyle="arc3,rad=-0.15"))
ax.text(3.4, 5.5, "SIP/TLS:5061\n+ SRTP", ha="center", fontsize=8, weight="bold", color="#0D47A1")

# Conexion SBC -> PBX (curva por debajo para no atravesar SG-PBX)
ax.annotate("", xy=(10.0, 3.7), xytext=(6.2, 4.4),
    arrowprops=dict(arrowstyle="->", lw=1.6, color="#388E3C",
                    connectionstyle="arc3,rad=0.35"))
ax.text(7.55, 2.4, "SIP/UDP:5060 + RTP plano\n(red privada VPC)", ha="center", fontsize=8,
        weight="bold", color="#1B5E20")

# Leyenda
ax.add_patch(patches.FancyBboxPatch((0.3, 0.5), 3.0, 1.6,
    boxstyle="round,pad=0.06", linewidth=1.0, edgecolor=C_BOX_BORDER, facecolor="#FFFFFF"))
ax.text(0.45, 1.95, "Leyenda", fontsize=8, weight="bold")
ax.text(0.45, 1.70, "━━  SIPS/SRTP cifrado (Internet)", fontsize=7, color="#0D47A1")
ax.text(0.45, 1.50, "━━  SIP/RTP plano (intra-VPC)", fontsize=7, color="#1B5E20")
ax.text(0.45, 1.28, "Topology hiding: el SBC reescribe\nVia/Contact con su IP pública.", fontsize=7, style="italic")

# Titulo
fig.suptitle("Arquitectura Cloud — Aseguramiento VoIP (Consultora A&B)",
             fontsize=13, weight="bold", y=0.98)
fig.text(0.5, 0.025,
    "Estado final seguro: PBX sin IP pública • SBC única fachada con TLS+SRTP • SG referenciado por GroupId",
    ha="center", fontsize=9, style="italic", color="#37474F")

plt.savefig(OUT, dpi=160, bbox_inches="tight")
print(f"[OK] Diagrama: {OUT}")
