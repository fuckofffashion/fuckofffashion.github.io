// Umkreisstufen und Anfahrt in "Platten" (Szene-Einheit: eine Platte = 40 Minuten Anfahrt).
import { sprache } from "./texte.js?v=26";

// Stufen für den Umkreis-Schalter, km ist die Obergrenze
export const STUFEN = [
  { id: "lauf", km: 5, label: "Laufweite" },
  { id: "rad", km: 25, label: "Fahrradweite" },
  { id: "bahn", km: 100, label: "Bahnweite" },
  { id: "bus", km: 300, label: "Bandbus-Weite" },
];

// Englische Namen der Stufen (die deutschen stehen in STUFEN)
export const STUFEN_EN = { lauf: "Walking distance", rad: "Cycling distance", bahn: "Train distance", bus: "Tour-van distance" };

// Name einer Stufe in der Sprache der Seite
export function stufenName(stufe, sp = sprache()) {
  return sp === "en" ? STUFEN_EN[stufe.id] ?? stufe.label : stufe.label;
}

// Verkehrsmittel nach Entfernung. Grenzen sind inklusive, daher `<=`.
function modus(kmGerundet) {
  if (kmGerundet <= 5) return { wort: "Fußweg", en: "on foot", kmh: 5 };
  if (kmGerundet <= 25) return { wort: "Rad", en: "by bike", kmh: 15 };
  if (kmGerundet <= 100) return { wort: "Bahn", en: "by train", kmh: 70 };
  return { wort: "Bandbus", en: "by tour van", kmh: 80 };
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

// Englisch: eine Platte ist eine LP, Punkt als Dezimaltrennzeichen
function plattenTextEn(platten) {
  if (platten === 0.5) return "half an LP";
  if (platten === 1) return "one LP";
  if (platten === 1.5) return "one and a half LPs";
  return `${platten} LPs`;
}

// Beispiel: "47 km · eine Platte lang Bahn", englisch "47 km · one LP by train"
export function anfahrt(km, sp = sprache()) {
  // Die angezeigte Entfernung bestimmt auch Verkehrsmittel und Zeit, damit alles zusammenpasst
  const kmGerundet = Math.round(km);
  const { wort, en, kmh } = modus(kmGerundet);

  const minuten = (kmGerundet / kmh) * 60;
  // Platten auf halbe Platten runden, mindestens eine halbe
  const platten = Math.max(0.5, Math.round((minuten / 40) * 2) / 2);

  if (sp === "en") return `${kmGerundet} km · ${plattenTextEn(platten)} ${en}`;
  return `${kmGerundet} km · ${plattenText(platten)} lang ${wort}`;
}
