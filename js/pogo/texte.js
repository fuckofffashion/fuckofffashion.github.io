// Texte von Pogo in zwei Sprachen. Die englische Seite liegt in en/ und setzt <html lang="en">.

export function sprache() {
  return globalThis.document?.documentElement?.lang === "en" ? "en" : "de";
}

export const TEXTE = {
  de: {
    teile: { "INTRO": "INTRO", "STROPHE": "STROPHE", "REFRAIN!": "REFRAIN!", "BREAK": "BREAK", "AUFBAU": "AUFBAU", "LETZTER REFRAIN": "LETZTER REFRAIN" },
    eigenerBeat: "Eigener Beat", eigenerBeatText: "Punk-Beat aus dem Browser", laedt: "Song lädt …", songFehlt: "Song lädt nicht, eigener Beat läuft.",
    naechstesKonzert: "Nächstes Konzert", keinKonzert: "Gerade keine Termine.",
    zonen: { rand: "Rand: keine Punkte", pit: "Pit", mitte: "Mitte: doppelt", reihe: "Erste Reihe: doppelt" },
    platsch: "PLATSCH!", schwapp: "schwapp", rucksack: "RUCKSACK!", stiefel: "STIEFEL IM BIER!",
    freibier: "FREIBIER!", crowdsurfer: "CROWDSURFER!", wall: "WALL OF DEATH!", los: "LOS!",
    randSchubs: "Was stehst du hier rum?", duDa: "DU DA!", abkuehlen: "ABKÜHLEN!",
    plektrum: "PLEKTRUM!", drumstick: "DRUMSTICK!", setliste: "SETLISTE!", oi: "OI!", takt: "IM TAKT!",
    daneben: "daneben", mikro: "MIKRO! Tipp im Takt: OI! OI! OI!", stagediveKnopf: "Stagediven!",
    getragen: "Du wirst getragen! Wisch weg von der Hand!", hand: "HAND!", abgewehrt: "weg da!",
    bierdusche: "BIERDUSCHE!", gelandet: "GELANDET!",
    punkte: "Punkte", bier: "Bier", ergebnis: "Ergebnis", andenken: "Gefangen",
    keineAndenken: "Nichts gefangen. Nach vorn!", tonAn: "Ton an", tonAus: "Ton aus",
    titel: {
      leer: "Becher leer.",
      randSteher: "Rand-Steher mit vollem Becher. Peinlich.",
      legendaer: "Trocken, aber legendär.",
      koenig: "Pit-König.",
      solide: "Ordentlich gepogt, Bier gerettet.",
      nass: "Mehr auf dem Shirt als im Becher.",
    },
    laeden: {
      keller: { name: "Kellerclub", text: "Eng, Pfeiler mitten im Pit, Decke so tief, dass keiner crowdsurft." },
      halle: { name: "AJZ-Halle", text: "Viel Platz, die Leute nehmen Anlauf. Circle Pit und Wall of Death." },
      wiese: { name: "Festivalwiese", text: "Draußen, Regen, Matsch. Im Schlamm kommt keiner vom Fleck." },
    },
  },
  en: {
    teile: { "INTRO": "INTRO", "STROPHE": "VERSE", "REFRAIN!": "CHORUS!", "BREAK": "BREAK", "AUFBAU": "BUILD-UP", "LETZTER REFRAIN": "LAST CHORUS" },
    eigenerBeat: "Own beat", eigenerBeatText: "Punk beat made in your browser", laedt: "Loading song …", songFehlt: "Song didn't load, own beat is playing.",
    naechstesKonzert: "Next gig", keinKonzert: "No gigs right now.",
    zonen: { rand: "Edge: no points", pit: "Pit", mitte: "Centre: double", reihe: "Front row: double" },
    platsch: "SPLASH!", schwapp: "slosh", rucksack: "BACKPACK!", stiefel: "BOOT IN YOUR BEER!",
    freibier: "FREE BEER!", crowdsurfer: "CROWDSURFER!", wall: "WALL OF DEATH!", los: "GO!",
    randSchubs: "Why are you just standing there?", duDa: "YOU THERE!", abkuehlen: "COOL DOWN!",
    plektrum: "PICK!", drumstick: "DRUMSTICK!", setliste: "SETLIST!", oi: "OI!", takt: "ON THE BEAT!",
    daneben: "off beat", mikro: "MIC! Tap on the beat: OI! OI! OI!", stagediveKnopf: "Stage dive!",
    getragen: "You're crowdsurfing! Swipe away from the hand!", hand: "HAND!", abgewehrt: "back off!",
    bierdusche: "BEER SHOWER!", gelandet: "LANDED!",
    punkte: "Points", bier: "Beer", ergebnis: "Score", andenken: "Caught",
    keineAndenken: "Caught nothing. Get to the front!", tonAn: "Sound on", tonAus: "Sound off",
    titel: {
      leer: "Cup's empty.",
      randSteher: "Wallflower with a full cup. Embarrassing.",
      legendaer: "Dry, but legendary.",
      koenig: "King of the pit.",
      solide: "Proper pogo, beer saved.",
      nass: "More on your shirt than in your cup.",
    },
    laeden: {
      keller: { name: "Basement club", text: "Tight, a pillar in the middle of the pit, ceiling too low to crowdsurf." },
      halle: { name: "Squat hall", text: "Lots of room, people take a run-up. Circle pit and wall of death." },
      wiese: { name: "Festival field", text: "Outside, rain, mud. Nobody gets anywhere in the mud." },
    },
  },
};

export function t(schluessel, werte = {}, sp = sprache()) {
  const wert = TEXTE[sp][schluessel];
  return typeof wert === "function" ? wert(werte) : wert;
}
