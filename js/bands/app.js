// Bandseite: Plakate nach nächstem Termin ordnen, Termine aus data/bands.json füllen, dann die 3D-Säule bauen.
// Die Plakate stehen fertig im HTML (tools/build-bands.py). Mit 3D werden sie zur Bandleiste unter der Säule;
// ohne 3D (kein WebGL, Fehler, ?flach) bleiben sie flache, abreißbare Plakate in einem Raster.
import { isoLokal, istBald, kuenftige, naechster, ordne, sichtbare } from "./saeulen.js?v=36";
import { sprache, t, tagDatum } from "./texte.js?v=36";

const WURZEL = document.documentElement.dataset.wurzel || "";
const DATEN_URL = WURZEL + "data/bands.json";
const ruhig = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const sp = sprache();

function element(tag, klasse, inhalt) {
  const el = document.createElement(tag);
  if (klasse) el.className = klasse;
  if (inhalt !== undefined) el.textContent = inhalt;
  return el;
}

/* ---------- Flaches Plakat: Zickzack-Riss per clip-path (Ersatz ohne 3D) ---------- */
const N = 14;
const ZACKEN = Array.from({ length: N + 1 }, (_, i) => ((i % 2 ? 2.6 : -2.2) + Math.sin(i * 2.7) * 1.4) * 2.4); // in px
// So viel vom Plakat bleibt oben hängen; muss zu --riss in css/bands.css passen.
const RISS = "4.4rem";
const kante = (i) => `calc(${RISS} + ${ZACKEN[i].toFixed(1)}px)`;
function oben(offen) {
  const p = ["0% 0%", "100% 0%"];
  for (let i = 0; i <= N; i++) p.push(`${100 - (i * 100) / N}% ${offen ? kante(i) : "100%"}`);
  return `polygon(${p.join(",")})`;
}
function unten() {
  const p = [];
  for (let i = 0; i <= N; i++) p.push(`${(i * 100) / N}% ${kante(N - i)}`);
  p.push("100% 100%", "0% 100%");
  return `polygon(${p.join(",")})`;
}

const nameVon = (plakat) => plakat.querySelector(".plakat__logo")?.alt || "";

function reissen(plakat) {
  const knopf = plakat.querySelector(".plakat__reiss");
  const zettel = plakat.querySelector(".plakat__zettel");
  const auf = knopf.getAttribute("aria-expanded") !== "true";
  if (auf && !ruhig()) {
    // abgerissenes Stück fällt herunter; reine Optik, für Screenreader unsichtbar
    const stueck = knopf.cloneNode(true);
    stueck.removeAttribute("id");
    stueck.className = "plakat__reiss plakat__fetzen";
    stueck.setAttribute("aria-hidden", "true");
    stueck.tabIndex = -1;
    stueck.style.clipPath = unten();
    plakat.append(stueck);
    const fall = stueck.animate(
      [{ transform: "none", opacity: 1 }, { transform: "translate(5%, 60%) rotate(8deg)", opacity: 0 }],
      { duration: 650, easing: "cubic-bezier(.5,0,.8,.4)" });
    fall.onfinish = fall.oncancel = () => stueck.remove();
  }
  knopf.style.transition = auf || ruhig() ? "none" : "";
  knopf.style.clipPath = oben(auf);
  knopf.setAttribute("aria-expanded", String(auf));
  knopf.setAttribute("aria-label", t(auf ? "ankleben" : "abreissen", { name: nameVon(plakat) }));
  plakat.classList.toggle("ist-offen", auf);
  zettel.inert = !auf;
}

/* ---------- Zettel ---------- */
function terminZeile(termin) {
  const li = element("li");
  li.append(element("b", "", tagDatum(termin.datum, sp)), ` ${termin.stadt} · ${termin.laden}`);
  return li;
}

