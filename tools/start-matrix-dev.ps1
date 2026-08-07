# MATRIX Dev launcher (Backend + Expo)
# ASCII-only to avoid Windows encoding/parser issues

$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
$Mobile = Join-Path $Root 'mobile'
$Backend = Join-Path $Root 'backend'
$PreferredIp = '192.168.8.200'
$ApiPort = 8110
$ExpoPort = 8081

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

function Get-LanIp {
  $cfg = Get-NetIPConfiguration |
    Where-Object { $_.IPv4Address -and $_.InterfaceAlias -eq 'Wi-Fi' -and $_.IPv4DefaultGateway } |
    Select-Object -First 1
  if ($cfg -and $cfg.IPv4Address) {
    return [string]$cfg.IPv4Address.IPAddress
  }
  $any = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -like '192.168.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -First 1
  if ($any) { return [string]$any.IPAddress }
  return $null
}

function Get-ActiveIp {
  $current = Get-LanIp
  if (-not $current) { return $null }
  if ($current -eq $PreferredIp) {
    Write-Host "Using preferred static IP: $PreferredIp" -ForegroundColor Green
    return $PreferredIp
  }
  Write-Host "Using current LAN IP: $current" -ForegroundColor Yellow
  Write-Host "Tip: right-click set-static-ip.bat -> Run as administrator for fixed .200" -ForegroundColor Yellow
  return $current
}

function Update-AppJson([string]$ip) {
  $appJsonPath = Join-Path $Mobile 'app.json'
  if (-not (Test-Path $appJsonPath)) { return }
  try {
    $raw = Get-Content $appJsonPath -Raw -Encoding UTF8
    $json = $raw | ConvertFrom-Json
    if (-not $json.expo.extra) {
      $json.expo | Add-Member -NotePropertyName extra -NotePropertyValue (@{}) -Force
    }
    $json.expo.extra.apiUrl = "http://${ip}:${ApiPort}"
    $json.expo.extra.appName = 'MATRIX'
    $out = $json | ConvertTo-Json -Depth 30
    Set-Content -Path $appJsonPath -Value $out -Encoding UTF8
    Write-Host "apiUrl -> http://${ip}:${ApiPort}" -ForegroundColor Green
  }
  catch {
    Write-Host "Could not update app.json: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

function Write-Urls([string]$ip) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $lines = @(
    'MATRIX URLs'
    '==========='
    "Time: $stamp"
    "IP: $ip"
    ''
    'Laptop browser:'
    "http://${ip}:${ExpoPort}"
    ''
    'iPhone Expo Go (Enter URL inside Expo Go - NOT Google):'
    "exp://${ip}:${ExpoPort}"
    ''
    'API health:'
    "http://${ip}:${ApiPort}/health"
    ''
    'Keep MATRIX Dev window open for live updates.'
  )
  $out = Join-Path $Root 'CURRENT-URLS.txt'
  Set-Content -Path $out -Value ($lines -join "`r`n") -Encoding ascii
  Write-Host ($lines -join "`n") -ForegroundColor White
}

function Test-Port([int]$port) {
  $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  return [bool]$c
}

function Start-Backend {
  Write-Step "Backend port $ApiPort"
  if (Test-Port $ApiPort) {
    Write-Host "Backend already running" -ForegroundColor Green
    return
  }

  $py = Join-Path $Backend 'venv\Scripts\python.exe'
  if (-not (Test-Path $py)) {
    Write-Host "Creating Python venv..." -ForegroundColor Yellow
    Push-Location $Backend
    python -m venv venv
    & (Join-Path $Backend 'venv\Scripts\python.exe') -m pip install -r requirements.txt
    Pop-Location
  }

  $runner = Join-Path $Backend 'run_api.py'
  Start-Process -FilePath $py -ArgumentList $runner -WorkingDirectory $Backend -WindowStyle Minimized
  Start-Sleep -Seconds 2
  if (Test-Port $ApiPort) {
    Write-Host "Backend ready" -ForegroundColor Green
  }
  else {
    Write-Host "Backend still starting..." -ForegroundColor Yellow
  }
}

function Start-Expo([string]$ip) {
  Write-Step "Expo port $ExpoPort"

  Get-NetTCPConnection -LocalPort $ExpoPort -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 1

  $env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
  $cli = Join-Path $Mobile 'node_modules\expo\bin\cli'
  if (-not (Test-Path $cli)) {
    Write-Host "Installing mobile packages..." -ForegroundColor Yellow
    Push-Location $Mobile
    npm install --legacy-peer-deps
    Pop-Location
  }

  try {
    Push-Location $Mobile
    $qrUrl = "exp://${ip}:${ExpoPort}"
    node -e "try{require('qrcode').toFile('expo-qr.png', process.argv[1], {width:512,margin:2}, function(){})}catch(e){}" $qrUrl
    Pop-Location
  }
  catch {}

  Write-Host "Starting Expo. Keep this window open." -ForegroundColor Green
  Set-Location $Mobile
  & node $cli start --lan --port $ExpoPort
}

# ---- main ----
try {
  [Console]::Title = 'MATRIX Dev'
}
catch {}

Write-Host 'MATRIX Dev Launcher' -ForegroundColor Magenta
Write-Host "Root: $Root"

$ip = Get-ActiveIp
if (-not $ip) {
  Write-Host 'No LAN IP found. Connect Wi-Fi and retry.' -ForegroundColor Red
  exit 1
}

Update-AppJson $ip
Write-Urls $ip
Start-Backend

$urlFile = Join-Path $Root 'CURRENT-URLS.txt'
if (Test-Path $urlFile) {
  Start-Process $urlFile -ErrorAction SilentlyContinue
}

Start-Expo $ip
