import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import { satzPartiell, satzMessw, satzR2Zuwachs, satzR2ZuwachsSens, satzAnovaFaktoren, satzAncova, satzKontrast, hinweisFestesModell, type Fmt } from './power';
import { rake, rakingSaetze, rakingFehlerSatz, rakingSeSatz } from './raking';

/* Leitfaden Falle 12 und 20: Ein fertiger Sprachtext, der in ein anderes `L(…)` eingesetzt wird, bleibt in jeder Sprache deutsch oder englisch.
 * Die Prüfsprache „xx“ setzt jeden übersetzten Text in [Klammern] mit Akzentbuchstaben. Zahlen, Zeichen (α, ρp, f², N) und Satzzeichen sind erlaubt. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const FMT: Fmt = { en: false, punkt: false };
/** Wörter mit unverändertem Buchstaben: Die Prüfsprache ersetzt a e i o u A E O U c n y durch Akzentbuchstaben (i18n/katalog.mjs, `pseudo`). Ein Wort mit einem dieser Buchstaben ohne Akzent
 *  ist darum nie aus der Sprachdatei, sondern fest eingesetzter deutscher oder englischer Text. */
export function rest(t: string): string[] { return (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w)); }
const pruefe = (name: string, t: string) => { expect(t, name).toMatch(/^\[/); expect(rest(t), `${name}: Rest außerhalb der Klammern in „${t}“`).toEqual([]); };

describe('Prüfsprache xx: kein deutscher oder englischer Rest in den Sätzen der Welle S-F2', () => {
  it('satzPartiell (exakt und fest, 0, 1 und 3 Kontrollvariablen, ein- und zweiseitig)', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const weg of ['exakt', 'fest'] as const) for (const k of [0, 1, 3]) for (const seiten of [1, 2] as const)
      pruefe(`partiell ${weg} k${k} s${seiten}`, satzPartiell({ rp: 0.3, k, alpha: 0.05, ziel: 0.8, seiten, weg, N: 87 }, FMT));
  });
  it('satzMessw (drei Effekte, ε 1 und ,75, eine und mehrere Gruppen, eine und mehrere Messungen)', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const typ of ['innerhalb', 'zwischen', 'wechsel'] as const) for (const eps of [1, 0.75]) for (const k of [1, 3]) for (const m of [2, 3])
      pruefe(`messw ${typ} e${eps} k${k} m${m}`, satzMessw({ typ, k, m, f: 0.25, rho: 0.5, eps, alpha: 0.05, ziel: 0.8, N: 28 }, FMT));
  });
  it('R²-Zuwachs, Sensitivität, mehrere Faktoren, Kovariate, Kontrast und der Pflichthinweis', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    for (const [q, m] of [[1, 1], [1, 4], [4, 9]] as [number, number][]) { pruefe(`r2 ${q}/${m}`, satzR2Zuwachs({ f2: 0.07, q, m, alpha: 0.01, ziel: 0.8, N: 242 }, FMT)); pruefe(`sens ${q}/${m}`, satzR2ZuwachsSens({ f2: 0.09, q, m, alpha: 0.05, ziel: 0.8, N: 100 }, FMT)); }
    for (const [effekt, name, df1] of [['A×B', undefined, 4], ['A', undefined, 2], ['B', 'C', 1], ['A×B', 'A×C', 1]] as const)
      pruefe(`faktoren ${effekt}`, satzAnovaFaktoren({ a: 3, b: 3, ...(name === 'C' ? { c: 2 } : {}), effekt, ...(name ? { effektName: name } : {}), f: 0.25, df1, alpha: 0.05, ziel: 0.8, N: 196, jeZelle: 22, NGleich: 198 }, FMT));
    for (const kovariaten of [1, 2]) pruefe(`ancova ${kovariaten}`, satzAncova({ f: 0.25, r2kov: 0.2, kovariaten, df1: 2, zellen: 6, alpha: 0.05, ziel: 0.8, N: 127 }, FMT));
    pruefe('kontrast', satzKontrast({ f: 0.4, gruppen: 4, alpha: 0.05, ziel: 0.8, N: 40 }, FMT));
    pruefe('hinweis', hinweisFestesModell(FMT));
  });
  it('Raking: Sätze, Fehlersätze, Hinweis zum Standardfehler', async () => {
    await ladeSprache('xx'); s.einst.sprache = 'xx';
    const g = ['w', 'm', 'w', 'm', 'w', 'm', 'w', 'w'], a = ['j', 'j', 'a', 'a', 'j', 'a', null, 'a'] as (string | null)[];
    const e = rake({ faktoren: [g, a], raender: [{ w: 40, m: 10 }, { j: 5, a: 45 }] });
    if (!e.ok) throw new Error('Raking sollte gehen');
    for (const satz of rakingSaetze(e, ['#1', '#2'])) pruefe('raking-satz', satz);
    for (const code of ['merkmale', 'rand-fehlt', 'zu-wenig', 'kategorie-ohne-stichprobe', 'kategorie-ohne-rand', 'rand-null', 'nicht-erreicht'] as const)
      pruefe(`raking-fehler ${code}`, rakingFehlerSatz({ ok: false, code, merkmal: 0, kategorie: 'x', maxAbweichung: 0.2, durchgaenge: 1000 }, ['#1']));
    pruefe('raking-se', rakingSeSatz());
  });
});
