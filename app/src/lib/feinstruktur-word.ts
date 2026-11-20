/**
 * Feinstruktur, Stufe F3c: Word im Format der Abgabe und Methodenanhang.
 * Grundlagen: docs/feinstruktur/FACHBLATT-FEINSTRUKTUR.md (9 Ergebnis und Qualität), Bauplan F3c.
 *
 * Inhalt: Titel, Angaben (Forschungsfrage, Verfahren), Ausschnitt wörtlich, Sinneinheiten nummeriert, Deutung je Sinneinheit als Tabelle
 * (Spalten: Sinneinheit + Spalten des Spaltensatzes; wahlweise eine große Tabelle), Lesarten mit Prüfkriterium und Stand
 * („verworfen an Sinneinheit k“), Zwischenreflexionen, Zwischenfazit mit Textstellen, Schlüsselentscheidungen, Methodenanhang (wahlweise).
 * Nicht vorauslesen: Word enthält nur, was auch der Bildschirm zeigen darf (`sichtbarBis`).
 * Barrierefrei: echte Überschriften, Tabellenkopf wiederholt (`tableHeader`), Sprache, Titel; geprüft mit scripts/docx-pruefen.mjs.
 * Der Methodenanhang nennt nur Fakten des Ablaufs, nie ein Ergebnis und keine Zählung von Lesarten außer der Zahl verworfener.
 */
import type { Eintrag, Lesart, Sequenzanalyse } from './qualprojekt';
import { orteMitEintraegen, satzFuer, eintraegeAn, spaltenText, type Spaltensatz } from './feinstruktur-spalten';
import { reflexionNach, reflexionsStellen, sichtbarBis, standVon, standWort, uebersicht } from './feinstruktur-pruefen';
import { alleGedeutet, zeilenZahl } from './feinstruktur-analyse';
import { woerter } from './feinstruktur';

type Sp = 'de' | 'en';
type Docx = typeof import('docx');

const STEUER = new RegExp('[\x00-\x08\x0b\x0c\x0e-\x1f' + String.fromCharCode(0xfffe, 0xffff) + ']', 'g');
const sauber = (t: string): string => String(t ?? '').replace(STEUER, '');

/* ---------------- Methodenanhang ---------------- */

/** Gruppennamen, die in der Analyse vorkommen (Einträge und Gruppe), in Reihenfolge des ersten Auftretens. */
export function gruppenIn(sa: Sequenzanalyse): string[] {
  const s = new Set<string>();
  for (const e of sa.einheiten) for (const o of orteMitEintraegen(e))
    for (const x of eintraegeAn(e, o) as Eintrag[]) for (const g of (x.gruppe ?? '').split(' + ')) if (g.trim()) s.add(g.trim());
  if (!s.size && sa.gruppe?.name) s.add(sa.gruppe.name);
  return [...s];
}

export interface Ablauf {
  woerter: number; zeilen: number; einheiten: number; gedeutet: number; reflexionen: number; reflexionsStellen: number;
  verworfen: number; gruppen: string[]; zusammengefuehrt: boolean; vorauslesenErlaubt: boolean; uebernommen: number;
}

/** Die Fakten des Ablaufs (Fachblatt 9): beschreiben das Vorgehen, nie ein Ergebnis. */
export function ablauf(sa: Sequenzanalyse): Ablauf {
  const verworfen = sa.einheiten.reduce((n, e) => n + e.lesarten.filter(l => standVon(l) === 'verworfen').length, 0);
  return {
    woerter: woerter(sa.ausschnitt.text).length, zeilen: zeilenZahl(sa.ausschnitt.text),
    einheiten: sa.einheiten.length, gedeutet: sa.einheiten.filter(e => e.gedeutet).length,
    reflexionen: sa.reflexionen.length, reflexionsStellen: reflexionsStellen(sa).length, verworfen,
    gruppen: gruppenIn(sa), zusammengefuehrt: sa.herkunft?.art === 'zusammengefuehrt', vorauslesenErlaubt: sa.vorauslesenErlaubt,
    uebernommen: sa.einheiten.filter(e => e.uebernommenVon).length,
  };
}

