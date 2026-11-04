/* =========================================================
   Intro: FUCK / OFF / FASHION werden gestempelt, das Anarchie-A
   wird gesprüht, dann reißt der Bogen nach oben weg.
   Einmal pro Session, überspringbar, bei Reduced Motion aus.
   ========================================================= */
(function () {
  const { MOTION } = FOF;
  const root = document.documentElement;
  const intro = document.getElementById("intro");
  let resolveDone;
  FOF.introDone = new Promise(r => (resolveDone = r));

  function remember() { try { sessionStorage.setItem("fof-intro", "1"); } catch (e) {} }

  if (!intro || root.classList.contains("no-intro")) {
    intro && intro.remove();
    resolveDone(false);
    return;
  }

  const words = intro.querySelectorAll(".intro__word");
  // Das A (aus Motiv 007) ist eine Fläche: es wird nicht gezogen, sondern durch Sprühstöße in der
  // Maske aufgedeckt. Ohne JS bleibt der Deckel voll – dann steht das A sofort da.
  const puffs = intro.querySelectorAll(".intro__a mask circle");
  const lid = intro.querySelector(".intro__deckel");
  gsap.set(puffs, { attr: { r: 0 } });
  if (lid) gsap.set(lid, { opacity: 0 });

  let finished = false;
  const tl = gsap.timeline({ onComplete: exit });
  words.forEach((w, i) => {
    tl.fromTo(w, { opacity: 0, scale: 2.4, rotate: i % 2 ? 4 : -4 },
                 { opacity: 1, scale: 1, rotate: i % 2 ? -2 : 1.5, duration: .22, ease: MOTION.ease.stamp }, i * .34)
      .to(intro, { x: 5, y: 3, duration: .035, yoyo: true, repeat: 1, ease: "none" }, i * .34 + .22);
  });
  // Stöße in Malreihenfolge, je ein kurzer Zisch; der Deckel schließt die letzten Lücken
  tl.to(puffs, { attr: { r: 150 }, duration: .26, ease: "power3.out", stagger: .034 }, "+=.05")
    .to(lid, { opacity: 1, duration: .14, ease: "power1.in" }, "-=.1")
    .to({}, { duration: .2 });

  function exit() {
    if (finished) return;
    finished = true;
    tl.kill();
    remember();
    detach();
    resolveDone(true);
    gsap.to(intro, { yPercent: -112, duration: .7, ease: MOTION.ease.punch, onComplete: () => intro.remove() });
  }

  const skip = () => exit();
  const onKey = e => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip(); };
  intro.addEventListener("click", skip);
  window.addEventListener("wheel", skip, { passive: true });
  window.addEventListener("touchmove", skip, { passive: true });
  window.addEventListener("keydown", onKey);
  function detach() {
    window.removeEventListener("wheel", skip);
    window.removeEventListener("touchmove", skip);
    window.removeEventListener("keydown", onKey);
  }

  // Sicherheitsnetz: das Overlay verschwindet immer.
  setTimeout(exit, 4500);
})();
