# FreeSound Sources (Gadżety SFX)

Dźwięki przedmiotów czysto smaczkowych — patrz `scripts/items/gadzety.mjs`.
Wszystkie źródła są CC0 w chwili importu (zweryfikowane na stronie każdego
dźwięku, nie tylko przez filtr wyszukiwarki). Zbudowane:

```
node dev/audio/build_audio.mjs pipeline_gadzety.json
```

Punkty przycięcia nie są zgadywane — wyznaczone przez `ffmpeg -af silencedetect`
na oryginale, tak żeby każdy plik zawierał **dokładnie jedno zdarzenie**
(jeden pisk, jedno kliknięcie), a nie całą sesję nagraniową.

- `kaczuszka.ogg` — „Ściśnij" na Gumowej kaczuszce
  - https://freesound.org/s/350917/
  - „rubber duck -CsG-.wav" by csaszi
  - License: Creative Commons 0
  - Trim: 0,09 s → 0,69 s (jeden pisk; oryginał ma ich kilkanaście przez 11,9 s)

- `krotkofalowka.ogg` — „Nadaj" na Krótkofalówce
  - https://freesound.org/s/321906/
  - „Walkie Talkie - Roger Beep" by bruce965
  - License: Creative Commons 0
  - Trim: 0 s → 0,35 s (oryginał trwa 0,65 s, reszta to cisza)

- `dezynfekcja.ogg` — „Spryskaj" na Przemysłowym środku do dezynfekcji
  - https://freesound.org/s/516815/
  - „Aerosol spray.wav" by C-V
  - License: Creative Commons 0
  - Trim: 0,6 s → 2,45 s (jedno psiknięcie; oryginał ma ich kilka przez 11,3 s)

- `dlugopis.ogg` — „Kliknij" na Długopisie
  - https://freesound.org/s/499190/
  - „15_ballpoint pen, click.WAV" by 16F_Panska_TisonD
  - License: Creative Commons 0
  - Trim: 2,13 s → 2,81 s (para naciśnięcie + zwolnienie, czyli pełny cykl długopisu)

## Normalizacja

Te same parametry co paczka `travel` (`pipeline_travel.json`): LUFS −18, LRA 11,
TP −1,5. Po przetworzeniu zmierzone `mean_volume` mieści się w −16…−30 dB, a
`max_volume` w −1…−10 dB — czyli żaden plik nie jest ciszą, co jest jedynym
realnym trybem awarii tego pipeline'u (złe przycięcie daje plik poprawny
formalnie i pusty w praktyce).
