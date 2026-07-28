<#
Builds the per-weapon SOUND BANKS under sounds/banks/ from the decoded
Fallout 2 library (dev/audio/lib/f2-decoded/).

WHAT A "BANK" IS
----------------
The Fallout 2 source material is shaped as per-weapon-archetype sound *sets*:
one prototype symbol gives you a fire sound, often a burst sound, a reload, a
dry-fire click, and impact sounds split four ways by target material — each
with 1-3 alternate takes. `scripts/config/sound-banks.mjs` consumes that shape
directly (a bank = one archetype, with slots), instead of the old flat
one-key-one-file WeaponSound map which would need ~30 new enum members to give
10 calibers their own shot+reload+click.

This script does NOT hardcode a file list. It parses the decoded naming
convention documented in dev/audio/lib/f2/DECODED_SOUND_MAP.md:

    {identity}_sym{symbol}_{type}[-single|-burst][-mat{F|M|S|W}]_v{take}.wav

...maps `identity` to a bank name via $bankOf below, and emits
    sounds/banks/{bank}/{slot}_v{take}.ogg
Adding a new source file to f2-decoded/ with a known identity picks it up on
the next run with no edit here.

LOUDNESS
--------
Normalized to -18 LUFS by default. The older process_f2_caliber_sfx.ps1
documents a standing "no loudnorm" preference, but that was overturned once the
banks were auditioned against each other: the F2 sources are 22050 Hz mono and
their levels vary so widely between prototypes that loudness dominated the
judgement instead of the character of each sound. Pass -Normalize:$false for a
raw conversion.

Same mono / 44.1 kHz / libvorbis q:a 5 output convention as the rest of the
pipeline.
#>
param(
  [string]$InputDir  = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/dev/audio/lib/f2-decoded",
  [string]$OutputDir = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/sounds/banks",
  [bool]$Normalize = $true,
  [switch]$WhatIfOnly
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg nie jest dostepny w PATH."
}

# ---------------------------------------------------------------------------
# identity (from the decoded filename) -> bank name
#
# Only identities listed here are converted. Energy-weapon and melee/unarmed
# identities are deliberately absent: Neuroshima's ruleset has no energy
# weapons, and melee is handled by the existing generic MELEE_* tiers.
# Anything in f2-decoded/ whose identity is not a key here is skipped and
# reported at the end, so a newly-added-but-unmapped file can't go unnoticed.
# ---------------------------------------------------------------------------
$bankOf = @{
  "pistol-semiauto"         = "pistol"          # sym A  — 9mm / 45acp, P
  "silenced-weapon"         = "silenced"        # sym U  — broń z tłumikiem, 22lr, lotki
  "heavycaliber-uncertain"  = "pistol-heavy"    # sym B  — 44mag, P (fire only)
  "impact-intermediate"     = "impact-intermediate" # sym # — hits only; light/intermediate rifle
  "uzi-reload"              = "uzi"             # UZI.wav — confirmed Uzi reload, reload only
  "rifle-ar-platform"       = "ar"              # sym G  — 556, P
  "rifle-fnfal"             = "fnfal"           # sym H  — 762, P/KS/DS/MS
  "rifle-medium-akpattern"  = "ak"              # sym D  — 76239ak, P/DS
  "rifle-highcaliber"       = "rifle-high"      # sym E  — 3006, P (fire only)
  "rifle-bolt"              = "bolt"            # RIFLE.wav — single-round reload only
  "shotgun"                 = "shotgun"         # sym R  — 12ga_s / 12ga_b, P
  "minigun"                 = "minigun"         # sym L  — Minigun, MS
  "rocket-launcher-mortar"  = "launcher"        # sym N  — 60mm / 120mm, P
  "energy-heavy"            = "hmg"             # sym @  — 50bmg DS/MS (see note)
  "crossbow"                = "crossbow"        # sym Z  — belt (kusze)
  "flamethrower"            = "flamethrower"    # sym I/!— Miotacz ognia
  "thrown-star"             = "thrown"          # sym O  — noze do rzucania
  "explosion-large"         = "explosion"       # sym P  — hit-only, large blast
  "explosion-emp"           = "explosion-emp"   # sym Q  — hit-only, EMP-flavored
  "rocket-flyby-whoosh"     = "flyby"           # WFN1   — incoming-rocket ambience
  "thrown-bola-net"         = "thrown-net"      # WF41   — bolas / boomerang
}
# NOTE on "energy-heavy" -> "hmg": DECODED_SOUND_MAP.md files symbol `@` as a
# heavy ENERGY weapon, on the strength of its reload ("large energy weapon",
# b4_10). But LISTENING_NOTES.md describes its two FIRE recordings as "a single,
# powerful shot from a high caliber weapon" and "four low fire rate shots from a
# powerful high caliber weapon" (lines 38-39) — that is a heavy machine gun
# profile, and .50 BMG (Browning, Light Fifty; P/DS/MS) has no other candidate
# in the library. Converted here so it can be auditioned and either kept or
# dropped; `sound-banks.mjs` flags the same uncertainty at its use site.

