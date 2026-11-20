/**
 * Papierfassungen aus dem Fragebogen-Plan (Paket 2G): Standard (Word), Großdruck (Word), Braille-taugliche Textfassung (.txt) und deren schlichte Word-Fassung.
 * Festlegungen: Kopf von papier-2g.test.ts; Fachblatt Stufe 2, „Paket 2G“. Alle gesperrt bei Fehlern aus `planPruefen` (`sperre`, „planFehler …“);
 * die Sprache kommt aus dem Aufruf, es gibt nie einen stillen Rückfall auf eine andere Sprache.
 *
 * Gemeinsam: Bogen-Nummer oben, Fragen laufend nummeriert (Fragen und Blöcke zählen, Hinweise nicht), Filter als „Weiter mit Frage N“ an der Frage,
 * die den Sprung auslöst. Die Inhalte (Fragetext, Optionen mit Code, Filtersätze) stammen aus demselben Modell wie Fragebogen Word/HTML (`modellVon`).
 * Großdruck: Grundschrift 18 pt, Zeilenabstand 1,5, eine Spalte, keine Tabellen, keine Kursivschrift, Kästchen 24 pt (rund 8 mm). RNIB nennt 16 pt als Untergrenze;
 * 18 pt und 1,5 (WCAG 2.2, 1.4.8) sind Statables Wahl darüber. Standard: Kästchen 14 pt (rund 5 mm, mindestens 4 mm), Codes klein.
 */
import type { Bedingung, FragebogenPlan } from './fragebogenplan';
import { einzeilig, filterTeil, indexVon, modellVon, sperre, sprachWahl, type Modell, type MFrage } from './fragebogenexport';

type Docx = typeof import('docx');
type Kind = InstanceType<Docx['Paragraph']>;

/* ------------------------------------------------------------------ Gemeinsames */
const worteBogen = (sp: string) => {
  const d = /^de/i.test(sp);
  return {
    d,
    bogen: d ? 'Bogen-Nummer:' : 'Questionnaire number:',
    anweisung: d ? 'Schreiben Sie bei jeder Frage die Nummer Ihrer Antwort auf.' : 'Write down the number of your answer for each question.',
    weiter: (n: number) => (d ? `Weiter mit Frage ${n}` : `Go to question ${n}`),
    weiterWenn: (n: number, f: string) => (d ? `Weiter mit Frage ${n}, wenn dies nicht zutrifft: ${f}` : `Go to question ${n} if this does not apply: ${f}`),
    textWenn: (n: number, f: string) => (d ? `Wenn die folgende Angabe nicht zutrifft: ${f}, gehen Sie weiter zu Frage ${n}.` : `If the following does not apply: ${f}, go on to question ${n}.`),
    abschnitt: d ? 'Abschnitt' : 'Section',
    aussagen: d ? 'Aussagen:' : 'Statements:',
    jeAussage: d ? 'Antwortmöglichkeiten für jede Aussage:' : 'Answer options for each statement:',
    jeAussageHinweis: d ? 'Schreiben Sie für jede Aussage die Nummer Ihrer Antwort auf.' : 'Write down the number of your answer for each statement.',
    mehrfach: d ? 'Mehrere Antworten möglich. Schreiben Sie alle Nummern auf.' : 'Several answers possible. Write down all numbers.',
    schreiben: d ? '(bitte aufschreiben)' : '(please write it down)'
  };
};

function bedingungFragen(b: Bedingung, aus: Set<string> = new Set()): Set<string> {
  if ('und' in b) b.und.forEach(x => bedingungFragen(x, aus));
  else if ('oder' in b) b.oder.forEach(x => bedingungFragen(x, aus));
  else if ('nicht' in b) bedingungFragen(b.nicht, aus);
  else aus.add(b.frage);
  return aus;
}

/**
 * Sprünge: Eine ganze Seite mit Filter wird übersprungen, wenn die Bedingung nicht zutrifft. Der Hinweis „Weiter mit Frage N“ (N = erste Frage nach der Seite)
 * steht an der Frage vor der Seite, auf die sich die Bedingung bezieht (die späteste davon). Ohne Frage dahinter oder ohne auslösende Frage davor gibt es keinen Sprung.
 */