function fuelleZettel(plakat, termine) {
  const ziel = plakat.querySelector(".js-termine");
  ziel.replaceChildren();
  if (!termine.length) {
    ziel.append(element("p", "zettel__still", t("keine")));
    return;
  }
  ziel.append(element("p", "zettel__kopf", t("termine")));
  const liste = element("ul", "zettel__liste");
  sichtbare(termine, false).forEach((x) => liste.append(terminZeile(x)));
  ziel.append(liste);
  if (termine.length > sichtbare(termine, false).length) {
    const mehr = element("button", "zettel__alle", t("alle", { n: termine.length }));
    mehr.type = "button";
    mehr.addEventListener("click", () => {
      const erste = liste.children.length;
      termine.slice(erste).forEach((x) => liste.append(terminZeile(x)));
      mehr.remove();
      // Fokus auf den ersten neuen Termin, sonst fiele er ins Leere
      const ziel = liste.children[erste];
      ziel.tabIndex = -1;
      ziel.focus();
    });
    ziel.append(mehr);
  }
}

function fuelleNaechstes(plakat, termine) {
  const ziel = plakat.querySelector(".js-naechst");
  ziel.replaceChildren();
  const n = termine[0];
  ziel.append(element("span", "plakat__naechst-kopf", n ? t("naechstes") : t("still")));
  if (n) ziel.append(element("span", "plakat__naechst-wann", `${tagDatum(n.datum, sp)} ${n.stadt}`));
}

/* ---------- Raster bauen (Grundlage für beide Arten) ---------- */
const main = document.querySelector("main.bs");
const behaelter = document.querySelector(".js-saeulen");
let szene = null;    // 3D-Säule, wenn sie läuft
let offen = null;    // abgerissenes Plakat im 3D-Modus
const heute = isoLokal(new Date());

function baue(daten) {
  const plakate = [...behaelter.querySelectorAll(".plakat")];
  const nachId = new Map(plakate.map((p) => [p.dataset.band, p]));

  // erst alles rechnen, dann das DOM ändern: wirft etwas, bleibt die Seite unberührt (Aufrufer baut ohne Daten)
  const reihe = ordne([...nachId.keys()], daten, heute).map((id) => nachId.get(id));
  const termineVon = new Map(plakate.map((p) => [p, daten ? kuenftige(daten.bands?.[p.dataset.band]?.termine, heute) : null]));

  plakate.forEach((p) => {
    const knopf = p.querySelector(".plakat__reiss");
    knopf.style.clipPath = oben(false);
    knopf.setAttribute("aria-label", t("abreissen", { name: nameVon(p) }));
    if (!knopf.dataset.bereit) { // nur einmal, auch wenn baue() nach einem Fehler erneut läuft
      knopf.dataset.bereit = "1";
      knopf.addEventListener("click", () => {
        if (!szene) { reissen(p); return; }
        // aus der Bandleiste: Säule ins Bild holen, damit Abreißen und Terminblatt sichtbar sind
        buehne.scrollIntoView({ block: "nearest" });
        umschalten(p);
      });
    }
    p.querySelector(".plakat__zettel").inert = true;
    if (!knopf.querySelector(".plakat__name")) { // Name für die Bandleiste (das Logo ist dort ausgeblendet)
      const n = element("span", "plakat__name", nameVon(p));
      n.setAttribute("aria-hidden", "true");
      knopf.prepend(n);
    }
    const termine = termineVon.get(p);
    if (termine) {
      fuelleNaechstes(p, termine);
      fuelleZettel(p, termine);
    }
    const bald = !!termine && istBald(termine, heute);
    p.classList.toggle("ist-bald", bald);
    p.querySelector(".plakat__bald")?.remove();
    if (bald) {
      const b = element("span", "plakat__bald", t("bald"));
      b.setAttribute("aria-hidden", "true");
      knopf.append(b);
    }
  });

  const raster = element("div", "plakate");
  reihe.forEach((p) => raster.append(p));
  behaelter.replaceChildren(raster);
  behaelter.classList.add("ist-gebaut");
  return { reihe, termineVon, hatDaten: !!daten };
}

/* ---------- 3D-Säule ---------- */
const buehne = document.querySelector(".js-buehne");
const blatt = document.querySelector(".js-terminblatt");

const ankleben = element("button", "btn terminblatt__zu", t("wiederAnkleben"));
ankleben.type = "button";
ankleben.addEventListener("click", () => schliesse());

function legeZurueck(p) {
  const z = blatt.querySelector(".plakat__zettel");
  if (z) { z.inert = true; p.append(z); }
  blatt.replaceChildren();
  blatt.hidden = true;
  const knopf = p.querySelector(".plakat__reiss");
  knopf.setAttribute("aria-expanded", "false");
  knopf.setAttribute("aria-label", t("abreissen", { name: nameVon(p) }));
}

