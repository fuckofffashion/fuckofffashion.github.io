// Bandseite: Plakate in Säulen ordnen, Termine aus data/bands.json füllen, Plakate abreißen.
// Die Plakate stehen fertig im HTML (tools/build-bands.py); dieses Modul verschiebt sie nur.
import { gruppiere, isoLokal, kuenftige, monatsSpanne, sichtbare } from "./saeulen.js";
import { sprache, t, tagDatum, TEXTE } from "./texte.js";

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

/* ---------- Riss: Zickzack-Linie mit fester Punktzahl, damit clip-path weich übergeht ---------- */
const N = 14;
const ZACKEN = Array.from({ length: N + 1 }, (_, i) => ((i % 2 ? 2.6 : -2.2) + Math.sin(i * 2.7) * 1.4) * 2.4); // in px
// So viel vom Plakat bleibt oben hängen; feste Höhe, damit der Streifen nicht mit dem Zettel wächst.
// Muss zu --riss in css/bands.css passen.
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

function reissen(plakat) {
  const knopf = plakat.querySelector(".plakat__reiss");
  const zettel = plakat.querySelector(".plakat__zettel");
  const name = plakat.querySelector(".plakat__logo")?.alt || "";
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
  knopf.setAttribute("aria-label", t(auf ? "ankleben" : "abreissen", { name }));
  plakat.classList.toggle("ist-offen", auf);
  zettel.inert = !auf;
}

/* ---------- Zettel und Säulen ---------- */
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

function saeule(name, zeit, id) {
  const s = element("section", `saeule saeule--${id}`);
  s.setAttribute("aria-labelledby", `saeule-${id}`);
  const dach = element("div", "saeule__dach");
  const h = element("h2", "saeule__name", name);
  h.id = `saeule-${id}`;
  dach.append(h);
  if (zeit) dach.append(element("span", "saeule__zeit", zeit));
  const koerper = element("div", "saeule__koerper");
  const plakate = element("div", "plakate");
  koerper.append(plakate);
  s.append(dach, koerper, element("div", "saeule__fuss"));
  return { s, plakate };
}

function baue(daten) {
  const behaelter = document.querySelector(".js-saeulen");
  const plakate = [...behaelter.querySelectorAll(".plakat")];
  const nachId = new Map(plakate.map((p) => [p.dataset.band, p]));
  const heute = isoLokal(new Date());

  plakate.forEach((p) => {
    const knopf = p.querySelector(".plakat__reiss");
    knopf.style.clipPath = oben(false);
    knopf.setAttribute("aria-label", t("abreissen", { name: p.querySelector(".plakat__logo")?.alt || "" }));
    knopf.addEventListener("click", () => reissen(p));
    p.querySelector(".plakat__zettel").inert = true;
    if (daten) {
      const termine = kuenftige(daten.bands?.[p.dataset.band]?.termine, heute);
      fuelleNaechstes(p, termine);
      fuelleZettel(p, termine);
    }
  });

  const gruppen = daten ? gruppiere([...nachId.keys()], daten, heute) : [{ saeule: "alle", ids: [...nachId.keys()] }];
  const neu = document.createDocumentFragment();
  for (const g of gruppen) {
    const zeit = g.saeule === "still" ? TEXTE[sp].stillZeit : monatsSpanne(heute, g.saeule, sp);
    const { s, plakate: ort } = saeule(TEXTE[sp].saeule[g.saeule], zeit, g.saeule);
    g.ids.forEach((id) => ort.append(nachId.get(id)));
    neu.append(s);
  }
  behaelter.replaceChildren(neu);
  behaelter.style.setProperty("--n", String(Math.min(gruppen.length, 4)));
  behaelter.classList.add("ist-gebaut");
}

fetch(DATEN_URL, { cache: "no-cache" })
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
  .then((daten) => baue(daten))
  .catch(() => {
    baue(null);
    const status = document.querySelector(".js-bs-status");
    if (status) status.textContent = t("datenFehlen");
  });
