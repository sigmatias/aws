# deploy_configs.ps1 - Sube configs Asterisk y AGI a la EC2
$ErrorActionPreference = "Stop"
$info = Get-Content (Join-Path $PSScriptRoot "..\aws\instance.json") | ConvertFrom-Json
$Ip   = $info.PublicIp
$Key  = $info.KeyPath

$cfgDir = Join-Path $PSScriptRoot "..\asterisk-config"

Write-Host "=== Copiando configs a $Ip ==="
scp -i $Key -o StrictHostKeyChecking=no `
    "$cfgDir\pjsip.conf" "$cfgDir\extensions.conf" "$cfgDir\manager.conf" "$cfgDir\logger.conf" `
    ubuntu@${Ip}:/tmp/

scp -i $Key -o StrictHostKeyChecking=no `
    "$cfgDir\consulta_externa.py" "$cfgDir\clientes.csv" `
    ubuntu@${Ip}:/tmp/

Write-Host "=== Instalando en el servidor ==="
ssh -i $Key -o StrictHostKeyChecking=no ubuntu@${Ip} @"
sudo cp /tmp/pjsip.conf /tmp/extensions.conf /tmp/manager.conf /tmp/logger.conf /etc/asterisk/
sudo chown asterisk:asterisk /etc/asterisk/*.conf
sudo mkdir -p /var/lib/asterisk/agi-bin
sudo cp /tmp/consulta_externa.py /var/lib/asterisk/agi-bin/
sudo cp /tmp/clientes.csv /var/lib/asterisk/agi-bin/
sudo chown -R asterisk:asterisk /var/lib/asterisk/agi-bin
sudo chmod 755 /var/lib/asterisk/agi-bin/consulta_externa.py
# Inserta IP publica en pjsip.conf (external_media_address)
sudo sed -i "s|;external_media_address=.*|external_media_address=$Ip|" /etc/asterisk/pjsip.conf
sudo sed -i "s|;external_signaling_address=.*|external_signaling_address=$Ip|" /etc/asterisk/pjsip.conf
sudo sed -i "s|;local_net=.*|local_net=172.31.0.0/16|" /etc/asterisk/pjsip.conf
sudo asterisk -rx 'core reload'
sudo asterisk -rx 'pjsip show endpoints'
"@

Write-Host ""
Write-Host "=== Listo. Conectate al CLI: ==="
Write-Host "  ssh -i $Key ubuntu@$Ip 'sudo asterisk -rvvv'"
