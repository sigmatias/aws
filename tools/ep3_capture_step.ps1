param(
    [Parameter(Mandatory=$true)] [int]$Number,
    [Parameter(Mandatory=$true)] [string]$Title,
    [Parameter(Mandatory=$true)] [string]$Body
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PwDir = Join-Path $Root ".pw-issabel"

python (Join-Path $Root "tools\ep3_evidence_page.py") $Number $Title $Body | Out-Host
python (Join-Path $Root "tools\ep3_evidence_overlay.py") --write $Title | Out-Host

Push-Location $PwDir
try {
    node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.connectOverCDP('http://127.0.0.1:9223'); const c=b.contexts()[0]; const p=c.pages()[0] || await c.newPage(); await p.goto('file:///D:/CLAUDE/tarea-prueba/informe/ep3_evidence.html'); await p.bringToFront(); await p.waitForTimeout(900); process.exit(0); })().catch(e=>{console.error(e); process.exit(1);});"
}
finally {
    Pop-Location
}

python (Join-Path $Root "tools\snap_ep3_secondary.py") $Number --delay 1 | Out-Host
