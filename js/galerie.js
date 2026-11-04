/* =========================================================
   FUCK OFF FASHION – Galerie "Das schwarze Brett"
   Antippen dreht ein Foto um (Notiz auf der Rückseite).
   Die Anzeige mitten am Brett kriegt beim Reinscrollen den Stempel.
   ========================================================= */
(function () {
  const brett = document.querySelector(".js-brett");
  if (!brett) return;

  brett.addEventListener("click", e => {
    const z = e.target.closest(".zettel");
    if (!z) return;
    const an = z.classList.toggle("ist-gedreht");
    z.setAttribute("aria-pressed", String(an));
  });

  // Ohne GSAP oder bei reduzierter Bewegung bleibt der Stempel einfach sichtbar
  const s = brett.querySelector(".js-brett-stamp");
  if (!s || !window.FOF || FOF.MOTION.reduced || !window.ScrollTrigger) return;
  gsap.set(s, { opacity: 0 });
  ScrollTrigger.create({ trigger: s.parentElement, start: "top 60%", once: true, onEnter: () => FOF.stamp(s) });
})();
