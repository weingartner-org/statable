import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import '../i18n/profil';
import { ladeSprache, paarText } from '../i18n/laufzeit';
import type { Paar } from '../i18n/laufzeit';
import { EINHEITEN } from './lernplan';
import { THEMEN, ladeThema } from './fragen';

/* Leitfaden Falle 12: Das Thema „Fragebogenbau“ (54 Fragen, Tabellen der Fälle und der Fragen, Einheiten) steht in allen 13 Sprachen da. Die Prüfsprache xx setzt jeden übersetzten Text in [Klammern]; ein deutscher
 * oder englischer Rest außerhalb davon wäre fest eingesetzter Text (Muster: lib/sprachrest-f2.test.ts). Dazu: Die Knopfnamen in den Antworten sind genau die der Oberfläche der Sprache. */
const SPRACHEN = ['fr', 'es', 'it', 'pt', 'nl', 'el', 'hu', 'sv', 'pl', 'uk', 'ro', 'cs', 'bg'] as const;
const modul = await ladeThema('fragebogenbau');
const EIN = EINHEITEN.filter(e => ['konstrukt-item-skala', 'validitaet-arten', 'gute-fragen', 'inhalt-und-zahlen', 'skala-gesamtablauf', 'skalenwert-mittelwert'].includes(e.id));
const paare: { name: string; p: Paar }[] = [];
for (const f of modul.FRAGEN) {
  paare.push({ name: `${f.id}: Stamm`, p: f.stamm });
  f.antworten.forEach((a, i) => { paare.push({ name: `${f.id}: Antwort ${i}`, p: a.text }, { name: `${f.id}: Warum ${i}`, p: a.warum }); });
}
/** Beispieltabellen an einzelnen Fragen (03.11.): Titel, Quelle und Spaltenköpfe stehen wie bei den Fällen in allen Sprachen. */
const MIT_TABELLE = ['fb-summe-gleich', 'fb-umpolen-lesart', 'fb-alpha-eindim', 'fb-trennschaerfe-null', 'fb-val-eng', 'fb-kd-diskriminant', 'fb-gf-alle-ja', 'fb-ga-start', 'fb-ga-umgepolt', 'fb-ga-dimension', 'fb-ga-items', 'fb-sm-werte', 'fb-sm-sechs', 'fb-sm-kurz'];
for (const f of modul.FRAGEN) if (f.tabelle) {
  if (f.tabelle.titel) paare.push({ name: `${f.id}: Tabellentitel`, p: f.tabelle.titel });
  paare.push({ name: `${f.id}: Tabellenquelle`, p: f.tabelle.quelle });
  f.tabelle.kopf.forEach((p, j) => paare.push({ name: `${f.id}: Tabellenkopf ${j}`, p }));
}
for (const [id, fall] of Object.entries(modul.FAELLE ?? {})) {
  paare.push({ name: `${id}: Titel`, p: fall.titel });
  fall.tabellen.forEach((t, i) => {
    if (t.titel) paare.push({ name: `${id}.${i}: Tabellentitel`, p: t.titel });
    paare.push({ name: `${id}.${i}: Quelle`, p: t.quelle });
    t.kopf.forEach((p, j) => paare.push({ name: `${id}.${i}: Kopf ${j}`, p }));
  });
}
for (const e of EIN) paare.push({ name: `${e.id}: alltag`, p: e.alltag }, { name: `${e.id}: fach`, p: e.fach });
for (const t of THEMEN.filter(t => t.id === 'fragebogenbau')) paare.push({ name: 'Thema: alltag', p: t.alltag }, { name: 'Thema: fach', p: t.fach });
/** Wörter mit unverändertem Buchstaben (Prüfsprache ersetzt a e i o u A E O U c n y durch Akzentbuchstaben). */
const rest = (t: string) => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w));
/** Namen und Befehle, die in jeder Sprache so stehen. */
const ERLAUBT = /^(COMPUTE|MEAN|SUM|Gewissenhaft|SPSS|Statable|psych|bfi|SAPA|IPIP|GPL|Cronbach|PCA)$/;

