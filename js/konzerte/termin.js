// Ein Konzerttermin als Listeneintrag. Fremde Texte nur per textContent, Links nur http/https.
import { anfahrt } from "./einheiten.js?v=16";
import { routenLink } from "./route.js?v=16";

const KNOX_EINTRAG = "https://knox.p-u-n-k.de/db/index.php?id=";

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

// Datum --------------------------------------------------------------------
// Immer lokale Kalendertage als "YYYY-MM-DD". Kein toISOString(): das rechnet in UTC.
const zwei = (n) => String(n).padStart(2, "0");
export const tagText = (d) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
export const heute = () => tagText(new Date());

export function plusTage(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

// Ein Termin ---------------------------------------------------------------
// Unsichtbare Steuerzeichen (z. B. U+202A aus kopierten Bandnamen) stören nur
const sauber = (s) => String(s ?? "").replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim();

export function element(tag, klasse, text) {
  const el = document.createElement(tag);
  if (klasse) el.className = klasse;
  if (text != null) el.textContent = text;
  return el;
}

export function link(href, text) {
  const a = element("a", "kz-link", text);
  a.href = href;
  a.rel = "noopener noreferrer";
  a.target = "_blank";
  return a;
}

// Nur http/https, sonst null. Links kommen ausschließlich aus `links`, nie aus anderen Feldern.
function sichereUrl(roh) {
  try {
    const u = new URL(roh);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

// Kleine, feste Schräglage je Termin, damit nicht alle Stempel gleich hängen
function schraeg(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  const grad = [-9, -6, -4, 3, 5, 8][Math.abs(h) % 6];
  return `${grad}deg`;
}

// Heute, morgen und das laufende Jahr – einmal je Rendervorgang ausrechnen, nicht je Termin
export function kalenderTage(jetzt = new Date()) {
  return { heute: tagText(jetzt), morgen: tagText(plusTage(jetzt, 1)), jahr: jetzt.getFullYear() };
}

// start: {lat, lon} nur bei freigegebener Geolocation, sonst null (Route ohne Startpunkt)
export function renderTermin(t, tage = kalenderTage(), start = null) {
  const li = element("li", "kz-termin");
  li.id = `termin-${t.id}`;
  li.dataset.id = t.id;

  // Wann
  const [j, m, d] = String(t.datum).split("-").map(Number);
  const datum = new Date(j, m - 1, d);
  const { heute: h, morgen, jahr } = tage;
  const wann = element("p", "kz-termin__wann");
  const zeit = element("time");
  zeit.dateTime = t.datum;
  const tagWort = t.datum === h ? "Heute" : t.datum === morgen ? "Morgen" : WOCHENTAGE[datum.getDay()];
  zeit.append(
    element("span", `kz-termin__tag${t.datum === h ? " is-heute" : ""}`, tagWort),
    element("span", "kz-termin__datum", `${zwei(d)}.${zwei(m)}.`),
  );
  if (j !== jahr) zeit.append(element("span", "kz-termin__jahr", String(j)));
  wann.append(zeit);
  if (t.zeit) wann.append(element("span", "kz-termin__zeit", sauber(t.zeit)));

  // Was und wo
  const was = element("div", "kz-termin__was");
  was.append(element("h3", "kz-termin__bands", sauber(t.bands) || "Bands unbekannt"));
  const zusatz = sauber(t.zusatz);
  if (zusatz) was.append(element("p", "kz-termin__zusatz", zusatz));

  const ort = [sauber(t.laden), sauber(t.stadt)].filter(Boolean);
  if (t.land && t.land !== "DE") ort.push(t.land);
  if (ort.length) was.append(element("p", "kz-termin__ort", ort.join(" · ")));

  if (t.km != null) was.append(element("p", "kz-termin__weg", anfahrt(t.km)));

  if (t.frei || t.kommerz) {
    const marken = element("p", "kz-termin__marken");
    if (t.frei) marken.append(element("span", "kz-frei", "Eintritt frei / Spende"));
    if (t.kommerz) {
      const stempel = element("span", "stamp kz-stempel", "Riecht nach Konzern");
      stempel.style.setProperty("--rot", schraeg(t.id));
      marken.append(stempel);
    }
    was.append(marken);
  }

  // Quellen: KNOX-Eintrag aus der Id, dazu Laden-/Website-Links aus `links`
  const links = element("p", "kz-termin__links");
  const knox = t.quelle === "knox" && /^knox-(\d+)$/.exec(String(t.id));
  if (knox) links.append(link(KNOX_EINTRAG + knox[1], "bei KNOX"));
  const gesehen = new Set();
  for (const l of Array.isArray(t.links) ? t.links : []) {
    const u = sichereUrl(l && l.url);
    if (!u || gesehen.has(u.href)) continue;
    gesehen.add(u.href);
    links.append(link(u.href, u.hostname.replace(/^www\./, "")));
  }
  if (t.quelle === "fof") links.append(element("span", "kz-termin__fof", "eingetragen von Fuck Off Fashion"));
  if (links.childNodes.length) was.append(links);

  // Hinkommen: echter Link zu openstreetmap.org, nur mit Koordinaten
  if (Number.isFinite(t.lat) && Number.isFinite(t.lon)) {
    const hin = element("p", "kz-termin__hin");
    const a = element("a", "btn btn--ghost kz-hin", "Hinkommen");
    a.href = routenLink(t, start);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    const name = sauber(t.laden) || sauber(t.stadt) || "diesem Termin";
    a.setAttribute("aria-label", `Hinkommen zu ${name}, öffnet openstreetmap.org`);
    // Standard ist Fahrrad; zu Fuß und Auto sind kleine Alternativen mit demselben Ziel
    const andere = element("span", "kz-hin__andere");
    [["fuss", "zu Fuß", "Hinkommen zu Fuß"], ["auto", "Auto", "Hinkommen mit dem Auto"]].forEach(([modus, text, art], i) => {
      const b = element("a", "kz-link kz-hin__modus", text);
      b.href = routenLink(t, start, modus);
      b.target = "_blank";
      b.rel = "noopener noreferrer";
      b.setAttribute("aria-label", `${art} zu ${name}, öffnet openstreetmap.org`);
      if (i) andere.append(" · ");
      andere.append(b);
    });
    hin.append(a, andere, element("span", "kz-hin__hinweis", "öffnet openstreetmap.org"));
    was.append(hin);
  }

  li.append(wann, was);
  return li;
}
