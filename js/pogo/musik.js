// Eigener Punk-Beat per WebAudio (Platzhalter, bis freigegebene Songs da sind).
// Ohne AudioContext läuft das Spiel stumm weiter.
import { teilBei, VIERTEL, songZeit } from "./regeln.js?v=31";

const ACHTEL = VIERTEL / 2;
const AKKORDE = [82.41, 82.41, 130.81, 146.83, 110, 110, 98, 123.47];

export function erzeugeMusik() {
  let audio = null, master = null, tonAn = true, naechste = 0, start = 0, achtel = 0, takt = null, rauschen = null, verzerrer = null;

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
    start() {
      try {
        if (!audio) {
          const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return;
          audio = new AC(); master = audio.createGain(); master.gain.value = tonAn ? 0.45 : 0; master.connect(audio.destination);
          rauschen = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
          const d = rauschen.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        audio.resume()?.catch?.(() => {}); naechste = start = audio.currentTime + 0.05; achtel = 0;
        clearInterval(takt); takt = setInterval(plane, 25);
      } catch { audio = null; }
    },
    stopp() { clearInterval(takt); takt = null; },
    pause() { clearInterval(takt); takt = null; audio?.suspend(); },
    // die Audiouhr steht während der Pause still, das Raster läuft danach nahtlos weiter
    weiter() { if (!audio) return; audio.resume()?.catch?.(() => {}); clearInterval(takt); takt = setInterval(plane, 25); },
    /** Songzeit nach der Audiouhr, oder null ohne Ton (dann zählt die normale Uhr). */
    uhr() { return audio && audio.state === "running" ? songZeit(audio.currentTime, start, audio.outputLatency || audio.baseLatency || 0) : null; },
    setzeTon(an) { tonAn = an; if (master) master.gain.value = an ? 0.45 : 0; },
  };
}
