# FreeSound Sources (misc interface SFX, `sounds/misc/`)

All sources below are CC0 at time of import.

- medyk_heal.ogg
  - Freesound #483608 (see `PLAN_toolkits.md`)
  - License: Creative Commons 0

- equip.ogg — Oporządzenie (equip / draw / stow acknowledgement, `actors/doll-panel.mjs`)
  - https://freesound.org/people/mrickey13/sounds/518850/ ("Item Equip", mrickey13)
  - Converted: leading silence trimmed, mono, Vorbis q4 (`ffmpeg -af silenceremove=start_periods=1:start_threshold=-55dB -ac 1 -c:a libvorbis -q:a 4`)
  - License: Creative Commons 0
