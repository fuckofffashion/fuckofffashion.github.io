// Easter Eggs der Startseite (js/eggs.js) und die Mittelfinger-Texte, deutsch und englisch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { kaufNixTag, EGG_TEXTE } from "../../js/eggs.js";

const wurzel = fileURLToPath(new URL("../../", import.meta.url));
const lies = (d) => readFileSync(wurzel + d, "utf8");
const abschnitt = (html, id) => { const a = html.indexOf(`<section id="${id}"`); return html.slice(a, html.indexOf("</section>", a)); };

test("kaufNixTag: Black Friday ist der Freitag nach dem vierten Novemberdonnerstag, Samstag ist Kauf-nix-Tag", () => {
  assert.equal(kaufNixTag(new Date(2026, 10, 27, 9)), "freitag");
  assert.equal(kaufNixTag(new Date(2026, 10, 28, 23, 59)), "samstag");
  assert.equal(kaufNixTag(new Date(2026, 10, 26, 12)), null); // Thanksgiving selbst
  assert.equal(kaufNixTag(new Date(2026, 10, 29, 0, 1)), null);
  assert.equal(kaufNixTag(new Date(2025, 10, 28)), "freitag"); // 2025: 1. Nov. ist ein Samstag
  assert.equal(kaufNixTag(new Date(2030, 10, 29)), "freitag"); // 2030: 1. Nov. ist ein Freitag
  assert.equal(kaufNixTag(new Date(2026, 11, 27)), null); // Dezember zählt nicht
});

test("Egg-Texte gibt es deutsch und englisch mit denselben Schlüsseln", () => {
  assert.deepEqual(Object.keys(EGG_TEXTE.de).sort(), Object.keys(EGG_TEXTE.en).sort());
  assert.equal(EGG_TEXTE.de.freitag, "Black Friday: −100 % auf alles. Wie jeden Tag.");
  assert.equal(EGG_TEXTE.en.freitag, "Black Friday: 100 % off everything. Like every day.");
  assert.equal(EGG_TEXTE.de.newsNein, "Abgelehnt. Wir schreiben dir nie. Trends auch nicht.");
  assert.equal(EGG_TEXTE.de.keksDanke, "Gute Wahl. Wie immer.");
});

const SEITEN = [
  { datei: "index.html", titel: "<title>Fuck Off Fashion · Mode ist tot. Druck sie selbst. Kauf nix.</title>",
    laufband: ["Neue Kollektion: nie", "Retoure: zwecklos", "Einheitsgröße: du", "Fashion Week? Fuck off."],
    hero: "Antikapitalistisches Modelabel.<br>Ohne Kasse, ohne Chef, ohne Fashion Week.",
    manifest: "<li><p>Die nächste Kollektion kommt nie. <strong>Versprochen.</strong></p></li>", news: "Newsletter: Trends direkt in dein Postfach" },
  { datei: "en/index.html", titel: "<title>Fuck Off Fashion · Fashion is dead. Print it yourself. Buy nothing.</title>",
    laufband: ["New collection: never", "Returns: pointless", "One size: you", "Fashion Week? Fuck off."],
    hero: "Anti-capitalist fashion label.<br>No till, no boss, no Fashion Week.",
    manifest: "<li><p>The next collection is never coming. <strong>Promise.</strong></p></li>", news: "Newsletter: trends straight to your inbox" },
];
for (const s of SEITEN) {
  test(`${s.datei}: Titel, Laufband, Hero-Zeile und Manifest`, () => {
    const html = lies(s.datei);
    assert.ok(html.includes(s.titel), "Titel");
    const band = html.match(/<div class="ticker__in">([^\n]*)<\/div>/)[1];
    for (const t of s.laufband) assert.ok(band.includes(`<span>${t}</span>`), t);
    assert.ok(band.trimEnd().endsWith("</span>") && /Punk (bleibt|stays) punk<\/span>$/i.test(band), "Punk bleibt Punk bleibt am Ende");
    assert.ok(html.includes(s.hero), "Hero");
    const m = abschnitt(html, "manifest"); assert.ok(m.includes(s.manifest), "Manifest");
    assert.ok(m.lastIndexOf("<li>") === m.indexOf(s.manifest), "neue Zeile ist die letzte");
  });
  test(`${s.datei}: Newsletter-Falle im Fuß schickt nichts weg`, () => {
    const html = lies(s.datei), fuss = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
    assert.ok(fuss.includes(s.news));
    const form = fuss.match(/<form[^>]*>/)[0];
    assert.ok(!/action=|method="post"/i.test(form), "kein Ziel, kein POST");
    const feld = fuss.match(/<input[^>]*type="email"[^>]*>/)[0];
    assert.ok(!/\sname=/.test(feld), "Feld ohne name: die Adresse landet nie in einer URL");
    assert.ok(html.includes('<script type="module" src="') && /src="(\.\.\/)?js\/eggs\.js\?v=\d+"/.test(html), "eggs.js eingebunden");
  });
}
