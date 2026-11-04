// Tests für die Logik der Motiv-Filter (Gruppen, Hash, Ansage).
import { test } from "node:test";
import assert from "node:assert/strict";
import { gruppenVon, istSichtbar, gruppeAusHash, hashFuer, urlFuer, ansage } from "../../js/motivfilter.js";

const BEKANNT = ["kritik", "anarchie", "skate"];

test("gruppenVon zerlegt das Attribut, leer oder fehlend ergibt keine Gruppe", () => {
  assert.deepEqual(gruppenVon("anarchie skate"), ["anarchie", "skate"]);
  assert.deepEqual(gruppenVon("  kritik  "), ["kritik"]);
  assert.deepEqual(gruppenVon(""), []);
  assert.deepEqual(gruppenVon(undefined), []);
});

test("istSichtbar: Alle zeigt alles, sonst nur Mitglieder (auch Motive in mehreren Gruppen)", () => {
  assert.equal(istSichtbar([], ""), true);
  assert.equal(istSichtbar(["kritik"], ""), true);
  assert.equal(istSichtbar(["anarchie", "skate"], "skate"), true);
  assert.equal(istSichtbar(["anarchie", "skate"], "anarchie"), true);
  assert.equal(istSichtbar(["kritik"], "skate"), false);
  assert.equal(istSichtbar([], "skate"), false);
});

test("gruppeAusHash: bekannte Gruppe, unbekannte → Alle, fremder Hash → null", () => {
  assert.equal(gruppeAusHash("#motive-skate", BEKANNT), "skate");
  assert.equal(gruppeAusHash("#motive-Kritik", BEKANNT), "kritik");
  assert.equal(gruppeAusHash("#MOTIVE-skate", BEKANNT), "skate");
  assert.equal(gruppeAusHash("#motive-gibtsnicht", BEKANNT), "");
  assert.equal(gruppeAusHash("#motive-", BEKANNT), "");
  assert.equal(gruppeAusHash("#motive-alle", BEKANNT), "");
  assert.equal(gruppeAusHash("#motive-%E0%A4%A", BEKANNT), "");
  assert.equal(gruppeAusHash("#wand", BEKANNT), null);
  assert.equal(gruppeAusHash("", BEKANNT), null);
  assert.equal(gruppeAusHash(undefined, BEKANNT), null);
});

test("hashFuer: Gruppe → #motive-id, Alle → kein Hash", () => {
  assert.equal(hashFuer("skate"), "#motive-skate");
  assert.equal(hashFuer(""), "");
});

test("urlFuer setzt den Motiv-Hash und lässt Pfad und Suche stehen", () => {
  const ort = { pathname: "/", search: "?a=1", hash: "" };
  assert.equal(urlFuer(ort, "kritik"), "/?a=1#motive-kritik");
  assert.equal(urlFuer({ ...ort, hash: "#wand" }, "skate"), "/?a=1#motive-skate");
  assert.equal(urlFuer({ ...ort, hash: "#motive-skate" }, "anarchie"), "/?a=1#motive-anarchie");
});

test("urlFuer bei Alle: Motiv-Hash fällt weg, fremder Hash bleibt", () => {
  assert.equal(urlFuer({ pathname: "/index.html", search: "", hash: "#motive-skate" }, ""), "/index.html");
  assert.equal(urlFuer({ pathname: "/", search: "", hash: "#wand" }, ""), "/#wand");
  assert.equal(urlFuer({ pathname: "/", search: "", hash: "" }, ""), "/");
});

test("ansage nennt Anzahl und Gruppe, Einzahl bei einem Motiv", () => {
  assert.equal(ansage(9, ""), "Alle 9 Motive");
  assert.equal(ansage(2, "Skate"), "Skate: 2 Motive");
  assert.equal(ansage(1, "Skate"), "Skate: 1 Motiv");
});
