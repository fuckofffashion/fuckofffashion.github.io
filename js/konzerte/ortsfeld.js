// Feld „PLZ / Ort“ mit Vorschlagsliste (Combobox nach ARIA-Muster).
// Die Ortstabelle lädt erst beim ersten Fokus oder Tippen, danach bleibt dasselbe Objekt im Speicher
// (sucheOrt() hängt seinen Index an genau dieses Objekt). Der getippte Ort wird nirgends gespeichert.
import { sucheOrt } from "./ortssuche.js?v=13";

const VERZOEGERUNG_MS = 150;

const TEXT_NICHT_GEFUNDEN = "Kenn ich nicht. Probier die PLZ oder den nächsten größeren Ort.";
const TEXT_TABELLE_FEHLT = "Ortsliste gerade nicht da. Drück „Wo bin ich?“ oder versuch's später.";

// input: <input role=combobox>, liste: <ul role=listbox>
// melde(text): Hinweis anzeigen ("" löscht), onWahl({lat, lon, name}): Ort gewählt
export function ortsfeld({ input, liste, url, melde, onWahl }) {
  let tabelle = null;
  let laden = null;
  let treffer = [];
  let aktiv = -1;
  let timer = 0;

  function holeTabelle() {
    if (tabelle) return Promise.resolve(tabelle);
    if (!laden) {
      laden = fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((t) => (tabelle = t))
        .catch((e) => {
          laden = null; // beim nächsten Versuch neu laden
          throw e;
        });
    }
    return laden;
  }

  function schliesse() {
    liste.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    aktiv = -1;
  }

  function markiere(i) {
    aktiv = i;
    for (const [j, li] of [...liste.children].entries()) li.setAttribute("aria-selected", String(j === i));
    if (i >= 0) {
      const li = liste.children[i];
      input.setAttribute("aria-activedescendant", li.id);
      li.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function zeige(neue) {
    treffer = neue;
    liste.replaceChildren();
    aktiv = -1;
    input.removeAttribute("aria-activedescendant");
    if (!treffer.length) {
      schliesse();
      return;
    }
    treffer.forEach((o, i) => {
      const li = document.createElement("li");
      li.id = `kz-ort-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      li.className = "kz-vorschlag";
      li.textContent = `${o.plz} ${o.name}`;
      if (o.land !== "DE") {
        const land = document.createElement("span");
        land.className = "kz-vorschlag__land";
        land.textContent = o.land;
        li.append(" ", land);
      }
      // mousedown verhindert, dass das Feld den Fokus verliert, bevor der Klick ankommt
      li.addEventListener("mousedown", (e) => e.preventDefault());
      li.addEventListener("click", () => waehle(i));
      liste.append(li);
    });
    liste.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function waehle(i) {
    const o = treffer[i];
    if (!o) return;
    clearTimeout(timer); // eine noch wartende Suche würde die Liste sonst wieder öffnen
    input.value = `${o.plz} ${o.name}`;
    schliesse();
    melde("");
    onWahl({ lat: o.lat, lon: o.lon, name: o.land === "DE" ? input.value : `${input.value} (${o.land})` });
  }

  // Sucht mit dem aktuellen Feldinhalt; liefert die Treffer (leer bei Fehler)
  async function sucheJetzt() {
    clearTimeout(timer);
    const text = input.value.trim();
    if (!text) {
      zeige([]);
      melde("");
      return [];
    }
    try {
      await holeTabelle();
    } catch {
      zeige([]);
      melde(TEXT_TABELLE_FEHLT);
      return [];
    }
    // Während des Ladens kann weitergetippt worden sein: immer den aktuellen Wert nehmen
    const ergebnis = sucheOrt(tabelle, input.value);
    zeige(ergebnis);
    melde(ergebnis.length || input.value.trim().length < 2 ? "" : TEXT_NICHT_GEFUNDEN);
    return ergebnis;
  }

  input.addEventListener("focus", () => {
    holeTabelle().catch(() => {}); // vorladen; Fehler meldet erst die Suche
  });

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(sucheJetzt, VERZOEGERUNG_MS);
  });

  input.addEventListener("keydown", async (e) => {
    const offen = !liste.hidden && treffer.length > 0;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!offen) {
        if (treffer.length) zeige(treffer);
        else await sucheJetzt();
        if (!treffer.length) return;
      }
      const n = treffer.length;
      const start = aktiv < 0 ? (e.key === "ArrowDown" ? -1 : 0) : aktiv;
      markiere((start + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
    } else if (e.key === "Enter") {
      e.preventDefault(); // Formular nicht absenden
      if (offen && aktiv >= 0) {
        waehle(aktiv);
      } else {
        // Enter ohne Auswahl: frisch suchen und den ersten Treffer nehmen
        const ergebnis = await sucheJetzt();
        if (ergebnis.length) waehle(0);
      }
    } else if (e.key === "Escape") {
      if (offen) {
        e.preventDefault();
        schliesse();
      }
    }
  });

  input.addEventListener("blur", () => schliesse());
}
