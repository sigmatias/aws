param(
    [Parameter(Mandatory=$true)] [int]$Number,
    [Parameter(Mandatory=$true)] [string]$Title,
    [Parameter(Mandatory=$true)] [string]$Description,
    [string]$EvidenceDir = "",
    [double]$DelaySec = 1.5
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if ([string]::IsNullOrWhiteSpace($EvidenceDir)) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $EvidenceDir = Join-Path $Root "informe\capturas_ep3_completa_$stamp"
}
if (-not [System.IO.Path]::IsPathRooted($EvidenceDir)) {
    $EvidenceDir = Join-Path $Root $EvidenceDir
}

New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$txtPath = Join-Path $Root "informe\EP3_TXT_VISIBLE.txt"
$txt = @(
    "Matias Oyanedel",
    "CUY1532-001D",
    "Comunicaciones Unificadas",
    "EP3 CUY5132",
    "",
    ("Paso {0:D2}: {1}" -f $Number, $Title)
) -join [Environment]::NewLine
Set-Content -LiteralPath $txtPath -Value ($txt + [Environment]::NewLine) -Encoding UTF8

$metaPath = Join-Path $EvidenceDir "capturas.jsonl"
$meta = [ordered]@{
    number = $Number
    title = $Title
    description = $Description
    file = ("captura_{0:D2}.png" -f $Number)
    timestamp = (Get-Date).ToString("s")
}
($meta | ConvertTo-Json -Compress) | Add-Content -LiteralPath $metaPath -Encoding UTF8

powershell -ExecutionPolicy Bypass -File (Join-Path $Root "tools\capturar_segunda_pantalla.ps1") `
    -Numero $Number `
    -DelaySec $DelaySec `
    -Destino $EvidenceDir

Write-Host "[OK] Evidencia $Number registrada en $EvidenceDir"
