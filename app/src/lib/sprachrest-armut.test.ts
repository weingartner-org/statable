import { IN_ARBEIT } from '../i18n/laufzeit';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import { VERFAHREN, type Ctx } from './verfahren';
import { ASSISTENTEN } from './datenassistenten';
import {
  armutCodeSatz, armutWarnungen, saetzeArmut, tabellenArmut, armutRCode, armutGerechnet, armutFachwort, armutWarum, armutPunkte, armutDaten, armutEntwurf, ARMUT_SPERREN, type ArmutCode, type ArmutE
} from './armut';
import { indexCodeSatz, zeitSperreSatz, laspeyresPaascheSatz, verkettenWarnung, vorjahrHinweis, type IndexCode } from './indexzahlen';
import { sitz, reihe } from './kptesthilfe';
import type { TableItem } from '../engine/types';

/* Leitfaden Falle 12 und 20 für Abschnitt 3 (Index, Armut): Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben (i18n/katalog.mjs, `pseudo`); was außerhalb übrig bleibt, ist fest eingesetzter deutscher oder englischer Text.
 * Voraussetzung: `node i18n/katalog.mjs` wurde nach dem letzten Ändern der Texte gelaufen (schreibt sprachen/xx.json). Muster: lib/sprachrest-kurspaket.test.ts.
 *
 * Der zweite Block (ÜBERSETZUNGEN) prüft, ob die 13 Sprachdateien die neuen Sätze enthalten. Er ist der EINZIGE Test dieser Datei, der aus einem anderen Grund rot sein darf:
 * solange die Übersetzungen fehlen (sie kommen von einem anderen Auftrag), meldet er sie. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const ERLAUBT = ['SE', 'Gini', 'Laspeyres', 'Paasche', 'survey'];
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
const ae = (o: Partial<ArmutE> = {}): ArmutE => ({ einkommen: 'e', gewicht: 'w', klumpen: 'k', schicht: 's', n: 150, ausgelassen: 2, gewichtNull: 1, summeW: 1e5, nullen: 1, negativ: 0, median: 18000, q20: 9000, q80: 30000,
  quoten: [0.4, 0.5, 0.6, 0.7].map(a => ({ anteil: a, schwelle: a * 18000, quote: 10 + a * 10, se: 0.5 })), s80s20: 4, gini: 26, giniSe: 0.3, klumpenN: 20, schichtN: 5, anteil: 0.6, ...o });

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen von Armut und Ungleichheit', () => {
  it('Armut: Sperren, Prüfliste, Sätze (alle Entwürfe, Gini gesperrt, S80/S20 nicht definiert), Warnungen, Tabellen und R-Text', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const c of [...ARMUT_SPERREN, 'negativ', 'nullen', 'klein'] as ArmutCode[]) for (const klumpen of [true, false]) {
      const t = armutCodeSatz(c, { n: 5, nullen: 2, negativ: 1, duenn: 2, klumpen }); pruefe(`code ${c}`, t.text); if (t.klein) pruefe(`code ${c} klein`, t.klein);
    }
    const q = sitz({ e: reihe(40, 1, 5, 7).map((v, i) => (i === 3 ? -5 : i === 4 ? 0 : v)), w: reihe(40, 1, 2, 5), k: Array.from({ length: 40 }, (_, i) => `k${i % 8}`), s: Array.from({ length: 40 }, (_, i) => `s${i % 2}`) }, ['k', 's']);
    for (const p of armutPunkte(armutDaten('e', 'w', 'k', 's', q.zeilen.map((z, i) => (i === 7 ? [z[0]!, null, z[2]!, z[3]!] : z)), q.spalten))) { pruefe(`punkt ${p.art}`, p.text); if (p.klein) pruefe(`punkt ${p.art} klein`, p.klein); }
    for (const [n, e] of Object.entries({ voll: ae(), einzeln: ae({ klumpen: null, schicht: null }), nurKlumpen: ae({ schicht: null }), nurSchicht: ae({ klumpen: null }), negativ: ae({ negativ: 2, gini: null, giniSe: null, s80s20: null }), ohne80: ae({ s80s20: null }), klein: ae({ n: 120 }) })) {
      const st = saetzeArmut(e, x => x);
      for (const [k, v] of Object.entries({ haupt: st.haupt, zusatz: st.zusatz })) pruefe(`satz ${n} ${k}`, v);
      kopfOk(`satz ${n} apa`, st.apa);
      for (const [i, w] of armutWarnungen(e).entries()) pruefe(`warnung ${n} ${i}`, w);
      pruefe(`entwurf ${n}`, armutEntwurf(e, x => x));
      tabellenOk(`armut ${n}`, tabellenArmut(e, x => x));
    }
    pruefe('gerechnet', armutGerechnet()); pruefe('fachwort', armutFachwort()); pruefe('warum', armutWarum());
    for (const [k, l, sc] of [['k', 's'], ['k', null], [null, 's'], [null, null]].map(([a, b]) => ['e', a, b] as [string, string | null, string | null])) expect(armutRCode(k, 'w', l, sc)).toContain('# [');
  });
  it('Indexzahlen: Sperren und Hinweise', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const codes: IndexCode[] = ['basis-leer', 'basis-fehlt', 'basis-null', 'raster', 'doppelt', 'zu-kurz', 'datum', 'kein-gemeinsam', 'u-ungueltig', 'basis-null', 'laenge', 'zu-wenig-gueter', 'basis-leer', 'basis-ungueltig'];
    for (const c of codes) for (const k of [{ fehlend: 1, zeilen: 3 }, { fehlend: 4 }, { grund: 'fehlt' as const }, { grund: 'preis' as const }, { grund: 'menge' as const }]) { const t = indexCodeSatz(c, k); pruefe(`code ${c}`, t.text); if (t.klein) pruefe(`code ${c} klein`, t.klein); }
    for (const g of ['fehlt', 'preis', 'menge'] as const) for (const n of [1, 3]) pruefe(`sperre ${g} ${n}`, zeitSperreSatz(n, g));
    pruefe('laspeyres', laspeyresPaascheSatz()); pruefe('verketten', verkettenWarnung()); pruefe('vorjahr', vorjahrHinweis());
    pruefe('assistent', ASSISTENTEN.find(a => a.id === 'index')!.name());
  });
  it('die Karte: Titel, Zusatz, Beispiel, Satz, Fragen, Fachwort und „Warum“', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const v = VERFAHREN.find(x => x.id === 'armut')!, w = { l1: ['a'], l2: ['c'], l3: ['d'], l4: ['e'] };
    pruefe('Titel', v.titel); pruefe('Zusatz', v.zusatz!); pruefe('Beispiel', v.beispiel); v.satz.forEach((t, i) => { if (t.replace(/[\s.;]/g, '')) pruefe(`Satz ${i}`, t.trim()); });
    v.luecken.forEach(l => { pruefe(`Frage ${l.schluessel}`, l.frage); if (l.ohne) pruefe(`ohne ${l.schluessel}`, l.ohne); if (l.keine) pruefe(`keine ${l.schluessel}`, l.keine([], {} as Ctx)); });
    pruefe('Fachwort', v.fachwort(w, {} as never)); pruefe('Warum', v.warum(w, {} as never)); expect(v.titelBlatt(w, n => ({ name: n, bezeichnung: n }) as never)).toContain('[');
    expect(v.syntax(w, {} as never)).toContain('# [');
  });
});

describe('ÜBERSETZUNGEN der neuen Sätze (rot, solange sie in den 13 Sprachdateien fehlen; der einzige Test hier, der deshalb rot sein darf)', () => {
  const katalog = JSON.parse(readFileSync(new URL('../i18n/katalog.json', import.meta.url), 'utf8')) as Record<string, { de: string | string[]; orte: string[] }>;
  const NEUE_DATEIEN = ['lib/armut.ts', 'lib/indexzahlen.ts', 'bausteine/AssistentIndex.svelte', 'bausteine/BlattArmut.svelte'];
  /** Neue Sätze in bestehenden Dateien (Karte, Bericht, Gewicht, Assistenten), erkannt an ihrem Anfang. */
  const IN_BESTEHENDEN = ['Wie ungleich ist das Einkommen verteilt?', 'Armutsquote, S80/S20', 'Die Auswertung von Armut und Ungleichheit', 'Armut und Ungleichheit mit R und survey', 'Indexzahlen', 'Statable rechnet dieses Verfahren mit R (Paket survey)'];
  const nachDe = (k: { de: string | string[] }) => [k.de].flat().at(-1)!;
  const noetig = Object.entries(katalog).filter(([, v]) => v.orte.some(o => NEUE_DATEIEN.includes(o)) || IN_BESTEHENDEN.some(g => nachDe(v).includes(g))).map(([k]) => k);
  const ordner = new URL('../i18n/sprachen/', import.meta.url);
  const sprachen = readdirSync(ordner).filter(f => /^[a-z]{2}\.json$/.test(f) && !/^x[xr]/.test(f)).map(f => f.slice(0, 2)).filter(c => !(IN_ARBEIT as string[]).includes(c)); // Sprachen in Arbeit (Bauplan 7 Sprachen) zählen erst ab der Freigabe

  it('der Katalog kennt die neuen Sätze (Prüfung der Prüfung)', () => { expect(noetig.length).toBeGreaterThan(80); expect(sprachen.length).toBe(13); });
  it('jede der 13 Sprachen hat jeden neuen Satz', () => {
    const fehlt: string[] = [];
    for (const sp of sprachen) {
      const tab: Record<string, unknown> = { ...JSON.parse(readFileSync(new URL(`${sp}.json`, ordner), 'utf8')), ...(existsSync(new URL(`${sp}.hilfe.json`, ordner)) ? JSON.parse(readFileSync(new URL(`${sp}.hilfe.json`, ordner), 'utf8')) : {}) };
      const weg = noetig.filter(k => !(k in tab));
      if (weg.length) fehlt.push(`${sp}: ${weg.length} von ${noetig.length} fehlen`);
    }
    expect(fehlt, 'Übersetzungen fehlen noch (kommen aus einem anderen Auftrag)').toEqual([]);
  });
});
