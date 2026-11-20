// Worker des Häppchen-Versuchs: liest eine Datei (File oder URL) stückweise, rechnet in einem Durchlauf, meldet Fortschritt nach Bytes.
import { Rechner } from './kern.js';
let abbruch = false, lauf = 0;
const kanal = new MessageChannel(); let wartet = null; kanal.port1.onmessage = () => { const r = wartet; wartet = null; r && r(); };
const atmen = () => new Promise(r => { wartet = r; kanal.port2.postMessage(0); });   // Nachrichtenkanal statt Zeitgeber: wird in Hintergrund-Tabs nicht gedrosselt   // dem Worker Luft lassen, damit „Abbrechen“ ankommt (sonst wird die Nachricht erst nach Sekunden gelesen)
self.onmessage = async (e) => {
  const m = e.data;
  if (m.art === 'abbruch') { abbruch = true; return; }
  if (m.art !== 'start') return;
  abbruch = false; const meinLauf = ++lauf;
  const r = new Rechner({ stapel: m.stapel || 2048 });
  const t0 = performance.now(); let gelesen = 0, letzteMeldung = 0, spitze = 0;
  const heap = () => (self.performance.memory ? self.performance.memory.usedJSHeapSize : 0);
  const melde = (art) => {
    const s = (performance.now() - t0) / 1000; spitze = Math.max(spitze, heap());
    self.postMessage({ art, bytes: gelesen, gesamt: m.gesamt, zeilen: r.zeilen, sek: s, zeilenProSek: r.zeilen / Math.max(s, 1e-9), heapMB: heap() / 1e6, spitzeMB: spitze / 1e6 });
  };
  try {
    if (m.modus === 'bereich') {
      // Ein Teil der Datei für mehrere Worker: Zeilen, die in [von, bis) BEGINNEN. Der Anfang wird bis zum ersten Zeilenende verworfen (die Zeile davor gehört dem Vorgänger),
      // am Ende wird bis zum Ende der angefangenen Zeile weitergelesen. Die Kopfzeile bekommt jeder Worker vom Aufrufer (`kopf`, Bytes mit Zeilenende).
      const D = m.datei; const bis = Math.min(D.size, m.bis);
      if (m.von > 0) r.schiebe(m.kopf);
      let pos = m.von > 0 ? m.von - 1 : 0, erste = m.von > 0;
      while (pos < bis && !abbruch) {
        const buf = new Uint8Array(await D.slice(pos, Math.min(bis, pos + m.stueck)).arrayBuffer());
        let u = buf;
        if (erste) { const nl = buf.indexOf(10); if (nl < 0) { pos += buf.length; gelesen += buf.length; continue; } u = buf.subarray(nl + 1); erste = false; }
        r.schiebe(u); gelesen += buf.length; pos += buf.length;
        if (performance.now() - letzteMeldung > 250) { letzteMeldung = performance.now(); melde('fortschritt'); await atmen(); }
      }
      // angefangene Zeile zu Ende lesen
      if (!abbruch && bis < D.size && pos >= bis) {
        let q = bis, fertig = false;
        while (q < D.size && !fertig) {
          const buf = new Uint8Array(await D.slice(q, Math.min(D.size, q + 65536)).arrayBuffer());
          const nl = buf.indexOf(10);
          if (nl >= 0) { r.schiebe(buf.subarray(0, nl + 1)); fertig = true; } else r.schiebe(buf);
          q += buf.length;
        }
      }
    } else if (m.modus === 'slice') {
      for (let pos = 0; pos < m.datei.size && !abbruch; pos += m.stueck) {
        const buf = await m.datei.slice(pos, Math.min(m.datei.size, pos + m.stueck)).arrayBuffer();
        r.schiebe(new Uint8Array(buf)); gelesen += buf.byteLength;
        if (performance.now() - letzteMeldung > 250) { letzteMeldung = performance.now(); melde('fortschritt'); await atmen(); }
      }
    } else {
      const quelle = m.datei ? m.datei.stream() : (await fetch(m.url)).body;
      const rd = quelle.getReader();
      for (;;) {
        if (abbruch) { await rd.cancel(); break; }
        const { done, value } = await rd.read();
        if (done) break;
        r.schiebe(value); gelesen += value.length;
        if (performance.now() - letzteMeldung > 250) { letzteMeldung = performance.now(); melde('fortschritt'); await atmen(); }
      }
    }
    if (abbruch) { melde('abgebrochen'); return; }
    if (m.modus === 'bereich') { const zustand = r.zustand(); melde('fortschritt'); self.postMessage({ art: 'fertig', zustand, sek: (performance.now() - t0) / 1000, spitzeMB: spitze / 1e6, bytes: gelesen }); return; }
    const erg = r.ende(); melde('fortschritt');
    self.postMessage({ art: 'fertig', erg, sek: (performance.now() - t0) / 1000, spitzeMB: spitze / 1e6, bytes: gelesen });
  } catch (f) { self.postMessage({ art: 'fehler', text: String(f && f.stack || f) }); }
};
