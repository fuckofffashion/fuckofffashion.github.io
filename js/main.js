/* =========================================================
   FUCK OFF FASHION – Seitenbewegung
   Reihenfolge: Intro → Hero → Scroll-Geschichte.
   ========================================================= */
(function () {
  gsap.registerPlugin(ScrollTrigger);
  const { MOTION, splitLines, tapeReveal, stamp, ransom, glitch, ticker, smoothScroll } = FOF;
  const lenis = FOF.lenis = smoothScroll();

  // Ankerlinks über Lenis, damit weiches Scrollen und Fokus zusammenpassen
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(target, { offset: 0, duration: 1.1 }) : target.scrollIntoView();
    history.replaceState(null, "", a.getAttribute("href"));
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }));

  // Kopfzeile: beim Runterscrollen weg, beim Hochscrollen wieder da
  const head = document.querySelector(".js-head");
  ScrollTrigger.create({
    start: 200,
    onUpdate: self => head.classList.toggle("is-hidden", self.direction === 1 && !head.contains(document.activeElement)),
    onLeaveBack: () => head.classList.remove("is-hidden"),
  });

  gsap.context(() => {
    /* Hero – wartet auf das Intro */
    const heroTitle = document.querySelector(".js-hero-title");
    const heroLines = splitLines(heroTitle);
    if (!MOTION.reduced) {
      gsap.set(heroLines, { clipPath: "inset(0 100% 0 0)" });
      gsap.set(".js-hero-fade, .js-stamp", { opacity: 0 });
      gsap.set(".hero__logo img", { clipPath: "inset(100% 0 0 0)" });
      gsap.set(head, { opacity: 0 });
    }
    FOF.introDone.then(played => {
      const tl = gsap.timeline({ delay: played ? .25 : .1 });
      tl.to(".hero__logo img", { clipPath: "inset(0% 0 0 0)", duration: MOTION.dur.slow, ease: MOTION.ease.out }, 0)
        .add(tapeReveal(heroTitle), .1)
        .add(stamp(document.querySelector(".js-stamp")), "-=.2")
        .to(".js-hero-fade", { opacity: 1, duration: MOTION.dur.base, ease: MOTION.ease.out, stagger: .1 }, "-=.15")
        .to(head, { opacity: 1, duration: MOTION.dur.base }, "<");
    });

    /* Sektions-Headlines: Klebeband */
    document.querySelectorAll(".sec .js-tape").forEach(el => {
      const lines = splitLines(el);
      if (MOTION.reduced) return;
      gsap.set(lines, { clipPath: "inset(0 100% 0 0)" });
      ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => tapeReveal(el) });
    });

    /* Manifest: "Kaufen" wird durchgestrichen, Zeilen klappen auf */
    if (!MOTION.reduced) {
      gsap.fromTo(".js-strike", { "--s": 0 }, { "--s": 1, duration: .45, ease: MOTION.ease.punch, delay: .55,
        scrollTrigger: { trigger: ".js-strike", start: "top 80%" } });
      gsap.utils.toArray(".js-list li").forEach(li => gsap.from(li, {
        clipPath: "inset(0 0 100% 0)", duration: MOTION.dur.base, ease: MOTION.ease.out,
        scrollTrigger: { trigger: li, start: "top 90%" } }));

      /* Plakate werden an die Wand geklatscht */
      gsap.utils.toArray(".js-poster").forEach(p => gsap.from(p, {
        y: 80, scale: 1.12, opacity: 0, duration: .45, ease: MOTION.ease.stamp,
        scrollTrigger: { trigger: p, start: "top 90%" },
        onComplete: () => gsap.set(p, { clearProps: "transform,opacity" }) }));
    }

    /* Selbermachen: auf Desktop horizontal durchscrollen */
    gsap.matchMedia().add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
      const track = document.querySelector(".js-diy-track");
      const dist = () => track.scrollWidth - document.documentElement.clientWidth;
      gsap.to(track, { x: () => -dist(), ease: "none",
        scrollTrigger: { trigger: ".js-diy", start: "top top", end: () => "+=" + dist(), pin: true, scrub: .6, invalidateOnRefresh: true } });
      gsap.utils.toArray(".diy__step").forEach((s, i) => gsap.set(s, { rotate: i % 2 ? 1.2 : -1 }));
    });

    /* Schluss: Erpresserbrief, einmal */
    const r = document.querySelector(".js-ransom");
    ScrollTrigger.create({ trigger: r, start: "top 80%", once: true, onEnter: () => ransom(r) });

    /* Glitch auf dem Wortmarken-Link */
    const mark = document.querySelector(".head__mark span");
    mark.classList.add("glitch"); mark.dataset.text = mark.textContent;
    head.querySelector(".head__mark").addEventListener("pointerenter", () => glitch(mark));

    ticker(document.querySelector(".js-ticker"));
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
