#!/bin/bash
# user-data-pbx.sh - PBX Asterisk 22 para EP2 (Consultora A&B)
# Sin exposicion publica SIP/RTP. UFW solo permite trafico desde el SBC (172.31.0.0/16).
set -euxo pipefail
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y
apt-get install -y build-essential git wget curl vim unzip \
    libedit-dev libssl-dev libncurses5-dev libsqlite3-dev libxml2-dev \
    libjansson-dev uuid-dev libnewt-dev pkg-config autoconf python3 python3-pip \
    libsrtp2-dev

ASTERISK_VERSION=22-current
cd /usr/src
wget -q https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VERSION}.tar.gz
tar -xzf asterisk-${ASTERISK_VERSION}.tar.gz
cd asterisk-22*/

contrib/scripts/install_prereq install
./configure --with-jansson-bundled --with-pjproject-bundled --with-srtp
make menuselect.makeopts
# Asegurar que res_srtp se construya
menuselect/menuselect --enable res_srtp menuselect.makeopts
make -j"$(nproc)"
make install
make samples
make config
ldconfig

id asterisk &>/dev/null || useradd -r -d /var/lib/asterisk -s /sbin/nologin asterisk
usermod -aG audio,dialout asterisk
chown -R asterisk:asterisk /etc/asterisk /var/{lib,log,spool}/asterisk /usr/lib/asterisk

sed -i 's/^#AST_USER.*/AST_USER="asterisk"/' /etc/default/asterisk || true
sed -i 's/^#AST_GROUP.*/AST_GROUP="asterisk"/' /etc/default/asterisk || true

# UFW: SIP/RTP solo desde la subred privada (donde vive el SBC).
# SSH y AMI permitidos a cualquier IP a nivel UFW; el SG-EC2 los acota a "Mi IP".
ufw --force enable
ufw allow 22/tcp
ufw allow 5038/tcp
ufw allow from 172.31.0.0/16 to any port 5060 proto udp
ufw allow from 172.31.0.0/16 to any port 5060 proto tcp
ufw allow from 172.31.0.0/16 to any port 10000:20000 proto udp

mkdir -p /var/lib/asterisk/agi-bin
chown -R asterisk:asterisk /var/lib/asterisk/agi-bin

systemctl enable asterisk
systemctl restart asterisk

echo "=== user-data PBX EP2 completed $(date) ==="
