// Ton im Pogo: läuft auch bei lautlosem iPhone und kommt nach Anruf/App-Wechsel mit dem nächsten Tippen zurück.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stilleWav, lautlosUmgehen, erzeugeMusik } from "../../js/pogo/musik.js";

test("stilleWav: gültige WAV-Datei als data-URI, nur Nullen", () => {
  const uri = stilleWav(0.25, 8000);
  assert.ok(uri.startsWith("data:audio/wav;base64,"));
  const b = Buffer.from(uri.split(",")[1], "base64");
  assert.equal(b.toString("ascii", 0, 4), "RIFF");
  assert.equal(b.toString("ascii", 8, 12), "WAVE");
  assert.equal(b.readUInt32LE(24), 8000); // Abtastrate
  assert.equal(b.readUInt32LE(40), 2000); // 0,25 s × 8000 × 1 Byte
  assert.equal(b.length, 44 + 2000);
  assert.ok(b.subarray(44).every((v) => v === 128)); // 8 Bit: 128 ist Stille
});

test("lautlosUmgehen: mit Audio Session (iOS 17+) wird sie auf Wiedergabe gestellt", () => {
  const nav = { audioSession: { type: "auto" } };
  assert.equal(lautlosUmgehen(nav, null).art, "sitzung");
  assert.equal(nav.audioSession.type, "playback");
});

test("lautlosUmgehen: ohne Audio Session spielt ein stummes <audio> in Schleife", () => {
  let gespielt = 0;
  class FakeAudio { constructor(src) { this.src = src; this.loop = false; } play() { gespielt++; return Promise.resolve(); } }
  const r = lautlosUmgehen({}, FakeAudio);
  assert.equal(r.art, "audio");
  assert.equal(gespielt, 1);
  assert.equal(r.el.loop, true);
  assert.ok(r.el.src.startsWith("data:audio/wav"));
  assert.equal(lautlosUmgehen({}, null).art, "nichts");
});

test("wecke: angehaltener oder unterbrochener Ton wird beim Tippen fortgesetzt, laufender nicht", async () => {
  let fortgesetzt = 0;
  class FakeAC {
    constructor() { this.state = "suspended"; this.sampleRate = 8000; this.destination = {}; this.currentTime = 0; }
    createGain() { return { gain: { value: 1 }, connect() {} }; }
    createBuffer(k, n) { const d = new Float32Array(n); return { getChannelData: () => d }; }
    resume() { fortgesetzt++; return Promise.resolve(); }
  }
  const alt = { AC: globalThis.AudioContext, fetch: globalThis.fetch };
  globalThis.AudioContext = FakeAC; globalThis.fetch = () => Promise.reject(new Error("offline"));
  try {
    const m = erzeugeMusik();
    m.wecke(); assert.equal(fortgesetzt, 0, "ohne Kontext passiert nichts");
    assert.equal(await m.lade("x.mp3"), false); // legt den Kontext an
    const ctx = m._kontext();
    for (const [zustand, erwartet] of [["interrupted", 1], ["suspended", 2], ["running", 2]]) {
      ctx.state = zustand; m.wecke(); assert.equal(fortgesetzt, erwartet, zustand);
    }
  } finally { globalThis.AudioContext = alt.AC; globalThis.fetch = alt.fetch; }
});