/**
 * Methodenanhang als Vorschlag (Absätze). Nur Fakten: Ausschnitt mit Fundstelle, Zahl der Sinneinheiten, Gruppen, Zwischenreflexionen,
 * verworfene Lesarten, Stand „vorauslesen“. Die Person übernimmt, ändert oder streicht ihn.
 */
export function methodenanhang(sa: Sequenzanalyse, sp: Sp, o: { dokumentName?: string; eigene?: readonly Spaltensatz[] } = {}): string[] {
  const a = ablauf(sa);
  const satz = satzFuer(sa, o.eigene);
  const de = sp === 'de';
  const r: string[] = [];
  const quelle = o.dokumentName ? (de ? ` aus dem Transkript „${o.dokumentName}“` : ` from the transcript “${o.dokumentName}”`) : '';
  r.push(de
    ? `Verfahren: ${satz.verfahren.de}. Ausgewertet wurde ein Ausschnitt${quelle} mit ${a.woerter} Wörtern (etwa ${a.zeilen} Zeilen).`
    : `Method: ${satz.verfahren.en}. An excerpt${quelle} of ${a.woerter} words (about ${a.zeilen} lines) was analysed.`);
  // A4: bei einem anderen Spaltensatz als der Feinstruktur die Spalten nennen (eigener Satz: mit seinem Namen)
  if ((sa.spaltensatz ?? 'feinstruktur') !== 'feinstruktur') {
    const namen = satz.spalten.map(x => spaltenText(x.name, sp)).join(', ');
    r.push(satz.eigen
      ? (de ? `Gedeutet wurde mit dem eigenen Spaltensatz „${spaltenText(satz.name, sp)}“ (Spalten: ${namen}).` : `The interpretation used the custom column set “${spaltenText(satz.name, sp)}” (columns: ${namen}).`)
      : (de ? `Spalten der Deutung: ${namen}.` : `Columns of the interpretation: ${namen}.`));
  }
  r.push(de
    ? `Der Ausschnitt wurde in ${a.einheiten} Sinneinheiten eingeteilt; ${a.gedeutet} davon sind gedeutet. Gedeutet wurde der Reihe nach, ${a.vorauslesenErlaubt ? 'mit Vorauslesen (eingeschaltet)' : 'ohne Vorauslesen: Spätere Sinneinheiten waren beim Deuten verdeckt'}.`
    : `The excerpt was divided into ${a.einheiten} units of meaning; ${a.gedeutet} of them are interpreted. Units were interpreted in sequence, ${a.vorauslesenErlaubt ? 'with reading ahead switched on' : 'without reading ahead: later units were hidden during interpretation'}.`);
  if (a.uebernommen) r.push(de ? `Bei ${a.uebernommen} Sinneinheit${a.uebernommen === 1 ? '' : 'en'} wurde die Deutung einer früheren gleichen Einheit (Füllwort) übernommen und an der neuen Stelle neu geprüft.` : `For ${a.uebernommen} unit${a.uebernommen === 1 ? '' : 's'}, the interpretation of an earlier identical unit (filler word) was copied and checked again at the new position.`);
  if (a.gruppen.length > 1 || a.zusammengefuehrt) {
    r.push(de
      ? `Gedeutet haben ${a.gruppen.length} Gruppen getrennt voneinander (${a.gruppen.join(', ')}). Die Deutungen wurden danach zusammengeführt; gleiche Lesarten wurden von Hand zusammengelegt, die Herkunft ist bei jedem Eintrag vermerkt.`
      : `${a.gruppen.length} groups interpreted independently (${a.gruppen.join(', ')}). Their interpretations were then merged; identical readings were combined by hand, and the origin is noted for each entry.`);
  } else if (a.gruppen.length === 1) {
    r.push(de ? `Gedeutet hat die Gruppe „${a.gruppen[0]}“.` : `The interpretation was done by the group “${a.gruppen[0]}”.`);
  }
  r.push(de
    ? `Zwischenreflexionen: ${a.reflexionen} (angeboten nach jeder ${sa.reflexionAlle ?? 4}. Sinneinheit, ${a.reflexionsStellen} Stellen). Im Lauf der Analyse wurden ${a.verworfen} Lesarten verworfen; die Begründungen stehen in der Deutung.`
    : `Interim reflections: ${a.reflexionen} (offered after every ${sa.reflexionAlle ?? 4}th unit, ${a.reflexionsStellen} points). In the course of the analysis, ${a.verworfen} readings were rejected; the reasons are given in the interpretation.`);
  return r;
}

