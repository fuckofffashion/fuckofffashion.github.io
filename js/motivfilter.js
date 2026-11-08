/* =========================================================
   Motiv-Filter: reine Logik (ohne DOM), getestet in tests/js/motivfilter.test.mjs.
   Gruppe "" heißt „Alle“. Teilbarer Link je Gruppe: #motive-<id>.
   ========================================================= */

export const HASH_PRAEFIX = "#motive-";

/** "anarchie skate" → ["anarchie", "skate"]; fehlend/leer → []. */
export function gruppenVon(attr) {
  return (attr || "").split(/\s+/).filter(Boolean);
}

/** Bleibt ein Motiv mit diesen Gruppen bei diesem Filter sichtbar? */
export function istSichtbar(gruppen, gruppe) {
  return !gruppe || gruppen.includes(gruppe);
}

/**
 * Gruppe aus dem Hash lesen.
 * null  → kein Motiv-Hash (z. B. #wand), Filter nicht anfassen
 * ""    → Motiv-Hash, aber unbekannte Gruppe (oder #motive-alle): „Alle“
 * "id"  → bekannte Gruppe
 */
export function gruppeAusHash(hash, bekannte) {
  if (typeof hash !== "string" || hash.slice(0, HASH_PRAEFIX.length).toLowerCase() !== HASH_PRAEFIX) return null;
  let id = hash.slice(HASH_PRAEFIX.length);
  try { id = decodeURIComponent(id); } catch (e) { return ""; }
  id = id.trim().toLowerCase();
  return bekannte.includes(id) ? id : "";
}

/** Hash für eine Gruppe; „Alle“ hat keinen eigenen Hash. */
export function hashFuer(gruppe) {
  return gruppe ? HASH_PRAEFIX + gruppe : "";
}

/**
 * Adresse für history.replaceState nach einem Filterwechsel.
 * Gruppe → #motive-<id>. „Alle“ → ein vorhandener Motiv-Hash fällt weg, ein anderer Hash (#wand) bleibt.
 */
export function urlFuer({ pathname, search, hash }, gruppe) {
  const basis = pathname + (search || "");
  if (gruppe) return basis + hashFuer(gruppe);
  return gruppeAusHash(hash, []) === null ? basis + (hash || "") : basis;
}

/** Sprache der Seite: "en" auf den englischen Seiten (en/), sonst "de". Ohne DOM (Node-Tests) "de". */
const sprache = () => (globalThis.document?.documentElement?.lang === "en" ? "en" : "de");

/** Text für die Bildschirmleser-Ansage nach einem Filterwechsel. */
export function ansage(anzahl, name, sp = sprache()) {
  if (sp === "en") {
    const designs = anzahl === 1 ? "design" : "designs";
    return name ? `${name}: ${anzahl} ${designs}` : `All ${anzahl} ${designs}`;
  }
  const motive = anzahl === 1 ? "Motiv" : "Motive";
  return name ? `${name}: ${anzahl} ${motive}` : `Alle ${anzahl} ${motive}`;
}
