/* =========================================================
   Intro in zwei Phasen:
   1. Das Anarchie-A (Motiv 007) wird groß und mittig allein aufgesprüht.
   2. Es schrumpft und fliegt auf das Logo oben links in der Kopfzeile;
      gleichzeitig werden FUCK / OFF / FASHION in der Mitte gestempelt.
      Das A liegt dabei immer über der Schrift, nie dahinter.
   Dann reißt der Bogen nach oben weg, das gelandete A bleibt stehen,
   bis das echte Logo darunter frei ist.
   Einmal pro Session, überspringbar, bei Reduced Motion aus (dann
   gleich der Endzustand: Seite mit Kopfzeile).
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

  const stack = intro.querySelector(".intro__stack");
  const words = intro.querySelectorAll(".intro__word");
  const a = intro.querySelector(".intro__a");
  // Das A ist eine Fläche: es wird nicht gezogen, sondern durch Sprühstöße in der Maske
  // aufgedeckt. Ohne JS bleibt der Deckel voll – dann steht das A sofort da.
  const puffs = a.querySelectorAll("mask circle");
  const lid = a.querySelector(".intro__deckel");
  gsap.set(puffs, { attr: { r: 0 } });
  gsap.set(lid, { opacity: 0 });
  gsap.set(a, { xPercent: -50, yPercent: -50 });

  // Zeitmarken in s ab Start. Sprühen ≈ .72 s, Flug .8 s, Schrift drei Stempel à .34 s.
  // Reihenfolge oder Überlappung ändern = nur diese Zahlen ändern.
  const START = { a: 0, flug: .8, schrift: .85 };
  const FLUG = .8;
  const STEMPEL = .34;

  // Ziel der Landung: das Logo in der Kopfzeile. Ist es nicht sauber im Bild (Kopf eingefahren,
  // weit gescrollt neu geladen), blendet das A stattdessen aus, bevor die Schrift kommt.
  const logo = document.querySelector(".head__mark svg");
  const head = document.querySelector(".js-head");
  const start = logo && logo.getBoundingClientRect();
  const landen = !!start && start.width > 0 && start.top >= 0 && start.bottom <= innerHeight
    && !(head && head.classList.contains("is-hidden"));
  const ziel = () => logo.getBoundingClientRect(); // erst beim Abflug messen: dann sitzen die Schriften
  let gelandet = false;

  let finished = false;
  const tl = gsap.timeline({ onComplete: exit });
  tl.addLabel("a", START.a).addLabel("flug", START.flug).addLabel("schrift", START.schrift);

  // Phase 1: Stöße in Malreihenfolge, je ein kurzer Zisch; der Deckel schließt die letzten Lücken
  tl.to(puffs, { attr: { r: 150 }, duration: .26, ease: "power3.out", stagger: .03 }, "a")
    .to(lid, { opacity: 1, duration: .14, ease: "power1.in" }, "a+=.58");

  // Phase 2: A fliegt aufs Logo (Mitte auf Mitte, Breite auf Breite) und nimmt dessen Farbe an
  if (landen) {
    tl.to(a, {
      x: () => { const z = ziel(); return z.left + z.width / 2 - innerWidth / 2; },
      y: () => { const z = ziel(); return z.top + z.height / 2 - innerHeight / 2; },
      scale: () => ziel().width / a.getBoundingClientRect().width,
      color: getComputedStyle(logo).color,
      duration: FLUG, ease: "power3.inOut",
      onComplete: () => { gelandet = true; },
    }, "flug");
  } else {
    tl.to(a, { opacity: 0, scale: .85, duration: .2, ease: "power1.in" }, "flug-=.15");
  }

  words.forEach((w, i) => {
    tl.fromTo(w, { opacity: 0, scale: 2.4, rotate: i % 2 ? 4 : -4 },
                 { opacity: 1, scale: 1, rotate: i % 2 ? -2 : 1.5, duration: .22, ease: MOTION.ease.stamp }, `schrift+=${i * STEMPEL}`)
      // der Schlag rüttelt nur die Schrift, nicht das fliegende A
      .to(stack, { x: 5, y: 3, duration: .035, yoyo: true, repeat: 1, ease: "none" }, `schrift+=${i * STEMPEL + .22}`);
  });
  tl.to({}, { duration: .2 }, tl.duration()); // kurz stehen lassen, dann reißt der Bogen weg

  function exit() {
    if (finished) return;
    finished = true;
    tl.kill();
    remember();
    detach();
    resolveDone(true);
    // Gelandetes A aus dem Bogen lösen: es bleibt auf dem Logo stehen, bis der Bogen weg ist.
    // Sonst (übersprungen) fährt es mit dem Bogen weg.
    if (gelandet) document.body.append(a);
    gsap.to(intro, { yPercent: -112, duration: .7, ease: MOTION.ease.punch, onComplete: () => { intro.remove(); a.remove(); } });
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
