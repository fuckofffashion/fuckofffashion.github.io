// Musik für Pogo: freigegebener Song aus einer Datei oder eigener Punk-Beat per WebAudio.
// Ohne AudioContext läuft das Spiel stumm weiter.
import { teilBei, VIERTEL, songZeit, rasterAb } from "./regeln.js?v=42";

const ACHTEL = VIERTEL / 2;

/** Stille als WAV-Datei (8 Bit mono) in einer data-URI; für den Lautlos-Trick auf älteren iPhones. */
export function stilleWav(sekunden = 0.5, rate = 8000) {
  const n = Math.round(sekunden * rate), b = new Uint8Array(44 + n), v = new DataView(b.buffer);
  const txt = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
  txt(0, "RIFF"); v.setUint32(4, 36 + n, true); txt(8, "WAVE"); txt(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  txt(36, "data"); v.setUint32(40, n, true); b.fill(128, 44);
  let s = ""; for (const x of b) s += String.fromCharCode(x);
  return "data:audio/wav;base64," + btoa(s);
}

/**
 * Auf dem iPhone schaltet der Lautlos-Schalter Web Audio stumm. Ab iOS 17 hebt die Audio Session
 * („playback“) das auf; ältere Geräte bekommen ein stummes <audio> in Schleife, das die Wiedergabe
 * ebenfalls auf „Medien“ umstellt. Muss im Tippen laufen.
 */
export function lautlosUmgehen(nav = globalThis.navigator, AudioEl = globalThis.Audio) {
  try {
    if (nav?.audioSession && "type" in nav.audioSession) { nav.audioSession.type = "playback"; return { art: "sitzung", el: null }; }
    if (!AudioEl) return { art: "nichts", el: null };
    const el = new AudioEl(stilleWav()); el.loop = true; el.play()?.catch?.(() => {});
    return { art: "audio", el };
  } catch { return { art: "nichts", el: null }; }
}
const AKKORDE = [82.41, 82.41, 130.81, 146.83, 110, 110, 98, 123.47];

export function erzeugeMusik() {
  let audio = null, master = null, tonAn = true, naechste = 0, start = 0, achtel = 0, takt = null, rauschen = null, verzerrer = null;
  let quelle = null, einmal = null, pegelMesser = null, pegelDaten = null, modus = "beat", klatschBpm = 120; const puffer = new Map();
  let lautlos = null; // Ergebnis von lautlosUmgehen, einmal beim ersten Start
  const kontext = () => {
    if (audio) return audio;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return null;
    audio = new AC(); master = audio.createGain(); master.gain.value = tonAn ? 0.45 : 0; master.connect(audio.destination);
    rauschen = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
    const d = rauschen.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return audio;
  };

  const knall = (t, frq, dauer, laut) => { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.setValueAtTime(frq, t); o.frequency.exponentialRampToValueAtTime(40, t + dauer); g.gain.setValueAtTime(laut, t); g.gain.exponentialRampToValueAtTime(0.001, t + dauer); o.connect(g).connect(master); o.start(t); o.stop(t + dauer); };
  const zisch = (t, dauer, laut, hoch) => { const s = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain(); s.buffer = rauschen; f.type = hoch ? "highpass" : "bandpass"; f.frequency.value = hoch ? 7000 : 1800; g.gain.setValueAtTime(laut, t); g.gain.exponentialRampToValueAtTime(0.001, t + dauer); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dauer); };
  const gitarre = (t, frq, laut) => {
    if (!verzerrer) {
      verzerrer = audio.createWaveShaper(); const k = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) k[i] = Math.tanh((i / 512 - 1) * 6);
      verzerrer.curve = k; const lp = audio.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; verzerrer.connect(lp).connect(master);
    }
    const g = audio.createGain(); g.gain.setValueAtTime(laut, t); g.gain.exponentialRampToValueAtTime(0.001, t + ACHTEL * 0.95); g.connect(verzerrer);
    for (const m of [1, 1.5, 2]) { const o = audio.createOscillator(); o.type = "sawtooth"; o.frequency.value = frq * m; o.connect(g); o.start(t); o.stop(t + ACHTEL); }
  };
  function klatsche() {
    const ctx = audio; if (!ctx) return;
    while (naechste < ctx.currentTime + 0.12) { zisch(naechste, 0.08, 0.5, false); knall(naechste, 180, 0.08, 0.35); naechste += 60 / klatschBpm; }
  }
  function plane() {
    while (naechste < audio.currentTime + 0.12) {
      const teil = teilBei(naechste - start);
      const i = achtel % 8, akk = AKKORDE[Math.floor(achtel / 8) % AKKORDE.length], t = naechste;
      if (teil.name === "INTRO") { if (i % 2 === 0) gitarre(t, akk, 0.12); zisch(t, 0.03, 0.05, true); }
      else if (teil.name === "BREAK") { if (i === 0) knall(t, 110, 0.3, 0.7); zisch(t, 0.03, 0.04, true); if (i % 4 === 0) gitarre(t, akk, 0.07); }
      else {
        const refrain = teil.kraft >= 1;
        if (refrain) { if (i % 2 === 0) knall(t, 120, 0.12, 0.9); else zisch(t, 0.12, 0.45, false); }
        else { if (i === 0 || i === 3 || i === 5) knall(t, 120, 0.14, 0.9); if (i === 2 || i === 6) zisch(t, 0.14, 0.5, false); }
        zisch(t, 0.03, refrain ? 0.09 : 0.06, true);
        if (refrain && achtel % 32 === 0) zisch(t, 0.9, 0.18, true);
        gitarre(t, akk, refrain ? 0.16 : 0.12);
      }
      naechste += ACHTEL; achtel++;
    }
  }
  return {
    /** Lädt und dekodiert die Songdatei vorab (vor dem Antippen erlaubt); true, wenn sie bereit ist. */
    async lade(url, fortschritt = null) {
      if (puffer.has(url)) { fortschritt?.(1); return true; }
      try {
        const ctx = kontext(); if (!ctx) return false;
        const antwort = await fetch(url), gesamt = Number(antwort.headers.get("content-length")) || 0;
        let daten;
        if (fortschritt && gesamt && antwort.body?.getReader) {
          const leser = antwort.body.getReader(), teile = []; let n = 0;
          for (;;) { const { done, value } = await leser.read(); if (done) break; teile.push(value); n += value.length; fortschritt(Math.min(1, n / gesamt)); }
          const alles = new Uint8Array(n); let o = 0; for (const t of teile) { alles.set(t, o); o += t.length; } daten = alles.buffer;
        } else daten = await antwort.arrayBuffer();
        puffer.set(url, await ctx.decodeAudioData(daten)); return true;
      } catch { return false; }
    },
    bereit(url) { return puffer.has(url); },
    /** Startet den Song (url) oder ohne url den eigenen Beat; muss im Klick laufen. */
    start(url = null, versatz = 0) {
      try {
        const ctx = kontext(); if (!ctx) return;
        ctx.resume()?.catch?.(() => {});
        lautlos ??= lautlosUmgehen();
        this.stopp();
        const t0 = ctx.currentTime + 0.05; start = t0 - versatz; modus = "beat";
        const r = rasterAb(versatz, ACHTEL); achtel = r.k; naechste = start + r.zeit;
        if (url && puffer.has(url)) {
          quelle = ctx.createBufferSource(); quelle.buffer = puffer.get(url); quelle.connect(master); quelle.start(t0, versatz);
        } else { takt = setInterval(plane, 25); }
      } catch { audio = null; }
    },
    stopp() { clearInterval(takt); takt = null; try { quelle?.stop(); } catch {} quelle = null; },
    /** Geladenes Stück einmal abspielen (z. B. Outro); gibt die Dauer in s zurück oder null. */
    spieleEinmal(url) {
      try {
        const ctx = kontext(); if (!ctx || !puffer.has(url)) return null;
        ctx.resume()?.catch?.(() => {}); this.stoppeEinmal();
        einmal = ctx.createBufferSource(); einmal.buffer = puffer.get(url);
        pegelMesser ??= ctx.createAnalyser(); pegelMesser.fftSize = 512; pegelDaten ??= new Uint8Array(pegelMesser.fftSize);
        einmal.connect(pegelMesser); pegelMesser.connect(master); einmal.start(ctx.currentTime + 0.05);
        return einmal.buffer.duration;
      } catch { return null; }
    },
    stoppeEinmal() { try { einmal?.stop(); } catch {} try { einmal?.disconnect(); } catch {} einmal = null; },
    /** Lautstärke des einmal gespielten Stücks, 0…1 (für den Kiefer im Outro). */
    pegel() {
      if (!einmal || !pegelMesser) return 0;
      pegelMesser.getByteTimeDomainData(pegelDaten); let s = 0;
      for (const v of pegelDaten) { const a = (v - 128) / 128; s += a * a; }
      return Math.min(1, Math.sqrt(s / pegelDaten.length) * 4);
    },
    /** Klatsch-Takt für den Zugabe-Ruf; die Uhr beginnt beim ersten Klatscher. */
    klatschen(bpm) {
      try {
        const ctx = kontext(); if (!ctx) return;
        this.stopp(); ctx.resume()?.catch?.(() => {});
        naechste = start = ctx.currentTime + 0.05; modus = "klatschen"; klatschBpm = bpm;
        takt = setInterval(klatsche, 25);
      } catch { audio = null; }
    },
    pause() { if (!quelle) { clearInterval(takt); takt = null; } audio?.suspend(); lautlos?.el?.pause?.(); },
    /** Bei jedem Tippen: hat der Browser den Ton angehalten (Anruf, App-Wechsel, Start abgelehnt), wieder an. */
    wecke() {
      if (!audio) return;
      if (audio.state !== "running") audio.resume()?.catch?.(() => {});
      if (lautlos?.el?.paused) lautlos.el.play()?.catch?.(() => {});
    },
    /** Läuft der Ton wirklich? (false: Browser hat ihn angehalten oder es gibt keinen) */
    laeuftTon() { return audio?.state === "running"; },
    _kontext() { return audio; },
    // die Audiouhr steht während der Pause still, das Raster läuft danach nahtlos weiter
    weiter() { if (!audio) return; audio.resume()?.catch?.(() => {}); lautlos?.el?.play?.()?.catch?.(() => {}); if (!quelle) { clearInterval(takt); takt = setInterval(modus === "klatschen" ? klatsche : plane, 25); } },
    /** Songzeit nach der Audiouhr, oder null ohne Ton (dann zählt die normale Uhr). */
    uhr() { return audio && audio.state === "running" ? songZeit(audio.currentTime, start, audio.outputLatency || audio.baseLatency || 0) : null; },
    setzeTon(an) { tonAn = an; if (master) master.gain.value = an ? 0.45 : 0; },
  };
}