describe('Fragebogenbau: alle Texte haben einen Sprachschlüssel', () => {
  it('Zahl der Paare und Schlüssel', () => {
    expect(modul.FRAGEN).toHaveLength(54);
    expect(paare.length).toBeGreaterThan(250);
    for (const { name, p } of paare) expect(p.k, name).toBeTruthy();
  });
});

describe('Fragebogenbau: Beispieltabellen an den Fragen', () => {
  it('genau diese Fragen tragen eine eigene Tabelle, jede mit Quelle, Titel und Kopf', () => {
    expect(modul.FRAGEN.filter(f => f.tabelle).map(f => f.id).sort()).toEqual([...MIT_TABELLE].sort());
    for (const f of modul.FRAGEN.filter(f => f.tabelle && !f.id.startsWith('fb-ga-') && !f.id.startsWith('fb-sm-'))) {
      expect(f.tabelle!.zeilen.length, f.id).toBeGreaterThan(0);
      expect(f.tabelle!.quelle.de, f.id).toMatch(/Beispielwerte|psych::bfi/);   // erfundene Werte sind als Beispielwerte gekennzeichnet, echte nennen Daten und Lizenz
      expect(f.tabelle!.titel, f.id).toBeTruthy();
    }
  });
  it('erfundene Werte stehen als „Beispielwerte“ im Stamm', () => {
    for (const id of ['fb-summe-gleich', 'fb-umpolen-lesart', 'fb-trennschaerfe-null', 'fb-val-eng', 'fb-kd-diskriminant', 'fb-gf-alle-ja']) {
      const f = modul.FRAGEN.find(x => x.id === id)!;
      expect(f.stamm.de, id).toContain('Beispielwerte'); expect(f.stamm.en, id).toContain('example values');
    }
  });
});

describe('Fragebogenbau: Prüfsprache xx', () => {
  it('kein deutscher oder englischer Rest', async () => {
    await ladeSprache('xx');
    for (const { name, p } of paare) {
      const t = paarText('xx', p);
      expect(t, name).toMatch(/^\[/);
      expect(rest(t.replace(/\b\w+::\w+\b/g, '')).filter(w => !ERLAUBT.test(w)), `${name}: Rest in „${t}“`).toEqual([]);
    }
  });
});

describe('Fragebogenbau: 13 Sprachen', () => {
  it.each(SPRACHEN)('%s: jeder Text übersetzt, Platzhalter vollständig', async sp => {
    await ladeSprache(sp);
    for (const { name, p } of paare) {
      const t = paarText(sp, p);
      const ph = (s: string) => (s.match(/\{\d+\}/g) ?? []).length;
      expect(ph(t), `${sp} ${name}`).toBe(0); // eingesetzt: kein offener Platzhalter
      if (p.en.length > 25 && p.de !== p.en) expect(t, `${sp} ${name}: englischer Rückfall`).not.toBe(p.en.replace(/\{(\d+)\}/g, (_, i) => String(p.w?.[Number(i)] ?? '')));
    }
  });
  it.each(SPRACHEN)('%s: Knopfnamen in den Antworten sind die der Oberfläche', async sp => {
    await ladeSprache(sp);
    const ui = JSON.parse(readFileSync(new URL(`../i18n/sprachen/${sp}.json`, import.meta.url), 'utf8')) as Record<string, string>;
    const knopf = ui['ke0709d8c']!, block = ui['kcbe2f086']!;
    const antw = modul.FRAGEN.flatMap(f => f.antworten.map(a => a.text)).find(p => p.en.includes('Create scale score as a new column'))!;
    expect(paarText(sp, antw), sp).toContain(knopf);
    const erkl = modul.FRAGEN.flatMap(f => f.antworten.flatMap(a => [a.text, a.warum])).find(p => p.en.includes('Next steps with the scale'))!;
    expect(paarText(sp, erkl), sp).toContain(block);
  });
});
