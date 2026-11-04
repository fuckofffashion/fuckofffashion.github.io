// Tests für den Routen-Link zu openstreetmap.org (reine Funktion, ohne DOM).
import { test } from "node:test";
import assert from "node:assert/strict";
import { routenLink } from "../../js/konzerte/route.js";

const ZIEL = { lat: 51.7883, lon: 6.1387 };
const START = { lat: 51.2, lon: 6.4 };
const BASIS = "https://www.openstreetmap.org/directions?engine=";

test("mit Start: beide Paare, Rad ist Standard", () => {
  assert.equal(routenLink(ZIEL, START), `${BASIS}fossgis_osrm_bike&route=51.2%2C6.4%3B51.7883%2C6.1387`);
});

test("ohne Start: erstes Paar ist leer", () => {
  assert.equal(routenLink(ZIEL), `${BASIS}fossgis_osrm_bike&route=%3B51.7883%2C6.1387`);
  assert.equal(routenLink(ZIEL, null), `${BASIS}fossgis_osrm_bike&route=%3B51.7883%2C6.1387`);
});

test("drei Modi wählen die passende Engine", () => {
  assert.match(routenLink(ZIEL, START, "rad"), /engine=fossgis_osrm_bike&/);
  assert.match(routenLink(ZIEL, START, "fuss"), /engine=fossgis_osrm_foot&/);
  assert.match(routenLink(ZIEL, START, "auto"), /engine=fossgis_osrm_car&/);
});

test("unbekannter Modus fällt auf Rad zurück", () => {
  assert.match(routenLink(ZIEL, START, "ufo"), /engine=fossgis_osrm_bike&/);
});

test("negative und winzige Koordinaten: Festkomma, keine Exponentialschreibweise", () => {
  const url = routenLink({ lat: -33.8688, lon: 1e-7 }, { lat: 1e-7, lon: -0.5 });
  assert.equal(url, `${BASIS}fossgis_osrm_bike&route=0%2C-0.5%3B-33.8688%2C0`);
  assert.doesNotMatch(url, /\de-\d/);
});
