/**
 * Kodierleitfaden (Paket 4E): reine Funktionen für den Baum der Codes eines qualitativen Projekts
 * (Name, Definition, Ankerbeispiele, Kodierregel nach Mayring; Baum über `elternId`) und der Word-Export.
 * Alle Funktionen geben neue Listen zurück; die übergebene Liste wird nie verändert.
 */
import type { Code } from './qualprojekt';

const norm = (n: string): string => n.trim().toLocaleLowerCase('de');

function neueId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID().toLowerCase();
  const h = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${h(3)}-${h(12)}`;
}

/** Eltern-id, die wirklich vorkommt; sonst undefined (Wurzel). */
function eltern(codes: Code[], k: Code): string | undefined {
  return k.elternId && k.elternId !== k.id && codes.some(x => x.id === k.elternId) ? k.elternId : undefined;
}

/** Die Geschwister (gleiche Eltern) in der Reihenfolge der Anzeige. */
export function geschwister(codes: Code[], elternId: string | undefined): Code[] {
  return codes.filter(k => eltern(codes, k) === elternId).sort((a, b) => a.reihenfolge - b.reihenfolge);
}

/** Alle Codes in Anzeigereihenfolge (Tiefensuche) mit ihrer Ebene (0 = Hauptkategorie). Ringe werden abgefangen. */
export function baumListe(codes: Code[]): { code: Code; ebene: number; eltern?: Code; geschwisterZahl: number; stelle: number }[] {
  const aus: { code: Code; ebene: number; eltern?: Code; geschwisterZahl: number; stelle: number }[] = [];
  const gesehen = new Set<string>();
  const gehe = (elternId: string | undefined, ebene: number, vater?: Code) => {
    const g = geschwister(codes, elternId);
    g.forEach((k, i) => {
      if (gesehen.has(k.id)) return;
      gesehen.add(k.id);
      aus.push({ code: k, ebene, eltern: vater, geschwisterZahl: g.length, stelle: i + 1 });
      gehe(k.id, ebene + 1, k);
    });
  };
  gehe(undefined, 0);
  // Codes in einem Ring (nie erreicht): als Hauptkategorien anzeigen, damit nichts verschwindet
  for (const k of codes) if (!gesehen.has(k.id)) { gesehen.add(k.id); aus.push({ code: k, ebene: 0, geschwisterZahl: 1, stelle: 1 }); gehe(k.id, 1, k); }
  return aus;
}

/** Je Geschwistergruppe 0, 1, 2 … (die Reihenfolge innerhalb der Gruppe bleibt). Die Liste behält ihre Reihenfolge. */
export function renummeriere(codes: Code[]): Code[] {
  const platz = new Map<string, number>();
  const gruppen = new Set<string | undefined>(codes.map(k => eltern(codes, k)));
  for (const g of gruppen) geschwister(codes, g).forEach((k, i) => platz.set(k.id, i));
  return codes.map(k => (platz.get(k.id) === k.reihenfolge ? k : { ...k, reihenfolge: platz.get(k.id) ?? k.reihenfolge }));
}

/** Setzt die Geschwistergruppe auf diese Reihenfolge (Liste von ids), mit diesen Eltern, und nummeriert sie neu. */
function setzeGruppe(codes: Code[], elternId: string | undefined, ids: string[]): Code[] {
  return codes.map(k => {
    const i = ids.indexOf(k.id);
    if (i < 0) return k;
    const n: Code = { ...k, reihenfolge: i };
    if (elternId) n.elternId = elternId; else delete n.elternId;
    return n;
  });
}

/** Ein neuer Code am Ende der Gruppe (Hauptkategorie, oder Unterkategorie von `elternId`). */
export function neuerCode(codes: Code[], name: string, elternId?: string): { codes: Code[]; id: string } {
  const id = neueId();
  const platz = geschwister(codes, elternId && codes.some(k => k.id === elternId) ? elternId : undefined).length;
  const k: Code = { id, name: name.trim(), kodierbar: true, reihenfolge: platz };
  if (elternId && codes.some(x => x.id === elternId)) k.elternId = elternId;
  return { codes: [...codes, k], id };
}

/** Eine Ebene höher: der Code wird Geschwister seiner bisherigen Eltern, direkt hinter ihnen. */
export function eineEbeneHoeher(codes: Code[], id: string): Code[] {
  const k = codes.find(x => x.id === id);
  const vater = k && codes.find(x => x.id === eltern(codes, k));
  if (!k || !vater) return codes;
  const opa = eltern(codes, vater);
  const rest = geschwister(codes, vater.id).filter(x => x.id !== id).map(x => x.id);
  const neu = geschwister(codes, opa).map(x => x.id);
  neu.splice(neu.indexOf(vater.id) + 1, 0, id);
  return setzeGruppe(setzeGruppe(codes, vater.id, rest), opa, neu);
}

/** Eine Ebene tiefer: der Code wird letzte Unterkategorie des Codes davor (nur möglich, wenn es einen gibt). */
export function eineEbeneTiefer(codes: Code[], id: string): Code[] {
  const k = codes.find(x => x.id === id);
  if (!k) return codes;
  const g = geschwister(codes, eltern(codes, k));
  const i = g.findIndex(x => x.id === id);
  if (i <= 0) return codes;
  const neuerVater = g[i - 1]!;
  const alt = g.filter(x => x.id !== id).map(x => x.id);
  const kinder = [...geschwister(codes, neuerVater.id).map(x => x.id), id];
  return setzeGruppe(setzeGruppe(codes, eltern(codes, k), alt), neuerVater.id, kinder);
}

function tausche(codes: Code[], id: string, richtung: -1 | 1): Code[] {
  const k = codes.find(x => x.id === id);
  if (!k) return codes;
  const vater = eltern(codes, k);
  const ids = geschwister(codes, vater).map(x => x.id);
  const i = ids.indexOf(id), j = i + richtung;
  if (i < 0 || j < 0 || j >= ids.length) return codes;
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  return setzeGruppe(codes, vater, ids);
}
export const nachOben = (codes: Code[], id: string): Code[] => tausche(codes, id, -1);
export const nachUnten = (codes: Code[], id: string): Code[] => tausche(codes, id, 1);

/** Die Anzahl der Unterkategorien aller Ebenen unter diesem Code. */
export function unterkategorien(codes: Code[], id: string): Code[] {
  const aus: Code[] = [], gesehen = new Set<string>([id]);
  const gehe = (v: string) => { for (const k of geschwister(codes, v)) if (!gesehen.has(k.id)) { gesehen.add(k.id); aus.push(k); gehe(k.id); } };
  gehe(id);
  return aus;
}

/** Entfernt den Code; seine Unterkategorien rücken eine Ebene hoch (an die Stelle des Codes). */
export function entferne(codes: Code[], id: string): Code[] {
  const k = codes.find(x => x.id === id);
  if (!k) return codes;
  const vater = eltern(codes, k);
  const kinder = geschwister(codes, id).map(x => x.id);
  const ids = geschwister(codes, vater).map(x => x.id);
  const i = ids.indexOf(id);
  ids.splice(i, 1, ...kinder);
  return setzeGruppe(codes.filter(x => x.id !== id), vater, ids);
}

/** Ändert Felder eines Codes (Name, Definition, …); leere Texte werden zu „nicht gesetzt“. */
export function aendereCode(codes: Code[], id: string, felder: Partial<Pick<Code, 'name' | 'definition' | 'anker' | 'regel' | 'farbe' | 'kodierbar'>>): Code[] {
  return codes.map(k => {
    if (k.id !== id) return k;
    const n: Code = { ...k, ...felder };
    for (const f of ['definition', 'regel', 'farbe'] as const) if (!(n[f] ?? '').trim()) delete n[f];
    if (n.anker) { n.anker = n.anker.map(a => ({ ...a, text: a.text.trim() })).filter(a => a.text); if (!n.anker.length) delete n.anker; }
    return n;
  });
}

/* ------------------------------------------------------------------ Vollständigkeit */
export interface Luecken { ohneDefinition: boolean; ohneAnker: boolean }
export const luecken = (k: Code): Luecken => ({ ohneDefinition: !(k.definition ?? '').trim(), ohneAnker: !(k.anker ?? []).some(a => a.text.trim()) });
export function vollstaendigkeit(codes: Code[]): { gesamt: number; ohneDefinition: number; ohneAnker: number } {
  let od = 0, oa = 0;
  for (const k of codes) { const l = luecken(k); if (l.ohneDefinition) od++; if (l.ohneAnker) oa++; }
  return { gesamt: codes.length, ohneDefinition: od, ohneAnker: oa };
}

/* ------------------------------------------------------------------ Einlesen eines Codebuchs */
export type Wahl = 'ersetzen' | 'beide' | 'ueberspringen';
export interface Konflikt { neu: Code; bestehend: Code }

function gleichEbene(bestehende: Code[], vater: string | undefined, name: string): Code | undefined {
  return geschwister(bestehende, vater).find(k => norm(k.name) === norm(name));
}

/**
 * Gleiche Namen auf derselben Ebene (Groß-/Kleinschreibung und Randleerzeichen zählen nicht). Eingelesene Hauptkategorien werden bei den
 * Hauptkategorien einsortiert. Wird ein Code „ersetzt“, werden seine Unterkategorien mit den vorhandenen Unterkategorien verglichen;
 * darum ist die Liste eine Obermenge (sie nimmt „ersetzen“ für jeden Treffer an).
 */
export function findeKonflikte(codes: Code[], neu: Code[]): Konflikt[] {
  const aus: Konflikt[] = [];
  const nIds = new Set(neu.map(k => k.id));
  const kinderN = (v: string | undefined) => neu.filter(k => (k.elternId && nIds.has(k.elternId) && k.elternId !== k.id ? k.elternId : undefined) === v).sort((a, b) => a.reihenfolge - b.reihenfolge);
  const gehe = (nVater: string | undefined, bVater: string | undefined, tiefe = 0) => {
    if (tiefe > 50) return;
    for (const n of kinderN(nVater)) {
      const b = gleichEbene(codes, bVater, n.name);
      if (b) { aus.push({ neu: n, bestehend: b }); gehe(n.id, b.id, tiefe + 1); }
    }
  };
  gehe(undefined, undefined);
  return aus;
}

/**
 * Hängt eingelesene Codes an. `wahl` je Konflikt (Schlüssel: id des eingelesenen Codes); fehlt sie, gilt „beide behalten“.
 * Ersetzen: der vorhandene Code behält seine id (Kodierungen bleiben), Name und Felder kommen aus der Datei.
 */
export function fuegeEin(codes: Code[], neu: Code[], wahl: Record<string, Wahl> = {}): { codes: Code[]; neu: number; ersetzt: number; uebersprungen: number } {
  let liste = codes.map(k => ({ ...k }));
  const nIds = new Set(neu.map(k => k.id));
  const kinderN = (v: string | undefined) => neu.filter(k => (k.elternId && nIds.has(k.elternId) && k.elternId !== k.id ? k.elternId : undefined) === v).sort((a, b) => a.reihenfolge - b.reihenfolge);
  const benutzt = new Set(liste.map(k => k.id));
  let angelegt = 0, ersetzt = 0, uebersprungen = 0;
  const zaehleBaum = (v: string, tiefe = 0): number => (tiefe > 50 ? 0 : kinderN(v).reduce((s, k) => s + 1 + zaehleBaum(k.id, tiefe + 1), 0));
  const gehe = (nVater: string | undefined, bVater: string | undefined, tiefe = 0) => {
    if (tiefe > 50) return;
    for (const n of kinderN(nVater)) {
      const b = gleichEbene(liste, bVater, n.name);
      const w: Wahl = b ? (wahl[n.id] ?? 'beide') : 'beide';
      if (b && w === 'ueberspringen') { uebersprungen += 1 + zaehleBaum(n.id); continue; }
      if (b && w === 'ersetzen') {
        liste = liste.map(k => {
          if (k.id !== b.id) return k;
          const r: Code = { id: k.id, name: n.name, kodierbar: n.kodierbar, reihenfolge: k.reihenfolge };
          if (k.elternId) r.elternId = k.elternId;
          if (n.farbe) r.farbe = n.farbe;
          if (n.definition) r.definition = n.definition;
          if (n.anker?.length) r.anker = n.anker.map(a => ({ ...a }));
          if (n.regel) r.regel = n.regel;
          return r;
        });
        ersetzt++;
        gehe(n.id, b.id, tiefe + 1);
        continue;
      }
      let id = n.id;
      if (benutzt.has(id)) id = neueId();
      benutzt.add(id);
      const k: Code = { ...n, id, reihenfolge: geschwister(liste, bVater).length };
      if (n.anker) k.anker = n.anker.map(a => ({ ...a }));
      if (bVater) k.elternId = bVater; else delete k.elternId;
      liste.push(k);
      angelegt++;
      gehe(n.id, id, tiefe + 1);
    }
  };
  gehe(undefined, undefined);
  return { codes: renummeriere(liste), neu: angelegt, ersetzt, uebersprungen };
}

/* ------------------------------------------------------------------ Word */
const wort = (sp: 'de' | 'en') => sp === 'de'
  ? { titel: 'Kodierleitfaden', uebersicht: 'Übersicht', kategorien: 'Kategorien', kopf: ['Kategorie', 'Oberkategorie', 'Definition'], ober: 'Oberkategorie', def: 'Definition', anker: 'Ankerbeispiel', regel: 'Kodierregel', keine: '(noch nicht beschrieben)', nurOrdnen: 'Nur zum Ordnen, wird nicht kodiert.', leer: 'Es gibt noch keine Kategorien.' }
  : { titel: 'Coding guide', uebersicht: 'Overview', kategorien: 'Categories', kopf: ['Category', 'Parent category', 'Definition'], ober: 'Parent category', def: 'Definition', anker: 'Anchor example', regel: 'Coding rule', keine: '(not described yet)', nurOrdnen: 'For grouping only, not coded.', leer: 'There are no categories yet.' };

// eslint-disable-next-line no-control-regex
const XML_UNGUELTIG = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f￾￿]/g;
const sauber = (t: string): string => String(t ?? '').replace(XML_UNGUELTIG, '');
const einzeilig = (t: string): string => sauber(t).replace(/[\r\n]+/g, ' ').trim();

/** Kodierleitfaden als Word: Titel, Übersichtstabelle mit Kopfzeile, je Kategorie eine Überschrift (2 für Hauptkategorien, sonst 3) mit Definition, Ankerbeispielen und Kodierregel. */
export async function kodierleitfadenWord(codes: Code[], sprache: 'de' | 'en'): Promise<Uint8Array> {
  const sp = sprache === 'en' ? 'en' : 'de', w = wort(sp);
  const D = await import('docx');
  const { wordStile } = await import('./export');
  const stile = wordStile(D);
  const styles = { ...stile, default: { ...stile.default, document: { run: { ...stile.default.document.run, language: { value: sp } } } } };
  const lauf = (t: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) => new D.TextRun({ text: sauber(t).replace(/[\r\n]+/g, ' '), font: 'Arial', size: o.size ?? 22, bold: o.bold, italics: o.italics });
  const ueb = (t: string, ebene: 'TITLE' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3') => new D.Paragraph({ heading: D.HeadingLevel[ebene], children: [lauf(t, { bold: true, size: ebene === 'TITLE' ? 32 : ebene === 'HEADING_1' ? 26 : ebene === 'HEADING_2' ? 23 : 22 })] });
  const zeile = (etikett: string, t: string) => new D.Paragraph({ spacing: { after: 80, line: 300 }, children: [lauf(`${etikett}: `, { bold: true }), lauf(t)] });
  const zelle = (t: string, fett: boolean) => new D.TableCell({ children: sauber(t).split(/\r?\n/).map(l => new D.Paragraph({ children: [new D.TextRun({ text: l, font: 'Arial', size: 20, bold: fett })] })) });
  const liste = baumListe(codes);
  const k: (InstanceType<typeof D.Paragraph> | InstanceType<typeof D.Table>)[] = [ueb(w.titel, 'TITLE')];
  if (!liste.length) {
    k.push(new D.Paragraph({ children: [lauf(w.leer, { italics: true })] }));
  } else {
    k.push(ueb(w.uebersicht, 'HEADING_1'));
    k.push(new D.Table({
      width: { size: 100, type: D.WidthType.PERCENTAGE },
      tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true },
      rows: [
        new D.TableRow({ tableHeader: true, cantSplit: true, children: w.kopf.map(x => zelle(x, true)) }),
        ...liste.map(e => new D.TableRow({ cantSplit: true, children: [zelle(e.code.name, true), zelle(e.eltern?.name ?? '-', false), zelle((e.code.definition ?? '').trim() || '-', false)] }))
      ]
    }));
    k.push(ueb(w.kategorien, 'HEADING_1'));
    for (const e of liste) {
      const c = e.code;
      k.push(ueb(c.name, e.ebene === 0 ? 'HEADING_2' : 'HEADING_3'));
      if (e.ebene >= 2 && e.eltern) k.push(zeile(w.ober, e.eltern.name));
      if (c.kodierbar === false) k.push(new D.Paragraph({ spacing: { after: 80 }, children: [lauf(w.nurOrdnen, { italics: true })] }));
      k.push(zeile(w.def, (c.definition ?? '').trim() || w.keine));
      const anker = (c.anker ?? []).map(a => einzeilig(a.text)).filter(Boolean);
      k.push(new D.Paragraph({ keepNext: anker.length > 0, spacing: { after: 80 }, children: [lauf(`${w.anker}:`, { bold: true }), ...(anker.length ? [] : [lauf(` ${w.keine}`)])] }));
      for (const a of anker) k.push(new D.Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 300 }, children: [lauf(a)] }));
      k.push(zeile(w.regel, (c.regel ?? '').trim() || w.keine));
    }
  }
  const doc = new D.Document({ creator: 'Statable', title: w.titel, styles, sections: [{ children: k }] });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
}
