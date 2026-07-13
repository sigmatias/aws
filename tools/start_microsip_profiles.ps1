param(
    [string]$ProfileRoot = "informe\microsip_profiles"
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not [System.IO.Path]::IsPathRooted($ProfileRoot)) {
    $ProfileRoot = Join-Path $Root $ProfileRoot
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

$windows = @(
    @{ Ext = "4001"; Dir = Join-Path $ProfileRoot "MicroSIP_4001"; X = -1340; Y = 356; W = 420; H = 560 },
    @{ Ext = "4002"; Dir = Join-Path $ProfileRoot "MicroSIP_4002"; X = -900; Y = 356; W = 420; H = 560 }
)

Get-Process microsip -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

foreach ($window in $windows) {
    $exe = Join-Path $window.Dir "microsip.exe"
    if (-not (Test-Path -LiteralPath $exe)) {
        throw "No existe $exe"
    }
    $proc = Start-Process -FilePath $exe -WorkingDirectory $window.Dir -PassThru
    for ($i = 0; $i -lt 60 -and $proc.MainWindowHandle -eq 0; $i++) {
        Start-Sleep -Milliseconds 200
        $proc.Refresh()
    }
    if ($proc.MainWindowHandle -ne 0) {
        [WinApi]::MoveWindow($proc.MainWindowHandle, $window.X, $window.Y, $window.W, $window.H, $true) | Out-Null
    }
    Write-Host ("[OK] MicroSIP {0} iniciado PID={1}" -f $window.Ext, $proc.Id)
    Start-Sleep -Seconds 2
}
