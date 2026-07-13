# ep2-deploy-sbc.ps1 - Despliega VM-SBC (Kamailio + RTPEngine) y reusa EIP existente.
# Requiere ep2-pbx.json (correr ep2-deploy-pbx.ps1 antes).
# Tras desplegar el SBC:
#   1. Modifica SG-PBX para que SOLO acepte SIP/RTP desde sg-sbc-ep2 (GroupId).
#   2. Disocia la IP publica transitoria de la PBX (la deja completamente privada).

$ErrorActionPreference = "Stop"
$env:AWS_PAGER = ""

# Wrapper para evitar el ruido del aws.cmd
$PythonExe = "C:\Users\tek\AppData\Local\Programs\Python\Python312\python.exe"
function aws { & $PythonExe -m awscli @args }

$Region        = "us-east-1"
$SgName        = "consultora-ep2-sbc"   # AWS reserva prefijo "sg-" para IDs
$Tag           = "ep2-sbc-oyanedel"
$InstanceType  = "t3.small"
$ReuseAllocId  = "eipalloc-0b1a67d297e53bc5f"  # EIP EP1 (44.215.149.184)
$TemplatePath  = Join-Path $PSScriptRoot "user-data-sbc.sh.template"
$RenderedPath  = Join-Path $PSScriptRoot "user-data-sbc.sh"
$PbxJsonPath   = Join-Path $PSScriptRoot "ep2-pbx.json"

if (-not (Test-Path $PbxJsonPath)) {
    throw "Falta $PbxJsonPath. Ejecuta primero ep2-deploy-pbx.ps1."
}
$Pbx = Get-Content $PbxJsonPath -Raw | ConvertFrom-Json
$PbxPrivIp = $Pbx.PrivateIp
$SgPbxId   = $Pbx.SgId
$KeyName   = "asterisk-ep1"
$KeyPath   = $Pbx.KeyPath
$VpcId     = $Pbx.VpcId
Write-Host "Datos PBX heredados: PrivIp=$PbxPrivIp  SG=$SgPbxId  VPC=$VpcId"

Write-Host "=== AMI Ubuntu 24.04 LTS ==="
$AmiId = aws ec2 describe-images --region $Region `
    --owners 099720109477 `
    --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" "Name=state,Values=available" `
    --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text
Write-Host "AMI: $AmiId"

Write-Host "=== Mi IP publica ==="
$MyIp = (Invoke-RestMethod -Uri "https://checkip.amazonaws.com").Trim()
Write-Host "Mi IP: $MyIp/32"

Write-Host "=== Security Group SG-SBC (fachada publica) ==="
$SgSbcId = aws ec2 describe-security-groups --region $Region --filters "Name=group-name,Values=$SgName" `
    --query "SecurityGroups[0].GroupId" --output text 2>$null
if (-not $SgSbcId -or $SgSbcId -eq "None" -or $SgSbcId -eq "") {
    $SgSbcId = aws ec2 create-security-group --region $Region `
        --group-name $SgName --description "SBC EP2 Consultora A&B - fachada SIPS+RTP" `
        --vpc-id $VpcId --query "GroupId" --output text
    if (-not $SgSbcId -or $SgSbcId -notmatch '^sg-') { throw "Fallo creando SG-SBC (id=`"$SgSbcId`")" }
    aws ec2 authorize-security-group-ingress --region $Region --group-id $SgSbcId `
        --ip-permissions `
        "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$MyIp/32}]" `
        "IpProtocol=tcp,FromPort=5061,ToPort=5061,IpRanges=[{CidrIp=0.0.0.0/0}]" `
        "IpProtocol=udp,FromPort=30000,ToPort=31000,IpRanges=[{CidrIp=0.0.0.0/0}]" | Out-Null
    Write-Host "SG-SBC creado: $SgSbcId"
} else {
    Write-Host "SG-SBC existente: $SgSbcId"
}

