// Dieselbe Rechnung in Node: node node-lauf.mjs <datei.csv> [stueckBytes=16777216] [stapel=2048]
import { open } from 'node:fs/promises';
import { Rechner } from './kern.js';
const [, , datei, st = '16777216', stapel = '2048'] = process.argv;
const bytes = Number(st), r = new Rechner({ stapel: Number(stapel) });
const fh = await open(datei, 'r'), buf = Buffer.allocUnsafe(bytes);
const t0 = performance.now(); let spitze = 0;
for (;;) {
  const { bytesRead } = await fh.read(buf, 0, bytes, null);
  if (!bytesRead) break;
  r.schiebe(buf.subarray(0, bytesRead));
  spitze = Math.max(spitze, process.memoryUsage().rss);
}
const erg = r.ende(); await fh.close();
const s = (performance.now() - t0) / 1000;
console.log(JSON.stringify({ datei, stueckBytes: bytes, sekunden: +s.toFixed(2), zeilenProSek: Math.round(erg.zeilen / s), rssSpitzeMB: Math.round(spitze / 1e6), erg }));
