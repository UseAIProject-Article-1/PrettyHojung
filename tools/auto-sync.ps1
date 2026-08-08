param(
  [int]$PollSeconds = 15,
  [int]$StableSeconds = 60
)

$ErrorActionPreference = 'Stop'
$expectedBranch = 'justboom03-nunchicoach-ui-mvp'
$stablePollsRequired = [Math]::Max(1, [Math]::Ceiling($StableSeconds / $PollSeconds))
$lastSnapshot = ''
$stablePolls = 0
$mutex = New-Object System.Threading.Mutex($false, 'Local\NunchiCoachFeatureBranchAutoSync')

if (-not $mutex.WaitOne(0)) {
  exit 0
}

Set-Location (Split-Path -Parent $PSScriptRoot)

while ($true) {
  try {
    $branch = (git branch --show-current).Trim()
    if ($branch -ne $expectedBranch) {
      $stablePolls = 0
      Start-Sleep -Seconds $PollSeconds
      continue
    }

    $unpushedCommitCount = [int](git rev-list --count '@{upstream}..HEAD' 2>$null)
    if ($unpushedCommitCount -gt 0) {
      git push origin "HEAD:$expectedBranch"
    }

    $snapshot = (git status --porcelain=v1 --untracked-files=all) -join "`n"
    if ([string]::IsNullOrWhiteSpace($snapshot)) {
      $lastSnapshot = ''
      $stablePolls = 0
      Start-Sleep -Seconds $PollSeconds
      continue
    }

    $sensitivePattern = '(^|/)(\.env($|\.)|.*\.(pem|key|p12|pfx)$|credentials?($|\.)|secrets?($|\.))'
    if ($snapshot -match $sensitivePattern) {
      $lastSnapshot = $snapshot
      $stablePolls = 0
      Start-Sleep -Seconds $PollSeconds
      continue
    }

    if ($snapshot -eq $lastSnapshot) {
      $stablePolls++
    } else {
      $lastSnapshot = $snapshot
      $stablePolls = 1
    }

    if ($stablePolls -lt $stablePollsRequired) {
      Start-Sleep -Seconds $PollSeconds
      continue
    }

    git diff --check
    if ($LASTEXITCODE -ne 0) {
      $stablePolls = 0
      Start-Sleep -Seconds $PollSeconds
      continue
    }

    git add -A
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
    git commit -m "chore: auto-sync workspace ($timestamp)" -m "Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"
    if ($LASTEXITCODE -eq 0) {
      git push origin "HEAD:$expectedBranch"
    }

    $lastSnapshot = ''
    $stablePolls = 0
  } catch {
    $lastSnapshot = ''
    $stablePolls = 0
  }

  Start-Sleep -Seconds $PollSeconds
}