# ---------------------------------------------------------------------------
# Filename -> slot name
#
#   fire-single / fire (no qualifier) -> shot
#   fire-burst                        -> burst
#   hit-single-matX                   -> impact-X
#   hit-burst-matX                    -> impact-burst-X
#   click                             -> click
#   reload / reload-mX                -> reload
#
# Single and burst hits are kept in SEPARATE slots, not merged as alternate
# takes of one. An earlier revision merged them ("an impact is an impact") and
# the result was audibly wrong: the burst recordings are multi-hit strings, so a
# single shot would randomly play the sound of several rounds landing. The
# author spotted it immediately as a "burst-burst-single-single" pattern across
# the four takes. bankImpactFile() now picks the slot from the fire mode.
# ---------------------------------------------------------------------------
function Get-Slot {
  param([string]$type)

  switch -Regex ($type) {
    '^fire-burst$'                       { return "burst" }
    '^fire(-single)?$'                   { return "shot" }
    '^hit-single$'                       { return "impact" }        # material-less (sym N, O, P, Q)
    '^hit-burst$'                        { return "impact-burst" }
    '^hit-single-mat(?<m>[FMSW])$'       { return "impact-$($Matches.m)" }
    '^hit-burst-mat(?<m>[FMSW])$'        { return "impact-burst-$($Matches.m)" }
    '^click(-mX)?$'                      { return "click" }
    '^reload(-mX)?$'                     { return "reload" }
    '^ambient$'                          { return "ambient" }       # WFN1 rocket flyby
    default                              { return $null }
  }
}

# ---------------------------------------------------------------------------
# Slots to drop outright: converted source exists, but the sound is unusable
# for the role its filename implies.
# ---------------------------------------------------------------------------
$excludeSlots = @{
  # symbol O's "hit" is a huge explosion / car-crash impact, nothing like a
  # thrown knife or star landing. Confirmed by ear. Its FIRE sound is fine and
  # is kept. Left in f2-decoded as archive; simply never banked.
  "thrown/impact" = $true

  # symbol @'s reload is an ELECTRIC/energy weapon action - it does not belong
  # with the slow-firing heavy machine gun its fire and impact recordings
  # describe. Confirmed by ear. This is the same reload-vs-fire mismatch that
  # got @ mis-filed as an energy weapon in the first place; here only the reload
  # is discarded, and sound-banks.mjs borrows one for .50 BMG instead.
  "hmg/reload"    = $true
}

# ---------------------------------------------------------------------------
# Individual SOURCE FILES to drop. Unlike $excludeSlots this removes one take
# while keeping the slot, for when a slot has multiple sources and only one is
# bad.
# ---------------------------------------------------------------------------
$excludeFiles = @{
  # Symbol L's own reload is "surprisingly mild... more like a machine pistol
  # reload" (LISTENING_NOTES b4_14) and does not match its unmistakable minigun
  # fire. MAGUNNLC.wav, promoted by promote_named_files.ps1, replaces it.
  "minigun_symL_reload_v1.wav" = $true
}

# Parse: {identity}_sym{symbol}_{type}_v{take}.wav
$rx = '^(?<identity>.+?)_sym(?<symbol>.+?)_(?<type>.+?)_v(?<take>\d+)\.wav$'

$files = Get-ChildItem -LiteralPath $InputDir -Recurse -Filter *.wav

# Group by destination slot so we can renumber takes densely (_v1.._vN) rather
# than inheriting gaps from the source take numbers.
$bySlot = @{}
$skippedIdentity = @{}
$skippedType = @{}

foreach ($f in $files) {
  if ($excludeFiles.ContainsKey($f.Name)) { $skippedType["$($f.Name) (plik na czarnej liscie)"] = $true; continue }
  if ($f.Name -notmatch $rx) {
    $skippedType["(nie pasuje do wzorca) $($f.Name)"] = $true
    continue
  }
  $identity = $Matches.identity
  $type     = $Matches.type

  $bank = $bankOf[$identity]
  if (-not $bank) { $skippedIdentity[$identity] = $true; continue }

  $slot = Get-Slot -type $type
  if (-not $slot) { $skippedType["$identity :: $type"] = $true; continue }

  $key = "$bank/$slot"
  if ($excludeSlots.ContainsKey($key)) { $skippedType["$key (na czarnej liscie)"] = $true; continue }
  if (-not $bySlot.ContainsKey($key)) { $bySlot[$key] = New-Object System.Collections.ArrayList }
  [void]$bySlot[$key].Add($f)
}

# Clean rebuild. Without this, a bank that has been renamed or dissolved leaves
# its old .ogg files behind and the manifest regenerates them back into
# existence — which is how a stale bank silently survives an assignment change.
if (-not $WhatIfOnly -and (Test-Path -LiteralPath $OutputDir)) {
  Remove-Item -LiteralPath $OutputDir -Recurse -Force
}

$ok = 0; $failed = 0; $slotCount = 0

