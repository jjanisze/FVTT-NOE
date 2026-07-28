<#
Synthesizes the automatic-fire sounds the Fallout 2 library does not contain, by
repeating a weapon's own SINGLE-SHOT recording at a realistic cyclic rate.

WHY
---
After the audition pass, exactly five fire slots had no source anywhere:

    9mm  KS / DS      Empepiatka, UZI      - SMG burst
    45acp KS / DS     Tommy gun, HK Univ.  - SMG burst
    556  MS           AR, XM-8, Minimi     - sustained magdump

The library has no SMG burst at all. Symbol `#` looked like one (LISTENING_NOTES
line 17, "UZI burst") but was confirmed by ear to be an EMP/pulse rifle. The only
real bursts are `H` (FN FAL, ~7 rifle rounds), `R` (3 shotgun shells), `@` (four
slow heavy shots) and `L` (minigun, reserved) - none of which can stand in for a
9mm SMG, and none long enough for MS.

Rather than borrow an audibly wrong gun, this builds the missing bursts from the
RIGHT gun: each caliber's own confirmed single-shot report, overlaid at that
weapon class's real cyclic rate. A 9mm SMG burst genuinely is the 9mm pistol
report repeated at ~800 rpm, so this stays in character with the rest of the set
instead of introducing a foreign sample.

HOW
---
N delayed copies of the source are mixed (`adelay` + `amix normalize=0`), so the
shots overlap and their tails build into a continuous report the way real
automatic fire does. Then `alimiter` catches the summed peaks - mixing 30 copies
at unity gain will otherwise clip hard - and `loudnorm` matches the -18 LUFS the
banks are normalized to.

These are DERIVED, not original recordings. They are marked
`confidence: "synth"` in sound-banks.mjs's BANK_INFO so nobody later mistakes
them for decoded Fallout 2 material.

Output goes straight into sounds/banks/ as `burst-{mode}_v1.ogg`, using the
mode-specific burst slots that sound-banks.mjs prefers over the generic `burst`.
Run AFTER build_sound_banks.ps1, which wipes the bank directory.
#>
param(
  [string]$DecodedDir = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/dev/audio/lib/f2-decoded",
  [string]$BanksDir   = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/sounds/banks"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg nie jest dostepny w PATH."
}

# src      = source single-shot recording, relative to $DecodedDir
# bank/slot= destination bank and slot under $BanksDir
# rounds   = how many shots to overlay
# rpm      = cyclic rate; interval between shots = 60000 / rpm milliseconds
# trimMs   = clip each copy to this length before overlaying (0 = full sample).
#            Long tails are wanted for short bursts but turn a 30-round dump into
#            undifferentiated wash, so sustained fire uses a tighter clip and
#            lets only the final shot ring out.
$jobs = @(
  # --- 9mm / 45acp SMG bursts, from the semi-auto pistol report (symbol A) ---
  # UZI ~600 rpm, MP5/Empepiatka ~800 rpm. 800 is the livelier read.
  @{ src = "firearms/pistol-semiauto_symA_fire-single_v1.wav"
     bank = "smg-synth"; slot = "burst-ks"; rounds = 3;  rpm = 800; trimMs = 0 }
  @{ src = "firearms/pistol-semiauto_symA_fire-single_v1.wav"
     bank = "smg-synth"; slot = "burst-ds"; rounds = 12; rpm = 800; trimMs = 260 }
  @{ src = "firearms/pistol-semiauto_symA_fire-single_v2.wav"
     bank = "smg-synth"; slot = "burst-oz"; rounds = 6;  rpm = 800; trimMs = 260 }

  # --- 5.56 sustained fire, from the AR report (symbol G) ---
  # M16 family ~800 rpm. MS is 50-200 rounds; 30 overlaid shots already reads as
  # "emptying the magazine" without becoming a three-second smear.
  @{ src = "firearms/rifle-ar-platform_symG_fire-single_v1.wav"
     bank = "ar-synth"; slot = "burst-ms"; rounds = 30; rpm = 800; trimMs = 200 }

  # --- 7.62 sustained fire, from the FN FAL single (symbol H) ---
  # Not a gap - 762 MS currently falls back to the FN FAL's own ~7-round burst -
  # but that is far too short for a 50-200 round dump. ~700 rpm battle rifle.
  @{ src = "firearms/rifle-fnfal_symH_fire-single_v1.wav"
     bank = "fnfal-synth"; slot = "burst-ms"; rounds = 26; rpm = 700; trimMs = 220 }
)

$ok = 0; $failed = 0

