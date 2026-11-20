/* Wächter für Üben (Fachblatt docs/fachblaetter/UEBEN-MC.md, „Regeln für jede Frage“). */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { artikelListe, artikelTeile } from '../hilfe/artikel';
import { ladeGlossar } from '../hilfe/glossar';
import { SEITE } from './fragen-seite';
import { ZELLEN, DATENNAMEN } from './fragen-zellen';
import { KARTEN_ALLE } from '../lib/fach';
import { zufall } from '../lib/zufall';
import { THEMEN, ladeThema, themaFuerHilfe, mische, mischeAntworten, baueRunde, falscheNochEinmal, zaehleRichtig, istRichtig, eingeschaetzt, type Frage, type Tabelle, type Antwortstand } from './fragen';

const WISSEN = '/Users/johannes/Entwicklung/pspp-web/kurs-lokal/bibliothek/wissen.json';
const ERWARTET = new URL('../lib/testdaten/ueben-erwartet.json', import.meta.url);
const PROBIEREN = ['verteilungen', 'kennzahlen', 'vergleich', 'anteilstest', 'lernlabor', 'zuteilung', 'effekt', 'kennlinie', 'gerade', 'lernlabor/baum'];
/** Spuren fremder Unterlagen (Fachblatt „Verboten“). */
const VERBOTEN = /zeitmanagement|wiederholungsstrateg|lernen im studium|statistikangst|ablenkbarkeit|\bFG\d+\b/i;
const alle = (p: { de: string; en: string }) => [p.de, p.en];
await ladeGlossar('de');   // die Begriffe des großen Glossars (Wahrscheinlichkeit u. a.) laden erst mit der Hilfe
const hilfeIds = new Set(artikelListe('de').map(a => a.id));

const geladen = await Promise.all(THEMEN.filter(t => t.n > 0).map(async t => ({ t, m: await ladeThema(t.id) })));
const fragen: Frage[] = geladen.flatMap(x => x.m.FRAGEN);

describe('Themenliste', () => {
  it('Zahl der Fragen stimmt, Hilfe-Ids und Zuordnung existieren', () => {
    for (const { t, m } of geladen) {
      expect(m.FRAGEN.length, t.id).toBe(t.n);
      expect(m.FRAGEN.every(f => f.thema === t.id), t.id).toBe(true);
      for (const h of t.hilfe) { expect(hilfeIds.has(h), h).toBe(true); expect(themaFuerHilfe(h)?.id).toBe(t.id); }
    }
    expect(new Set(fragen.map(f => f.id)).size).toBe(fragen.length);
  });
  it('Alltagsfrage und Fachbegriff stehen in beiden Sprachen da', () => {
    for (const t of THEMEN) for (const p of [t.alltag, t.fach]) for (const x of alle(p)) expect(x.trim().length, t.id).toBeGreaterThan(3);
  });
});

describe('Seitenleiste zu jeder Frage (Johannes 31.10.)', () => {
  it('jede Frage hat eine Erklärung, und sie steht in der Hilfe mit Text', () => {
    expect(Object.keys(SEITE).sort()).toEqual(fragen.map(f => f.id).sort());
    for (const f of fragen) {
      const id = SEITE[f.id]!;
      expect(hilfeIds.has(id), `${f.id}: ${id}`).toBe(true);
      for (const sp of ['de', 'en'] as const) expect(artikelTeile(id, ['kurz'], sp).length, `${f.id}: ${id} (${sp})`).toBeGreaterThan(0);
    }
  });
});

describe('Fremdsprachen (Fall vom 31.10.: Antworten blieben englisch)', () => {
  it('Stamm, Antworten und Erklärungen haben einen Sprachschlüssel', () => {
    for (const f of fragen) for (const p of [f.stamm, ...f.antworten.flatMap(x => [x.text, x.warum])]) expect(p.k, `${f.id}: ${p.en}`).toBeTruthy();
  });
});

