// Messung (Große Daten 31.10.): nur lokal, mit GROSS_DATEI=<csv>. Ohne die Variable läuft nichts.
import { test } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { leseCsv, planeSpalten, zurEngine, dekodiere } from './einlesen';
import { erkenneFragebogen } from './fragebogen';
import { pruefe } from './datencheck';
const datei = process.env.GROSS_DATEI;
test.runIf(!!datei)('Stufen einzeln', () => {
  const T: Record<string, number> = {}; let t0 = performance.now(); const m = (n: string) => { const t = performance.now(); T[n] = Math.round(t - t0); t0 = t; };
  const bytes = new Uint8Array(readFileSync(datei!)); m('lesen');
  const text = dekodiere(bytes); m('dekodieren');
  const tab = leseCsv(text, 'x.csv'); m('zerlegen');
  erkenneFragebogen(tab); m('fragebogen-erkennung');
  const plan = planeSpalten(tab); m('typen');
  zurEngine(tab, plan); m('engine-csv');
  const daten = tab.kopf.map((k, i) => ({ name: k, bezeichnung: '', art: plan[i]!.art as 'zahl' | 'text' | 'datum', fehlend: [] as number[], werte: tab.zeilen.map(z => (plan[i]!.art === 'zahl' ? (z[i] === null ? null : Number(z[i])) : z[i]) ) }));
  m('spalten-bauen');
  pruefe(daten as any); m('daten-check');
  writeFileSync(process.env.GROSS_AUS ?? '/dev/stderr', 'STUFEN_MS ' + JSON.stringify(T) + ' zeilen=' + tab.zeilen.length);
}, 600000);
