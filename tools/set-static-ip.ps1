# MATRIX static IP setup (run as Administrator)
param([switch]$NoPause)

$PreferredIp = '192.168.8.200'
$Gateway = '192.168.8.1'
$Alias = 'Wi-Fi'

function Wait-User {
  if (-not $NoPause) {
    Write-Host ""
    Read-Host "Press Enter to continue"
  }
}

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Host ""
  Write-Host "NOT running as Administrator." -ForegroundColor Red
  Write-Host "Close this window, then:" -ForegroundColor Yellow
  Write-Host "  1) Right-click set-static-ip.bat" -ForegroundColor Yellow
  Write-Host "  2) Choose: Run as administrator" -ForegroundColor Yellow
  Write-Host "  3) Click Yes on the Windows prompt" -ForegroundColor Yellow
  Wait-User
  exit 1
}

Write-Host "Setting static IP $PreferredIp on $Alias ..." -ForegroundColor Cyan

try {
  $existing = @(Get-NetIPAddress -InterfaceAlias $Alias -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -like '192.168.*' })

  foreach ($addr in $existing) {
    if ($addr.IPAddress -eq $PreferredIp) {
      Write-Host "Already set: $PreferredIp" -ForegroundColor Green
      Write-Host "Phone URL: exp://192.168.8.200:8081"
      Wait-User
      exit 0
    }
  }

  foreach ($addr in $existing) {
    Remove-NetIPAddress -InterfaceAlias $Alias -IPAddress $addr.IPAddress -Confirm:$false -ErrorAction SilentlyContinue
  }

  Get-NetRoute -InterfaceAlias $Alias -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
    Remove-NetRoute -Confirm:$false -ErrorAction SilentlyContinue

  New-NetIPAddress -InterfaceAlias $Alias -IPAddress $PreferredIp -PrefixLength 24 -DefaultGateway $Gateway -ErrorAction Stop | Out-Null
  Set-DnsClientServerAddress -InterfaceAlias $Alias -ServerAddresses @($Gateway, '8.8.8.8') -ErrorAction SilentlyContinue

  Start-Sleep -Seconds 3
  $now = (Get-NetIPAddress -InterfaceAlias $Alias -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -like '192.168.*' } |
    Select-Object -First 1).IPAddress

  Write-Host "Done. Current IP: $now" -ForegroundColor Green
  Write-Host "Save on phone: exp://192.168.8.200:8081" -ForegroundColor Green
  Wait-User
  exit 0
}
catch {
  Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Alt: reserve 192.168.8.200 in router for MAC DC-56-7B-B3-82-23" -ForegroundColor Yellow
  Wait-User
  exit 1
}
