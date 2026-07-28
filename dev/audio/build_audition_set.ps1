<#
Converts the Fallout 2 files that were NEVER DECODED into sounds/audition/,
so they can be heard in-game via the sound debug panel and either promoted
into a bank or discarded.

WHY THESE WERE MISSED
---------------------
DECODED_SOUND_MAP.md and LISTENING_NOTES.md worked through the 339 raw files
via the `W[TYPE][SYMBOL][MODE]XXX[VARIANT]` symbol scheme. A handful of files
in dev/audio/lib/f2/ carry plain descriptive names instead and sit entirely
outside that scheme. Five of them WERE covered, as "reference anchors" in
LISTENING_NOTES.md lines 47-51:

  PISTOL.wav   "Click upon insertion of a pistol magazine"      -> a RELOAD
  RIFLE.wav    "Loading of a single round into a chambered rifle" -> a RELOAD
  UZI.wav      "Uzi reload"                                      -> a RELOAD
  MINIGUN.wav  "a short click. Unsuitable even for minigun reload"
  SHOTS.wav /  "4 distant shots. Background ambience"
  SHOTS1.wav

Note all three of the first group are RELOAD sounds despite gun-shaped names -
they are NOT fire sounds. RIFLE.wav in particular is an ideal RELOAD_SINGLE
(the "doladuj 1 naboj" / bolt-cycle case), which currently has only a
placeholder.

The rest below appear in NEITHER document and are genuinely unidentified. Their
filenames suggest obvious candidates (HOWITZER -> 120mm mozdzierz, MAGUNNLC /
magun2ao -> "machine gun"?, RLAUNCH -> rocket launch) but a filename is not a
listening confirmation, and this library has already produced two symbols whose
names/labels were wrong (`#` and `@`). So: converted for audition, wired to
nothing.

LOUDNESS: every file here is loudnorm'd to -18 LUFS, matching what
build_sound_banks.ps1 now does for the banks. Auditioning is a comparison task
and raw F2 levels vary wildly between prototypes, which made quiet-vs-loud
dominate the judgement instead of the actual character of each sound. Any file
promoted from here into a bank gets re-encoded by the bank build anyway, so this
normalization only affects the audition copies.
#>
param(
  [string]$F2Dir     = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/dev/audio/lib/f2",
  [string]$OutputDir = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/sounds/audition"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg nie jest dostepny w PATH."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# All entries are normalized (see header); no per-entry flag needed.
$map = @(
  # --- decoded as "reference anchors", but never converted: all RELOADS ---
  @{ in = "PISTOL.wav";   out = "reload-pistol-maginsert.ogg" }
  @{ in = "RIFLE.wav";    out = "reload-rifle-singleround.ogg" }
  @{ in = "UZI.wav";      out = "reload-uzi-smg.ogg" }
  @{ in = "MINIGUN.wav";  out = "click-short-minigun.ogg" }
  @{ in = "SHOTS.wav";    out = "ambience-distant-shots-4.ogg" }
  @{ in = "SHOTS1.wav";   out = "ambience-distant-shots-alt.ogg" }

  # --- genuinely undecoded: named-only, in neither listening doc ---
  @{ in = "HOWITZER.wav"; out = "unknown-howitzer.ogg" }
  @{ in = "MAGUNNLC.wav"; out = "unknown-magunnlc.ogg" }
  @{ in = "magun2ao.wav"; out = "unknown-magun2ao.ogg" }
  @{ in = "RLAUNCH.wav";  out = "unknown-rlaunch.ogg" }
  @{ in = "FLAMETHR.wav"; out = "unknown-flamethr.ogg" }
  @{ in = "SPEAR.wav";    out = "unknown-spear.ogg" }
  @{ in = "KNIFE.wav";    out = "unknown-knife.ogg" }
  @{ in = "FLARE.wav";    out = "unknown-flare.ogg" }
  @{ in = "WEPNBOX.wav";  out = "unknown-wepnbox.ogg" }

  # --- the documented-broken gunshot; loudnorm IS the fix being tested ---
  @{ in = "WWHNXXX2.wav"; out = "gunshot-normalized.ogg" }
)

$ok = 0; $failed = 0
foreach ($e in $map) {
  $src = Join-Path $F2Dir $e.in
  $dst = Join-Path $OutputDir $e.out

  if (-not (Test-Path -LiteralPath $src)) {
    Write-Warning "Brak pliku zrodlowego: $src"
    $failed++
    continue
  }

  $ffArgs = @("-y", "-v", "error", "-i", $src, "-ac", "1", "-ar", "44100",
               "-af", "loudnorm=I=-18:LRA=11:TP=-1.5")
  $ffArgs += @("-c:a", "libvorbis", "-q:a", "5", $dst)

  ffmpeg @ffArgs | Out-Null

  if (Test-Path -LiteralPath $dst) {
    Write-Host "OK: $($e.in) -> $($e.out)"
    $ok++
  } else {
    Write-Warning "FFmpeg nie utworzyl: $dst"
    $failed++
  }
}

Write-Host ""
Write-Host "Gotowe. $ok OK, $failed bledow. Wyjscie: $OutputDir"
