#!/bin/bash
# user-data-sbc.sh.template - SBC Kamailio + RTPEngine para EP2
# Placeholders sustituidos por ep2-deploy-sbc.ps1:
#   172.31.69.103
# El SBC obtiene su propia IP publica/privada via instance metadata.
set -euxo pipefail
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

PBX_PRIVATE_IP="172.31.69.103"

# --- IPs propias via IMDSv2 ---
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" \
        -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
SBC_PUBLIC_IP=$(curl -sH "X-aws-ec2-metadata-token: $TOKEN" \
        http://169.254.169.254/latest/meta-data/public-ipv4)
SBC_PRIVATE_IP=$(curl -sH "X-aws-ec2-metadata-token: $TOKEN" \
        http://169.254.169.254/latest/meta-data/local-ipv4)

echo "=== SBC IPs ==="
echo "  PUBLIC : $SBC_PUBLIC_IP"
echo "  PRIVATE: $SBC_PRIVATE_IP"
echo "  PBX    : $PBX_PRIVATE_IP"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# --- Kamailio + modulos ---
apt-get install -y \
    kamailio kamailio-tls-modules kamailio-extra-modules \
    openssl ca-certificates \
    build-essential pkg-config git \
    sngrep tcpdump

# --- RTPEngine: probar paquete primero, fallback a fuente ---
RTPENGINE_OK=0
if apt-get install -y ngcp-rtpengine-daemon 2>/dev/null; then
    RTPENGINE_OK=1
    echo "rtpengine instalado desde apt"
fi

if [ "$RTPENGINE_OK" = "0" ]; then
    echo "=== Compilando rtpengine desde fuente ==="
    apt-get install -y \
        libavfilter-dev libavformat-dev libavcodec-dev libavutil-dev \
        libswresample-dev libswscale-dev libhiredis-dev libjson-glib-dev \
        libpcre3-dev libxmlrpc-core-c3-dev libcurl4-openssl-dev libevent-dev \
        libsystemd-dev libssl-dev libglib2.0-dev zlib1g-dev libpcap-dev \
        libmosquitto-dev libnftnl-dev libmnl-dev libmariadb-dev-compat \
        default-libmysqlclient-dev
    cd /usr/src
    git clone --depth 1 --branch mr12.5 https://github.com/sipwise/rtpengine.git
    cd rtpengine
    make -C daemon -j"$(nproc)"
    install -m 755 daemon/rtpengine /usr/sbin/rtpengine
    install -m 644 etc/rtpengine.conf /etc/rtpengine/rtpengine.conf 2>/dev/null || \
        mkdir -p /etc/rtpengine
    # Unit systemd minimal
    cat >/etc/systemd/system/rtpengine.service <<EOF
[Unit]
Description=RTPEngine
After=network.target

[Service]
Type=simple
EnvironmentFile=-/etc/default/rtpengine
ExecStart=/usr/sbin/rtpengine --config-file=/etc/rtpengine/rtpengine.conf
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
fi

# --- Configuracion de rtpengine ---
mkdir -p /etc/rtpengine
cat >/etc/rtpengine/rtpengine.conf <<EOF
[rtpengine]
interface = pub/${SBC_PUBLIC_IP};int/${SBC_PRIVATE_IP}
listen-ng = 127.0.0.1:22222
port-min = 30000
port-max = 31000
log-level = 6
log-stderr = false
foreground = false
table = 0
EOF

# --- Certificado TLS autofirmado ---
mkdir -p /etc/kamailio/tls
openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout /etc/kamailio/tls/sbc.key \
    -out    /etc/kamailio/tls/sbc.crt \
    -days 365 \
    -subj "/C=CL/ST=Santiago/O=Consultora-AyB/CN=${SBC_PUBLIC_IP}"
chown -R kamailio:kamailio /etc/kamailio/tls
chmod 600 /etc/kamailio/tls/sbc.key

# --- Configuracion de Kamailio ---
cat >/etc/kamailio/tls.cfg <<'EOF'
[server:default]
method = TLSv1.2+
verify_certificate = no
require_certificate = no
private_key = /etc/kamailio/tls/sbc.key
certificate = /etc/kamailio/tls/sbc.crt

[client:default]
method = TLSv1.2+
verify_certificate = no
require_certificate = no
EOF

# Sustituir placeholders en kamailio.cfg.template (que vendra en /tmp via SCP del deploy)
# Si todavia no esta, escribimos uno inline:
if [ -f /tmp/kamailio.cfg.template ]; then
    cp /tmp/kamailio.cfg.template /etc/kamailio/kamailio.cfg
else
    # Inline fallback (mismo contenido que sbc-config/kamailio.cfg.template)
    cat >/etc/kamailio/kamailio.cfg <<'KAMEOF'
#!KAMAILIO
#!define WITH_TLS
#!define WITH_RTPENGINE

#!substdef "!SBC_PUBLIC_IP!__SBC_PUBLIC_IP__!g"
#!substdef "!SBC_PRIVATE_IP!__SBC_PRIVATE_IP__!g"
#!substdef "!PBX_PRIVATE_IP!172.31.69.103!g"

debug=2
log_stderror=no
log_facility=LOG_LOCAL0
log_prefix="{$mt $hdr(CSeq) $ci} "
fork=yes
children=4

listen=tls:SBC_PRIVATE_IP:5061 advertise SBC_PUBLIC_IP:5061
listen=udp:SBC_PRIVATE_IP:5060
enable_tls=yes
disable_tcp=yes

mpath="/usr/lib/x86_64-linux-gnu/kamailio/modules"
loadmodule "tls.so"
loadmodule "tm.so"
loadmodule "tmx.so"
loadmodule "sl.so"
loadmodule "rr.so"
loadmodule "pv.so"
loadmodule "maxfwd.so"
loadmodule "siputils.so"
loadmodule "textops.so"
loadmodule "uri.so"
loadmodule "xlog.so"
loadmodule "sanity.so"
loadmodule "ctl.so"
loadmodule "kex.so"
loadmodule "corex.so"
loadmodule "rtpengine.so"
loadmodule "nathelper.so"

modparam("tls", "config", "/etc/kamailio/tls.cfg")
modparam("tm", "failure_reply_mode", 3)
modparam("tm", "fr_timer", 30000)
modparam("tm", "fr_inv_timer", 120000)
modparam("rr", "enable_full_lr", 1)
modparam("rr", "append_fromtag", 0)
modparam("rtpengine", "rtpengine_sock", "udp:127.0.0.1:22222")

request_route {
    if (!mf_process_maxfwd_header("10")) {
        sl_send_reply("483", "Too Many Hops"); exit;
    }
    if (!sanity_check("1511", "7")) {
        xlog("Malformed SIP from $si:$sp\n"); exit;
    }
    if (is_method("CANCEL")) {
        if (t_check_trans()) { route(RELAY); } exit;
    }
    if (has_totag()) {
        if (loose_route()) {
            if (is_method("BYE")) { rtpengine_delete(); }
            route(RELAY); exit;
        } else {
            sl_send_reply("404", "Not here"); exit;
        }
    }
    if (is_method("REGISTER")) {
        $du = "sip:PBX_PRIVATE_IP:5060";
        route(RELAY); exit;
    }
    if (is_method("INVITE")) {
        record_route();
        rtpengine_offer("RTP/AVP replace-origin replace-session-connection ICE=remove");
        $du = "sip:PBX_PRIVATE_IP:5060";
        t_on_reply("REPLY_FROM_PBX");
        t_on_failure("FAIL_PBX");
        route(RELAY); exit;
    }
    if (is_method("OPTIONS")) {
        sl_send_reply("200", "OK"); exit;
    }
    sl_send_reply("405", "Method Not Allowed");
}

route[RELAY] {
    if (!t_relay()) { sl_reply_error(); } exit;
}

onreply_route[REPLY_FROM_PBX] {
    if (status =~ "(18[03])|(2[0-9][0-9])") {
        if (has_body("application/sdp")) {
            rtpengine_answer("RTP/SAVP replace-origin replace-session-connection ICE=remove");
        }
    }
}

failure_route[FAIL_PBX] {
    if (t_is_canceled()) { exit; }
    rtpengine_delete();
}
KAMEOF
fi

# Sustituciones de IPs en el cfg final
sed -i "s/__SBC_PUBLIC_IP__/${SBC_PUBLIC_IP}/g"  /etc/kamailio/kamailio.cfg
sed -i "s/__SBC_PRIVATE_IP__/${SBC_PRIVATE_IP}/g" /etc/kamailio/kamailio.cfg
sed -i "s/172.31.69.103/${PBX_PRIVATE_IP}/g" /etc/kamailio/kamailio.cfg

# Habilitar Kamailio al boot
sed -i 's/^#\?RUN_KAMAILIO=.*/RUN_KAMAILIO=yes/' /etc/default/kamailio

# --- UFW del SBC ---
ufw --force enable
ufw allow 22/tcp
ufw allow 5061/tcp           # SIPS publico
ufw allow 30000:31000/udp    # RTP/SRTP publico
ufw allow from 172.31.0.0/16 to any port 5060 proto udp   # SIP interno
ufw allow from 172.31.0.0/16 to any port 5060 proto tcp

# --- Arrancar servicios ---
systemctl daemon-reload
systemctl enable rtpengine || true
systemctl restart rtpengine || true
systemctl enable kamailio
systemctl restart kamailio

echo "=== user-data SBC EP2 completed $(date) ==="