function spruenge(plan: FragebogenPlan, sp: string): Map<number, { ziel: number; filter: string }[]> {
  const ix = indexVon(plan), aus = new Map<number, { ziel: number; filter: string }[]>();
  const gesamt = ix.nr.size;
  for (const s of plan.elemente) {
    if (!s.wennGezeigt) continue;
    const nrn = s.elemente.map(e => ix.nr.get(e.id)).filter((n): n is number => n !== undefined);
    if (!nrn.length) continue;
    const erste = Math.min(...nrn), ziel = Math.max(...nrn) + 1;
    if (ziel > gesamt) continue;
    const ausloeser = [...bedingungFragen(s.wennGezeigt)].map(id => ix.nr.get(id)).filter((n): n is number => n !== undefined && n < erste);
    if (!ausloeser.length) continue;
    const von = Math.max(...ausloeser);
    const liste = aus.get(von) ?? [];
    liste.push({ ziel, filter: filterTeil(plan, ix, sp, true, s.wennGezeigt) });
    aus.set(von, liste);
  }
  return aus;
}

/** Eine Optionszeile des Modells („☐ Text (Code)“ oder „___ Text (Code)“) in Kästchen/Text und Code zerlegen. */
function optionTeile(z: string): { text: string; code?: string } {
  const m = /^(?:☐|___) (.*) \((-?\d+)\)$/.exec(z);
  if (m) return { text: m[1]!, code: m[2]! };
  return { text: z.replace(/^(?:☐|___) /, '').replace(/\s*_{2,}\s*/g, ' ').trim() };
}
const ohneLinien = (z: string): string => z.replace(/_{2,}/g, '').replace(/\s+/g, ' ').trim();

/** Standard und Großdruck brauchen dasselbe Modell; die Nummern der Hilfsabsätze kommen aus `spruenge`. */
interface Vorbereitet { m: Modell; w: ReturnType<typeof worteBogen>; sprung: Map<number, { ziel: number; filter: string }[]> }
function vorbereiten(plan: FragebogenPlan, sprache: string): Vorbereitet & { sp: string } {
  sperre(plan);
  const sp = sprachWahl(plan, sprache);
  return { sp, m: modellVon(plan, sp, true), w: worteBogen(sp), sprung: spruenge(plan, sp) };
}

