// Mitmachen: Willkommenssatz und das Dreck-Shirt in der Foto-Karte (DE und EN).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const wurzel = fileURLToPath(new URL("../../", import.meta.url));
const abschnitt = (html, id) => { const a = html.indexOf(`<section id="${id}"`); return html.slice(a, html.indexOf("</section>", a)); };
const karte = (html) => { const m = abschnitt(html, "mitmachen"); const a = m.indexOf("join__way--mail"); return m.slice(a, m.indexOf("</article>", a)); };

const FAELLE = [
  { datei: "index.html", gruss: "Willkommen bei unserem kleinen antikapitalistischen Anarcho-Projekt.", zeile: "Kein Drucker? Dreck tut’s auch.", bild: "assets/img/mitmachen-dreck-shirt.webp" },
  { datei: "en/index.html", gruss: "Welcome to our little anti-capitalist anarcho project.", zeile: "No printer? Dirt works too.", bild: "../assets/img/mitmachen-dreck-shirt.webp" },
];

for (const f of FAELLE) {
  test(`${f.datei}: Willkommenssatz steht vorn im Mitmachen-Text`, () => {
    const m = abschnitt(readFileSync(wurzel + f.datei, "utf8"), "mitmachen");
    const lead = m.slice(m.indexOf('class="lead join__lead"'));
    assert.ok(lead.startsWith(`class="lead join__lead"><b>${f.gruss}</b> `), lead.slice(0, 160));
  });
  test(`${f.datei}: Dreck-Shirt mit Zeile in der Foto-Karte, vor dem Mail-Knopf`, () => {
    const k = karte(readFileSync(wurzel + f.datei, "utf8"));
    const fig = k.indexOf('<figure class="join__foto"'), knopf = k.indexOf('href="mailto:');
    assert.ok(fig > 0 && fig < knopf, "Bild steht vor dem Knopf");
    assert.ok(k.includes(`src="${f.bild}"`) && k.includes(`<figcaption>${f.zeile}</figcaption>`));
    assert.match(k, /<img [^>]*alt="[^"]{20,}"[^>]*width="\d+" height="\d+"/);
  });
}

test("Bilddatei liegt bei", () => assert.ok(existsSync(wurzel + "assets/img/mitmachen-dreck-shirt.webp")));