describe('Regeln für jede Frage', () => {
  it('drei bis fünf Antworten, genau eine richtig, je Antwort ein Warum (vier Aussagen bei „mehrere möglich“)', () => {
    for (const f of fragen) {
      if (f.mehrfach) {
        expect(f.antworten, f.id).toHaveLength(4);
        expect(f.antworten.filter(a => a.richtig).length, f.id).toBeGreaterThanOrEqual(1);
        expect(f.antworten.filter(a => !a.richtig).length, f.id).toBeGreaterThanOrEqual(1);
      } else {
        expect(f.antworten.length, f.id).toBeGreaterThanOrEqual(3);
        expect(f.antworten.length, f.id).toBeLessThanOrEqual(5);
        expect(f.antworten.filter(a => a.richtig), f.id).toHaveLength(1);
      }
      for (const a of f.antworten) { for (const x of [...alle(a.text), ...alle(a.warum)]) expect(x.trim().length, f.id).toBeGreaterThan(5); }
    }
  });
  it('keine verbotenen Wörter, keine Spuren fremder Unterlagen', () => {
    for (const f of fragen) {
      const text = [...alle(f.stamm), ...f.antworten.flatMap(a => [...alle(a.text), ...alle(a.warum)]), ...f.belege].join(' \n ');
      expect(text, f.id).not.toMatch(VERBOTEN);
    }
  });
  it('kein „alle oben“, keine Wahr-Falsch-Form, kein „nicht“ im Stamm, keine Hinweiswörter in den Antworten', () => {
    for (const f of fragen) {
      for (const a of f.antworten) for (const x of alle(a.text)) {
        expect(x, f.id).not.toMatch(/\b(alle|keine) (der )?(oben|genannten|obigen)|all of the above|none of the above/i);
        expect(x, f.id).not.toMatch(/\b(immer|nie|stets|niemals|always|never)\b/i);
      }
      const [de, en] = alle(f.stamm);
      expect(de, f.id).not.toMatch(/\bnicht\b/i); expect(en, f.id).not.toMatch(/\bnot\b/i);
      expect(de, f.id).not.toMatch(/wahr oder falsch|richtig oder falsch/i);
    }
  });
  it('jede Hilfe-id, Karte und Ausprobier-Kachel existiert', () => {
    for (const f of fragen) {
      expect(f.hilfe.length, f.id).toBeGreaterThan(0);
      for (const h of f.hilfe) expect(hilfeIds.has(h), `${f.id}: ${h}`).toBe(true);
      if (f.karte) expect(KARTEN_ALLE, f.id).toContain(f.karte);
      if (f.probieren) expect(PROBIEREN, f.id).toContain(f.probieren);
      if (f.fall) expect(geladen.find(x => x.t.id === f.thema)!.m.FAELLE?.[f.fall], `${f.id}: Fall ${f.fall}`).toBeTruthy();
    }
  });
  it('Belege vorhanden; wissen:<id> steht in wissen.json (wenn die Datei da ist); Hilfe:<id>, Fachblatt:<NAME> und Code:<Datei> gibt es', () => {
    const ids = existsSync(WISSEN) ? new Set((JSON.parse(readFileSync(WISSEN, 'utf8')) as { id: string }[]).map(w => w.id)) : null;
    for (const f of fragen) {
      expect(f.belege.length, f.id).toBeGreaterThan(0);
      for (const b of f.belege) {
        expect(b.trim().length, f.id).toBeGreaterThan(3);
        if (ids && b.startsWith('wissen:')) expect(ids.has(b.slice(7)), `${f.id}: ${b}`).toBe(true);
        // Funktionsfragen (Charge 4): Beleg ist der Hilfe-Artikel, das Fachblatt der Funktion oder der Code des Assistenten; jeder muss es geben
        if (b.startsWith('Hilfe:')) expect(hilfeIds.has(b.slice(6)), `${f.id}: ${b}`).toBe(true);
        if (b.startsWith('Fachblatt:')) expect(existsSync(new URL(`../../../docs/fachblaetter/${b.slice(10)}.md`, import.meta.url)), `${f.id}: ${b}`).toBe(true);
        if (b.startsWith('Code:')) expect(existsSync(new URL(`../${b.slice(5)}`, import.meta.url)), `${f.id}: ${b}`).toBe(true);
      }
    }
  });
  it('Zahlen in den Tabellen stimmen mit ueben-erwartet.json überein', () => {
    expect(existsSync(ERWARTET), 'ueben-erwartet.json fehlt (Rscript scripts/ueben-erwartet.R)').toBe(true);
    const erw = JSON.parse(readFileSync(ERWARTET, 'utf8')) as Record<string, (string | number)[][]>;
    for (const { t, m } of geladen) {
      if (t.id === 'beispiele' || t.id === 'psychologie2' || t.id === 'pruefschritte') continue;   // psychologie2: eigener Wächter fragen-psychologie-2.test.ts; Fallreihen zu den echten Beispielen: eigene Sollwerte, eigener Wächter (fragen-beispiele-echt.test.ts)
      const tabs: [string, Tabelle][] = [];
      for (const f of m.FRAGEN) if (f.tabelle) tabs.push([f.id, f.tabelle]);
      for (const [k, v] of Object.entries(m.FAELLE ?? {})) v.tabellen.forEach((tb, i) => tabs.push([`${k}.${i}`, tb]));
      for (const [schluessel, tb] of tabs) {
        const soll = erw[schluessel];
        expect(soll, `ueben-erwartet.json fehlt Eintrag ${schluessel}`).toBeTruthy();
        expect(tb.zeilen, schluessel).toEqual(soll);
      }
    }
  });
});

