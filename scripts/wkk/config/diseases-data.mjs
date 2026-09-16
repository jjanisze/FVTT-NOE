/**
 * Choroby z Koloru Kobaltu — treść domowa tej kampanii, **nie** z podręcznika.
 *
 * Osobna mapa z tego samego powodu co `KOBALT_PHOBIAS` w `wkk/config/phobias-data.mjs`:
 * `CHRONIC_DISEASES` (w `config/diseases-data.mjs`) jest ścisłą tabelą k8 i dziewiąty wpis
 * zepsułby kość. Brak pola `roll` jest celowy — tych chorób się nie losuje.
 *
 * `Schizofrenia paranoidalna` ma drabinkę stopni **identyczną** z podręcznikową `Paranoja`
 * (str. 110) i to nie przypadek: przy stole jest to ta sama choroba pod inną nazwą. Domowa
 * jest wyłącznie tabelka `kobaltTable` — wcześniej żyła jako wolny tekst w `notes` na karcie
 * Raynalda, przez co nie dało się jej ani wyświetlić, ani rzucić.
 */
export const KOBALT_DISEASES = Object.freeze({
  schizofreniaParanoidalna: {
    kobalt: true,
    label: "Schizofrenia paranoidalna",
    medicine: "Psychotropy",
    flavor: "Nie śpi po nocach, czasami gada do siebie. Młody chłopaczek, chodzi w kamizelce "
      + "z wyszytym krzyżem.",
    stages: [
      "Masz Ułatwienie w Testach Intuicji i Percepcji, ale i Utrudnienie w testach Oszustwa i Perswazji.",
      "Masz Utrudnienie w Testach i Rzutach Obronnych opartych na Inteligencji i Mądrości oraz "
      + "Utrudnienie w testach Wpływania.",
      "Otrzymujesz stan Przerażenie i jedyną akcją, jaką możesz wykonać w walce, jest Unikanie."
    ],
    kobaltTable: {
      title: "Lekarz i farmaceuta",
      trigger: "Biorąc leki (zwykle wieczorem) rzuć 1k20.",
      results: [
        { range: [1, 1],   text: "Podmienili wszystkie tabletki; zniszcz 1k8 tabletek, zanim "
                                 + "spostrzeżesz, że nie wszystkie są otrute." },
        { range: [2, 10],  text: "Osłabili tabletki; żeby lek zadziałał, musisz zażyć podwójną dawkę." },
        { range: [11, 19], text: "Nie podmienili tabletek." },
        { range: [20, 20], text: "Tabletka puściła do ciebie oczko; jesteś pewien, że Schizofrenia "
                                 + "nie pogorszy się, jeżeli dziś nie weźmiesz leków." }
      ]
    }
  }
});

/** Stable id, for RAW files that need to reference this disease without importing all of it. */
export const SCHIZOFRENIA_PARANOIDALNA_ID = "schizofreniaParanoidalna";