foreach ($j in $jobs) {
  $src = Join-Path $DecodedDir $j.src
  if (-not (Test-Path -LiteralPath $src)) {
    Write-Warning "Brak zrodla: $src"
    $failed++
    continue
  }

  $bankDir = Join-Path $BanksDir $j.bank
  if (-not (Test-Path -LiteralPath $bankDir)) {
    New-Item -ItemType Directory -Force -Path $bankDir | Out-Null
  }
  $dst = Join-Path $bankDir "$($j.slot)_v1.ogg"

  $n        = [int]$j.rounds
  $interval = [math]::Round(60000.0 / [double]$j.rpm)   # ms between shots
  $trim     = [int]$j.trimMs

  # Build: [0:a]asplit=N[s0][s1]...  then per-copy trim+delay, then amix.
  $labels = 0..($n - 1) | ForEach-Object { "[s$_]" }
  $chain  = "[0:a]asplit=$n$($labels -join '')"

  $mixIn = ""
  for ($i = 0; $i -lt $n; $i++) {
    $delay = $i * $interval
    # The LAST copy keeps its full tail so the burst rings out naturally;
    # earlier copies are clipped (when trimMs > 0) to keep the body defined.
    $applyTrim = ($trim -gt 0) -and ($i -lt ($n - 1))
    $seg = "[s$i]"
    if ($applyTrim) {
      # afade prevents a click at the hard cut.
      $tSec = [math]::Round($trim / 1000.0, 3)
      $fadeStart = [math]::Round([math]::Max(0.0, $tSec - 0.03), 3)
      $seg += "atrim=0:$tSec,asetpts=N/SR/TB,afade=t=out:st=${fadeStart}:d=0.03,"
    }
    $seg += "adelay=$delay|$delay[d$i]"
    $chain += ";$seg"
    $mixIn += "[d$i]"
  }

  # normalize=0 keeps each shot at unity so overlap actually accumulates;
  # alimiter then tames the sum, and loudnorm matches the banks' -18 LUFS.
  $chain += ";${mixIn}amix=inputs=$n`:normalize=0,alimiter=limit=0.95,loudnorm=I=-18:LRA=11:TP=-1.5[out]"

  ffmpeg -y -v error -i "$src" -filter_complex "$chain" -map "[out]" `
         -ac 1 -ar 44100 -c:a libvorbis -q:a 5 "$dst" 2>$null

  if (Test-Path -LiteralPath $dst) {
    $dur = & ffprobe -v error -show_entries format=duration -of csv=p=0 "$dst"
    Write-Host ("OK: {0}/{1}  <- {2} x{3} @ {4} rpm  ({5}s)" -f `
      $j.bank, $j.slot, (Split-Path $j.src -Leaf), $n, $j.rpm, [math]::Round([double]$dur, 2))
    $ok++
  } else {
    Write-Warning "FFmpeg nie utworzyl: $dst"
    $failed++
  }
}

Write-Host ""
Write-Host "Gotowe. $ok OK, $failed bledow."
Write-Host "UWAGA: te pliki sa SYNTEZOWANE, nie oryginalne nagrania Fallout 2."

# ---------------------------------------------------------------------------
# Append the synthesized banks to the generated manifest.
#
# build_sound_banks.ps1 only sees f2-decoded/, so it cannot know about these.
# Rather than have it guess, this appends them itself - keeping the rule that
# the manifest is always generated and never hand-edited.
# ---------------------------------------------------------------------------
$manifestPath = "c:/Users/archo/AppData/Local/FoundryVTT/Data/modules/neuroshima-2026-overrides/scripts/config/sound-bank-manifest.mjs"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  Write-Warning "Brak manifestu - uruchom najpierw build_sound_banks.ps1."
  return
}

$synth = @{}
foreach ($j in $jobs) {
  $dst = Join-Path (Join-Path $BanksDir $j.bank) "$($j.slot)_v1.ogg"
  if (-not (Test-Path -LiteralPath $dst)) { continue }
  if (-not $synth.ContainsKey($j.bank)) { $synth[$j.bank] = @{} }
  $synth[$j.bank][$j.slot] = 1
}

$lines = New-Object System.Collections.ArrayList
foreach ($b in ($synth.Keys | Sort-Object)) {
  $pairs = ($synth[$b].Keys | Sort-Object | ForEach-Object { "`"$_`": $($synth[$b][$_])" }) -join ", "
  [void]$lines.Add("  `"$b`": Object.freeze({ $pairs }),")
}

$text = [System.IO.File]::ReadAllText($manifestPath)
# Insert before the closing "});" of BANK_MANIFEST.
$marker = "});"
$idx = $text.IndexOf($marker)
if ($idx -lt 0) { Write-Warning "Nie znaleziono konca BANK_MANIFEST."; return }

$insert = "`r`n  // --- Banki SYNTEZOWANE (dev/audio/build_synth_bursts.ps1) ---`r`n" +
          ($lines -join "`r`n") + "`r`n"
$text = $text.Insert($idx, $insert)
[System.IO.File]::WriteAllText($manifestPath, $text, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Manifest zaktualizowany: $($synth.Keys.Count) bankow syntezowanych."
