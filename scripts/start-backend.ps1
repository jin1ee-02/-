param([string]$BindAddress = '127.0.0.1')
$ErrorActionPreference = 'Stop'
$backendRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'backend'
$venvPython = Join-Path $backendRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) { throw 'scripts/setup.ps1을 먼저 실행하세요.' }
Push-Location $backendRoot
try { & $venvPython -m uvicorn app.main:app --host $BindAddress --port 8000 --workers 1 }
finally { Pop-Location }