describe('Zeilenbeschriftungen der Tabellen (Johannes 01.11.)', () => {
  /** Alle Textzellen mit Buchstaben aus allen Tabellen und Fallreihen. */
  const textzellen = new Set<string>();
  for (const { m } of geladen) {
    const tabs: Tabelle[] = [...m.FRAGEN.flatMap(f => (f.tabelle ? [f.tabelle] : [])), ...Object.values(m.FAELLE ?? {}).flatMap(v => v.tabellen)];
    for (const tb of tabs) for (const z of tb.zeilen) for (const c of z) if (typeof c === 'string' && /\p{L}/u.test(c)) textzellen.add(c);
  }
  it('jede Textzelle steht in ZELLEN (mit beiden Sprachen) oder ist ein Name aus den Daten', () => {
    const fehlt = [...textzellen].filter(c => !(c in ZELLEN) && !DATENNAMEN.includes(c));
    expect(fehlt, 'Zellen ohne Eintrag in fragen-zellen.ts').toEqual([]);
    for (const [k, p] of Object.entries(ZELLEN)) { expect(p.de.trim().length, k).toBeGreaterThan(0); expect(p.en.trim().length, k).toBeGreaterThan(0); }
  });
  it('kein Eintrag in ZELLEN oder DATENNAMEN ohne Tabelle, und kein Name doppelt', () => {
    expect([...Object.keys(ZELLEN), ...DATENNAMEN].filter(k => !textzellen.has(k)), 'Einträge ohne Zelle').toEqual([]);
    expect(Object.keys(ZELLEN).filter(k => DATENNAMEN.includes(k))).toEqual([]);
  });
});

