/* =========================================================
   Motiv-Filter auf der Startseite: Wand (#wand) und Motivwahl (#tragen).
   Die Leisten stehen mit `hidden` im HTML (tools/build-motive.py) und
   werden erst hier eingeblendet: ohne JavaScript bleiben alle Motive sichtbar.
   Beide Leisten sind unabhängig. Nur die Wand-Leiste (data-hash) liest und
   schreibt den teilbaren Link #motive-<gruppe>.
   ========================================================= */
import { gruppenVon, istSichtbar, gruppeAusHash, urlFuer, ansage } from "./motivfilter.js?v=26";

const leisten = [...document.querySelectorAll(".js-motivfilter")];
let refreshGeplant = false;

// Neue Positionen an ScrollTrigger (Einflug der Plakate, gepinnte Sektion) und Lenis melden
function neuVermessen() {
  if (refreshGeplant) return;
  refreshGeplant = true;
  requestAnimationFrame(() => {
    refreshGeplant = false;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    if (window.FOF && FOF.lenis) FOF.lenis.resize();
  });
}

function zurWand() {
  const wand = document.getElementById("wand");
  if (!wand) return;
  const lenis = window.FOF && FOF.lenis;
  lenis ? lenis.scrollTo(wand, { immediate: true, force: true }) : wand.scrollIntoView();
}

for (const leiste of leisten) {
  const ziel = document.getElementById(leiste.getAttribute("aria-controls"));
  if (!ziel) continue;
  const motive = [...ziel.children];
  const knoepfe = [...leiste.querySelectorAll("button[data-gruppe]")];
  const bekannte = knoepfe.map(b => b.dataset.gruppe).filter(Boolean);
  const live = leiste.nextElementSibling && leiste.nextElementSibling.matches(".js-motivfilter-live")
    ? leiste.nextElementSibling : null;
  const mitHash = leiste.hasAttribute("data-hash");

  function setze(gruppe, { ansagen = false } = {}) {
    let anzahl = 0;
    for (const b of knoepfe) b.setAttribute("aria-pressed", String(b.dataset.gruppe === gruppe));
    for (const el of motive) {
      const an = istSichtbar(gruppenVon(el.dataset.gruppen), gruppe);
      if (an) anzahl++;
      if (el.hidden !== !an) {
        el.hidden = !an;
        // Kurz einblenden; bei reduzierter Bewegung schaltet css/base.css Animationen ab
        if (an) { el.classList.remove("is-neu"); void el.offsetWidth; el.classList.add("is-neu"); }
      }
    }
    if (ansagen && live) {
      const knopf = knoepfe.find(b => b.dataset.gruppe === gruppe);
      live.textContent = ansage(anzahl, gruppe && knopf ? knopf.textContent.trim() : "");
    }
    neuVermessen();
  }

  for (const el of motive) el.addEventListener("animationend", () => el.classList.remove("is-neu"));

  // Ausgewähltes Rückenmotiv bleibt gewählt, auch wenn sein Bildchen gerade ausgeblendet ist:
  // es wird nur versteckt, nie abgewählt (kein change-Ereignis, das Shirt bleibt).
  leiste.addEventListener("click", e => {
    const knopf = e.target.closest("button[data-gruppe]");
    if (!knopf) return;
    const gruppe = knopf.dataset.gruppe;
    setze(gruppe, { ansagen: true });
    if (mitHash) history.replaceState(history.state, "", urlFuer(location, gruppe));
  });

  leiste.hidden = false;

  if (mitHash) {
    const ausLink = () => {
      const gruppe = gruppeAusHash(location.hash, bekannte);
      if (gruppe === null) return false;
      setze(gruppe);
      // Unbekannte Gruppe: „Alle“ und den kaputten Hash aus der Adresse nehmen
      if (!gruppe) history.replaceState(history.state, "", urlFuer(location, ""));
      zurWand();
      return true;
    };

    if (ausLink() && document.readyState !== "complete") {
      // Bis alles geladen ist, kann sich oberhalb noch etwas verschieben (Schriften):
      // dann noch einmal an die Wand, außer jemand hat inzwischen selbst gescrollt.
      let selbst = false;
      const merke = () => { selbst = true; };
      ["wheel", "touchstart", "keydown", "pointerdown"].forEach(t => addEventListener(t, merke, { once: true, passive: true }));
      addEventListener("load", () => { if (!selbst) zurWand(); }, { once: true });
    }
    addEventListener("hashchange", ausLink);
  }
}
