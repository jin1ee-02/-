$ErrorActionPreference = 'Stop'
$frontendRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'frontend'
Push-Location $frontendRoot
try { & npm run web }
finally { Pop-Location }