describe('Zahlen im Text stammen aus ueben-erwartet.json', () => {
  const erw = JSON.parse(readFileSync(ERWARTET, 'utf8')) as Record<string, unknown>;
  /** Alle Zahlen der Erwartungsdatei (Werte und Tabellenzellen) als Beträge. */
  const bekannt: number[] = [];
  const sammle = (x: unknown): void => {
    if (typeof x === 'number') bekannt.push(Math.abs(x));
    else if (typeof x === 'string') { const m = /^<?(-?\d*\.\d+)$/.exec(x); if (m) bekannt.push(Math.abs(Number(m[1]))); }
    else if (Array.isArray(x)) x.forEach(sammle);
    else if (x && typeof x === 'object') Object.values(x).forEach(sammle);
  };
  for (const [k, v] of Object.entries(erw)) if (k !== 'herkunft') sammle(v);
  // LE3 (14.11.2026): die Zahlen der Fragen sf-rs-* (Ergebnis in R nachrechnen) kommen aus scripts/ueben-erwartet-r-skript.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-r-skript.json', import.meta.url), 'utf8')));
  // B4 Teil 3b-3 (14.11.2026): die Zahlen der Fragen lkl-* (latente Klassen) kommen aus scripts/ueben-erwartet-klassen.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-klassen.json', import.meta.url), 'utf8')));
  // V5 Teil 2 (14.11.2026): die Zahlen der Fragen ml-* (Maschinelles Lernen verstehen) kommen aus scripts/ueben-erwartet-ml.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-ml.json', import.meta.url), 'utf8')));
  // B4 Teil 1 (14.11.2026): die Zahlen der Fragen lgm-* (Wachstumskurven) kommen aus scripts/ueben-erwartet-wachstum.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-wachstum.json', import.meta.url), 'utf8')));
  // B4 Teil 2 (14.11.2026): die Zahlen der Fragen nw-* (Netzwerkanalyse) kommen aus scripts/ueben-erwartet-netzwerk.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-netzwerk.json', import.meta.url), 'utf8')));
  // B4 Teil 3 (14.11.2026): die Zahlen der Fragen lpr-* (latente Profile) kommen aus scripts/ueben-erwartet-profile.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-profile.json', import.meta.url), 'utf8')));
  // B2 Teil 1c (14.11.2026): die Zahlen der Fragen pan-* (Paneldaten) kommen aus scripts/ueben-erwartet-panel.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-panel.json', import.meta.url), 'utf8')));
  // B2 Teil 2b (14.11.2026): die Zahlen der Fragen iv-* (Instrumentvariablen) kommen aus scripts/iv-erwartet.R
  sammle(JSON.parse(readFileSync(new URL('../lib/iv-erwartet.json', import.meta.url), 'utf8')));
  // B2 Teil 2c (14.11.2026): die Zahlen der Fragen did-* (Differenz-in-Differenzen) kommen aus scripts/did-erwartet.R
  sammle(JSON.parse(readFileSync(new URL('../lib/did-erwartet.json', import.meta.url), 'utf8')));
  // B2 Teil 2d-3 (14.11.2026): die Zahlen der Fragen rd-* (Regressions-Diskontinuität) kommen aus scripts/rd-erwartet.R
  sammle(JSON.parse(readFileSync(new URL('../lib/rd-erwartet.json', import.meta.url), 'utf8')));
  // B3 Teil 2c (15.11.2026): die Zahlen der Fragen eh-dl-* (Delphi-Befragung) kommen aus scripts/ueben-erwartet-delphi.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-delphi.json', import.meta.url), 'utf8')));
  // B3 Teil 4c (15.11.2026): die Zahlen der Fragen eh-cm-* (Concept Mapping) kommen aus scripts/ueben-erwartet-conceptmap.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-conceptmap.json', import.meta.url), 'utf8')));
  // B3 Teil 3c (15.11.2026): die Zahlen der Fragen eh-qm-* (Q-Methode) kommen aus scripts/ueben-erwartet-qmethode.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-qmethode.json', import.meta.url), 'utf8')));
  // B3 Teil 1c (14.11.2026): die Zahlen der Fragen eh-ta-* (Wörter zählen) kommen aus scripts/ueben-erwartet-textanalyse.R
  sammle(JSON.parse(readFileSync(new URL('../lib/testdaten/ueben-erwartet-textanalyse.json', import.meta.url), 'utf8')));
  const zahlen = (t: string) => [...t.matchAll(/(\d+)[.,](\d+)/g)].map(m => ({ s: m[0], v: Number(`${m[1]}.${m[2]}`) }));
  it('jede Dezimalzahl in Stamm, Antworten, Erklärungen und Tabellentiteln kommt in der Erwartungsdatei vor', () => {
    for (const { t, m } of geladen) {
      if (t.id === 'beispiele' || t.id === 'psychologie2' || t.id === 'pruefschritte') continue;
      const texte: [string, string][] = [];
      for (const f of m.FRAGEN) {
        for (const x of alle(f.stamm)) texte.push([f.id, x]);
        for (const a of f.antworten) for (const x of [...alle(a.text), ...alle(a.warum)]) texte.push([f.id, x]);
      }
      for (const [k, fall] of Object.entries(m.FAELLE ?? {})) {
        for (const x of alle(fall.titel)) texte.push([k, x]);
        for (const tb of fall.tabellen) { for (const x of [...alle(tb.quelle), ...(tb.titel ? alle(tb.titel) : [])]) texte.push([k, x]); }
      }
      for (const f of m.FRAGEN) if (f.tabelle) for (const x of [...alle(f.tabelle.quelle), ...(f.tabelle.titel ? alle(f.tabelle.titel) : [])]) texte.push([f.id, x]);
      for (const [id, text] of texte) for (const z of zahlen(text)) {
        const stellen = z.s.split(/[.,]/)[1]!.length;   // auf die gezeigten Stellen gerundete Werte zählen (zum Beispiel 3,9 für 3,932)
        expect(bekannt.some(b => Math.abs(b - z.v) < 1e-9 || Number(b.toFixed(stellen)) === z.v), `${t.id} ${id}: Zahl ${z.s} fehlt in ueben-erwartet.json`).toBe(true);
      }
    }
  });
  it('Deutsch hat Komma, Englisch Punkt (keine vermischten Dezimalzeichen)', () => {
    for (const f of fragen) {
      const [de, en] = [alle(f.stamm)[0]!, alle(f.stamm)[1]!];
      expect(de, f.id).not.toMatch(/\d\.\d/); expect(en, f.id).not.toMatch(/\d,\d/);
    }
  });
  it('die Tabellen jeder Frage stehen mit ihren Zeilen in der Erwartungsdatei (kein Fall ohne Eintrag)', () => {
    for (const { t, m } of geladen) if (t.id !== 'beispiele' && t.id !== 'psychologie2' && t.id !== 'pruefschritte') for (const k of Object.keys(m.FAELLE ?? {})) expect(erw[`${k}.0`], k).toBeTruthy();
  });
});

