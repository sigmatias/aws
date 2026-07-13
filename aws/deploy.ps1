# deploy.ps1 - Despliega EC2 Ubuntu 24.04 con Asterisk 22
# Requisitos: AWS CLI v2 configurado (aws configure) con credenciales validas.
# Uso: .\deploy.ps1

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
# AWS CLI envia mensajes informativos por stderr que PowerShell trata como error
$env:AWS_PAGER = ""

$Region      = "us-east-1"
$KeyName     = "asterisk-ep1"
$SgName      = "sg-asterisk-ep1"
$Tag         = "asterisk-ep1-oyanedel"
$InstanceType = "t3.small"
$UserDataPath = Join-Path $PSScriptRoot "user-data.sh"
$KeyPath     = Join-Path $PSScriptRoot "$KeyName.pem"

Write-Host "=== Verificando credenciales AWS ==="
aws sts get-caller-identity --region $Region | Out-Host

Write-Host "=== Detectando AMI Ubuntu 24.04 LTS (Canonical) ==="
$AmiId = aws ec2 describe-images --region $Region `
    --owners 099720109477 `
    --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" "Name=state,Values=available" `
    --query "sort_by(Images, &CreationDate)[-1].ImageId" --output text
Write-Host "AMI: $AmiId"

Write-Host "=== Detectando IP publica local ==="
$MyIp = (Invoke-RestMethod -Uri "https://checkip.amazonaws.com").Trim()
Write-Host "Mi IP: $MyIp/32"

Write-Host "=== Key pair ==="
$existing = $null
try { $existing = aws ec2 describe-key-pairs --region $Region --key-names $KeyName 2>$null } catch {}
if (-not $existing -or $LASTEXITCODE -ne 0) {
    aws ec2 create-key-pair --region $Region --key-name $KeyName `
        --query "KeyMaterial" --output text | Out-File -FilePath $KeyPath -Encoding ascii
    icacls $KeyPath /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null
    Write-Host "Key creada: $KeyPath"
} else {
    Write-Host "Key $KeyName ya existe."
}

Write-Host "=== Security Group ==="
$VpcId = aws ec2 describe-vpcs --region $Region --filters "Name=is-default,Values=true" `
    --query "Vpcs[0].VpcId" --output text
$SgId = $null
try { $SgId = aws ec2 describe-security-groups --region $Region --filters "Name=group-name,Values=$SgName" `
    --query "SecurityGroups[0].GroupId" --output text 2>$null } catch {}
if (-not $SgId -or $SgId -eq "None" -or $LASTEXITCODE -ne 0) {
    $SgId = aws ec2 create-security-group --region $Region `
        --group-name $SgName --description "Asterisk EP1" --vpc-id $VpcId `
        --query "GroupId" --output text
    aws ec2 authorize-security-group-ingress --region $Region --group-id $SgId `
        --ip-permissions `
        "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$MyIp/32}]" `
        "IpProtocol=tcp,FromPort=5038,ToPort=5038,IpRanges=[{CidrIp=$MyIp/32}]" `
        "IpProtocol=udp,FromPort=5060,ToPort=5060,IpRanges=[{CidrIp=0.0.0.0/0}]" `
        "IpProtocol=tcp,FromPort=5060,ToPort=5060,IpRanges=[{CidrIp=0.0.0.0/0}]" `
        "IpProtocol=udp,FromPort=10000,ToPort=20000,IpRanges=[{CidrIp=0.0.0.0/0}]" | Out-Null
    Write-Host "SG creado: $SgId"
} else {
    Write-Host "SG existente: $SgId"
}

Write-Host "=== Lanzando instancia EC2 ==="
$InstanceId = aws ec2 run-instances --region $Region `
    --image-id $AmiId --count 1 --instance-type $InstanceType `
    --key-name $KeyName --security-group-ids $SgId `
    --user-data file://$UserDataPath `
    --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3}" `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$Tag}]" `
    --query "Instances[0].InstanceId" --output text
Write-Host "Instance: $InstanceId"

Write-Host "=== Esperando estado running ==="
aws ec2 wait instance-running --region $Region --instance-ids $InstanceId

Write-Host "=== Asignando Elastic IP ==="
$AllocId = aws ec2 allocate-address --region $Region --domain vpc --query "AllocationId" --output text
aws ec2 associate-address --region $Region --instance-id $InstanceId --allocation-id $AllocId | Out-Null

$PublicIp = aws ec2 describe-instances --region $Region --instance-ids $InstanceId `
    --query "Reservations[0].Instances[0].PublicIpAddress" --output text

Write-Host ""
Write-Host "===================================================="
Write-Host "  Instancia lista"
Write-Host "  Instance ID : $InstanceId"
Write-Host "  IP publica  : $PublicIp"
Write-Host "  SSH         : ssh -i $KeyPath ubuntu@$PublicIp"
Write-Host "===================================================="
Write-Host "NOTA: Asterisk esta compilando (~15 min). Revisa con:"
Write-Host "  ssh -i $KeyPath ubuntu@$PublicIp 'sudo tail -f /var/log/user-data.log'"
Write-Host ""

# Guarda datos para scripts siguientes
@{
    InstanceId = $InstanceId
    PublicIp   = $PublicIp
    AllocId    = $AllocId
    SgId       = $SgId
    KeyPath    = $KeyPath
    Region     = $Region
} | ConvertTo-Json | Out-File -FilePath (Join-Path $PSScriptRoot "instance.json") -Encoding utf8
