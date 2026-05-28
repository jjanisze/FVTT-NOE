param(
  [string]$InputDir = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/dev/audio/in/explosives",
  [string]$OutputDir = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/sounds/explosives"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg nie jest dostępny w PATH."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$map = @(
  @{ in = "grenade_launcher.wav"; out = "grenade_launcher.ogg" },
  @{ in = "flashbang.wav";       out = "flashbang.ogg" },
  @{ in = "pipe_bomb.wav";       out = "pipe_bomb.ogg" },
  @{ in = "gas_grenade.wav";     out = "gas_grenade.ogg" },
  @{ in = "explosion.wav";       out = "explosion.ogg" },
  @{ in = "molotov_fire.wav";    out = "molotov_fire.ogg" },
  @{ in = "detonator_switch.wav";out = "detonator_switch.ogg" },
  @{ in = "mine_arm_click.wav";  out = "mine_arm_click.ogg" }
)

foreach ($entry in $map) {
  $src = Join-Path $InputDir $entry.in
  $dst = Join-Path $OutputDir $entry.out

  if (-not (Test-Path $src)) {
    Write-Warning "Brak pliku wejściowego: $src"
    continue
  }

  ffmpeg -y -i "$src" -ac 1 -ar 44100 -af "loudnorm=I=-18:LRA=11:TP=-1.5" -c:a libvorbis -q:a 5 "$dst" | Out-Null
  Write-Host "OK: $($entry.in) -> $($entry.out)"
}

# Dedicated short blast variant for remote charges and related effects:
# total 3.0s, fade-out starts at 2.75s.
$blastSrc = Join-Path $InputDir "explosion.wav"
$blastDst = Join-Path $OutputDir "explosion_short.ogg"
if (Test-Path $blastSrc) {
  ffmpeg -y -i "$blastSrc" -ac 1 -ar 44100 -af "atrim=0:3,afade=t=out:st=2.75:d=0.25,loudnorm=I=-18:LRA=11:TP=-1.5" -c:a libvorbis -q:a 5 "$blastDst" | Out-Null
  Write-Host "OK: explosion.wav -> explosion_short.ogg (3.0s, fade @2.75s)"
} else {
  Write-Warning "Brak pliku wejściowego do short blast: $blastSrc"
}

Write-Host "Gotowe. Wyjście: $OutputDir"