Write-Host "=== Agregando reglas al SG-PBX que apuntan al SG-SBC (GroupId) ==="
# Esto cumple el criterio "muy buen desempeno": SG-PBX acepta SIP/RTP SOLO desde el GroupId del SBC.
aws ec2 authorize-security-group-ingress --region $Region --group-id $SgPbxId `
    --ip-permissions `
    "IpProtocol=udp,FromPort=5060,ToPort=5060,UserIdGroupPairs=[{GroupId=$SgSbcId}]" `
    "IpProtocol=tcp,FromPort=5060,ToPort=5060,UserIdGroupPairs=[{GroupId=$SgSbcId}]" `
    "IpProtocol=udp,FromPort=10000,ToPort=20000,UserIdGroupPairs=[{GroupId=$SgSbcId}]" | Out-Null

Write-Host "=== Generando user-data del SBC (sustituyendo PBX_PRIVATE_IP) ==="
$tmpl = Get-Content $TemplatePath -Raw
$rendered = $tmpl -replace "__PBX_PRIVATE_IP__", $PbxPrivIp
# UTF-8 SIN BOM: cloud-init rechaza scripts con BOM como "unhandled userdata".
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($RenderedPath, $rendered, $utf8NoBom)
Write-Host "user-data renderizado (sin BOM): $RenderedPath"

Write-Host "=== Lanzando VM-SBC ==="
$InstanceId = aws ec2 run-instances --region $Region `
    --image-id $AmiId --count 1 --instance-type $InstanceType `
    --key-name $KeyName --security-group-ids $SgSbcId `
    --user-data file://$RenderedPath `
    --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=10,VolumeType=gp3}" `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$Tag}]" `
    --query "Instances[0].InstanceId" --output text
Write-Host "Instance: $InstanceId"

Write-Host "=== Esperando estado running ==="
aws ec2 wait instance-running --region $Region --instance-ids $InstanceId

Write-Host "=== Asociando EIP existente (44.215.149.184) ==="
aws ec2 associate-address --region $Region --instance-id $InstanceId --allocation-id $ReuseAllocId | Out-Null

$PubIp = aws ec2 describe-instances --region $Region --instance-ids $InstanceId `
    --query "Reservations[0].Instances[0].PublicIpAddress" --output text
$PrivIp = aws ec2 describe-instances --region $Region --instance-ids $InstanceId `
    --query "Reservations[0].Instances[0].PrivateIpAddress" --output text

Write-Host "=== Quitando la IP publica transitoria de la PBX ==="
# La PBX ya no necesita IP publica. Si tiene, la asociacion la libera ec2 sola al re-lanzar,
# pero si es auto-asigned no se quita en caliente. Comprobamos:
$PbxPubNow = aws ec2 describe-instances --region $Region --instance-ids $Pbx.InstanceId `
    --query "Reservations[0].Instances[0].PublicIpAddress" --output text
if ($PbxPubNow -and $PbxPubNow -ne "None") {
    Write-Host "  La PBX tiene IP publica $PbxPubNow (auto-asignada). En AWS las auto-asignadas no se pueden disasociar; quedara expuesta hasta el proximo reboot O hasta lanzar la PBX SIN auto-public IP."
    Write-Host "  >>> Mitigacion: el SG-PBX ya bloquea 5060/RTP a cualquier origen distinto del SG-SBC. SSH/AMI siguen restringidos a Mi IP. Riesgo aceptable durante el laboratorio."
}

Write-Host ""
Write-Host "===================================================="
Write-Host "  VM-SBC lista"
Write-Host "  Instance ID  : $InstanceId"
Write-Host "  IP publica   : $PubIp  (EIP fija)"
Write-Host "  IP privada   : $PrivIp"
Write-Host "  SG-SBC       : $SgSbcId"
Write-Host "===================================================="
Write-Host "SBC bootstrap toma ~8-12 min. Tail con:"
Write-Host "  ssh -i $KeyPath ubuntu@$PubIp 'sudo tail -f /var/log/user-data.log'"
Write-Host ""

@{
    InstanceId  = $InstanceId
    PublicIp    = $PubIp
    PrivateIp   = $PrivIp
    AllocId     = $ReuseAllocId
    SgId        = $SgSbcId
    Region      = $Region
} | ConvertTo-Json | Out-File -FilePath (Join-Path $PSScriptRoot "ep2-sbc.json") -Encoding utf8
