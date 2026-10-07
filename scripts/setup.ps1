param([switch]$MvpMode)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$frontendRoot = Join-Path $projectRoot 'frontend'
$venvPython = Join-Path $backendRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) {
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        & uv venv --python 3.12 (Join-Path $backendRoot '.venv')
    } elseif (Get-Command py -ErrorAction SilentlyContinue) {
        & py -3 -m venv (Join-Path $backendRoot '.venv')
    } else {
        & python -m venv (Join-Path $backendRoot '.venv')
    }
    if ($LASTEXITCODE -ne 0) { throw 'Python 가상환경 생성 실패' }
}
if (Get-Command uv -ErrorAction SilentlyContinue) {
    & uv pip install --python $venvPython -r (Join-Path $backendRoot 'requirements-dev.txt')
} else {
    & $venvPython -m pip install -r (Join-Path $backendRoot 'requirements-dev.txt')
}
if ($LASTEXITCODE -ne 0) { throw '백엔드 의존성 설치 실패' }
foreach ($taskRoot in @($backendRoot, $frontendRoot)) {
    $envPath = Join-Path $taskRoot '.env'
    if (-not (Test-Path -LiteralPath $envPath)) { Copy-Item -LiteralPath (Join-Path $taskRoot '.env.example') -Destination $envPath }
}
if ($MvpMode) {
    $frontendEnv = Join-Path $frontendRoot '.env'
    $content = Get-Content -LiteralPath $frontendEnv -Raw
    foreach ($pair in @(@('EXPO_PUBLIC_API_MODE', 'ai'), @('EXPO_PUBLIC_FEATURE_MODE', 'api'))) {
        $pattern = '(?m)^' + $pair[0] + '=.*$'
        if ($content -match $pattern) { $content = [regex]::Replace($content, $pattern, $pair[0] + '=' + $pair[1]) }
        else { $content += "`n" + $pair[0] + '=' + $pair[1] + "`n" }
    }
    Set-Content -LiteralPath $frontendEnv -Value $content -Encoding utf8
}
Push-Location $frontendRoot
try { & npm ci; if ($LASTEXITCODE -ne 0) { throw '프론트엔드 의존성 설치 실패' } }
finally { Pop-Location }
Write-Host '준비 완료. 키 없이도 오프라인 규칙으로 실행됩니다. 실제 LLM은 backend/.env의 OPENAI_API_KEY를 설정하세요.'
