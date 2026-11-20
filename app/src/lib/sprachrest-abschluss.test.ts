import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import {
  nlsCodeSatz, nlsWarnungen, saetzeNls, tabellenNls, nlsRCode, nlsGerechnet, nlsFachwort, nlsWarum, nlsFormelName, nlsPunkte, nlsDaten, NLS_SPERREN, NLS_FORMELN, type NlsCode, type NlsE
} from './nls';
import { abgleichCodeSatz, abgleichWarnungen, abgleichen, abgleichRolleText, abgleichNameGruppe, abgleichNameRolle } from './abgleich';
import { vermerkText, artText } from './protokollsaetze';
import type { ProtokollEintrag } from './protokoll';
import type { TableItem } from '../engine/types';
import type { Spalte } from './verzeichnis';

/* Leitfaden Falle 12 und 20 für Abschnitt 5 und 6 (nichtlineare Regression, Fallkontrollabgleich): Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben (i18n/katalog.mjs, `pseudo`); was außerhalb übrig bleibt, ist fest eingesetzter deutscher oder englischer Text.
 * Voraussetzung: `node i18n/katalog.mjs` wurde nach dem letzten Ändern der Texte gelaufen (schreibt sprachen/xx.json). Muster: lib/sprachrest-kurspaket.test.ts. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const ERLAUBT = ['exp', 'Michaelis', 'Menten', 'AIC', 'SE', 'RSS', 'Wald', 'nls', 'df'];
const rest = (t: string): string[] => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w) && !ERLAUBT.includes(w));
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };
const kopfOk = (name: string, t: string) => { if (t.startsWith('[')) pruefe(name, t); else expect(rest(t), `${name}: ${t}`).toEqual([]); };
const tabellenOk = (was: string, ts: TableItem[]) => {
  for (const t of ts) {
    pruefe(`${was} ${t.label}: Titel`, t.title!.t);
    t.footnotes.forEach((f, i) => pruefe(`${was} ${t.label}: Fußnote ${i}`, f.t));
    t.cells.filter(c => c.r === 0).forEach(c => kopfOk(`${was} ${t.label}: Kopf ${c.t}`, c.t));
  }
};

const nl = (o: Partial<NlsE> = {}): NlsE => ({ art: 'michaelis', ziel: 'y', praed: 'x', start: [1, 2], n: 12, ausgelassen: 1,
  koef: [{ name: 'a', b: 212.7, se: 6.9, t: 30.6, p: 1e-11, waldU: 197, waldO: 228, profilU: 197.3, profilO: 229.3 }, { name: 'b', b: 0.064, se: 0.008, t: 7.7, p: 1.5e-5, waldU: 0.045, waldO: 0.082, profilU: 0.047, profilO: 0.086 }],
  rss: 1195.4, sigma: 10.9, df: 10, aic: 95.3, profil: false, x: [0.02, 0.06, 0.11], y: [76, 97, 123], angepasst: [50, 80, 100], rest: [26, 17, 23], warnung: true, ...o });

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen der nichtlinearen Regression', () => {
  it('Sperren, Prüfliste, Sätze, Warnungen, Tabellen, R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of [...NLS_SPERREN] as NlsCode[]) { const t = nlsCodeSatz(c, { n: 3, k: 2, zahl: 2 }); pruefe(`code ${c}`, t.text); if (t.klein) pruefe(`code ${c} klein`, t.klein); }
    const sp = (name: string): Spalte => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {} });
    const dt = nlsDaten('y', ['x'], '', [[1, 0], [2, null]], [sp('y'), sp('x')]);
    for (const p of nlsPunkte(dt)) { pruefe(`punkt ${p.art}`, p.text); if (p.klein) pruefe(`punkt ${p.art} klein`, p.klein); }
    for (const art of NLS_FORMELN) {
      const st = saetzeNls(nl({ art }), x => x);
      for (const [k, v] of Object.entries({ haupt: st.haupt, zusatz: st.zusatz, vorsicht: st.vorsicht })) pruefe(`satz ${art} ${k}`, v);
      kopfOk(`satz ${art} apa`, st.apa);
      kopfOk(`name ${art}`, nlsFormelName(art));
      tabellenOk(art, tabellenNls(nl({ art, profil: true, ausgelassen: 0 }), x => x));
    }
    for (const [i, w] of nlsWarnungen(nl()).entries()) pruefe(`warnung ${i}`, w);
    pruefe('gerechnet', nlsGerechnet()); pruefe('fachwort', nlsFachwort()); pruefe('warum', nlsWarum());
    expect(nlsRCode('y', 'x', 'michaelis')).toContain('# [');
  });
});

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen des Abgleichs', () => {
  it('Sperren, Warnungen mit und ohne Ergebnis, Rollen, Protokoll', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of ['k-bereich', 'keine-zahl', 'toleranz', 'keine-faelle', 'keine-kontrollen', 'laenge'] as const) pruefe(`code ${c}`, abgleichCodeSatz(c).text);
    const r = abgleichen({ gruppe: [1, 1, 0, null], anker: [], zahlen: [[10, 90, 11, 5]], toleranzen: [2], k: 2 });
    if (!r.ok) throw new Error('kein Ergebnis');
    for (const [i, w] of abgleichWarnungen(r).entries()) pruefe(`warnung ${i}`, w);
    for (const [i, w] of abgleichWarnungen().entries()) pruefe(`warnung allgemein ${i}`, w);
    for (const x of ['fall', 'kontrolle', null] as const) pruefe(`rolle ${x}`, abgleichRolleText(x));
    pruefe('name Gruppe', abgleichNameGruppe()); pruefe('name Abgleich', abgleichNameRolle());
    pruefe('art', artText('abgleich'));
    const e: ProtokollEintrag = { nr: 1, art: 'abgleich', spalten: ['Gruppe', 'Abgleich'], betroffen: 3, vorher: 4, nachher: 4, zeit: 0, quelle: 'hand', ergebnis: 'ok', nicht: 'art',
      abgleich: { fall: 'F1', k: 2, anker: [], zahlen: [{ spalte: 'Z1', toleranz: 2 }], faelle: 2, voll: 0, teilweise: 1, ohne: 1, ausgeschlossen: 1 } };
    const v = vermerkText(e);
    pruefe('vermerk', v);   // mehrere Sätze hintereinander, jeder in Klammern; die Namen F1 und Z1 sind Spaltennamen aus den Daten
  });
});
