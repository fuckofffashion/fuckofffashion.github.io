// Pogo-Teilbild: Band, Lied und nächstes Konzert im geteilten Bild und im Begleittext (Variante B „Konzertplakat“).
import { test } from "node:test";
import assert from "node:assert/strict";
import { TEXTE } from "../../js/pogo/texte.js";
import { teilbildBand, zeichneTeilbild } from "../../js/pogo/teilbild.js";

const SONG = { band: "dan-ganove", bandName: "Dan Ganove", titel: "Es geht noch lauter" };
const DATEN = { bands: { "dan-ganove": { termine: [
  { datum: "2026-11-20", zeit: null, laden: "Alt", stadt: "Gestern" },
  { datum: "2026-12-04", zeit: "18:00", laden: "Zentrum Altenberg", stadt: "Oberhausen" },
] } } };

test("teilbildBand: Band, Lied und nächster künftiger Termin, deutsch und englisch", () => {
  assert.deepEqual(teilbildBand(SONG, DATEN, "2026-11-22", "de"), {
    band: "Dan Ganove", lied: "Es geht noch lauter", logo: "assets/img/bands/dan-ganove.webp",
    konzert: { tag: "Fr 04.12.", zeit: "18:00", laden: "Zentrum Altenberg", stadt: "Oberhausen" },
  });
  assert.equal(teilbildBand(SONG, DATEN, "2026-11-22", "en").konzert.tag, "Fri 4 Dec");
});

test("teilbildBand: ohne Termin oder ohne Daten bleibt das Konzert leer, ohne Band gibt es nichts", () => {
  assert.equal(teilbildBand(SONG, DATEN, "2026-12-05", "de").konzert, null);
  assert.equal(teilbildBand(SONG, null, "2026-11-22", "de").konzert, null);
  assert.equal(teilbildBand({ band: null }, DATEN, "2026-11-22", "de"), null);
});

test("Begleittext nennt Lied, Band und Konzert; ohne Konzert und ohne Band wie bisher", () => {
  const band = teilbildBand(SONG, DATEN, "2026-11-22", "de");
  assert.equal(TEXTE.de.teilenText({ erg: 1840, laden: "Zentrum Altenberg", band }),
    "Ich hab 1840 beim Pogo im Zentrum Altenberg geholt, zu „Es geht noch lauter“ von Dan Ganove. Live: Fr 04.12., Oberhausen, Zentrum Altenberg. Schaffst du mehr? #fuckofffashion");
  const en = teilbildBand(SONG, DATEN, "2026-11-22", "en");
  assert.equal(TEXTE.en.teilenText({ erg: 1840, laden: "Zentrum Altenberg", band: en }),
    "I scored 1840 at Pogo in Zentrum Altenberg, to “Es geht noch lauter” by Dan Ganove. Live: Fri 4 Dec, Oberhausen, Zentrum Altenberg. Can you beat it? #fuckofffashion");
  assert.equal(TEXTE.de.teilenText({ erg: 5, laden: "PITCHER", band: { ...band, konzert: null } }),
    "Ich hab 5 beim Pogo im PITCHER geholt, zu „Es geht noch lauter“ von Dan Ganove. Schaffst du mehr? #fuckofffashion");
  assert.equal(TEXTE.de.teilenText({ erg: 5, laden: "PITCHER", band: null }), "Ich hab 5 beim Pogo im PITCHER geholt. Schaffst du mehr? #fuckofffashion");
});

// Leinwand-Attrappe: merkt sich jeden geschriebenen Text
function attrappe() {
  const texte = [];
  const x = new Proxy({ texte }, {
    get: (z, k) => (k in z ? z[k] : k === "fillText" ? (t) => texte.push(String(t)) : () => {}),
    set: () => true,
  });
  return { x, texte };
}
const E = { erg: 1840, laden: "Zentrum Altenberg", titel: "Ordentlich gepogt, Bier gerettet.", rang: "Pit-Sau" };

test("zeichneTeilbild: mit Band ein Konzertplakat mit LIVE, Termin, Ort und Lied", () => {
  const { x, texte } = attrappe();
  zeichneTeilbild(x, { ...E, band: teilbildBand(SONG, DATEN, "2026-11-22", "de") }, { logo: {} }, TEXTE.de);
  for (const t of ["1840", "LIVE!", "Fr 04.12. · 18:00", "Zentrum Altenberg", "OBERHAUSEN", "GEPOGT ZU „ES GEHT NOCH LAUTER“", "fuckofffashion.github.io/pogo.html"])
    assert.ok(texte.includes(t), t);
  assert.ok(!texte.includes("Dan Ganove"), "Logo zeigt den Namen, Schrift nur ohne Logo");
});

test("zeichneTeilbild: ohne Logo steht der Bandname, ohne Termin „Gerade keine Termine.“", () => {
  const { x, texte } = attrappe();
  zeichneTeilbild(x, { ...E, band: { ...teilbildBand(SONG, DATEN, "2026-11-22", "de"), konzert: null } }, { logo: null }, TEXTE.de);
  assert.ok(texte.includes("DAN GANOVE"));
  assert.ok(texte.includes("Gerade keine Termine.") && !texte.includes("LIVE!"));
});

test("zeichneTeilbild: ohne Band das bisherige Bild", () => {
  const { x, texte } = attrappe();
  zeichneTeilbild(x, { ...E, band: null }, {}, TEXTE.de);
  assert.ok(texte.includes("POGO.") && texte.includes("Rang: Pit-Sau") && !texte.includes("LIVE!"));
});
