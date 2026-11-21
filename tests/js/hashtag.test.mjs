// #fuckofffashion: Leute finden sich selbst über den Hashtag (Startseite DE/EN und Pogo-Teilen).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TEXTE } from "../../js/pogo/texte.js";

const wurzel = fileURLToPath(new URL("../../", import.meta.url));
const TAG = "#fuckofffashion";
const abschnitt = (html, id) => { const a = html.indexOf(`<section id="${id}"`); return html.slice(a, html.indexOf("</section>", a)); };

test("Pogo: geteiltes Ergebnis trägt den Hashtag, deutsch und englisch", () => {
  for (const sp of ["de", "en"]) assert.ok(TEXTE[sp].teilenText({ erg: 1234, laden: "Pitcher" }).endsWith(" " + TAG), sp);
});

test("Startseite: Hashtag im Laufband, bei den Motiven und beim Mitmachen (DE und EN)", () => {
  for (const datei of ["index.html", "en/index.html"]) {
    const html = readFileSync(wurzel + datei, "utf8");
    assert.ok(html.match(/<div class="ticker__in">[^\n]*#fuckofffashion/), `${datei}: Laufband`);
    assert.ok(abschnitt(html, "wand").includes(TAG), `${datei}: Motive`);
    const mit = abschnitt(html, "mitmachen");
    assert.ok(mit.includes(`class="join__tag`) && mit.includes(TAG), `${datei}: Mitmachen`);
  }
});
