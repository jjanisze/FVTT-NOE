<#
Converts a curated subset of the decoded Fallout 2 sound library
(dev/audio/lib/f2-decoded/) to .ogg for use as per-caliber/per-weapon
CALIBER_VFX / WEAPON_VFX sound overrides. See dev/audio/lib/f2/DECODED_SOUND_MAP.md
for what each source identity actually is and the confidence behind it.

Deliberately NO loudnorm here (raw conversion only, per author's request) —
unlike process_explosive_sfx.ps1, which does apply it for that category.
Same mono/44.1kHz/libvorbis q:a 5 convention as the rest of this pipeline.
#>
param(
  [string]$InputDir = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/dev/audio/lib/f2-decoded",
  [string]$OutputDir = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/sounds/firearms"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg nie jest dostępny w PATH."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# in = relative to $InputDir; out = filename in $OutputDir
$map = @(
  # -- firearms/ --
  @{ in = "firearms/pistol-semiauto_symA_fire-single_v1.wav";              out = "pistol-semiauto_shot.ogg" }
  @{ in = "firearms/pistol-semiauto_symA_reload_v1.wav";                   out = "pistol-semiauto_reload.ogg" }
  @{ in = "firearms/rifle-ar-platform_symG_fire-single_v1.wav";            out = "rifle-ar-platform_shot.ogg" }
  @{ in = "firearms/rifle-ar-platform_symG_reload_v1.wav";                 out = "rifle-ar-platform_reload.ogg" }
  @{ in = "firearms/rifle-fnfal_symH_fire-single_v1.wav";                  out = "rifle-fnfal_shot-single.ogg" }
  @{ in = "firearms/rifle-fnfal_symH_fire-burst_v1.wav";                   out = "rifle-fnfal_shot-burst.ogg" }
  @{ in = "firearms/shotgun_symR_fire-single_v1.wav";                      out = "shotgun_shot-single.ogg" }
  @{ in = "firearms/shotgun_symR_fire-burst_v1.wav";                       out = "shotgun_shot-burst.ogg" }
  @{ in = "firearms/shotgun_symR_reload_v1.wav";                           out = "shotgun_reload.ogg" }
  @{ in = "firearms/minigun_symL_fire-single_v1.wav";                      out = "minigun_shot.ogg" }
  @{ in = "firearms/rocket-launcher-mortar_symN_fire-single_v1.wav";       out = "rocket-launcher-mortar_shot.ogg" }
  @{ in = "firearms/rocket-launcher-mortar_symN_reload_v1.wav";            out = "rocket-launcher-mortar_reload.ogg" }
  @{ in = "firearms/rifle-medium-akpattern_symD_fire-single_v1.wav";       out = "rifle-medium-akpattern_shot.ogg" }
  @{ in = "firearms/rifle-medium-akpattern_symD_reload_v1.wav";            out = "rifle-medium-akpattern_reload.ogg" }
  @{ in = "firearms/rifle-highcaliber_symE_fire-single_v1.wav";            out = "rifle-highcaliber_shot.ogg" }
  @{ in = "firearms/heavycaliber-uncertain_symB_fire-single_v1.wav";       out = "heavycaliber-uncertain_shot.ogg" }
  @{ in = "firearms/pistol-weak-uncertain_symU_fire-single_v1.wav";        out = "pistol-weak-uncertain_shot.ogg" }
  @{ in = "firearms/pistol-weak-uncertain_symU_reload_v1.wav";             out = "pistol-weak-uncertain_reload.ogg" }
  # -- weapon-adjacent/ (non-caliber weapon needs: flamethrower, crossbow, explosions, thrown) --
  @{ in = "weapon-adjacent/flamethrower_symI_fire-single_v1.wav";          out = "flamethrower_shot.ogg" }
  @{ in = "weapon-adjacent/flamethrower_symI_reload_v1.wav";               out = "flamethrower_reload.ogg" }
  @{ in = "weapon-adjacent/crossbow_symZ_fire-single_v1.wav";              out = "crossbow_shot.ogg" }
  @{ in = "weapon-adjacent/crossbow_symZ_reload_v1.wav";                   out = "crossbow_reload.ogg" }
  @{ in = "weapon-adjacent/explosion-large_symP_hit-single_v1.wav";        out = "explosion-large_alt.ogg" }
  @{ in = "weapon-adjacent/explosion-emp_symQ_hit-single_v1.wav";          out = "explosion-emp_alt.ogg" }
  @{ in = "weapon-adjacent/thrown-star_symO_fire-single_v1.wav";           out = "thrown-star_shot.ogg" }
)

$ok = 0; $failed = 0
foreach ($entry in $map) {
  $src = Join-Path $InputDir $entry.in
  $dst = Join-Path $OutputDir $entry.out

  if (-not (Test-Path $src)) {
    Write-Warning "Brak pliku wejsciowego: $src"
    $failed++
    continue
  }

  ffmpeg -y -v warning -i "$src" -ac 1 -ar 44100 -c:a libvorbis -q:a 5 "$dst" | Out-Null
  if (Test-Path $dst) {
    Write-Host "OK: $($entry.in) -> $($entry.out)"
    $ok++
  } else {
    Write-Warning "FFmpeg nie utworzyl pliku wyjsciowego dla: $($entry.in)"
    $failed++
  }
}

Write-Host ""
Write-Host "Gotowe. $ok OK, $failed failed. Wyjscie: $OutputDir"
