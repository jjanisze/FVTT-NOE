// NOT imported from config/phobias-data.mjs's own HOUR constant: that file imports
// KOBALT_PHOBIAS from here, so importing back would be a circular module dependency
// (and would throw — HOUR wouldn't be initialized yet when this module evaluates).
const HOUR = 3600;

/**
 * Fobie z Koloru Kobaltu — treść domowa tej kampanii, **nie** z podręcznika.
 *
 * Nie dopisujemy ich do `PHOBIAS` (w `config/phobias-data.mjs`), bo tamto jest ścisłą tabelą
 * k8 (str. 111–112) i dziewiąty wpis zepsułby zarówno kość, jak i zgodność z RAW. Osobna mapa
 * + osobna grupa w pickerze (widoczna tylko przy włączonym Kobalcie) załatwia jedno i drugie.
 *
 * Brak pola `roll` jest celowy: tych fobii się nie losuje, przydziela je MG.
 */
export const KOBALT_PHOBIAS = Object.freeze({
  mizoofobia: {
    kobalt: true,
    label: "Mizoofobia",
    // ST 16 zamiast domyślnego 15 — patrz `phobiaSaveDc()` w config/phobias-data.mjs.
    saveDc: 16,
    effect: "Reagujesz lękiem, kiedy dowolne zwierzę — nawet przyjazne — znajdzie się bliżej "
      + "niż 1,5 metra od ciebie. Wykonaj Rzut Obronny na Mądrość o ST 16.",
    breakthrough: "Użycie przemysłowego środka do dezynfekcji obniża ST do 14 i pozwala "
      + "powtórzyć Rzut Obronny w chwili aplikacji. Kosztuje 1 dawkę środka i akcję.",
    breakthroughSeconds: HOUR
  }
});