/* ------------------------------------------------------------------ Word: Standard und Großdruck */
async function wordFassung(plan: FragebogenPlan, sprache: string, gross: boolean): Promise<Uint8Array> {
  const { sp, m, w, sprung } = vorbereiten(plan, sprache);
  const D = await import('docx');
  const schrift = 'Arial';
  const styles = gross
    ? {
        default: {
          document: { run: { font: schrift, size: 36, language: { value: sp } }, paragraph: { spacing: { line: 360 } } },
          title: { run: { font: schrift, size: 56, bold: true, color: '1D2530' }, paragraph: { spacing: { after: 240 } } },
          heading1: { run: { font: schrift, size: 44, bold: true, color: '1D2530' }, paragraph: { keepNext: true, spacing: { before: 360, after: 160 } } },
          // Fragen sind im Großdruck Überschrift 2 (Orientierung mit der Überschriftennavigation; gleiche Größe wie der Text, nur fett).
          heading2: { run: { font: schrift, size: 36, bold: true, color: '1D2530' }, paragraph: { keepNext: true, keepLines: true, spacing: { before: 360, after: 120 } } },
          // Die Vorgaben von docx für Überschrift 4 bis 6 sind kursiv und werden nicht benutzt; hier ohne Kursivschrift, damit der Großdruck keine enthält.
          heading4: { run: { font: schrift, size: 36, bold: true } }, heading5: { run: { font: schrift, size: 36, bold: true } }, heading6: { run: { font: schrift, size: 36, bold: true } }
        }
      }
    // Standard: Arial 11 pt, Überschriften wie bei den anderen Word-Ausgaben (hier eigene Vorlagen, damit `./export` mit seinen vielen Abhängigkeiten nicht geladen wird).
    : {
        default: {
          document: { run: { font: schrift, size: 22, language: { value: sp } } },
          title: { run: { font: schrift, size: 32, bold: true, color: '1D2530' }, paragraph: { spacing: { after: 240 } } },
          heading1: { run: { font: schrift, size: 26, bold: true, color: '1D2530' }, paragraph: { keepNext: true, spacing: { before: 240, after: 120 } } }
        }
      };
  // Großdruck: keine Größe an den Läufen (gilt die Grundschrift 18 pt), keine Kursivschrift; Standard: 11 pt, Hilfstexte 10 pt.
  const lauf = (t: string, o: { fett?: boolean; kursiv?: boolean; klein?: boolean; groesse?: number; ohnePruefung?: boolean } = {}) =>
    new D.TextRun({ text: einzeilig(t), font: schrift, bold: o.fett, ...(o.ohnePruefung ? { noProof: true } : {}), ...(gross ? (o.groesse ? { size: o.groesse } : {}) : { size: o.groesse ?? (o.klein ? 20 : 22), italics: o.kursiv }) });
  const absatz = (laeufe: InstanceType<Docx['TextRun']>[], o: { links?: number; keepNext?: boolean; vor?: number } = {}) =>
    new D.Paragraph({ keepNext: o.keepNext, keepLines: true, indent: o.links ? { left: o.links } : undefined, spacing: { before: o.vor ?? 0, after: gross ? 120 : 80, ...(gross ? {} : { line: 300 }) }, children: laeufe });
  const einfach = (t: string, o: { fett?: boolean; kursiv?: boolean; klein?: boolean; links?: number; keepNext?: boolean; vor?: number } = {}) => absatz([lauf(t, o)], o);
  const KAESTCHEN = gross ? 48 : 28, CODE = 16;
  // Antwortzeilen, Codes und Platzhalterlinien sind keine Fließtexte: `noProof` hält Word davon ab, „Grammatikfehler“ oder „Rechtschreibfehler“ zu melden (Screenreader sagen es sonst bei jeder Zeile).
  const optionsAbsatz = (z: string, links: number, keepNext = false) => {
    const { text, code } = optionTeile(z);
    const l = [];
    if (z.startsWith('☐')) l.push(lauf('☐ ', { groesse: KAESTCHEN, ohnePruefung: true }));
    else if (z.startsWith('___')) l.push(lauf('___ ', { ohnePruefung: true }));
    l.push(lauf(text, { ohnePruefung: true }));
    if (code !== undefined) l.push(lauf(` (${code})`, { ...(gross ? {} : { groesse: CODE }), ohnePruefung: true }));
    return absatz(l, { links, keepNext });
  };
  const ueberschrift = (t: string, art: 'TITLE' | 'HEADING_1') => new D.Paragraph({ heading: D.HeadingLevel[art], children: [new D.TextRun({ text: einzeilig(t), font: schrift, bold: true, ...(gross ? {} : { size: art === 'TITLE' ? 32 : 26 }) })] });

  const k: Kind[] = [ueberschrift(m.titel, 'TITLE'), absatz([lauf(`${w.bogen} `, { fett: true }), lauf('______________________')], { vor: 120 })];
  if (m.einleitung) for (const t of m.einleitung.split(/\r?\n+/).filter(x => x.trim())) k.push(einfach(t));
  const filterAbsatz = (t: string, keepNext = false) => einfach(t, gross ? { fett: false, keepNext } : { kursiv: true, klein: true, keepNext });
  let hatSeitenTitel = false;   // Fragen sind Überschrift 2 nur unter einer Seitenüberschrift; sonst Überschrift 1 (Ebenen werden nicht übersprungen)
  for (const s of m.seiten) {
    if (s.titel) { k.push(ueberschrift(s.titel, 'HEADING_1')); hatSeitenTitel = true; }
    if (s.filter) k.push(filterAbsatz(s.filter));
    for (const e of s.inhalt) {
      if (e.art === 'hinweis') {
        if (e.filter) k.push(filterAbsatz(e.filter, true));
        if (e.text) k.push(einfach(e.text));
        if (e.bild) k.push(filterAbsatz(m.w.bild(e.bild.datei, e.bild.alt)));
        continue;
      }
      const f: MFrage = e;
      // Alle Absätze einer Frage hängen zusammen (kein Seitenumbruch mittendrin): jeder außer dem letzten hat „mit nächstem Absatz zusammen“.
      type Teil = (weiter: boolean) => Kind;
      const teile: Teil[] = [];
      const frageText = `${f.nr}. ${f.text}`;
      teile.push(gross
        ? () => new D.Paragraph({ heading: hatSeitenTitel ? D.HeadingLevel.HEADING_2 : D.HeadingLevel.HEADING_1, keepNext: true, keepLines: true, children: [new D.TextRun({ text: einzeilig(frageText), font: schrift, bold: true })] })
        : w2 => einfach(frageText, { fett: true, keepNext: true, vor: 200 }));
      if (f.filter) { const t = f.filter; teile.push(w2 => filterAbsatz(t, w2)); }
      if (f.hilfe) { const t = f.hilfe; teile.push(w2 => filterAbsatz(t, w2)); }
      if (f.pflicht) teile.push(w2 => einfach(m.w.pflicht, { klein: true, keepNext: w2 }));
      const a = f.antwort;
      if (a.art === 'optionen') { if (a.hinweis) { const t = a.hinweis; teile.push(w2 => einfach(t, { klein: true, keepNext: w2 })); } for (const z of a.zeilen) teile.push(w2 => optionsAbsatz(z, 360, w2)); }
      else if (a.art === 'linien') for (const z of a.zeilen) teile.push(w2 => einfach(z, { links: 360, keepNext: w2 }));
      else {
        // Block: je Aussage ein eigener Absatz, darunter die Optionen als Liste (keine Tabelle, die Antworten stehen in Zeilen).
        const opt = a.kopf.slice(1);
        a.zeilen.forEach((zeile, i) => {
          teile.push(() => einfach(`${f.nr}.${i + 1} ${zeile[0]}`, { fett: true, keepNext: true, links: 360, vor: 120 }));
          for (const o of opt) teile.push(w2 => optionsAbsatz(`☐ ${o}`, 720, w2));
        });
      }
      for (const j of sprung.get(f.nr) ?? []) teile.push(w2 => einfach(w.weiterWenn(j.ziel, j.filter), { fett: gross, kursiv: !gross, klein: !gross, links: 360, keepNext: w2 }));
      teile.forEach((t, i) => k.push(t(i < teile.length - 1)));
    }
  }
  k.push(einfach(m.abschluss ?? m.w.ende, { vor: 200, kursiv: true }));
  const titel = einzeilig(m.titel);
  const doc = new D.Document({ creator: 'Statable', title: gross ? `${titel} (${w.d ? 'Großdruck' : 'large print'})` : titel, styles, sections: [{ children: k }] });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
}

