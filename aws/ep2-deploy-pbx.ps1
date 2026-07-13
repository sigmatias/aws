# ep2-deploy-pbx.ps1 - Despliega VM-PBX (Asterisk 22) sin acceso publico SIP/RTP
# Reusa keypair 'asterisk-ep1' existente.
# Salida: aws/ep2-pbx.json con instance-id, IP privada, SG-PBX ID, key path.

$ErrorActionPreference = "Stop"
$env:AWS_PAGER = ""

# Wrapper para evitar el ruido del aws.cmd (pip-installed) -> "Asociación de archivo .py"
$PythonExe = "C:\Users\tek\AppData\Local\Programs\Python\Python312\python.exe"
function aws { & $PythonExe -m awscli @args }

$Region       = "us-east-1"
$KeyName      = "asterisk-ep1"
$KeyPath      = Join-Path $PSScriptRoot "$KeyName.pem"
$SgName       = "consultora-ep2-pbx"   # AWS reserva prefijo "sg-" para IDs
$Tag          = "ep2-pbx-oyanedel"
$InstanceType = "t3.small"
$UserDataPath = Join-Path $PSScriptRoot "user-data-pbx.sh"

Write-Host "=== Identidad AWS ==="
aws sts get-caller-identity --region $Region | Out-Host

Write-Host "=== AMI Ubuntu 24.04 LTS ==="
$AmiId = aws ec2 describe-images --region $Region `
    --owners 099720109477 `
    --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" "Name=state,Values=available" `
    --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text
Write-Host "AMI: $AmiId"

Write-Host "=== Mi IP publica ==="
$MyIp = (Invoke-RestMethod -Uri "https://checkip.amazonaws.com").Trim()
Write-Host "Mi IP: $MyIp/32"

Write-Host "=== Keypair ==="
$existing = aws ec2 describe-key-pairs --region $Region --key-names $KeyName --query "KeyPairs[0].KeyName" --output text 2>$null
if ($LASTEXITCODE -ne 0 -or -not $existing -or $existing -eq "None") {
    throw "Keypair '$KeyName' no existe en AWS. Verifica o crea uno nuevo."
}
if (-not (Test-Path $KeyPath)) {
    throw "Archivo de clave local no existe: $KeyPath. No se puede desplegar."
}
Write-Host "Reusando key: $KeyName ($KeyPath)"

Write-Host "=== VPC default ==="
$VpcId = aws ec2 describe-vpcs --region $Region --filters "Name=is-default,Values=true" `
    --query "Vpcs[0].VpcId" --output text
Write-Host "VPC: $VpcId"

Write-Host "=== Security Group SG-PBX (estricto, sin SIP/RTP publico) ==="
$SgId = aws ec2 describe-security-groups --region $Region --filters "Name=group-name,Values=$SgName" `
    --query "SecurityGroups[0].GroupId" --output text 2>$null
if (-not $SgId -or $SgId -eq "None" -or $SgId -eq "") {
    $SgId = aws ec2 create-security-group --region $Region `
        --group-name $SgName --description "PBX EP2 Consultora A&B - sin acceso publico SIP/RTP" `
        --vpc-id $VpcId --query "GroupId" --output text
    if (-not $SgId -or $SgId -notmatch '^sg-') { throw "Fallo creando SG-PBX (id=`"$SgId`")" }
    aws ec2 authorize-security-group-ingress --region $Region --group-id $SgId `
        --ip-permissions `
        "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$MyIp/32}]" `
        "IpProtocol=tcp,FromPort=5038,ToPort=5038,IpRanges=[{CidrIp=$MyIp/32}]" | Out-Null
    Write-Host "SG-PBX creado: $SgId"
} else {
    Write-Host "SG-PBX existente: $SgId"
}

Write-Host "=== Subnet por defecto de la VPC ==="
$SubnetId = aws ec2 describe-subnets --region $Region `
    --filters "Name=vpc-id,Values=$VpcId" "Name=default-for-az,Values=true" `
    --query "Subnets[0].SubnetId" --output text
Write-Host "Subnet: $SubnetId"

Write-Host "=== Lanzando VM-PBX (SIN IP publica auto-asignada) ==="
# AssociatePublicIpAddress=false: la PBX nunca tendra IP publica. Solo sera
# alcanzable desde la red privada del VPC (es decir, desde el SBC).
# Para administracion SSH se usa el SBC como bastion o EC2 Instance Connect.
# IMPORTANTE: Inicialmente lanzamos CON IP publica auto para poder hacer SSH
# de admin mientras compila Asterisk. La quitaremos manualmente al final.
$Nic = "AssociatePublicIpAddress=true,DeviceIndex=0,SubnetId=$SubnetId,Groups=$SgId"
$InstanceId = aws ec2 run-instances --region $Region `
    --image-id $AmiId --count 1 --instance-type $InstanceType `
    --key-name $KeyName `
    --network-interfaces $Nic `
    --user-data file://$UserDataPath `
    --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3}" `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$Tag}]" `
    --query "Instances[0].InstanceId" --output text
if (-not $InstanceId -or $InstanceId -notmatch '^i-') { throw "Fallo run-instances (id=`"$InstanceId`")" }
Write-Host "Instance: $InstanceId"

Write-Host "=== Esperando estado running ==="
aws ec2 wait instance-running --region $Region --instance-ids $InstanceId

$PrivIp = aws ec2 describe-instances --region $Region --instance-ids $InstanceId `
    --query "Reservations[0].Instances[0].PrivateIpAddress" --output text
$PubIp = aws ec2 describe-instances --region $Region --instance-ids $InstanceId `
    --query "Reservations[0].Instances[0].PublicIpAddress" --output text

Write-Host ""
Write-Host "===================================================="
Write-Host "  VM-PBX lista"
Write-Host "  Instance ID  : $InstanceId"
Write-Host "  IP privada   : $PrivIp"
Write-Host "  IP publica   : $PubIp  (transitoria; se quita antes de capturar)"
Write-Host "  SG-PBX       : $SgId"
Write-Host "  Subnet       : $SubnetId"
Write-Host "===================================================="
Write-Host "Asterisk compila en background (~15 min). Tail con:"
Write-Host "  ssh -i $KeyPath ubuntu@$PubIp 'sudo tail -f /var/log/user-data.log'"
Write-Host ""

@{
    InstanceId       = $InstanceId
    PrivateIp        = $PrivIp
    TempPublicIp     = $PubIp
    SgId             = $SgId
    KeyPath          = $KeyPath
    Region           = $Region
    VpcId            = $VpcId
    SubnetId         = $SubnetId
} | ConvertTo-Json | Out-File -FilePath (Join-Path $PSScriptRoot "ep2-pbx.json") -Encoding utf8
