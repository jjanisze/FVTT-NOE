<#
.SYNOPSIS
  Stores the Foundry administrator password for the `fvtt` agent CLI, encrypted
  with Windows DPAPI.

.DESCRIPTION
  Run this yourself, in your own terminal; an agent should never run it. It prompts
  for the password with Read-Host -AsSecureString, so the password is never echoed,
  logged or passed on a command line.

  It writes %LOCALAPPDATA%\neuroshima-agent\secrets.clixml, which only this Windows
  user on this machine can decrypt. That keeps the password out of transcripts, repos,
  process lists and logs. It does not protect it from another process that runs as
  you (PLAN_agentic_improvements.md section 5 B).

  Re-run it whenever the Foundry administrator password changes. Check the result
  with:  npm run fvtt -- doctor   (it compares the stored password with
  Config/admin.txt without printing either of them).

.PARAMETER Remove
  Deletes the stored secret instead of writing one.
#>
[CmdletBinding()]
param([switch]$Remove)

$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:LOCALAPPDATA 'neuroshima-agent'
$file = Join-Path $dir 'secrets.clixml'

if ($Remove) {
  if (Test-Path $file) { Remove-Item -LiteralPath $file -Force; Write-Host "Removed $file" }
  else { Write-Host "Nothing to remove ($file does not exist)" }
  return
}

New-Item -ItemType Directory -Force -Path $dir | Out-Null
$secure = Read-Host -AsSecureString -Prompt 'Foundry administrator password'
if ($secure.Length -eq 0) { throw 'Empty password, nothing stored.' }

# PSCredential + Export-Clixml = DPAPI-encrypted SecureString, scoped to this user.
New-Object System.Management.Automation.PSCredential('foundry-admin', $secure) |
  Export-Clixml -LiteralPath $file

Write-Host "Stored in $file (DPAPI, this Windows user only)."
Write-Host 'Verify with: npm run fvtt -- doctor'