foreach ($key in ($bySlot.Keys | Sort-Object)) {
  $parts = $key -split '/'
  $bank  = $parts[0]
  $slot  = $parts[1]

  $bankDir = Join-Path $OutputDir $bank
  if (-not $WhatIfOnly -and -not (Test-Path -LiteralPath $bankDir)) {
    New-Item -ItemType Directory -Force -Path $bankDir | Out-Null
  }

  # Stable, deterministic take order: hit-single before hit-burst, then v1,v2...
  $sorted = $bySlot[$key] | Sort-Object Name
  $take = 0
  $slotCount++

  foreach ($f in $sorted) {
    $take++
    $dst = Join-Path $bankDir "${slot}_v${take}.ogg"

    if ($WhatIfOnly) {
      Write-Host "WHATIF: $($f.Name) -> banks/$bank/${slot}_v${take}.ogg"
      $ok++
      continue
    }

    $ffArgs = @("-y", "-v", "error", "-i", $f.FullName, "-ac", "1", "-ar", "44100")
    if ($Normalize) {
      $ffArgs += @("-af", "loudnorm=I=-18:LRA=11:TP=-1.5")
    }
    $ffArgs += @("-c:a", "libvorbis", "-q:a", "5", $dst)

    ffmpeg @ffArgs | Out-Null

    if (Test-Path -LiteralPath $dst) {
      $ok++
    } else {
      Write-Warning "FFmpeg nie utworzyl: $dst  (zrodlo: $($f.Name))"
      $failed++
    }
  }
}

# ---------------------------------------------------------------------------
# Emit the generated manifest consumed by scripts/config/sound-bank-manifest.mjs.
#
# The runtime needs to know how many variant takes each slot has, in order to
# pick one at random. Hand-maintaining those counts in JS would silently drift
# from what is actually on disk the first time a file is added or dropped (the
# `#` symbol going missing for this long is precisely that failure mode), so
# they are generated here instead. The hand-edited editorial layer - which
# caliber uses which bank - lives in sound-banks.mjs and imports this.
# ---------------------------------------------------------------------------
if (-not $WhatIfOnly) {
  $manifestPath = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/scripts/config/sound-bank-manifest.mjs"

  $banks = @{}
  foreach ($key in $bySlot.Keys) {
    $parts = $key -split '/'
    $b = $parts[0]; $s = $parts[1]
    if (-not $banks.ContainsKey($b)) { $banks[$b] = @{} }
    $banks[$b][$s] = $bySlot[$key].Count
  }

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("/**")
  [void]$sb.AppendLine(" * Neuroshima 5e - GENERATED FILE, DO NOT EDIT BY HAND.")
  [void]$sb.AppendLine(" *")
  [void]$sb.AppendLine(" * Regenerate with:")
  [void]$sb.AppendLine(" *   dev/audio/build_sound_banks.ps1")
  [void]$sb.AppendLine(" *")
  [void]$sb.AppendLine(" * Maps each sound bank to its available slots and the number of alternate")
  [void]$sb.AppendLine(" * takes per slot, as actually present under sounds/banks/. Files are named")
  [void]$sb.AppendLine(" * {slot}_v{1..N}.ogg, so a count of N means _v1 through _vN exist and any")
  [void]$sb.AppendLine(" * of them may be chosen at random for variety.")
  [void]$sb.AppendLine(" *")
  [void]$sb.AppendLine(" * The editorial layer - which caliber/weapon maps to which bank - is")
  [void]$sb.AppendLine(" * hand-maintained in sound-banks.mjs, which imports this.")
  [void]$sb.AppendLine(" */")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("export const BANK_MANIFEST = Object.freeze({")

  foreach ($b in ($banks.Keys | Sort-Object)) {
    $slotPairs = ($banks[$b].Keys | Sort-Object | ForEach-Object {
      # Slot names contain a hyphen (impact-F), so they must be quoted keys.
      "`"$_`": $($banks[$b][$_])"
    }) -join ", "
    [void]$sb.AppendLine("  `"$b`": Object.freeze({ $slotPairs }),")
  }

  [void]$sb.AppendLine("});")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("/** Base path for every bank file, relative to the FVTT data root. */")
  [void]$sb.AppendLine("export const BANKS_BASE = `"modules/neuroshima-2026-overrides/sounds/banks`";")

  # UTF8 without BOM - Foundry serves these as ES modules.
  [System.IO.File]::WriteAllText($manifestPath, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Manifest: $manifestPath"
}

Write-Host ""
Write-Host "=== Banki ==="
Write-Host "Slotow: $slotCount, plikow: $ok OK, $failed bledow."
Write-Host "Normalizacja: $(if ($Normalize) { 'TAK (-18 LUFS)' } else { 'NIE (raw)' })"
Write-Host "Wyjscie: $OutputDir"

if ($skippedIdentity.Count) {
  Write-Host ""
  Write-Host 'Pominiete tozsamosci (brak wpisu w $bankOf - celowo dla energy/melee):'
  $skippedIdentity.Keys | Sort-Object | ForEach-Object { Write-Host "  - $_" }
}
if ($skippedType.Count) {
  Write-Host ""
  Write-Host "Pominiete typy plikow:"
  $skippedType.Keys | Sort-Object | ForEach-Object { Write-Host "  - $_" }
}