const probeFrage = (id: string, fall?: string): Frage => ({
  id, thema: 'x', fall, stamm: { de: id, en: id }, hilfe: ['p-wert'], belege: ['t'],
  antworten: [0, 1, 2].map(i => ({ text: { de: `a${i}`, en: `a${i}` }, warum: { de: 'w', en: 'w' }, ...(i === 1 ? { richtig: true as const } : {}) })) as Frage['antworten']
});

/** Probefrage der Art „mehrere möglich“: Aussagen 0 und 2 stimmen. Nur im Test, die Inhalte schreibt ein anderer Auftrag. */
const mehrfachFrage = (id: string): Frage => ({
  id, thema: 'x', mehrfach: true, stamm: { de: id, en: id }, hilfe: ['p-wert'], belege: ['t'],
  antworten: [0, 1, 2, 3].map(i => ({ text: { de: `s${i}`, en: `s${i}` }, warum: { de: 'w', en: 'w' }, ...(i % 2 === 0 ? { richtig: true as const } : {}) })) as Frage['antworten']
});

describe('Fragenart „Welche Aussagen stimmen? (mehrere möglich)“', () => {
  const m = mehrfachFrage('m');
  it('richtig nur, wenn alle vier Aussagen richtig eingeschätzt sind', () => {
    expect(istRichtig({ frage: m, gewaehlt: [0, 2] })).toBe(true);
    expect(istRichtig({ frage: m, gewaehlt: [2, 0] })).toBe(true);
    for (const falsch of [[], [0], [2], [0, 1, 2], [0, 2, 3], [0, 1, 2, 3], [1, 3]]) expect(istRichtig({ frage: m, gewaehlt: falsch }), falsch.join()).toBe(false);
  });
  it('je Aussage: richtig eingeschätzt oder nicht', () => {
    expect(eingeschaetzt(m, [0, 2])).toEqual([true, true, true, true]);
    expect(eingeschaetzt(m, [])).toEqual([false, true, false, true]);
    expect(eingeschaetzt(m, [0, 1, 2])).toEqual([true, false, true, true]);
    expect(eingeschaetzt(m, [1, 3]).filter(Boolean)).toHaveLength(0);
  });
  it('eine einzelne Zahl als Wahl zählt bei dieser Art nie als richtig', () => {
    expect(istRichtig({ frage: m, gewaehlt: 0 })).toBe(false);
  });
  it('Zählen und „Falsche noch einmal“ mischen beide Arten', () => {
    const a = probeFrage('a');
    const erg: Antwortstand[] = [{ frage: a, gewaehlt: 1 }, { frage: m, gewaehlt: [0, 2] }, { frage: mehrfachFrage('m2'), gewaehlt: [0] }, { frage: probeFrage('b'), gewaehlt: 0 }];
    expect(zaehleRichtig(erg)).toBe(2);
    expect(falscheNochEinmal(erg).map(f => f.id)).toEqual(['m2', 'b']);
  });
  it('Mischen verliert keine Aussage und merkt sich die Plätze', () => {
    for (let s = 0; s < 20; s++) { const g = mischeAntworten(m, zufall(s)); expect(g.map(x => x.nr).sort()).toEqual([0, 1, 2, 3]); expect(g.filter(x => x.a.richtig).map(x => x.nr).sort()).toEqual([0, 2]); }
  });
});

