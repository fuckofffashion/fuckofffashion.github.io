/* =========================================================
   FUCK OFF FASHION – Motion-Tokens und wiederverwendbare Effekte
   Gleiche Werte wie in css/tokens.css, damit CSS und GSAP
   dieselbe Handschrift haben.
   ========================================================= */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MOTION = {
    reduced,
    ease: { out: "expo.out", punch: "power4.inOut", stamp: "power4.in" },
    dur:  { fast: 0.15, base: 0.5, slow: 1.1 },
    stagger: 0.07,
  };

  /* Zerlegt Text in Zeilen-Masken (für Klebeband-Wischer). */
  function splitLines(el) {
    if (el.dataset.split) return el.querySelectorAll(".line");
    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = lines.map(l => `<span class="line"><span class="line__in">${l.trim()}</span></span>`).join("");
    el.dataset.split = "1";
    return el.querySelectorAll(".line");
  }

  /* Klebeband-Wischer: jede Zeile wird von links "aufgeklebt". */
  function tapeReveal(el, opts = {}) {
    const lines = splitLines(el);
    if (reduced) return gsap.set(lines, { clipPath: "inset(0 0% 0 0)" });
    return gsap.fromTo(lines,
      { clipPath: "inset(0 100% 0 0)" },
      { clipPath: "inset(0 0% 0 0)", duration: MOTION.dur.base * 1.2, ease: MOTION.ease.punch,
        stagger: MOTION.stagger * 1.6, ...opts });
  }

  /* Stempel: fällt aus der Nähe aufs Papier, ein kurzer Ruck beim Aufschlag. */
  function stamp(el, opts = {}) {
    const rot = parseFloat(getComputedStyle(el).getPropertyValue("--rot")) || -3;
    if (reduced) return gsap.set(el, { opacity: 1, scale: 1, rotate: rot });
    const tl = gsap.timeline(opts);
    tl.fromTo(el, { opacity: 0, scale: 1.9, rotate: rot - 9 },
                  { opacity: 1, scale: 1, rotate: rot, duration: .32, ease: MOTION.ease.stamp })
      .to(el.parentElement, { x: 3, y: 2, duration: .04, yoyo: true, repeat: 1, ease: "none" });
    return tl;
  }

  /* Erpresserbrief: jeder Buchstabe flackert durch Schnipsel und rastet ein. */
  function ransom(el) {
    const text = el.textContent;
    el.setAttribute("aria-label", text);
    el.innerHTML = [...text].map(c => c === " " ? " " :
      `<span class="ransom__c" aria-hidden="true">${c}</span>`).join("");
    const chars = el.querySelectorAll(".ransom__c");
    if (reduced) return gsap.timeline();
    const looks = ["is-cut-a", "is-cut-b", "is-cut-c", "is-cut-d"];
    const tl = gsap.timeline();
    chars.forEach((c, i) => {
      const flips = 3 + Math.floor(Math.random() * 3);
      for (let f = 0; f < flips; f++) {
        tl.call(() => { c.className = "ransom__c " + looks[Math.floor(Math.random() * looks.length)]; },
                null, i * 0.045 + f * 0.06);
      }
      tl.call(() => { c.className = "ransom__c"; }, null, i * 0.045 + flips * 0.06);
      tl.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.01 }, i * 0.045);
    });
    return tl;
  }

  /* Glitch: kurzer RGB-Versatz, nur als Ereignis – nie in Dauerschleife. */
  function glitch(el) {
    if (reduced || el.classList.contains("is-glitching")) return;
    el.classList.add("is-glitching");
    setTimeout(() => el.classList.remove("is-glitching"), 420);
  }

  /* Ticker, der mit der Scroll-Geschwindigkeit mitzieht. */
  function ticker(track) {
    const inner = track.querySelector(".ticker__in");
    inner.innerHTML += inner.innerHTML;                    // nahtlos doppeln
    if (reduced) return;
    let x = 0, dir = -1, boost = 0;
    const base = 0.6;
    gsap.ticker.add(() => {
      const w = inner.scrollWidth / 2;
      x += (base + boost) * dir;
      if (x <= -w) x += w; if (x > 0) x -= w;
      inner.style.transform = `translate3d(${x}px,0,0)`;
      boost *= 0.92;
    });
    if (window.ScrollTrigger) ScrollTrigger.create({
      onUpdate: self => { dir = self.direction === 1 ? -1 : 1; boost = Math.min(Math.abs(self.getVelocity()) / 120, 18); }
    });
  }

  /* Weiches Scrollen (Lenis) mit ScrollTrigger gekoppelt. */
  function smoothScroll() {
    if (reduced || !window.Lenis) return null;
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    return lenis;
  }

  window.FOF = { MOTION, splitLines, tapeReveal, stamp, ransom, glitch, ticker, smoothScroll };
})();
