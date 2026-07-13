# cleanup.ps1 - Termina la instancia y libera recursos
$ErrorActionPreference = "Stop"
$info = Get-Content (Join-Path $PSScriptRoot "instance.json") | ConvertFrom-Json
$Region = $info.Region

Write-Host "Terminando $($info.InstanceId)..."
aws ec2 terminate-instances --region $Region --instance-ids $info.InstanceId | Out-Null
aws ec2 wait instance-terminated --region $Region --instance-ids $info.InstanceId
Write-Host "Liberando Elastic IP $($info.AllocId)..."
aws ec2 release-address --region $Region --allocation-id $info.AllocId
Write-Host "Borrando SG $($info.SgId)..."
aws ec2 delete-security-group --region $Region --group-id $info.SgId
Write-Host "Listo."
