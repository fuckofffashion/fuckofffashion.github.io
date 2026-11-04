// Konzertseite: Filterleiste, Liste, Leerstellen. Kein Algorithmus, nur Datum oder Entfernung.
// Datenschutz: Der Standort (Geolocation oder getippter Ort) bleibt im Speicher dieser Seite.
// In localStorage stehen nur Umkreisstufe, Genre und die zwei Schalter.
// Fremde Texte (Bands, Zusatz, Laden, Stadt) kommen ausschließlich per textContent ins DOM.
import { filtern, sortieren } from "./filter.js?v=13";
import { STUFEN } from "./einheiten.js?v=13";
import { SPRUECHE, spruch } from "./leer.js?v=13";
import { ortsfeld } from "./ortsfeld.js?v=13";
import { renderTermin, element, link, heute, plusTage, tagText } from "./termin.js?v=13";

export { renderTermin }; // Schnittstelle für Task 9 und Tests

const DATEN_URL = "data/konzerte.json";
const ORTE_URL = "data/orte-tabelle.json";
const SPEICHER_SCHLUESSEL = "fof-konzerte";
const SEITE = 100; // so viele Termine je „Mehr zeigen“
const ALLGEMEIN = "Punk / Hardcore (allgemein)";
const KNOX_NEU = "https://knox.p-u-n-k.de/db/neu.php";
const KNOX_START = "https://knox.p-u-n-k.de/db/";

const TEXT_KEIN_STANDORT = "Kein Standort. Tipp eine PLZ oder einen Ort ein.";
const TEXT_DATEN_FEHLEN = "Termine gerade nicht da. Versuch's später.";

// Fr/Sa/So: heute bis Sonntag. Sonst: kommender Freitag bis Sonntag.
function wochenende(jetzt = new Date()) {
  const tag = jetzt.getDay(); // 0 = Sonntag
  const start = tag === 5 || tag === 6 || tag === 0 ? plusTage(jetzt, 0) : plusTage(jetzt, 5 - tag);
  const ende = plusTage(start, start.getDay() === 0 ? 0 : 7 - start.getDay());
  return [tagText(start), tagText(ende)];
}