describe('Ablauf', () => {
  it('Mischen ist reproduzierbar, verliert nichts und merkt sich die Plätze', () => {
    expect(mische([1, 2, 3, 4, 5], zufall(7))).toEqual(mische([1, 2, 3, 4, 5], zufall(7)));
    const eingabe = [1, 2, 3, 4, 5, 6]; const m = mische(eingabe, zufall(3));
    expect([...m].sort()).toEqual(eingabe); expect(eingabe).toEqual([1, 2, 3, 4, 5, 6]);
    const f = probeFrage('f'); const reihen = new Set<string>();
    for (let s = 0; s < 40; s++) { const g = mischeAntworten(f, zufall(s)); reihen.add(g.map(x => x.nr).join()); expect(g.filter(x => x.a.richtig).map(x => x.nr)).toEqual([1]); }
    expect(reihen.size).toBeGreaterThan(1);
  });
  it('Runde: höchstens 10, Fallreihen bleiben beisammen und in Reihenfolge', () => {
    const fs = [...Array.from({ length: 12 }, (_, i) => probeFrage(`e${i}`)), probeFrage('f1', 'F'), probeFrage('f2', 'F'), probeFrage('f3', 'F')];
    for (let s = 0; s < 30; s++) {
      const r = baueRunde(fs, zufall(s));
      expect(r.length).toBeLessThanOrEqual(10);
      const i = r.findIndex(x => x.fall); if (i >= 0) expect(r.slice(i, i + 3).map(x => x.id)).toEqual(['f1', 'f2', 'f3']);
    }
    expect(baueRunde(fs.slice(0, 4), zufall(1))).toHaveLength(4);
  });
  it('„Falsche noch einmal“ nimmt die falschen Fragen, Fallreihen ganz', () => {
    const a = probeFrage('a'), b = probeFrage('b', 'F'), c = probeFrage('c', 'F'), d = probeFrage('d');
    const erg: Antwortstand[] = [{ frage: a, gewaehlt: 1 }, { frage: b, gewaehlt: 0 }, { frage: c, gewaehlt: 1 }, { frage: d, gewaehlt: 2 }];
    expect(zaehleRichtig(erg)).toBe(2); expect(istRichtig(erg[1]!)).toBe(false);
    // Abnahme 31.10. F12: „Falsche noch einmal“ fragt nur die falschen (8 falsch gaben 10 Fragen); die Tabellen der Fallreihe hängen an der Frage selbst
    expect(falscheNochEinmal(erg).map(f => f.id)).toEqual(['b', 'd']);
    expect(falscheNochEinmal([{ frage: a, gewaehlt: 1 }])).toEqual([]);
  });
});
