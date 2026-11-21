// Texte von Pogo in zwei Sprachen. Die englische Seite liegt in en/ und setzt <html lang="en">.

export function sprache() {
  return globalThis.document?.documentElement?.lang === "en" ? "en" : "de";
}

export const TEXTE = {
  de: {
    teile: { "INTRO": "INTRO", "STROPHE": "STROPHE", "REFRAIN!": "REFRAIN!", "BREAK": "BREAK", "AUFBAU": "AUFBAU", "LETZTER REFRAIN": "LETZTER REFRAIN" },
    eigenerBeat: "Eigener Beat", eigenerBeatText: "Punk-Beat aus dem Browser", laedt: "Song lädt …", songFehlt: "Song lädt nicht, eigener Beat läuft.",
    naechstesKonzert: "Nächstes Konzert", keinKonzert: "Gerade keine Termine.",
    kutte: "Deine Lederjacke", aufgabenTitel: "Aufgaben", aufgabeErledigt: "erledigt",
    abgeguckt: "ABGEGUCKT!", schubs: "SCHUBS!", schnoeselRaus: "FUCK OFF FASHION!", blitz: "BLITZ!",
    fascho: "NAZIS RAUS!", faschoGeholfen: "RAUS MIT IHM!", zugabe: "ZUGABE!", zugabeRuf: "ZUGABE! Tipp im Takt!", zugaGa: "ZU-GA-BE!",
    keineZugabe: "Keine Zugabe. Nächstes Mal lauter!", saenger: "Trag den Sänger: bleib unter ihm!", saengerFaellt: "ER FÄLLT!",
    rang: "Rang", raenge: { randSteher: "Rand-Steher", pogoLehrling: "Pogo-Lehrling", pitSau: "Pit-Sau", pitLegende: "Pit-Legende" },
    gesperrt: ({ n, laden }) => `Gesperrt: noch ${n} Punkte im ${laden}`, neuFrei: ({ laden }) => `Neu frei: ${laden}!`,
    motivAbgeguckt: ({ nr, titel }) => `Abgeguckt: Motiv ${nr} · ${titel}`, zurVorlage: "Zur Druckvorlage",
    aufgaben: { reiheLetzterRefrain: "Letzter Refrain in der ersten Reihe", plektrum: "Fang das Plektrum", mitte10: "10 Sekunden in der Mitte", stagediveVoll: "Stagedive, Landung mit halbem Bier", takt8: "8-mal im Takt springen", surferUeberlebt: "Kein Stiefel im Bier" },
    zonen: { rand: "Rand: keine Punkte", pit: "Pit", mitte: "Mitte: doppelt", reihe: "Erste Reihe: doppelt" },
    platsch: "PLATSCH!", schwapp: "schwapp", rucksack: "RUCKSACK!", stiefel: "STIEFEL IM BIER!",
    freibier: "FREIBIER!", crowdsurfer: "CROWDSURFER!", wall: "WALL OF DEATH!", los: "LOS!",
    randSchubs: "Was stehst du hier rum?", duDa: "DU DA!", abkuehlen: "ABKÜHLEN!",
    plektrum: "PLEKTRUM!", drumstick: "DRUMSTICK!", setliste: "SETLISTE!", oi: "OI!", takt: "IM TAKT!",
    daneben: "daneben", mikro: "MIKRO! Tipp im Takt: OI! OI! OI!", stagediveKnopf: "Stagediven!",
    getragen: "Du wirst getragen! Schlag die Hände weg: tipp auf ihre Seite.", hand: "HAND!", abgewehrt: "weg da!",
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
      pitcher: { name: "PITCHER, Düsseldorf", text: "Eng und dunkel, Deckenventilatoren, Bilderwand. Decke zu tief zum Crowdsurfen." },
      druckluftInnen: { name: "Druckluft drinnen", text: "Kleiner Clubraum in Oberhausen, Graffiti überall, Punks dicht an dicht." },
      druckluftDraussen: { name: "Druckluft draußen", text: "Open Air im Hof, Graffiti-Wände, Bierbänke. Crowdsurfer unterm Abendhimmel." },
      altenberg: { name: "Zentrum Altenberg", text: "Große Halle der alten Zinkfabrik, Traversen über der Bühne. Circle Pit und Wall of Death." },
    },
  },
  en: {
    teile: { "INTRO": "INTRO", "STROPHE": "VERSE", "REFRAIN!": "CHORUS!", "BREAK": "BREAK", "AUFBAU": "BUILD-UP", "LETZTER REFRAIN": "LAST CHORUS" },
    eigenerBeat: "Own beat", eigenerBeatText: "Punk beat made in your browser", laedt: "Loading song …", songFehlt: "Song didn't load, own beat is playing.",
    naechstesKonzert: "Next gig", keinKonzert: "No gigs right now.",
    kutte: "Your leather jacket", aufgabenTitel: "Tasks", aufgabeErledigt: "done",
    abgeguckt: "COPIED!", schubs: "SHOVE!", schnoeselRaus: "FUCK OFF FASHION!", blitz: "FLASH!",
    fascho: "NAZIS OUT!", faschoGeholfen: "OUT HE GOES!", zugabe: "ENCORE!", zugabeRuf: "ENCORE! Tap on the beat!", zugaGa: "EN-CORE!",
    keineZugabe: "No encore. Louder next time!", saenger: "Carry the singer: stay under him!", saengerFaellt: "HE'S FALLING!",
    rang: "Rank", raenge: { randSteher: "Wallflower", pogoLehrling: "Pogo apprentice", pitSau: "Pit pig", pitLegende: "Pit legend" },
    gesperrt: ({ n, laden }) => `Locked: ${n} more points at ${laden}`, neuFrei: ({ laden }) => `Unlocked: ${laden}!`,
    motivAbgeguckt: ({ nr, titel }) => `Copied: design ${nr} · ${titel}`, zurVorlage: "To the print template",
    aufgaben: { reiheLetzterRefrain: "Last chorus in the front row", plektrum: "Catch the pick", mitte10: "10 seconds in the centre", stagediveVoll: "Stage dive, land with half a beer", takt8: "Jump on the beat 8 times", surferUeberlebt: "No boot in your beer" },
    zonen: { rand: "Edge: no points", pit: "Pit", mitte: "Centre: double", reihe: "Front row: double" },
    platsch: "SPLASH!", schwapp: "slosh", rucksack: "BACKPACK!", stiefel: "BOOT IN YOUR BEER!",
    freibier: "FREE BEER!", crowdsurfer: "CROWDSURFER!", wall: "WALL OF DEATH!", los: "GO!",
    randSchubs: "Why are you just standing there?", duDa: "YOU THERE!", abkuehlen: "COOL DOWN!",
    plektrum: "PICK!", drumstick: "DRUMSTICK!", setliste: "SETLIST!", oi: "OI!", takt: "ON THE BEAT!",
    daneben: "off beat", mikro: "MIC! Tap on the beat: OI! OI! OI!", stagediveKnopf: "Stage dive!",
    getragen: "You're crowdsurfing! Slap the hands away: tap their side.", hand: "HAND!", abgewehrt: "back off!",
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
      pitcher: { name: "PITCHER, Düsseldorf", text: "Tight and dark, ceiling fans, a wall of pictures. Ceiling too low to crowdsurf." },
      druckluftInnen: { name: "Druckluft inside", text: "Small club room in Oberhausen, graffiti everywhere, punks packed tight." },
      druckluftDraussen: { name: "Druckluft outside", text: "Open air in the yard, graffiti walls, beer benches. Crowdsurfers under the evening sky." },
      altenberg: { name: "Zentrum Altenberg", text: "Big hall of the old zinc factory, trusses over the stage. Circle pit and wall of death." },
    },
  },
};

export function t(schluessel, werte = {}, sp = sprache()) {
  const wert = TEXTE[sp][schluessel];
  return typeof wert === "function" ? wert(werte) : wert;
}
