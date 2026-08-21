# Prompty do generowania żetonów top-down

Szablon + gotowe wypełnienia. Prompty są **po angielsku** — modele graficzne są na angielskim
trenowane i po polsku gubią szczegóły techniczne (zwłaszcza „head toward the bottom").

## Jak podpinać referencje

Dwa obrazy, w dwóch **różnych** rolach — i trzeba to powiedzieć wprost, bo inaczej model
zmiksuje treść obu:

| Plik | Rola | Co ma z niego wziąć |
|---|---|---|
| `worlds/output/characters/<NNN>_-_<NAZWA>/avatar.png` | **SUBJECT** | anatomia, proporcje, sylwetka, detale postaci |
| `systems/dnd5e/tokens/<kat>/<Ref>.webp` | **STYLE / FORMAT** | rzut kamery, kadrowanie, cień, sposób malowania |

⚠️ Najczęstsza wpadka: model przenosi **treść** ze style-refa — dokleja goblinowi maczugę,
zbroję albo zieloną skórę. Dlatego w prompcie jest osobny blok „from the style reference take
ONLY…".

---

## ⚠️ `<FILL>` — rozmiar rysowanej postaci, nie kadru

**Mały i Średni dzielą ten sam żeton 1×1.** dnd5e rozróżnia je **wyłącznie tym, jak duża jest
postać narysowana w identycznym kadrze** — nie rozmiarem pliku ani `width` żetonu.

Zmierzone na dostarczonym arcie (wszystkie przy `scaleX: 1.0`):

| Token | Rozmiar | Wypełnienie kadru |
|---|---|---|
| `humanoid/Goblin.webp` | **Mały** | **67%** |
| `humanoid/Bandit.webp` | Średni | 88% |
| `humanoid/Orc.webp` | Średni | 99% |

Stąd `<FILL>` do wstawienia w prompt:

| Rozmiar istoty | `<PX>` | `<FILL>` |
|---|---|---|
| Malutki | 200 | 60 |
| **Mały** | **400** | **70** |
| Średni | 400 | 90 |
| Duży | 800 | 90 |
| Wielki | 1200 | 92 |
| Ogromny | 1600 | 92 |

**Bit-Boys jest Mały → 400×400, `<FILL>` = 70.** Narysowany na 85–90% będzie na mapie czytany
jako dorosły człowiek, co kasuje cały sens opisu „child-sized".

*(Wcześniejsza wersja tego pliku mówiła 85% dla wszystkiego — to była wartość dla Średnich.)*

---

## Szablon

```
Create a top-down TTRPG battle-map token.

REFERENCES
- Image A (SUBJECT): the creature. Take its anatomy, proportions, silhouette and
  details from here. This is who the token depicts.
- Image B (STYLE/FORMAT ONLY): a Foundry VTT token. Take ONLY the camera angle,
  framing, shadow treatment and painting style from it.
  Do NOT copy its creature, equipment, weapons, armour or colours.

CAMERA — the single most important constraint
- Near-overhead view, as seen by a player looking down at a battle map.
- The creature is hunched/crouched forward so the top of the head, the shoulders
  and the back read clearly, while the face is still partly visible.
- HEAD TOWARD THE BOTTOM OF THE FRAME. The creature faces DOWN (south).
  This is the resting orientation; the VTT rotates the image from here.
- Limbs splay outward to the sides. No side view, no 3/4 portrait, no horizon.

FRAMING
- Square 1:1, exactly <PX>x<PX> px.
- Fully TRANSPARENT background (alpha). No scene, no ground, no floor texture.
- No border, no circle, no ring, no base, no pedestal, no drop-frame.
- The creature fills about <FILL>% of the frame, centred, with clear margin —
  nothing may touch the corners.

LIGHT AND SHADOW
- Light from the upper-left.
- Soft contact shadow cast to the lower-right, ON THE TRANSPARENT LAYER,
  close to the body. No long cast shadow.

RENDERING
- Painterly, hand-illustrated, crisp dark outline, readable at 70 px.
- Silhouette is everything: it must be identifiable at thumbnail size.

SUBJECT
<opis istoty — patrz niżej>
```

---

## Bit-Boys (`tokens/bit-boys.webp`, 400×400, `<FILL>` = **70**)

Referencje: **A** = `021_-_BIT-BOY/avatar.png`, **B** = `humanoid/Goblin.webp`.

Goblin jest tu podwójnie dobrym style-refem: nie tylko stylem, ale i **skalą** — też jest
istotą Małą i wypełnia dokładnie tyle kadru, ile ma wypełnić Bit-Boy.

Blok SUBJECT:

```
A feral, child-sized post-apocalyptic mutant scavenger — emaciated and wiry,
the build of a starving child, not a muscular monster.

- Enormous curved black claws: four per hand, glossy black, nearly as long as
  its forearms, splayed wide to the sides. These are the creature's signature
  and must dominate the silhouette.
- Bald-ish skull with sparse spiky tufts of hair; large pointed ears swept back.
- Huge round bulging pale eyes, no visible iris.
- Mouth split ear to ear in a wide predatory grin packed with small sharp teeth.
- Bare grey emaciated torso, ribs and sinew visible, taut leathery skin.
- Only clothing: filthy tattered rag shorts.
- Barefoot, long splayed prehensile toes.
- Posture: crouched low and forward like a stalking animal, arms hanging wide
  and low, claws leading — mid-hunt, about to pounce.

Palette: desaturated grey-green sickly skin, black claws, grime and ash. Grim,
feral, unsettling. Post-apocalyptic, not fantasy.

Do NOT give it: any weapon, any armour, boots, a belt, pouches, green
"goblin" skin, a helmet, or a shield.
```

### Uwaga o kolorze

Portret to **czarno-biały rysunek węglem**, a żetony dnd5e są malowane w pełnym kolorze.
Do wyboru:

- **Zdesaturowany kolor** *(sugerowane)* — szaro-zielona skóra, czarne pazury, trochę brudu.
  Trzyma klimat portretu, a jednocześnie czyta się na mapie. Kontrast walorowy (jasne/ciemne)
  robi robotę na 70 px, nie nasycenie.
- **Pełny monochrom** — spójne z portretem, ale na ciemnej mapie zleje się z podłożem
  i będzie nie do odróżnienia od innych szarych żetonów.

---

## Po wygenerowaniu

1. Zapisz jako `tokens/bit-boys.webp` (WEBP RGBA; PNG też zadziała).
2. Sprawdź na podkładce `tokens/_template/template-maly-sredni-400.png` — postać w zielonym
   kole, strzałka na dole = kierunek głowy.
3. `npm run build:bestiary` (Foundry zamknięte).
4. Weryfikacja: w logu builda w sekcji `token art:` id ma się pojawić przy **`własna`**,
   a nie przy `pożyczona` / `placeholder`.

> **Nie trzeba nic kasować.** Plik w `tokens/<id>.webp` ma **najwyższy** priorytet — wygrywa
> zarówno z `aliases.json`, jak i z atrapą w `_placeholder/`. Pipeline może po prostu wrzucać
> pliki i przebudowywać.
>
> (Wcześniejsza wersja tej instrukcji kazała usuwać linijkę z `aliases.json`, bo alias miał
> wtedy pierwszeństwo. Kolejność została odwrócona właśnie po to, żeby dostarczony asset nie
> był po cichu ignorowany.)