function oeffne(id) {
  const p = behaelter.querySelector(`.plakat[data-band="${CSS.escape(id)}"]`);
  if (!p || !szene) return;
  if (offen && offen !== p) { const alt = offen; legeZurueck(alt); szene.klebe(alt.dataset.band, false); }
  if (offen === p) return;
  offen = p;
  const knopf = p.querySelector(".plakat__reiss");
  knopf.setAttribute("aria-expanded", "true");
  knopf.setAttribute("aria-label", t("ankleben", { name: nameVon(p) }));
  szene.reisse(id, () => {
    if (offen !== p) return;
    const z = p.querySelector(".plakat__zettel");
    z.inert = false;
    blatt.replaceChildren(element("h2", "terminblatt__name", nameVon(p)), z, ankleben);
    blatt.hidden = false;
    blatt.focus({ preventScroll: true });
  });
}

function schliesse() {
  if (!offen || !szene) return;
  const p = offen;
  offen = null;
  legeZurueck(p);
  szene.klebe(p.dataset.band, true);
  p.querySelector(".plakat__reiss").focus({ preventScroll: true });
}

function umschalten(p) {
  if (offen === p) schliesse(); else oeffne(p.dataset.band);
}

document.addEventListener("keydown", (e) => { if (e.key === "Escape" && offen) schliesse(); });

function webglDa() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

function zeitAus(ms) { return new Promise((ok) => setTimeout(ok, ms)); }

async function logo(img) {
  if (!img) return null;
  const bild = new Image();
  bild.src = img.currentSrc || img.src;
  // decode() wartet in versteckten Tabs, bis die Seite sichtbar wird; zum Malen reicht das geladene Bild
  await Promise.race([
    bild.decode().catch(() => {}),
    new Promise((ok) => { bild.onload = bild.onerror = ok; if (bild.complete) ok(); }),
    zeitAus(5000),
  ]);
  return bild.complete && bild.naturalWidth ? bild : null;
}

async function versuche3d({ reihe, termineVon, hatDaten }) {
  if (!buehne || !blatt || new URLSearchParams(location.search).has("flach") || !webglDa()) return;
  try {
    const schriften = ["400 40px Anton", '700 40px "Courier Prime"', '40px "Permanent Marker"'];
    const [THREE, { baueSzene, naechstText }] = await Promise.all([
      import("../../assets/vendor/three.module.min.js"),
      import("./szene.js?v=36"),
      Promise.race([Promise.all(schriften.map((s) => document.fonts.load(s))), zeitAus(3500)]),
    ]);
    const bands = await Promise.all(reihe.map(async (p) => {
      const termine = termineVon.get(p) || [];
      return {
        id: p.dataset.band,
        name: nameVon(p),
        plakat: p.classList.contains("plakat--papier") ? "papier" : p.classList.contains("plakat--blut") ? "blut" : "schwarz",
        bild: await logo(p.querySelector(".plakat__logo")),
        termine,
        hatDaten,
        naechstText: naechstText(naechster(termine, heute), sp, hatDaten, p.querySelector(".plakat__text")?.textContent),
        baldText: hatDaten && istBald(termine, heute) ? t("bald") : null,
      };
    }));
    buehne.hidden = false;
    szene = baueSzene(THREE, { buehne, bands, sp, ruhig: ruhig(), beiAntippen: oeffne });
    // Plakate werden zur Bandleiste: kein Riss-Ausschnitt mehr
    reihe.forEach((p) => { const k = p.querySelector(".plakat__reiss"); k.style.clipPath = ""; k.style.transition = ""; p.classList.remove("ist-offen"); });
    main.classList.add("ist-3d");
  } catch (fehler) {
    console.warn("Bandseite: 3D-Säule nicht möglich, flache Plakate bleiben.", fehler);
    try { szene?.ende(); } catch {}
    szene = null;
    buehne.hidden = true;
    main.classList.remove("ist-3d");
  }
}

fetch(DATEN_URL, { cache: "no-cache" })
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
  .then((daten) => baue(daten))
  .catch(() => {
    const status = document.querySelector(".js-bs-status");
    if (status) status.textContent = t("datenFehlen");
    return baue(null);
  })
  .then((stand) => stand && versuche3d(stand));