/** Standard-Papierbogen (Word): Bogen-Nummer oben, Fragen nummeriert, Kästchen mit kleinem Code, Filter „Weiter mit Frage N“. Ohne Eckmarken. */
export const papierStandard = (plan: FragebogenPlan, sprache: string): Promise<Uint8Array> => wordFassung(plan, sprache, false);
/** Großdruck (Word): 18 pt, Zeilenabstand 1,5, eine Spalte, keine Tabellen, keine Kursivschrift, große Kästchen. */
export const papierGrossdruck = (plan: FragebogenPlan, sprache: string): Promise<Uint8Array> => wordFassung(plan, sprache, true);

/* ------------------------------------------------------------------ Textfassung */
export interface TextZeile { art: 'titel' | 'abschnitt' | 'frage' | 'zeile'; text: string }

/** Die Textfassung als Zeilenliste mit Art (für den Text und für die Word-Fassung). Leerzeilen setzt `alsText` vor Titel-Folgen, Abschnitte und Fragen. */
export function papierTextZeilen(plan: FragebogenPlan, sprache: string): TextZeile[] {
  const { m, w, sprung } = vorbereiten(plan, sprache);
  const z: TextZeile[] = [{ art: 'titel', text: einzeilig(m.titel) }, { art: 'zeile', text: w.anweisung }, { art: 'zeile', text: w.bogen }];
  const zeile = (t: string) => { const x = einzeilig(t); if (x) z.push({ art: 'zeile', text: x }); };
  if (m.einleitung) for (const t of m.einleitung.split(/\r?\n+/)) zeile(t);
  const optionen = (zeilen: string[]) => { for (const o of zeilen) { const t = optionTeile(o); zeile(t.code !== undefined ? `${t.code} = ${t.text}` : `${t.text} ${w.schreiben}`); } };
  for (const s of m.seiten) {
    if (s.titel) z.push({ art: 'abschnitt', text: einzeilig(`${w.abschnitt}: ${s.titel}`) });
    if (s.filter) zeile(s.filter);
    for (const e of s.inhalt) {
      if (e.art === 'hinweis') { if (e.filter) zeile(e.filter); zeile(e.text); if (e.bild) zeile(m.w.bild(e.bild.datei, e.bild.alt)); continue; }
      z.push({ art: 'frage', text: einzeilig(`${e.nr}. ${e.text}`) });
      if (e.filter) zeile(e.filter);
      if (e.hilfe) zeile(e.hilfe);
      if (e.pflicht) zeile(m.w.pflicht);
      const a = e.antwort;
      if (a.art === 'optionen') {
        if (a.hinweis) zeile(a.hinweis === m.w.mehrere ? w.mehrfach : a.hinweis);
        optionen(a.zeilen);
      } else if (a.art === 'linien') { for (const x of a.zeilen) { const t = ohneLinien(x); if (t) zeile(t); } }
      else {
        zeile(w.jeAussageHinweis);
        zeile(w.aussagen);
        a.zeilen.forEach((r, i) => zeile(`${e.nr}.${i + 1} ${r[0]}`));
        zeile(w.jeAussage);
        optionen(a.kopf.slice(1).map(o => `☐ ${o}`));
      }
      for (const j of sprung.get(e.nr) ?? []) zeile(w.textWenn(j.ziel, j.filter));
    }
  }
  zeile(m.abschluss ?? m.w.ende);
  return z;
}

