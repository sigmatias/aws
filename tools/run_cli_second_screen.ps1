param(
    [Parameter(Mandatory=$true)] [string]$Title,
    [string]$Command = "",
    [string]$CommandFile = "",
    [int]$Width = 940,
    [int]$Height = 520
)

$ErrorActionPreference = "Stop"

if (-not [string]::IsNullOrWhiteSpace($CommandFile)) {
    $Command = Get-Content -LiteralPath $CommandFile -Raw
}
if ([string]::IsNullOrWhiteSpace($Command)) {
    throw "Debe indicar -Command o -CommandFile."
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WinApi {
    [DllImport("user32.dll")]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
}
"@

$screens = [System.Windows.Forms.Screen]::AllScreens
$target = $screens |
    Where-Object { -not $_.Primary } |
    Sort-Object @{ Expression = { $_.Bounds.Width * $_.Bounds.Height } }, DeviceName |
    Select-Object -First 1

if (-not $target) {
    throw "No se detecto segunda pantalla."
}

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$tmpDir = Join-Path $Root "informe\cli_runs"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
$scriptPath = Join-Path $tmpDir ("cli_{0}.ps1" -f ([Guid]::NewGuid().ToString("N")))

$script = @"
`$Host.UI.RawUI.WindowTitle = "$Title"
Clear-Host
Write-Host "EP3 CUY5132 - $Title" -ForegroundColor Cyan
Write-Host "Comando ejecutado:" -ForegroundColor Yellow
Write-Host @'
$Command
'@
Write-Host ""
Write-Host "Salida real:" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------"
try {
    $Command
    Write-Host "------------------------------------------------------------"
    Write-Host "[OK] Comando finalizado." -ForegroundColor Green
} catch {
    Write-Host "------------------------------------------------------------"
    Write-Host "[ERROR] `$(`$_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""
"@

Set-Content -LiteralPath $scriptPath -Value $script -Encoding UTF8

$proc = Start-Process powershell.exe `
    -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $scriptPath) `
    -PassThru

for ($i = 0; $i -lt 50 -and $proc.MainWindowHandle -eq 0; $i++) {
    Start-Sleep -Milliseconds 100
    $proc.Refresh()
}

if ($proc.MainWindowHandle -ne 0) {
    $bounds = $target.Bounds
    $x = $bounds.Left + 20
    $y = $bounds.Top + 20
    [WinApi]::MoveWindow($proc.MainWindowHandle, $x, $y, $Width, $Height, $true) | Out-Null
}

Write-Host "[OK] CLI visible iniciado. PID=$($proc.Id) Script=$scriptPath"