// Einstellungen ------------------------------------------------------------
function ladeEinstellungen() {
  try {
    const roh = localStorage.getItem(SPEICHER_SCHLUESSEL);
    const o = roh ? JSON.parse(roh) : null;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function speichereEinstellungen(z) {
  try {
    const { stufe, genre, nurFrei, ohneKommerz } = z;
    localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify({ stufe, genre, nurFrei, ohneKommerz }));
  } catch {
    // privates Fenster, Speicher voll oder gesperrt: dann eben ohne Gedächtnis
  }
}

// Seite --------------------------------------------------------------------
function start(wurzel) {
  const $ = (s) => wurzel.querySelector(s);
  const el = {
    form: $(".js-filter"),
    wo: $(".js-wo"),
    ort: $(".js-ort"),
    ortListe: $(".js-ort-liste"),
    hinweis: $(".js-hinweis"),
    mitte: $(".js-mitte"),
    mitteName: $(".js-mitte-name"),
    mitteWeg: $(".js-mitte-weg"),
    umkreis: $(".js-umkreis"),
    stufe: $(".js-stufe"),
    umkreisHinweis: $(".js-umkreis-hinweis"),
    schnell: [...wurzel.querySelectorAll(".js-schnell")],
    von: $(".js-von"),
    bis: $(".js-bis"),
    genre: $(".js-genre"),
    frei: $(".js-frei"),
    kommerz: $(".js-kommerz"),
    sort: [...wurzel.querySelectorAll(".js-sort")],
    zahl: $(".js-zahl"),
    leer: $(".js-leer"),
    liste: $(".js-liste"),
    mehr: $(".js-mehr"),
    ohneOrt: $(".js-ohne-ort"),
    stand: $(".js-stand"),
    mehrfilter: $(".js-mehrfilter"),
    mehrfilterAktiv: $(".js-mehrfilter-aktiv"),
  };

  const gespeichert = ladeEinstellungen();
  const z = {
    mitte: null, // {lat, lon, name, um, art: "geo"|"ort"} – nur im Speicher
    stufe: STUFEN.some((s) => s.id === gespeichert.stufe) ? gespeichert.stufe : "bahn",
    genre: typeof gespeichert.genre === "string" ? gespeichert.genre : null, // wird nach dem Laden geprüft
    nurFrei: gespeichert.nurFrei === true,
    ohneKommerz: gespeichert.ohneKommerz === true,
    von: heute(),
    bis: "",
    sortierung: "datum",
  };

  let daten = null;
  let treffer = [];
  let gezeigt = 0;
  let wechsel = 0; // zählt Filterwechsel, wählt den Spruch für die leere Liste

  const stufe = () => STUFEN.find((s) => s.id === z.stufe);

  function melde(text) {
    el.hinweis.textContent = text;
  }

  // Anzeige der Steuerelemente aus dem Zustand
  function zeigeStufe() {
    const s = stufe();
    el.umkreis.value = String(STUFEN.indexOf(s));
    const text = `${s.label} · ${s.km} km`;
    el.stufe.textContent = text;
    el.umkreis.setAttribute("aria-valuetext", text);
  }

  function zeigeSchnellwahl() {
    const h = heute();
    const [ws, we] = wochenende();
    for (const b of el.schnell) {
      const w = b.dataset.wahl;
      const an =
        w === "heute" ? z.von === h && z.bis === h :
        w === "wochenende" ? z.von === ws && z.bis === we :
        !z.von && !z.bis;
      b.setAttribute("aria-pressed", String(an));
    }
  }

  // Kurzfassung der Filter in „Mehr Filter“, sichtbar solange der Block zu ist (Telefon)
  function zeigeMehrfilter() {
    const teile = [];
    const standard = z.von === heute() && !z.bis;
    const schnell = el.schnell.some((b) => b.getAttribute("aria-pressed") === "true");
    if (!standard && !schnell) {
      const kurz = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : "…");
      teile.push(`${kurz(z.von)}–${kurz(z.bis)}`);
    }
    if (z.genre) teile.push(`Genre: ${z.genre}`);
    if (z.nurFrei) teile.push("nur frei");
    if (z.ohneKommerz) teile.push("ohne Kommerz");
    el.mehrfilterAktiv.textContent = teile.join(" · ");
  }

  function zeigeMitte() {
    const da = z.mitte != null;
    el.mitte.hidden = !da;
    el.mitteName.textContent = da ? z.mitte.name : "";
    el.umkreisHinweis.hidden = da;
    const entfernung = el.sort.find((r) => r.value === "entfernung");
    entfernung.disabled = !da;
    if (!da && z.sortierung === "entfernung") {
      z.sortierung = "datum";
      el.sort.find((r) => r.value === "datum").checked = true;
    }
  }

  // Liste ------------------------------------------------------------------
  function zeigeMehr() {
    const bis = Math.min(treffer.length, gezeigt + SEITE);
    const stapel = document.createDocumentFragment();
    for (let i = gezeigt; i < bis; i++) stapel.append(renderTermin(treffer[i]));
    el.liste.append(stapel);
    gezeigt = bis;
    const rest = treffer.length - gezeigt;
    el.mehr.hidden = rest <= 0;
    el.mehr.textContent = `Mehr zeigen (noch ${rest.toLocaleString("de-DE")})`;
  }

  function zeigeLeer() {
    if (treffer.length) {
      el.leer.hidden = true;
      el.leer.replaceChildren();
      return;
    }
    const text = spruch(wechsel);
    el.leer.replaceChildren(element("span", "kz-leer__spruch", text));
    if (text === SPRUECHE[1]) el.leer.append(" ", link(KNOX_NEU, "Termin bei KNOX eintragen"));
    el.leer.hidden = false;
  }

  function zeigeZahl() {
    const n = treffer.length;
    let text = n === 0 ? "Keine Termine" : `${n.toLocaleString("de-DE")} ${n === 1 ? "Termin" : "Termine"}`;
    if (z.mitte) text += ` in ${stufe().label} um ${z.mitte.um}`;
    el.zahl.textContent = text;
  }

  function aktualisiere() {
    zeigeMehrfilter();
    if (!daten) return;
    const radiusKm = stufe().km;
    const gefiltert = filtern(daten.termine, {
      mitte: z.mitte,
      radiusKm,
      von: z.von || null,
      bis: z.bis || null,
      genre: z.genre,
      nurFrei: z.nurFrei,
      ohneKommerz: z.ohneKommerz,
    });
    treffer = sortieren(gefiltert, z.mitte ? z.sortierung : "datum");
    el.liste.replaceChildren();
    gezeigt = 0;
    zeigeMehr();
    zeigeZahl();
    zeigeLeer();
    wechsel += 1;
    document.dispatchEvent(new CustomEvent("konzerte:treffer", { detail: { treffer, mitte: z.mitte, radiusKm } }));
  }

  function setzeMitte(mitte) {
    z.mitte = mitte;
    zeigeMitte();
    aktualisiere();
  }

  // Ereignisse -------------------------------------------------------------
  el.form.addEventListener("submit", (e) => e.preventDefault());

  el.wo.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      melde(TEXT_KEIN_STANDORT);
      return;
    }
    el.wo.setAttribute("aria-busy", "true");
    melde("Moment, wir gucken, wo du steckst …");
    const fertig = () => el.wo.removeAttribute("aria-busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fertig();
        melde("");
        el.ort.value = "";
        setzeMitte({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: "dein Standort",
          um: "deinen Standort",
          art: "geo",
        });
      },
      () => {
        fertig();
        melde(TEXT_KEIN_STANDORT);
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  });

  ortsfeld({
    input: el.ort,
    liste: el.ortListe,
    url: ORTE_URL,
    melde,
    onWahl: ({ lat, lon, name }) => setzeMitte({ lat, lon, name, um: name, art: "ort" }),
  });

  el.mitteWeg.addEventListener("click", () => {
    z.mitte = null;
    el.ort.value = "";
    zeigeMitte();
    aktualisiere();
    el.ort.focus(); // der Knopf verschwindet, der Fokus soll nicht ins Leere fallen
  });

  el.umkreis.addEventListener("input", () => {
    z.stufe = STUFEN[Number(el.umkreis.value)]?.id ?? "bahn";
    zeigeStufe();
    speichereEinstellungen(z);
    aktualisiere();
  });

  for (const b of el.schnell) {
    b.addEventListener("click", () => {
      const w = b.dataset.wahl;
      if (w === "heute") z.von = z.bis = heute();
      else if (w === "wochenende") [z.von, z.bis] = wochenende();
      else z.von = z.bis = "";
      el.von.value = z.von;
      el.bis.value = z.bis;
      zeigeSchnellwahl();
      aktualisiere();
    });
  }

  for (const [feld, schluessel] of [[el.von, "von"], [el.bis, "bis"]]) {
    feld.addEventListener("change", () => {
      z[schluessel] = feld.value;
      zeigeSchnellwahl();
      aktualisiere();
    });
  }

  el.genre.addEventListener("change", () => {
    z.genre = el.genre.value || null; // "" hieße „nichts passt“, deshalb null für alle
    speichereEinstellungen(z);
    aktualisiere();
  });

  el.frei.addEventListener("change", () => {
    z.nurFrei = el.frei.checked;
    speichereEinstellungen(z);
    aktualisiere();
  });

  el.kommerz.addEventListener("change", () => {
    z.ohneKommerz = el.kommerz.checked;
    speichereEinstellungen(z);
    aktualisiere();
  });

  for (const r of el.sort) {
    r.addEventListener("change", () => {
      if (!r.checked) return;
      z.sortierung = r.value;
      aktualisiere();
    });
  }

  el.mehr.addEventListener("click", zeigeMehr);

  // „Mehr Filter“ auf dem Telefon zu, sonst offen (dort ist der Knopf ausgeblendet)
  const schmal = matchMedia("(max-width: 560px)");
  const passeMehrfilterAn = () => {
    el.mehrfilter.open = !schmal.matches;
  };
  passeMehrfilterAn();
  schmal.addEventListener("change", passeMehrfilterAn);

  // Anfangszustand ---------------------------------------------------------
  zeigeStufe();
  el.von.value = z.von;
  el.bis.value = z.bis;
  el.frei.checked = z.nurFrei;
  el.kommerz.checked = z.ohneKommerz;
  zeigeSchnellwahl();
  zeigeMitte();
  zeigeMehrfilter();

  // Daten laden ------------------------------------------------------------
  fetch(DATEN_URL, { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((d) => {
      if (!d || !Array.isArray(d.termine)) throw new Error("Format");
      daten = d;

      // Genres aus den Daten, „allgemein“ ans Ende
      const genres = [...new Set(d.termine.flatMap((t) => (Array.isArray(t.genres) ? t.genres : [])))]
        .filter((g) => typeof g === "string" && g)
        .sort((a, b) => (a === ALLGEMEIN) - (b === ALLGEMEIN) || a.localeCompare(b, "de"));
      for (const g of genres) {
        const o = element("option", null, g);
        o.value = g;
        el.genre.append(o);
      }
      if (!genres.includes(z.genre)) z.genre = null;
      el.genre.value = z.genre ?? "";

      if (Number.isFinite(d.ohne_ort) && d.ohne_ort > 0) {
        el.ohneOrt.replaceChildren(
          `${d.ohne_ort.toLocaleString("de-DE")} Termine ohne Ort, die findest du `,
          link(KNOX_START, "bei KNOX"),
        );
        el.ohneOrt.hidden = false;
      }

      const stand = new Date(d.stand);
      if (!Number.isNaN(stand.getTime())) {
        el.stand.textContent = `Stand: ${stand.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}`;
        el.stand.hidden = false;
      }

      aktualisiere();
    })
    .catch(() => {
      daten = null;
      el.zahl.textContent = TEXT_DATEN_FEHLEN;
      el.liste.replaceChildren();
      el.mehr.hidden = true;
      el.leer.hidden = true;
    });
}

const wurzel = typeof document !== "undefined" ? document.querySelector(".js-konzerte") : null;
if (wurzel) start(wurzel);
