<#
Promotes the three descriptively-named Fallout 2 files whose identity IS
confirmed into dev/audio/lib/f2-decoded/, using the standard naming convention
so that build_sound_banks.ps1 picks them up with no special-casing.

WHY
---
LISTENING_NOTES.md lines 47-51 identify five named (non-symbol) files as
"reference anchors". Three of them are usable reloads whose identity is
documented rather than guessed, and they fill gaps the symbol-based library
leaves open:

  RIFLE.wav  "Loading of a single round into a chambered rifle"
      -> The bolt-action / single-round reload case. Symbol `E`
         (rifle-highcaliber, used for .30-06) recorded a fire sound ONLY --
         no reload exists for it anywhere -- so .30-06 currently falls back to
         a generic placeholder. This is exactly the right sound for it.

  PISTOL.wav "Click upon insertion of a pistol magazine"
      -> A second reload take for the semi-auto pistol bank, which has only
         one (symbol `A`'s slide-rack). Adds variety to a very frequent sound.

  UZI.wav    "Uzi reload"
      -> Its own reload-only bank `uzi`. It was briefly a second take in an
         `smg` bank built on symbol `#`, but `#` turned out to be an energy
         weapon (see recover_hash_symbol.ps1) and that bank was dissolved. This
         remains the library's only genuine SMG reload, so it is kept available
         for a per-weapon override on the actual SMGs (Empepiątka, UZI, Tommy
         gun) rather than being discarded. Not wired to any caliber: those guns
         are 9mm/45acp and would otherwise take the pistol bank's reload.

Naming is deliberate: each file is given the IDENTITY of the bank it should
join, so build_sound_banks.ps1's normal identity->bank mapping and dense take
renumbering absorb them as extra variants. The original F2 symbol is preserved
in the _sym{...} segment (symRIFLE / symPISTOL / symUZI) so provenance stays
traceable, same as every other decoded file.

The other two anchors are deliberately NOT promoted: MINIGUN.wav is documented
as "a short click. Unsuitable even for minigun reload", and SHOTS/SHOTS1 are
background ambience rather than weapon FX. Both remain in sounds/audition/.

Idempotent: re-running overwrites the same destination names.
#>
param(
  [string]$F2Dir      = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/dev/audio/lib/f2",
  [string]$DecodedDir = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/dev/audio/lib/f2-decoded"
)

$ErrorActionPreference = "Stop"

$map = @(
  # New identity -> its own bank ("bolt"), reload-only. Nothing else in the
  # library is a single-round chambered reload.
  @{ in = "RIFLE.wav";  out = "firearms/rifle-bolt_symRIFLE_reload_v1.wav" }

  # Joins existing banks as an extra reload take (identity matches the bank's).
  @{ in = "PISTOL.wav"; out = "firearms/pistol-semiauto_symPISTOL_reload_v1.wav" }

  # Own reload-only bank; see the header note on why this is not folded into
  # another bank.
  @{ in = "UZI.wav";    out = "firearms/uzi-reload_symUZI_reload_v1.wav" }

  # Joins the minigun bank and REPLACES symbol L's own reload, which is excluded
  # in build_sound_banks.ps1 ($excludeFiles). Confirmed by ear as the better of
  # the two - symbol L's is documented as sounding like a machine pistol, which
  # is the same fire-vs-reload mismatch seen on symbols # and @.
  @{ in = "MAGUNNLC.wav"; out = "firearms/minigun_symMAGUN_reload_v1.wav" }
)

$ok = 0; $failed = 0
foreach ($e in $map) {
  $src = Join-Path $F2Dir $e.in
  $dst = Join-Path $DecodedDir $e.out

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
  Write-Host "OK: $($e.in) -> $($e.out)"
  $ok++
}

Write-Host ""
Write-Host "Gotowe. $ok promowanych, $failed bledow."
Write-Host "Uruchom teraz build_sound_banks.ps1, aby przebudowac banki i manifest."
