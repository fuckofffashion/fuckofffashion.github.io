/* =========================================================
   FUCK OFF FASHION – Handy-Menü
   Unter 560 px klappt die Navigation hinter einen Knopf „Menü“.
   Ohne JavaScript bleibt die Navigation, wie sie ist (eine Zeile).
   ========================================================= */
(function () {
  // Sprachumschalter: in der anderen Sprache an derselben Stelle landen (Abschnitt, Filter)
  document.querySelectorAll(".js-sprache").forEach(link => {
    const ziel = link.getAttribute("href").split(/[?#]/)[0];
    link.addEventListener("click", () => { link.setAttribute("href", ziel + location.search + location.hash); });
  });
})();

(function () {
  const EN = document.documentElement.lang === "en";
  const knopf = document.querySelector(".js-menu");
  const nav = knopf && document.getElementById(knopf.getAttribute("aria-controls"));
  if (!nav) return;
  const head = knopf.closest(".head");
  head.classList.add("has-menu");
  knopf.hidden = false;

  const offen = () => head.classList.contains("is-menu-open");
  const setze = auf => {
    head.classList.toggle("is-menu-open", auf);
    knopf.setAttribute("aria-expanded", String(auf));
    knopf.querySelector(".head__menu-text").textContent = auf ? (EN ? "Close" : "Zu") : (EN ? "Menu" : "Menü");
  };

  knopf.addEventListener("click", () => setze(!offen()));
  nav.addEventListener("click", e => { if (e.target.closest("a")) setze(false); });
  document.addEventListener("click", e => { if (offen() && !head.contains(e.target)) setze(false); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && offen()) { setze(false); knopf.focus(); }
  });
  matchMedia("(max-width: 560px)").addEventListener("change", () => setze(false));
})();
