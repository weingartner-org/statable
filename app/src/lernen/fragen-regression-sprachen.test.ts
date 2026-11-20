import { describe, expect, it } from 'vitest';
import '../i18n/profil';
import { ladeSprache, paarText } from '../i18n/laufzeit';
import type { Paar } from '../i18n/laufzeit';
import { EINHEITEN, PFADE } from './lernplan';
import { ladeThema, type Diagramm } from './fragen';

/* Leitfaden Falle 12: Die 43 Regressionsfragen (reg-tl-, reg-mv-, reg-sv-, reg-ef-, reg-dp-, darunter acht Streudiagramme mit Titel, Achsen, Gruppen, Kurzbeschreibung und Quelle, und die 13 neuen zu Deckeneffekt, r über 0,9 und kleiner Stichprobe mit eigenen Tabellen), ihre Fälle (rg-*), die fünf Einheiten und der Pfad „regression-lesen“ stehen in allen 13 Sprachen da.
 * Die Prüfsprache xx setzt jeden übersetzten Text in [Klammern]; ein deutscher oder englischer Rest außerhalb davon wäre fest eingesetzter Text (Muster: fragen-fragebogenbau-sprachen.test.ts). */
const SPRACHEN = ['fr', 'es', 'it', 'pt', 'nl', 'el', 'hu', 'sv', 'pl', 'uk', 'ro', 'cs', 'bg'] as const;
const modul = await ladeThema('regression');
const NEU = /^reg-(tl|mv|sv|ef|dp)-/;
const FALL_IDS = ['rg-mt', 'rg-md', 'rg-c93', 'rg-eb', 'rg-ef', 'rg-dp', 'rg-vk', 'rg-kn', 'rg-gm', 'rg-r9m'];
const EIN_IDS = ['regression-tabelle-lesen', 'regression-modelle-vergleichen', 'regression-studien-vergleichen', 'regression-effekte-einordnen', 'daten-probleme-regression'];
const fragen = modul.FRAGEN.filter(f => NEU.test(f.id));
const paare: { name: string; p: Paar }[] = [];
for (const f of fragen) {
  paare.push({ name: `${f.id}: Stamm`, p: f.stamm });
  f.antworten.forEach((a, i) => { paare.push({ name: `${f.id}: Antwort ${i}`, p: a.text }, { name: `${f.id}: Warum ${i}`, p: a.warum }); });
  if (f.tabelle) {   // eigene Tabelle der Frage (Deckeneffekt, r über 0,9, kleine Stichprobe)
    if (f.tabelle.titel) paare.push({ name: `${f.id}: Tabellentitel`, p: f.tabelle.titel });
    paare.push({ name: `${f.id}: Quelle`, p: f.tabelle.quelle });
    f.tabelle.kopf.forEach((p, j) => paare.push({ name: `${f.id}: Kopf ${j}`, p }));
  }
}
for (const id of Object.keys(modul.FAELLE ?? {}).filter(id => FALL_IDS.some(x => id === x || id.startsWith(`${x}.`)))) {
  const fall = modul.FAELLE![id]!;
  paare.push({ name: `${id}: Titel`, p: fall.titel });
  fall.tabellen.forEach((t, i) => {
    if (t.titel) paare.push({ name: `${id}.${i}: Tabellentitel`, p: t.titel });
    paare.push({ name: `${id}.${i}: Quelle`, p: t.quelle });
    t.kopf.forEach((p, j) => paare.push({ name: `${id}.${i}: Kopf ${j}`, p }));
  });
}
/** Diagramme (Streudiagramme der Fragen und Fälle): Titel, Achsen, Gruppen, Kurzbeschreibung und Quelle. */
const diagramme: { name: string; d: Diagramm }[] = [
  ...fragen.filter(f => f.diagramm).map(f => ({ name: f.id, d: f.diagramm! })),
  ...Object.entries(modul.FAELLE ?? {}).flatMap(([id, fall]) => (fall.diagramme ?? []).map((d, i) => ({ name: `${id}.d${i}`, d })))
];
for (const { name, d } of diagramme) {
  if (d.titel) paare.push({ name: `${name}: Diagrammtitel`, p: d.titel });
  paare.push({ name: `${name}: Achse x`, p: d.x }, { name: `${name}: Achse y`, p: d.y }, { name: `${name}: Kurzbeschreibung`, p: d.kurz }, { name: `${name}: Diagrammquelle`, p: d.quelle });
  d.gruppen?.forEach((g, i) => paare.push({ name: `${name}: Gruppe ${i}`, p: g }));
}
const einheiten = EINHEITEN.filter(e => EIN_IDS.includes(e.id));
for (const e of einheiten) paare.push({ name: `${e.id}: alltag`, p: e.alltag }, { name: `${e.id}: fach`, p: e.fach });
const pfad = PFADE.find(p => p.id === 'regression-lesen')!;
paare.push({ name: 'Pfad regression-lesen', p: pfad.name });
/** Wörter mit unverändertem Buchstaben (Prüfsprache ersetzt a e i o u A E O U c n y durch Akzentbuchstaben). */
const rest = (t: string) => (t.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) ?? []).filter(w => /[aeiouAEOUcny]/.test(w));
/** Namen, Spalten und Befehle, die in jeder Sprache so stehen. */
const ERLAUBT = /^(mpg|wt|am|hp|cyl|disp|lm|Beta|Sig|VIF|Tolerance|Cars|MASS|mtcars|cars|iris|Man|trans|avail|SPSS|Statable|R|Std|Error|Coefficients|Model|Summary|Constant|Intercept|Unstandardized|Standardized|Collinearity|Statistics|Education|Catholic|Fertility|Price|Weight|Horsepower|Length|Width|Species|Sepal|Petal)$/;

