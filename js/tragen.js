/* =========================================================
   Vorne/Hinten-Vorschau: Teil, Farbe und Rückenmotiv wählen.
   Vorne bleibt der Brust-Schriftzug, hinten wechselt das Motiv.
   ========================================================= */
(function () {
  const form = document.querySelector(".js-tr-form");
  if (!form) return;
  const { MOTION } = FOF;
  const stage = document.querySelector(".js-tr-stage");
  const front = document.querySelector(".js-tr-front");
  const back = document.querySelector(".js-tr-back");
  const dlBack = document.querySelector(".js-tr-dl-back");
  const dlFront = document.querySelector(".js-tr-dl-front");
  const hint = document.querySelector(".js-tr-hint");
  const live = document.querySelector(".js-tr-live");
  const FRONT = { black: "assets/img/fof-000-brust-schwarz", white: "assets/img/fof-000-brust-weiss" };
  const NAMES = { hoodie: "Hoodie", tee: "T-Shirt", schwarz: "Schwarz", grau: "Grau", natur: "Natur" };

  // Heißpresse: Motiv drückt sich kurz ins Textil
  function press(img) {
    if (MOTION.reduced) return;
    gsap.fromTo(img, { scale: 1.14, opacity: 0, filter: "blur(3px)" },
                     { scale: 1, opacity: 1, filter: "blur(0px)", duration: .3, ease: MOTION.ease.stamp, clearProps: "filter" });
    gsap.fromTo(img.closest(".js-tr-view"), { scaleY: .985 }, { scaleY: 1, duration: .3, ease: MOTION.ease.out, delay: .28 });
  }

  function update(changed) {
    const teil = form.teil.value, farbe = form.farbe.value;
    const m = form.querySelector('input[name="motiv"]:checked').dataset;
    const dark = farbe !== "natur";
    stage.dataset.garment = teil;
    stage.dataset.color = farbe;

    front.src = (dark ? FRONT.white : FRONT.black) + "-1024.webp";
    dlFront.href = (dark ? FRONT.white : FRONT.black) + ".png";

    const color = m.type === "color";
    back.src = color ? m.src : (dark ? m.white : m.black);
    back.classList.toggle("is-color", color);
    back.classList.toggle("is-mask", m.mask === "true");
    dlBack.href = color ? m.png : (dark ? m.pngWhite : m.pngBlack);

    hint.textContent = dark ? "Schriftzug und Strich-Motive in Weiß, für dunkle Textilien"
                            : "Schriftzug und Strich-Motive in Schwarz, für helle Textilien";
    live.textContent = `${NAMES[teil]} in ${NAMES[farbe]}, vorne Fuck Off Fashion, hinten ${m.title}`;

    if (changed === "motiv") press(back);
    if (changed === "farbe") { press(front); press(back); }
  }

  form.addEventListener("change", e => update(e.target.name));
  update();
})();