/* ---------------- Word ---------------- */

export interface WordOptionen { sprache?: string; form?: 'je-einheit' | 'eine-tabelle'; methodenanhang?: boolean; dokumentName?: string; /** eigene Spaltensätze des Projekts (A4) */ eigene?: readonly Spaltensatz[] }

/** Stand einer Lesart als Text: „hält (an Sinneinheit 3: Begründung)“, „verworfen an Sinneinheit 2: …“, „offen“. */
export function standText(sa: Sequenzanalyse, l: Lesart, sp: Sp): string {
  const w = l.verlauf.at(-1);
  if (!w) return standWort('offen', sp);
  const k = sa.einheiten.findIndex(e => e.id === w.beiEinheit) + 1;
  const bei = sp === 'de' ? `an Sinneinheit ${k}` : `at unit ${k}`;
  return `${standWort(w.stand, sp)} ${bei}${w.begruendung.trim() ? `: ${w.begruendung.trim()}` : ''}`;
}

const herkunft = (x: Eintrag, sp: Sp): string => {
  const t = [x.gruppe, x.person].filter(Boolean).join(', ');
  return t ? (sp === 'de' ? ` (${t})` : ` (${t})`) : '';
};

/** Word-Datei der Feinstrukturanalyse. Aufruf: `speichereDatei(await feinstrukturWord(sa, { sprache }), name + '.docx')`. */
export async function feinstrukturWord(sa: Sequenzanalyse, o: WordOptionen = {}): Promise<Uint8Array> {
  const sp: Sp = o.sprache === 'de' || o.sprache === undefined ? 'de' : 'en';
  const de = sp === 'de';
  const D: Docx = await import('docx');
  const { wordStile } = await import('./export');
  const s = wordStile(D);
  const stile = { ...s, default: { ...s.default, document: { run: { ...s.default.document.run, language: { value: sp } } } } };
  const satz = satzFuer(sa, o.eigene);
  const bis = sichtbarBis(sa);
  const zeilen = uebersicht(sa, o.eigene);

  const lauf = (t: string, f: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
    new D.TextRun({ text: sauber(t).replace(/[\r\n\t]+/g, ' '), font: 'Arial', size: f.size ?? 22, bold: f.bold, italics: f.italics });
  const absatz = (t: string, f: { bold?: boolean; italics?: boolean; size?: number } = {}) => new D.Paragraph({ spacing: { after: 120 }, children: [lauf(t, f)] });
  const mitText = (marke: string, t: string) => new D.Paragraph({ spacing: { after: 120 }, children: [lauf(marke + ' ', { bold: true }), lauf(t)] });
  const ue = (t: string, e: 'TITLE' | 'HEADING_1' | 'HEADING_2') =>
    new D.Paragraph({ heading: D.HeadingLevel[e], children: [lauf(t, { bold: true, size: e === 'TITLE' ? 32 : e === 'HEADING_1' ? 26 : 24 })] });
  // mehrzeiliger Text: je Zeile ein Absatz (keine leeren Absätze hintereinander)
  const absaetze = (t: string) => sauber(t).split(/\r?\n/).map(z => z.trim()).filter(Boolean).map(z => absatz(z));

  const zelleAbs = (kinder: InstanceType<Docx['Paragraph']>[]) => new D.TableCell({ children: kinder.length ? kinder : [new D.Paragraph({ children: [lauf('-', { size: 20 })] })] });
  const kz = (t: string) => new D.Paragraph({ children: [lauf(t, { size: 20 })] });
  const eintragAbs = (x: Eintrag | Lesart, feldLesart: boolean): InstanceType<Docx['Paragraph']>[] => {
    const r = [new D.Paragraph({ spacing: { after: 60 }, children: [lauf(x.text + herkunft(x, sp), { size: 20 })] })];
    if (feldLesart) {
      const l = x as Lesart;
      if (l.pruefung.trim()) r.push(new D.Paragraph({ spacing: { after: 60 }, children: [lauf(de ? 'Prüfung: ' : 'Test: ', { size: 20, italics: true }), lauf(l.pruefung, { size: 20 })] }));
      r.push(new D.Paragraph({ spacing: { after: 120 }, children: [lauf(de ? 'Stand: ' : 'Status: ', { size: 20, italics: true }), lauf(standText(sa, l, sp), { size: 20, bold: standVon(l) === 'verworfen' })] }));
    }
    return r;
  };
  const kopfZeile = () => new D.TableRow({
    tableHeader: true, cantSplit: true,
    children: [de ? 'Sinneinheit' : 'Unit of meaning', ...satz.spalten.map(c => spaltenText(c.name, sp))].map(h => new D.TableCell({ children: [new D.Paragraph({ children: [lauf(h, { bold: true, size: 20 })] })] })),
  });
  const datenZeile = (z: (typeof zeilen)[number]) => new D.TableRow({
    children: [
      zelleAbs([kz(`${z.nr}. ${z.text}`)]),
      ...z.spalten.map((c, i) => zelleAbs(c.eintraege.flatMap(x => eintragAbs(x, !!satz.spalten[i]!.mitPruefung)))),
    ],
  });
  const tabelle = (rows: InstanceType<Docx['TableRow']>[]) => new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE }, tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true }, rows,
  });
  const reflexion = (k: number) => {
    const r = reflexionNach(sa, k);
    if (!r) return [];
    return [
      ue(de ? `Zwischenreflexion nach Sinneinheit ${k + 1}` : `Interim reflection after unit ${k + 1}`, 'HEADING_2'),
      mitText(de ? 'Begriffe und Spuren:' : 'Terms and traces:', r.begriffe || '-'),
      mitText(de ? 'Bisher herausgefunden:' : 'Found so far:', r.bisher || '-'),
      mitText(de ? 'Noch zu prüfen:' : 'Still to check:', r.pruefen || '-'),
    ];
  };

  const titel = sauber(sa.name || (de ? 'Feinstrukturanalyse' : 'Fine structure analysis'));
  // Teil 1: Hochformat - Titel, Angaben, Ausschnitt, Sinneinheiten
  const t1: (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] = [ue(titel, 'TITLE'), ue(de ? 'Angaben' : 'Details', 'HEADING_1')];
  t1.push(mitText(de ? 'Verfahren:' : 'Method:', satz.verfahren[sp]));
  if (sa.forschungsfrage.trim()) t1.push(mitText(de ? 'Forschungsfrage:' : 'Research question:', sa.forschungsfrage.replace(/\s+/g, ' ')));
  if (o.dokumentName) t1.push(mitText(de ? 'Transkript:' : 'Transcript:', o.dokumentName));
  const gr = gruppenIn(sa);
  if (gr.length) t1.push(mitText(de ? 'Gruppen:' : 'Groups:', gr.join(', ')));
  if (bis < sa.einheiten.length - 1) t1.push(absatz(de ? `Stand: gedeutet bis Sinneinheit ${bis + 1} von ${sa.einheiten.length}. Spätere Sinneinheiten sind nicht enthalten.` : `Status: interpreted up to unit ${bis + 1} of ${sa.einheiten.length}. Later units are not included.`, { italics: true }));
  t1.push(ue(de ? 'Ausschnitt' : 'Excerpt', 'HEADING_1'));
  if (sa.ausschnitt.kontext?.trim()) t1.push(mitText(de ? 'Davor (Frage):' : 'Before (question):', sa.ausschnitt.kontext));
  const sichtbar = zeilen.map(z => z.text).join(' ');
  t1.push(absatz(sichtbar));
  t1.push(ue(de ? 'Sinneinheiten' : 'Units of meaning', 'HEADING_1'));
  for (const z of zeilen) t1.push(mitText(`${z.nr}.`, z.text));

  // Teil 2: Querformat - Deutung
  const t2: (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] = [ue(de ? 'Deutung' : 'Interpretation', 'HEADING_1')];
  if (o.form === 'eine-tabelle') {
    t2.push(tabelle([kopfZeile(), ...zeilen.map(datenZeile)]));
    const stellen = reflexionsStellen(sa).filter(k => k <= bis && reflexionNach(sa, k));
    if (stellen.length) {
      t2.push(ue(de ? 'Zwischenreflexionen' : 'Interim reflections', 'HEADING_1'));
      for (const k of stellen) t2.push(...reflexion(k));
    }
  } else {
    for (const z of zeilen) {
      t2.push(ue(de ? `Sinneinheit ${z.nr}` : `Unit ${z.nr}`, 'HEADING_2'));
      t2.push(tabelle([kopfZeile(), datenZeile(z)]));
      if (z.nr - 1 <= bis) t2.push(...reflexion(z.nr - 1));
    }
  }

  // Teil 3: Hochformat - Zwischenfazit, Schlüsselentscheidungen, Methodenanhang
  const t3: (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] = [];
  if (sa.fazit && alleGedeutet(sa)) {
    t3.push(ue(de ? 'Zwischenfazit' : 'Interim conclusion', 'HEADING_1'));
    sa.fazit.muster.forEach((m, i) => {
      t3.push(ue(de ? `Deutungsmuster ${i + 1}` : `Pattern ${i + 1}`, 'HEADING_2'), ...absaetze(m.text));
      for (const b of m.belege) {
        const k = sa.einheiten.findIndex(e => e.id === b.einheit) + 1;
        t3.push(mitText(de ? `Sinneinheit ${k}:` : `Unit ${k}:`, de ? `„${b.zitat}“` : `“${b.zitat}”`));
      }
    });
    if (sa.fazit.bezugForschungsfrage.trim()) t3.push(ue(de ? 'Bezug zur Forschungsfrage' : 'Relation to the research question', 'HEADING_2'), ...absaetze(sa.fazit.bezugForschungsfrage));
    if (sa.fazit.text?.trim()) t3.push(ue(de ? 'Weitere Gedanken' : 'Further thoughts', 'HEADING_2'), ...absaetze(sa.fazit.text));
  }
  if (sa.schluesselentscheidungen?.trim()) t3.push(ue(de ? 'Schlüsselentscheidungen' : 'Key decisions', 'HEADING_1'), ...absaetze(sa.schluesselentscheidungen));
  if (o.methodenanhang) t3.push(ue(de ? 'Methodenanhang' : 'Methods appendix', 'HEADING_1'), ...methodenanhang(sa, sp, { dokumentName: o.dokumentName, eigene: o.eigene }).map(t => absatz(t)));

  const rand = { top: 1417, bottom: 1417, left: 1417, right: 1417 };
  const sections = [
    { properties: { page: { margin: rand } }, children: t1 },
    { properties: { page: { margin: rand, size: { orientation: D.PageOrientation.LANDSCAPE } } }, children: t2 },
  ];
  if (t3.length) sections.push({ properties: { page: { margin: rand } }, children: t3 });
  const doc = new D.Document({ creator: 'Statable', title: titel.replace(/\s+/g, ' '), styles: stile, sections });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
}

