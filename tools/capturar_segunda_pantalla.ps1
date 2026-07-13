param(
    [int]$Numero = -1,
    [double]$DelaySec = 1,
    [string]$Destino = "informe\capturas_ep3",
    [switch]$Listar
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DestinoAbs = if ([System.IO.Path]::IsPathRooted($Destino)) {
    $Destino
} else {
    Join-Path $Root $Destino
}

function Get-MonitorObjetivo {
    $screens = [System.Windows.Forms.Screen]::AllScreens
    $secondary = $screens |
        Where-Object { -not $_.Primary } |
        Sort-Object @{ Expression = { $_.Bounds.Width * $_.Bounds.Height } }, DeviceName |
        Select-Object -First 1

    if (-not $secondary) {
        throw "No se detecto una segunda pantalla. Conecta/activa el monitor pequeno antes de capturar."
    }

    return $secondary
}

$target = Get-MonitorObjetivo

if ($Listar) {
    [System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
        $bounds = $_.Bounds
        $area = $bounds.Width * $bounds.Height
        $selected = if ($_.DeviceName -eq $target.DeviceName) { " <= seleccionado" } else { "" }
        "monitor=$($_.DeviceName) primary=$($_.Primary) size=$($bounds.Width)x$($bounds.Height) pos=$($bounds.X),$($bounds.Y) area=$area$selected"
    }
    exit 0
}

New-Item -ItemType Directory -Force -Path $DestinoAbs | Out-Null

if ($Numero -lt 0) {
    $existing = Get-ChildItem -Path $DestinoAbs -Filter "captura_*.png" -ErrorAction SilentlyContinue |
        Where-Object { $_.BaseName -match '^captura_(\d+)$' } |
        ForEach-Object { [int]$Matches[1] }

    $Numero = if ($existing) { (($existing | Measure-Object -Maximum).Maximum + 1) } else { 1 }
}

if ($DelaySec -gt 0) {
    Write-Host "Esperando $DelaySec segundos antes de capturar la segunda pantalla..."
    Start-Sleep -Seconds $DelaySec
}

$bounds = $target.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
    [console]::beep(900, 80)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $path = Join-Path $DestinoAbs ("captura_{0:D2}.png" -f $Numero)
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    [console]::beep(2600, 45)
    [console]::beep(2200, 45)

    Write-Host "[OK] $path ($($bounds.Width)x$($bounds.Height)) monitor=$($target.DeviceName)"
} finally {
    $graphics.Dispose()
    $bitmap.Dispose()
}
