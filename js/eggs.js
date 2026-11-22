/* =========================================================
   FUCK OFF FASHION – Easter Eggs der Startseite
   1. Black Friday / Kauf-nix-Tag: Band unten „−100 % auf alles. Wie jeden Tag.“
   2. Newsletter-Falle im Fuß: lehnt ab, schickt nichts weg (das Feld hat keinen name).
   3. Ehrlicher Cookie-Banner: einmal je Seitenaufruf, wenn man unten ankommt.
   Speichert nichts im Browser und schickt nichts weg.
   ========================================================= */

export const EGG_TEXTE = {
  de: {
    freitag: "Black Friday: −100 % auf alles. Wie jeden Tag.",
    samstag: "Kauf-nix-Tag: Machen wir das ganze Jahr.",
    zuDen: "Zu den Motiven",
    zu: "Schließen",
    newsNein: "Abgelehnt. Wir schreiben dir nie. Trends auch nicht.",
    keks: "Diese Seite verwendet keine Cookies. Wir wollten nur mal so tun wie alle anderen.",
    keksNein: "Ablehnen",
    keksAuchNein: "Auch ablehnen",
    keksDanke: "Gute Wahl. Wie immer.",
    keksName: "Cookie-Hinweis",
  },
  en: {
    freitag: "Black Friday: 100 % off everything. Like every day.",
    samstag: "Buy Nothing Day: We do it all year.",
    zuDen: "To the designs",
    zu: "Close",
    newsNein: "Rejected. We'll never write to you. Neither will trends.",
    keks: "This site uses no cookies. We just wanted to act like everyone else for once.",
    keksNein: "Reject",
    keksAuchNein: "Also reject",
    keksDanke: "Good call. As always.",
    keksName: "Cookie notice",
  },
};

/** "freitag" am Black Friday, "samstag" am Kauf-nix-Tag danach, sonst null (Ortszeit). */
export function kaufNixTag(datum) {
  if (datum.getMonth() !== 10) return null;
  const erster = new Date(datum.getFullYear(), 10, 1).getDay(); // 0 = Sonntag
  const donnerstag = 1 + ((4 - erster + 7) % 7) + 21; // vierter Donnerstag im November
  const tag = datum.getDate();
  return tag === donnerstag + 1 ? "freitag" : tag === donnerstag + 2 ? "samstag" : null;
}

function el(tag, klasse, text) { const e = document.createElement(tag); if (klasse) e.className = klasse; if (text) e.textContent = text; return e; }

function bandZeigen(T, welcher) {
  const band = el("aside", "egg-band");
  band.setAttribute("aria-label", "Black Friday");
  const link = el("a", "egg-band__text", T[welcher]);
  link.href = "#wand"; link.append(el("span", "egg-band__pfeil", ` ${T.zuDen} ↓`));
  const zu = el("button", "egg-band__zu", "×"); zu.type = "button"; zu.setAttribute("aria-label", T.zu);
  zu.addEventListener("click", () => { band.remove(); document.documentElement.style.removeProperty("--egg-band-h"); });
  band.append(link, zu); document.body.append(band);
  document.documentElement.style.setProperty("--egg-band-h", band.offsetHeight + "px");
}

function newsletterFalle(T) {
  const form = document.querySelector(".js-news"); if (!form) return;
  const feld = form.querySelector("input"), antwort = form.querySelector(".js-news-antwort");
  form.addEventListener("submit", (e) => { e.preventDefault(); feld.value = ""; antwort.textContent = T.newsNein; });
}

function keksBanner(T) {
  const fuss = document.querySelector("footer"); if (!fuss || !("IntersectionObserver" in window)) return;
  const beob = new IntersectionObserver((eintraege) => {
    if (!eintraege.some((x) => x.isIntersecting)) return;
    beob.disconnect();
    const box = el("aside", "egg-keks"); box.setAttribute("aria-label", T.keksName);
    const knoepfe = el("div", "egg-keks__knoepfe");
    for (const t of [T.keksNein, T.keksAuchNein]) {
      const k = el("button", "egg-keks__knopf", t); k.type = "button";
      k.addEventListener("click", () => {
        box.replaceChildren(el("p", "egg-keks__danke", T.keksDanke)); box.setAttribute("role", "status");
        setTimeout(() => { box.classList.add("is-weg"); setTimeout(() => { box.remove(); document.documentElement.style.removeProperty("--egg-keks-h"); }, 400); }, 2200);
      });
      knoepfe.append(k);
    }
    box.append(el("p", "egg-keks__text", T.keks), knoepfe); document.body.append(box);
    // die Seite bekommt unten Platz, damit der Banner nichts verdeckt (Impressum, Datenschutz)
    document.documentElement.style.setProperty("--egg-keks-h", box.offsetHeight + 16 + "px");
  }, { threshold: 0.6 });
  beob.observe(fuss);
}

/** Der Zähler rollt einmal hoch, wenn er ins Bild kommt, und bleibt bei 000001 stehen. */
function zaehlerRollen() {
  const ziffern = [...document.querySelectorAll(".js-ziffern .foot__ziffer")];
  if (!ziffern.length || !("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ziel = ziffern.map((z) => z.textContent);
  const beob = new IntersectionObserver((e) => {
    if (!e.some((x) => x.isIntersecting)) return;
    beob.disconnect(); let n = 0;
    const t = setInterval(() => {
      ziffern.forEach((z, i) => { z.textContent = n > 8 + i * 4 ? ziel[i] : String(Math.floor(Math.random() * 10)); });
      if (++n > 34) { clearInterval(t); ziffern.forEach((z, i) => (z.textContent = ziel[i])); }
    }, 45);
  }, { threshold: 0.8 });
  beob.observe(ziffern[0].parentElement);
}

if (typeof document !== "undefined") {
  zaehlerRollen();
  const T = EGG_TEXTE[document.documentElement.lang === "en" ? "en" : "de"];
  const welcher = kaufNixTag(new Date());
  if (welcher) bandZeigen(T, welcher);
  newsletterFalle(T);
  keksBanner(T);
}
