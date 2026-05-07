/**
 * MIGRACJA TYPÓW BRONI — Neuroshima 5e
 *
 * Uruchom w konsoli Foundry **jako GM** (F12 → Console):
 *   copy(await game.modules.get("neuroshima-2026-overrides") && null)
 *   — albo po prostu wklej cały ten plik w konsoli i naciśnij Enter.
 *
 * Co robi:
 *   - Mapuje stare typy dnd5e (simpleM / natural / improv) na Neuroshima typy
 *   - Aktualizuje world items i embedded items na aktorach
 *   - Pomija naturalne ataki potworów (Atak, Pięść, Ugryzienie itp.)
 *   - Loguje wynik w konsoli
 */
(async () => {
  const exactMap = {
    // Palna Krótka
    "b 92":"palnaKrotka","b92":"palnaKrotka","b 93r":"palnaKrotka","jedenastka":"palnaKrotka",
    "desert eagle":"palnaKrotka","złoty desert eagle":"palnaKrotka","glock":"palnaKrotka",
    "g17":"palnaKrotka","mark 23":"palnaKrotka","mk iv":"palnaKrotka","ruger lcp":"palnaKrotka",
    "walther ppk":"palnaKrotka","wyciszony pistolet":"palnaKrotka","trzydziestka":"palnaKrotka",
    "38-ka":"palnaKrotka","peacemaker":"palnaKrotka","magnum":"palnaKrotka","rewolwer":"palnaKrotka",
    "colt python":"palnaKrotka","colt ":"palnaKrotka","obrzyn":"palnaKrotka","dwururka":"palnaKrotka",
    "samoróbka":"palnaKrotka","pistolet":"palnaKrotka",
    // Palna Pośrednia
    "hk universal":"palnaPosr","hk ump":"palnaPosr","h&k ump":"palnaPosr","empepiątka":"palnaPosr",
    "tommy gun":"palnaPosr","uzi":"palnaPosr","kałach":"palnaPosr","scar ":"palnaPosr",
    "fn scar":"palnaPosr","xm-8":"palnaPosr",
    // Palna Długa
    "deer hunter":"palnaDluga","r700":"palnaDluga","lewar m95":"palnaDluga","field 03":"palnaDluga",
    "m1 garand":"palnaDluga","h&k g3":"palnaDluga","hk g3":"palnaDluga","kusz":"palnaDluga",
    "winchester":"palnaDluga",
    // Palna Ciężka
    "light fifty":"palnaCiezka","browning":"palnaCiezka","minimi":"palnaCiezka",
    "the pig":"palnaCiezka","minigun":"palnaCiezka","karabin krótka seria":"palnaCiezka",
    "karabin ppanc":"palnaCiezka","zintegrowany karabin":"palnaCiezka",
    // Broń Biała
    "bejsbol":"biala","bejzbol":"biala","berdysz":"biala","buzdygan":"biala","kastet":"biala",
    "katana":"biala","miecz":"biala","szabla":"biala","kilof":"biala","łańcuch":"biala",
    "maczeta":"biala","nadziak":"biala","nóż":"biala","piła":"biala","piłomiecz":"biala",
    "siekierka":"biala","szoker":"biala","paralizator":"biala","topór":"biala","widły":"biala",
    "włócznia":"biala","laska":"biala","łopatka":"biala","rura stalowa":"biala","maczuga":"biala",
    "stalowe maczugi":"biala","pałka":"biala","scyzoryk":"biala","skalpel":"biala",
    "klucz francuski":"biala","pochodnia":"biala","kafar":"biala","bat ":"biala",
    // Broń Miotana
    "oszczep":"miotana","raca drogowa":"miotana","granat":"miotana",
  };

  // Naturalne ataki potworów / placeholder — NIE migruj
  const skipPrefixes = [
    "atak","pięść","ugryzienie","odnóże","macka","zęby","pazury",
    "splunięcie","żądło","ukłucie","ryjossawka","strzał ","bez broni",
    "piąchopiryna","tulipan","atak wielokrotny","krótka seria (kur",
  ];

  const neuroTypes = new Set(["biala","miotana","palnaKrotka","palnaPosr","palnaDluga","palnaCiezka"]);

  const allWeapons = [
    ...game.items.filter(i => i.type === "weapon"),
    ...game.actors.contents.flatMap(a => a.items.filter(i => i.type === "weapon"))
  ].filter(w => !neuroTypes.has(w.system.type?.value));

  let updated = 0, skipped = 0;
  const unknown = [];

  for (const w of allWeapons) {
    const low = w.name.toLowerCase();
    if (skipPrefixes.some(s => low.startsWith(s))) { skipped++; continue; }

    const found = Object.entries(exactMap).find(([k]) => low.includes(k));
    if (!found) { unknown.push(`${w.name} (${w.parent?.name ?? "world"})`); continue; }

    await w.update({ "system.type.value": found[1] });
    updated++;
  }

  console.log(`=== Migracja typów broni ===`);
  console.log(`✅ Zaktualizowano: ${updated}`);
  console.log(`⏭ Pominięto (naturalne ataki): ${skipped}`);
  console.log(`❓ Nierozpoznane (${unknown.length}):`, unknown);
  ui.notifications.info(`Neuroshima: zaktualizowano ${updated} broni. Sprawdź konsolę po szczegóły.`);
})();
