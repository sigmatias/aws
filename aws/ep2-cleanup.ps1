# ep2-cleanup.ps1 - Limpia todos los recursos EP2 (PBX, SBC, SGs, EIP).
# No borra el keypair (lo dejamos por si se reusa).

$ErrorActionPreference = "Continue"
$env:AWS_PAGER = ""

$PythonExe = "C:\Users\tek\AppData\Local\Programs\Python\Python312\python.exe"
function aws { & $PythonExe -m awscli @args }

$Region = "us-east-1"

function Get-Json($name) {
    $p = Join-Path $PSScriptRoot $name
    if (Test-Path $p) { return Get-Content $p -Raw | ConvertFrom-Json }
    return $null
}

$Pbx = Get-Json "ep2-pbx.json"
$Sbc = Get-Json "ep2-sbc.json"

if ($Sbc) {
    Write-Host "=== Disasociando EIP del SBC ==="
    $assoc = aws ec2 describe-addresses --region $Region --allocation-ids $Sbc.AllocId `
        --query "Addresses[0].AssociationId" --output text 2>$null
    if ($assoc -and $assoc -ne "None") {
        aws ec2 disassociate-address --region $Region --association-id $assoc 2>&1 | Out-Host
    }
    Write-Host "=== Liberando EIP $($Sbc.AllocId) ==="
    aws ec2 release-address --region $Region --allocation-id $Sbc.AllocId 2>&1 | Out-Host

    Write-Host "=== Terminando SBC $($Sbc.InstanceId) ==="
    aws ec2 terminate-instances --region $Region --instance-ids $Sbc.InstanceId | Out-Host
}

if ($Pbx) {
    Write-Host "=== Terminando PBX $($Pbx.InstanceId) ==="
    aws ec2 terminate-instances --region $Region --instance-ids $Pbx.InstanceId | Out-Host
}

if ($Pbx -or $Sbc) {
    $ids = @()
    if ($Pbx) { $ids += $Pbx.InstanceId }
    if ($Sbc) { $ids += $Sbc.InstanceId }
    Write-Host "=== Esperando terminacion ==="
    aws ec2 wait instance-terminated --region $Region --instance-ids $ids
}

if ($Pbx) {
    Write-Host "=== Borrando SG-PBX $($Pbx.SgId) ==="
    aws ec2 delete-security-group --region $Region --group-id $Pbx.SgId 2>&1 | Out-Host
}
if ($Sbc) {
    Write-Host "=== Borrando SG-SBC $($Sbc.SgId) ==="
    aws ec2 delete-security-group --region $Region --group-id $Sbc.SgId 2>&1 | Out-Host
}

# Tambien borramos el SG viejo de EP1 que quedo huerfano
Write-Host "=== Borrando SG viejo de EP1 (asterisk-ep1) si existe ==="
$old = aws ec2 describe-security-groups --region $Region --filters "Name=group-name,Values=sg-asterisk-ep1" `
    --query "SecurityGroups[0].GroupId" --output text 2>$null
if ($old -and $old -ne "None") {
    aws ec2 delete-security-group --region $Region --group-id $old 2>&1 | Out-Host
}

Write-Host ""
Write-Host "[OK] Cleanup EP2 terminado."