/** Braille-taugliche Textfassung: reiner Text mit \n, ohne Tabulator, Kästchen und Tabelle; Optionen als „Code = Text“, je eine Zeile. Die Datei schreibt die Oberfläche (UTF-8 ohne BOM). */
export function papierTextfassung(plan: FragebogenPlan, sprache: string): string {
  const zeilen = papierTextZeilen(plan, sprache);
  const aus: string[] = [];
  zeilen.forEach((x, i) => {
    if (i > 0 && (x.art === 'frage' || x.art === 'abschnitt' || i === 1)) aus.push('');
    aus.push(x.text);
  });
  return aus.join('\n') + '\n';
}

/** Schlichte Word-Fassung der Textfassung: Titel und Abschnitte als Überschriften, sonst Absätze in 12 pt, keine Tabelle, keine Kästchen. */
export async function papierTextfassungWord(plan: FragebogenPlan, sprache: string): Promise<Uint8Array> {
  const zeilen = papierTextZeilen(plan, sprache);
  const sp = sprachWahl(plan, sprache), D = await import('docx');
  const schrift = 'Arial';
  const kinder: Kind[] = zeilen.map(x => x.art === 'titel'
    ? new D.Paragraph({ heading: D.HeadingLevel.TITLE, children: [new D.TextRun({ text: x.text, font: schrift, bold: true })] })
    : x.art === 'abschnitt'
      ? new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, children: [new D.TextRun({ text: x.text, font: schrift, bold: true })] })
      : new D.Paragraph({ keepNext: x.art === 'frage', spacing: { before: x.art === 'frage' ? 240 : 0, after: 60, line: 300 }, children: [new D.TextRun({ text: x.text, font: schrift, size: 24, bold: x.art === 'frage' })] }));
  const titel = zeilen[0]?.text ?? '';
  const doc = new D.Document({
    creator: 'Statable', title: `${titel} (${worteBogen(sp).d ? 'Textfassung' : 'text version'})`,
    styles: { default: { document: { run: { font: schrift, size: 24, language: { value: sp } } }, title: { run: { font: schrift, size: 32, bold: true }, paragraph: { spacing: { after: 240 } } }, heading1: { run: { font: schrift, size: 28, bold: true }, paragraph: { keepNext: true, spacing: { before: 360, after: 120 } } } } },
    sections: [{ children: kinder }]
  });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
}
