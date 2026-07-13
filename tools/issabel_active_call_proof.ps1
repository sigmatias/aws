$ErrorActionPreference = "Stop"

$ip = "44.213.63.39"
$key = "aws\asterisk-ep1.pem"
$dir1 = Resolve-Path "informe\microsip_profiles\MicroSIP_4001"
$dir2 = Resolve-Path "informe\microsip_profiles\MicroSIP_4002"
$exe1 = Join-Path $dir1 "microsip.exe"
$exe2 = Join-Path $dir2 "microsip.exe"

Write-Host "EP3 Issabel - prueba real de llamada 4001 -> 4002"
Write-Host "Cortando llamadas previas..."
Start-Process -FilePath $exe1 -WorkingDirectory $dir1 -ArgumentList "/hangupall" -Wait
Start-Process -FilePath $exe2 -WorkingDirectory $dir2 -ArgumentList "/hangupall" -Wait
Start-Sleep -Seconds 3

Write-Host "Marcando desde 4001 hacia 4002..."
Start-Process -FilePath $exe1 -WorkingDirectory $dir1 -ArgumentList "4002"
Start-Sleep -Seconds 3

Write-Host "Contestando desde 4002..."
Start-Process -FilePath $exe2 -WorkingDirectory $dir2 -ArgumentList "/answer"
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "Salida Asterisk durante la llamada activa:"
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i $key ubuntu@$ip "sudo docker exec issabel asterisk -rx 'core show channels verbose'"

Write-Host ""
Write-Host "Corte posterior a la evidencia..."
Start-Process -FilePath $exe1 -WorkingDirectory $dir1 -ArgumentList "/hangupall" -Wait
Start-Process -FilePath $exe2 -WorkingDirectory $dir2 -ArgumentList "/hangupall" -Wait
