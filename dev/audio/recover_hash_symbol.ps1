<#
Recovers the `#`-symbol Fallout 2 sound set into dev/audio/lib/f2-decoded/.

WHY THIS SCRIPT EXISTS
----------------------
The original organizing pass that produced f2-decoded/ (280 files) silently
dropped all 22 files belonging to the `#` symbol. Their raw filenames are the
only ones in f2/ that use a LOWERCASE `w` prefix (`wA#1XXX1.wav`, not
`WA#1XXX1.wav`) and contain a `#` — both of which fell outside the pattern the
organizer matched on. 339 raw - 280 organized leaves them unaccounted for.

RESOLVED IDENTITY (confirmed by ear, 2026-07-25)
------------------------------------------------
LISTENING_NOTES.md line 17 described `#`'s `_1` fire recording as
"UZI burst (medium caliber)", which briefly made it look like the library's only
usable SMG burst — the thing 9mm / 45acp KS+DS have no other source for. That
was WRONG. On listening to the converted files in context, the author confirmed:

  fire / click / reload  -> an EMP or pulse rifle. Energy weapon.
                            DECODED_SOUND_MAP.md's original "energy weapon"
                            reading (from the b4_09 reload) was correct.
  hit (WH#, 16 files)    -> audibly a DIFFERENT weapon from the fire/click/
                            reload above. Identity still unknown; kept as an
                            auditionable impact set, wired to nothing.

So `#` is still a mixed symbol, just not mixed the way the notes suggested: the
fire/utility half is energy, and only its impact half is plausibly ballistic.
Filed accordingly below — energy parts to energy-unused/ where they will not be
picked up by any bank, impacts to their own audition-only bank.

Net effect: there is NO SMG burst anywhere in this library. 9mm/45acp automatic
fire falls back to the generic burst tiers, which is the honest answer.

Idempotent: re-running overwrites the same destination names.
#>
param(
  [string]$F2Dir      = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/dev/audio/lib/f2",
  [string]$DecodedDir = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/dev/audio/lib/f2-decoded"
)

$ErrorActionPreference = "Stop"

# in  = filename in $F2Dir (literal — `#` is NOT a comment inside a quoted string)
# out = subfolder + filename under $DecodedDir, following the established
#       {identity}_sym{symbol}_{type}[-single|-burst][-mat{F|M|S|W}]_v{take}.wav shape.
#       Symbol is spelled "hash" because `#` is not filename-safe everywhere.
$map = @(
  # -- FIRE: both modes are the energy weapon (mode 1 confirmed EMP/pulse rifle
  #    by ear; mode 2 was already read as "pulse rifle shot" in batch 1) --
  @{ in = "wA#1XXX1.wav"; out = "energy-unused/energy-emp-rifle_symhash_fire-burst_v1.wav" }
  @{ in = "wA#1XXX2.wav"; out = "energy-unused/energy-emp-rifle_symhash_fire-burst_v2.wav" }
  @{ in = "wA#2XXX1.wav"; out = "energy-unused/energy-emp-rifle_symhash_fire-single_v1.wav" }
  @{ in = "wA#2XXX2.wav"; out = "energy-unused/energy-emp-rifle_symhash_fire-single_v2.wav" }

  # -- CLICK / RELOAD: same energy weapon as the fire sounds --
  @{ in = "wO#1XXX1.wav"; out = "energy-unused/energy-emp-rifle_symhash_click_v1.wav" }
  @{ in = "wR#1XXX1.wav"; out = "energy-unused/energy-emp-rifle_symhash_reload_v1.wav" }

  # -- HIT: a different weapon from this symbol's fire/click/reload. Identified
  #    by ear as a LIGHT/INTERMEDIATE rifle (5.56 or 7.62x39 AK class), with the
  #    single-vs-burst split confirmed accurate. Own identity so it forms its own
  #    bank rather than contaminating a named one. --
  @{ in = "wH#1FXX1.wav"; out = "firearms/impact-intermediate_symhash_hit-single-matF_v1.wav" }
  @{ in = "wH#1FXX2.wav"; out = "firearms/impact-intermediate_symhash_hit-single-matF_v2.wav" }
  @{ in = "wH#1MXX1.wav"; out = "firearms/impact-intermediate_symhash_hit-single-matM_v1.wav" }
  @{ in = "wH#1MXX2.wav"; out = "firearms/impact-intermediate_symhash_hit-single-matM_v2.wav" }
  @{ in = "wH#1SXX1.wav"; out = "firearms/impact-intermediate_symhash_hit-single-matS_v1.wav" }
  @{ in = "wH#1SXX2.wav"; out = "firearms/impact-intermediate_symhash_hit-single-matS_v2.wav" }
  @{ in = "wH#1WXX1.wav"; out = "firearms/impact-intermediate_symhash_hit-single-matW_v1.wav" }
  @{ in = "wH#1WXX2.wav"; out = "firearms/impact-intermediate_symhash_hit-single-matW_v2.wav" }
  @{ in = "wH#2FXX1.wav"; out = "firearms/impact-intermediate_symhash_hit-burst-matF_v1.wav" }
  @{ in = "wH#2FXX2.wav"; out = "firearms/impact-intermediate_symhash_hit-burst-matF_v2.wav" }
  @{ in = "wH#2MXX1.wav"; out = "firearms/impact-intermediate_symhash_hit-burst-matM_v1.wav" }
  @{ in = "wH#2MXX2.wav"; out = "firearms/impact-intermediate_symhash_hit-burst-matM_v2.wav" }
  @{ in = "wH#2SXX1.wav"; out = "firearms/impact-intermediate_symhash_hit-burst-matS_v1.wav" }
  @{ in = "wH#2SXX2.wav"; out = "firearms/impact-intermediate_symhash_hit-burst-matS_v2.wav" }
  @{ in = "wH#2WXX1.wav"; out = "firearms/impact-intermediate_symhash_hit-burst-matW_v1.wav" }
  @{ in = "wH#2WXX2.wav"; out = "firearms/impact-intermediate_symhash_hit-burst-matW_v2.wav" }
)

# Names used by the previous (incorrect) SMG reading. Removed so a rebuild can't
# resurrect the dissolved `smg` bank from leftover files.
$stale = @(
  "firearms/smg-uzi_symhash_fire-burst_v1.wav", "firearms/smg-uzi_symhash_fire-burst_v2.wav"
  "firearms/smg-uzi_symhash_click_v1.wav",      "firearms/smg-uzi_symhash_reload_v1.wav"
  "firearms/smg-uzi_symUZI_reload_v1.wav"
  "energy-unused/energy-pulse-mixed_symhash_fire-single_v1.wav"
  "energy-unused/energy-pulse-mixed_symhash_fire-single_v2.wav"
) + @('F','M','S','W' | ForEach-Object {
    # previous name for the hit set, before it was identified as intermediate-rifle
    "firearms/impact-unknown_symhash_hit-single-mat$_" + "_v1.wav"
    "firearms/impact-unknown_symhash_hit-single-mat$_" + "_v2.wav"
    "firearms/impact-unknown_symhash_hit-burst-mat$_"  + "_v1.wav"
    "firearms/impact-unknown_symhash_hit-burst-mat$_"  + "_v2.wav"
    "firearms/smg-uzi_symhash_hit-single-mat$_" + "_v1.wav"
    "firearms/smg-uzi_symhash_hit-single-mat$_" + "_v2.wav"
    "firearms/smg-uzi_symhash_hit-burst-mat$_"  + "_v1.wav"
    "firearms/smg-uzi_symhash_hit-burst-mat$_"  + "_v2.wav"
  })

foreach ($s in $stale) {
  $p = Join-Path $DecodedDir $s
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force; Write-Host "USUNIETO (stare): $s" }
}

$ok = 0; $failed = 0
foreach ($entry in $map) {
  # -LiteralPath: `#` and `$` in these names must not be glob/expansion-interpreted.
  $src = Join-Path $F2Dir $entry.in
  $dst = Join-Path $DecodedDir $entry.out

  if (-not (Test-Path -LiteralPath $src)) {
    Write-Warning "Brak pliku zrodlowego: $src"
    $failed++
    continue
  }

  $dstDir = Split-Path -Parent $dst
  if (-not (Test-Path -LiteralPath $dstDir)) {
    New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  }

  Copy-Item -LiteralPath $src -Destination $dst -Force
  Write-Host "OK: $($entry.in) -> $($entry.out)"
  $ok++
}

Write-Host ""
Write-Host "Gotowe. $ok odzyskanych, $failed bledow."