describe('Regression: alle neuen Texte haben einen Sprachschlüssel', () => {
  it('Zahl der Fragen, Einheiten, Fälle und Schlüssel', () => {
    expect(fragen).toHaveLength(43);
    expect(einheiten).toHaveLength(5);
    expect(Object.keys(modul.FAELLE ?? {}).filter(id => id.startsWith('rg-')).length).toBeGreaterThanOrEqual(FALL_IDS.length);
    expect(paare.length).toBeGreaterThan(250);
    expect(diagramme.map(x => x.name).sort(), 'Diagramme der Regressionsfragen').toEqual(['reg-dp-decke-wirkung', 'reg-dp-r90-umkehr', 'reg-sv-streuung', 'rg-dp.d0', 'rg-dp.d1', 'rg-gm.d0', 'rg-kn.d0', 'rg-kn.d1']);
    for (const { name, p } of paare) expect(p.k, name).toBeTruthy();
  });
});

describe('Regression: Prüfsprache xx', () => {
  it('kein deutscher oder englischer Rest', async () => {
    await ladeSprache('xx');
    for (const { name, p } of paare) {
      const t = paarText('xx', p);
      expect(t, name).toMatch(/^\[/);
      expect(rest(t.replace(/\b\w+::\w+\b/g, '')).filter(w => !ERLAUBT.test(w)), `${name}: Rest in „${t}“`).toEqual([]);
    }
  });
});

describe('Regression: 13 Sprachen', () => {
  it.each(SPRACHEN)('%s: jeder Text übersetzt, Platzhalter vollständig', async sp => {
    await ladeSprache(sp);
    for (const { name, p } of paare) {
      const t = paarText(sp, p);
      expect((t.match(/\{\d+\}/g) ?? []).length, `${sp} ${name}`).toBe(0); // eingesetzt: kein offener Platzhalter
      if (p.en.length > 25 && p.de !== p.en) expect(t, `${sp} ${name}: englischer Rückfall`).not.toBe(p.en.replace(/\{(\d+)\}/g, (_, i) => String(p.w?.[Number(i)] ?? '')));
    }
  });
});
