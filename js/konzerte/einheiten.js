// Umkreisstufen und Anfahrt in "Platten" (Szene-Einheit: eine Platte = 40 Minuten Anfahrt).

// Stufen für den Umkreis-Schalter, km ist die Obergrenze
export const STUFEN = [
  { id: "lauf", km: 5, label: "Laufweite" },
  { id: "rad", km: 25, label: "Fahrradweite" },
  { id: "bahn", km: 100, label: "Bahnweite" },
  { id: "bus", km: 300, label: "Bandbus-Weite" },
];

// Verkehrsmittel nach Entfernung. Grenzen sind inklusive, daher `<=`.
function modus(kmGerundet) {
  if (kmGerundet <= 5) return { wort: "Fußweg", kmh: 5 };
  if (kmGerundet <= 25) return { wort: "Rad", kmh: 15 };
  if (kmGerundet <= 100) return { wort: "Bahn", kmh: 70 };
  return { wort: "Bandbus", kmh: 80 };
}

// Zahl mit Komma als Dezimaltrennzeichen, ganze Zahlen ohne Nachkommastellen
const zahl = (x) => String(x).replace(".", ",");

// Platten als Wort: 0,5 / 1 / 1,5 als Sonderfälle, sonst Zahl und "Platten"
function plattenText(platten) {
  if (platten === 0.5) return "eine halbe Platte";
  if (platten === 1) return "eine Platte";
  if (platten === 1.5) return "anderthalb Platten";
  return `${zahl(platten)} Platten`;
}

// Beispiel: "47 km · eine Platte lang Bahn"
export function anfahrt(km) {
  // Die angezeigte Entfernung bestimmt auch Verkehrsmittel und Zeit, damit alles zusammenpasst
  const kmGerundet = Math.round(km);
  const { wort, kmh } = modus(kmGerundet);

  const minuten = (kmGerundet / kmh) * 60;
  // Platten auf halbe Platten runden, mindestens eine halbe
  const platten = Math.max(0.5, Math.round((minuten / 40) * 2) / 2);

  return `${kmGerundet} km · ${plattenText(platten)} lang ${wort}`;
}
