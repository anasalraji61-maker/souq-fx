# MATRIX HANDOFF local watchdog — DETERMINISTIC gate (v2, 2026-09-11)
$ErrorActionPreference = 'Continue'
$Host.UI.RawUI.WindowTitle = 'MATRIX HANDOFF Watchdog'
$intervalSec = 300
$backoffSec = 900
$failCount = 0
$repoRoot = Split-Path -Parent $PSScriptRoot
$handoffPath = Join-Path $repoRoot 'HANDOFF.md'
$promptTemplate = 'Read HANDOFF.md from disk. Obey .cursor/rules/handoff-file-safety.mdc strictly: execute the task named in the Claude directions section (Task #{0}), then ONLY append your reply under the Cursor reply section — do not edit or rewrite the Claude directions section, the file-safety section, or any other section; never write docs/ROADMAP.md.'

function Get-PendingTaskNumber {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  $text = Get-Content -Path $Path -Raw -Encoding UTF8
  $dirMatch = [regex]::Match($text, '### توجيهات للوكيل\s*```(.*?)```', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if (-not $dirMatch.Success) { return $null }
  $directions = $dirMatch.Groups[1].Value
  if ($directions -match 'بانتظار\s+المهمة') { return $null }
  $taskMatch = [regex]::Match($directions, 'المهمة\s+(\d+)')
  if (-not $taskMatch.Success) { return $null }
  $taskNum = $taskMatch.Groups[1].Value
  $replyMatch = [regex]::Match($text, '### رد Cursor بعد التنفيذ\s*```(.*?)```', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $reply = if ($replyMatch.Success) { $replyMatch.Groups[1].Value } else { '' }
  if ($reply -match "المهمة\s+$taskNum\b") { return $null }
  return $taskNum
}

while ($true) {
  try {
    Start-Sleep -Seconds $intervalSec
    $pending = Get-PendingTaskNumber -Path $handoffPath
    if ($pending) {
      $prompt = [string]::Format($promptTemplate, $pending)
      Write-Output ("AGENT_LOOP_TICK_handoff {""prompt"":""$prompt""}")
    } else {
      Write-Output ("watchdog_tick skip=no_new_task")
    }
    $failCount = 0
  } catch {
    $failCount++
    Write-Output ("AGENT_LOOP_TICK_handoff_watchdog_error fail=$failCount")
    Start-Sleep -Seconds $backoffSec
  }
}