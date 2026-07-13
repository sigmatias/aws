# ep2-secure-pbx.ps1 - Quita la IP publica auto-asignada de la VM-PBX.
# Tecnica EIP-fantasma: la IP auto-asignada se REEMPLAZA al asociar una EIP nueva;
# al disociar+liberar esa EIP, la instancia queda sin IP publica (la auto no vuelve).
# Conserva la IP privada (la PBX sigue alcanzable desde el SBC dentro del VPC).
# Ejecutar justo antes de capturar el "estado final seguro".

$ErrorActionPreference = "Stop"
$env:AWS_PAGER = ""

$PythonExe = "C:\Users\tek\AppData\Local\Programs\Python\Python312\python.exe"
function aws { & $PythonExe -m awscli @args }

$Region      = "us-east-1"
$PbxJsonPath = Join-Path $PSScriptRoot "ep2-pbx.json"
if (-not (Test-Path $PbxJsonPath)) { throw "Falta $PbxJsonPath" }
$Pbx = Get-Content $PbxJsonPath -Raw | ConvertFrom-Json
$PbxId = $Pbx.InstanceId

$CurPub = aws ec2 describe-instances --region $Region --instance-ids $PbxId `
    --query "Reservations[0].Instances[0].PublicIpAddress" --output text
if (-not $CurPub -or $CurPub -eq "None") {
    Write-Host "[OK] La PBX ya no tiene IP publica. Nada que hacer."
    exit 0
}
Write-Host "PBX tiene IP publica auto-asignada: $CurPub. Procediendo a quitarla..."

Write-Host "=== 1. Allocate EIP temporal ==="
$TmpAlloc = aws ec2 allocate-address --region $Region --domain vpc --query "AllocationId" --output text
Write-Host "EIP temporal: $TmpAlloc"

Write-Host "=== 2. Associate a la PBX (reemplaza la auto) ==="
$AssocId = aws ec2 associate-address --region $Region `
    --instance-id $PbxId --allocation-id $TmpAlloc `
    --allow-reassociation --query "AssociationId" --output text
Write-Host "Association: $AssocId"

Write-Host "=== 3. Disassociate ==="
aws ec2 disassociate-address --region $Region --association-id $AssocId | Out-Null

Write-Host "=== 4. Release EIP temporal ==="
aws ec2 release-address --region $Region --allocation-id $TmpAlloc | Out-Null

Start-Sleep -Seconds 3
$NewPub = aws ec2 describe-instances --region $Region --instance-ids $PbxId `
    --query "Reservations[0].Instances[0].PublicIpAddress" --output text
if (-not $NewPub -or $NewPub -eq "None") {
    Write-Host "[OK] PBX quedo SIN IP publica. Estado final seguro."
} else {
    Write-Host "[!]  PBX aun tiene IP publica: $NewPub. Algo salio mal."
}

# Refrescamos el JSON
$Pbx.TempPublicIp = $null
$Pbx | ConvertTo-Json | Out-File -FilePath $PbxJsonPath -Encoding utf8
