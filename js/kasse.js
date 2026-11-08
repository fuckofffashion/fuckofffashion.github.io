/* =========================================================
   FUCK OFF FASHION – Fake-Kasse
   „Jetzt shoppen“ auf dem Werbeplakat öffnet einen glatten Warenkorb.
   „Zur Kasse“ lädt bis 99 % und bleibt hängen, dann knallt der Stempel drauf:
   Preis durchgestrichen, „Spar dir das. Mach selbst.“, Weg zu den Motiven.
   Reduzierte Bewegung: gleich das Ende, ohne Ladebalken.
   ========================================================= */
(function () {
  const auf = document.querySelector(".js-kasse-auf");
  const dlg = document.querySelector(".js-kasse");
  if (!auf || !dlg || typeof dlg.showModal !== "function") return;

  const $ = sel => dlg.querySelector(sel);
  const los = $(".js-kasse-los"), laden = $(".js-kasse-laden"), balken = $(".js-kasse-balken");
  const leiste = $("[role=progressbar]"), status = $(".js-kasse-status"), ende = $(".js-kasse-ende");
  const stempel = $(".js-kasse-stempel"), nullPreis = $(".js-kasse-null"), ansage = $(".js-kasse-ansage");
  const reduced = window.FOF?.MOTION?.reduced ?? matchMedia("(prefers-reduced-motion: reduce)").matches;

  const EN = document.documentElement.lang === "en"; // englische Seiten liegen in en/
  const SCHRITTE = EN ? [
    [0, "Packing your individuality …"],
    [22, "Printing the logo …"],
    [48, "Activating the ad space on your chest …"],
    [74, "Lightening your bank account …"],
    [92, "Nearly there …"],
  ] : [
    [0, "Individualität wird verpackt …"],
    [22, "Logo wird aufgedruckt …"],
    [48, "Werbefläche auf deiner Brust wird aktiviert …"],
    [74, "Dein Konto wird erleichtert …"],
    [92, "Fast geschafft …"],
  ];
  let tl = null;

  function zuruecksetzen() {
    tl?.kill(); tl = null;
    dlg.classList.remove("is-entlarvt");
    los.hidden = false; laden.hidden = true; ende.hidden = true; nullPreis.hidden = true;
    balken.style.width = "0%"; leiste.setAttribute("aria-valuenow", "0");
    status.textContent = SCHRITTE[0][1]; ansage.textContent = "";
    if (window.gsap) gsap.set([stempel, stempel.parentElement], { clearProps: "transform,opacity" });
  }

  function entlarven() {
    laden.hidden = true; ende.hidden = false; nullPreis.hidden = false;
    dlg.classList.add("is-entlarvt");
    ansage.textContent = EN ? "Fuck Off. Total €0.00. Don't bother. Make it yourself."
                          : "Fuck Off. Gesamt 0,00 Euro. Spar dir das. Mach selbst.";
    ende.querySelector("a").focus({ preventScroll: true });
    if (!reduced && window.FOF?.stamp) FOF.stamp(stempel);
  }

  function kaufen() {
    los.hidden = true;
    if (reduced || !window.gsap) return entlarven();
    laden.hidden = false;
    laden.focus(); // der Knopf verschwindet, der Fokus bleibt im Fenster
    ansage.textContent = EN ? "Processing your order." : "Bestellung läuft.";
    const p = { v: 0 };
    const zeigen = () => {
      const v = Math.round(p.v);
      balken.style.width = v + "%";
      leiste.setAttribute("aria-valuenow", String(v));
      status.textContent = SCHRITTE.filter(([ab]) => v >= ab).pop()[1];
    };
    tl = gsap.timeline()
      .to(p, { v: 99, duration: 2.6, ease: "power1.inOut", onUpdate: zeigen })
      .to(p, { v: 99.4, duration: 1.1, ease: "none", onUpdate: zeigen }) // hängt bei 99 %
      .call(entlarven);
  }

  auf.addEventListener("click", () => {
    zuruecksetzen();
    dlg.showModal();
    window.FOF?.lenis?.stop();
    los.focus();
  });
  los.addEventListener("click", kaufen);
  $(".js-kasse-zu").addEventListener("click", () => dlg.close());
  dlg.addEventListener("close", () => {
    if (dlg.open) return; // schon wieder geöffnet: das Close-Ereignis kommt verzögert
    tl?.kill(); window.FOF?.lenis?.start();
  });
  // Klick auf den abgedunkelten Hintergrund schließt
  dlg.addEventListener("click", e => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });
  // Ankerlink zu den Motiven: erst schließen (Capture-Phase), dann scrollt der Ankerlink-Handler aus main.js
  dlg.addEventListener("click", e => {
    if (!e.target.closest(".js-kasse-motive")) return;
    dlg.close();
    window.FOF?.lenis?.start(); // sofort, das close-Ereignis kommt erst nach dem Scrollbefehl
  }, true);
})();
