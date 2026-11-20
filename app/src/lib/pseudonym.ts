/**
 * Pseudonymisieren (Rechenkern, Stufe 5, Paket 5D).
 * Treffer finden, ersetzen, Segmente und Transkript-Abschnitte verschieben, Zuordnungsliste als CSV.
 * Alle Positionen sind Codepoints (nicht UTF-16). Keine dynamische Auswertung von Text als Code;
 * Namen aus der Liste werden vor dem Bau eines regulären Ausdrucks maskiert.
 */
import { cpLaenge, cpTeil, positionsKarte, utf16ZuCp, type QualProjekt, type Sinneinheit } from './qualprojekt';
import { haengeEintraegeAn } from './feinstruktur-analyse';
import { FESTE_FELDER } from './feinstruktur-spalten';

export type NamensArt = 'person' | 'ort' | 'organisation' | 'sonstiges';
export type RegelArt = 'email' | 'telefon' | 'datum' | 'plz' | 'adresse' | 'url' | 'iban';
export type TrefferArt = NamensArt | RegelArt;
export interface Fund { start: number; ende: number; text: string; art: TrefferArt }
export interface Name { text: string; art: NamensArt }

const ARTEN: TrefferArt[] = ['person', 'ort', 'organisation', 'sonstiges', 'email', 'telefon', 'datum', 'plz', 'adresse', 'url', 'iban'];
const NAMENSARTEN: ReadonlySet<TrefferArt> = new Set(['person', 'ort', 'organisation', 'sonstiges']);

export const VORAUSWAHL: Record<TrefferArt, boolean> = {
  person: true, ort: true, organisation: true, sonstiges: true,
  email: true, telefon: true, iban: true, url: true,
  datum: false, plz: false, adresse: false,
};

/* ---------------------------------------------------------------------------------------------
 * Texte nach Sprache
 * ------------------------------------------------------------------------------------------- */

const ERSATZ_NUMMERIERT: Record<'de' | 'en', Record<NamensArt, string>> = {
  de: { person: 'Person', ort: 'Ort', organisation: 'Organisation', sonstiges: 'Angabe' },
  en: { person: 'Person', ort: 'Place', organisation: 'Organisation', sonstiges: 'Detail' },
};
const ERSATZ_FEST: Record<'de' | 'en', Record<RegelArt, string>> = {
  de: { email: '[E-Mail]', telefon: '[Telefon]', datum: '[Datum]', plz: '[PLZ]', adresse: '[Adresse]', url: '[Internetadresse]', iban: '[IBAN]' },
  en: { email: '[Email]', telefon: '[Phone]', datum: '[Date]', plz: '[Postcode]', adresse: '[Address]', url: '[Web address]', iban: '[IBAN]' },
};
const ART_BESCHRIFTUNG: Record<'de' | 'en', Record<TrefferArt, string>> = {
  de: { person: 'Person', ort: 'Ort', organisation: 'Organisation', sonstiges: 'Sonstiges', email: 'E-Mail', telefon: 'Telefon', datum: 'Datum', plz: 'PLZ', adresse: 'Adresse', url: 'Internetadresse', iban: 'IBAN' },
  en: { person: 'Person', ort: 'Place', organisation: 'Organisation', sonstiges: 'Other', email: 'Email', telefon: 'Phone', datum: 'Date', plz: 'Postcode', adresse: 'Address', url: 'Web address', iban: 'IBAN' },
};
const CSV_KOPF: Record<'de' | 'en', string[]> = {
  de: ['Ersatz', 'Klartext', 'Art', 'Stellen'],
  en: ['Replacement', 'Original', 'Type', 'Count'],
};

/* ---------------------------------------------------------------------------------------------
 * Hilfen
 * ------------------------------------------------------------------------------------------- */

const maskiere = (s: string): string => s.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&');
const normName = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Kein Wortzeichen davor (auch kein „Buchstabe + Bindestrich“). */
const VOR = '(?<![\\p{L}\\p{N}_]|[\\p{L}\\p{N}]-)';
/** Kein Wortzeichen dahinter (auch kein „Bindestrich + Buchstabe“). */
const NACH = '(?![\\p{L}\\p{N}_]|-[\\p{L}\\p{N}])';

const MONATE = 'Januar|Jänner|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|May|June|July|October|December';

const RE_EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;
const RE_URL = /(?<![\p{L}\p{N}])(?:https?:\/\/|www\.)[^\s<>"]+/giu;
const RE_TEL_INTL = /(?<![\p{L}\p{N}+])(?:\+|0)\d(?:[ /-]?\d){5,}(?![\p{L}\p{N}])/gu;
const RE_TEL_US = /(?<![\p{L}\p{N}])(?:\(\d{3}\)\s?|\d{3}[ .-])\d{3}[ .-]\d{4}(?![\p{L}\p{N}])/gu;
const RE_DATUM = [
  /(?<![\p{N}.])\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2})(?!\p{N})/gu,
  /(?<![\p{N}])\d{4}-\d{2}-\d{2}(?!\p{N})/gu,
  new RegExp(`(?<![\\p{L}\\p{N}])\\d{1,2}\\.?\\s+(?:${MONATE})\\s+\\d{4}(?!\\p{N})`, 'giu'),
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${MONATE})\\s+\\d{1,2},\\s*\\d{4}(?!\\p{N})`, 'giu'),
];
const RE_PLZ = /(?<![\p{L}\p{N}.,-])(\d{4,5})(?!\p{N})(?=\s+\p{Lu})/gu;
const NUM = '\\d{1,4}[a-z]?(?![\\p{L}\\p{N}])';
const RE_ADRESSE = [
  new RegExp(`(?<![\\p{L}\\p{N}])\\p{L}{2,}(?:straße|strasse|gasse|weg|platz|allee|ring)\\s+${NUM}`, 'gu'),
  new RegExp(`(?<![\\p{L}\\p{N}])(?!(?:[Dd]er|[Dd]ie|[Dd]as|[Dd]en|[Dd]em|[Dd]es|[Ee]in|[Ee]ine|[Ee]inen|[Ee]inem|[Ee]iner|[Ee]ines|[Uu]nser|[Mm]ein|[Ss]ein|[Ii]hr)\\s)\\p{Lu}\\p{L}*\\s+(?:Straße|Strasse|Gasse|Weg|Platz|Allee|Ring)\\s+${NUM}`, 'gu'),
  /(?<![\p{L}\p{N}])\d{1,5}\s+(?:\p{Lu}\p{L}+\s+){1,2}(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln)(?![\p{L}\p{N}])/gu,
];
const RE_IBAN = /(?<![\p{L}\p{N}])[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}/gu;

/** Prüfsumme nach ISO 13616: Summe mod 97 muss 1 sein. */
function ibanGueltig(roh: string): boolean {
  const k = roh.replace(/\s+/g, '');
  if (k.length < 15 || k.length > 34) return false;
  const um = k.slice(4) + k.slice(0, 4);
  let rest = 0;
  for (const z of um) {
    const c = z.charCodeAt(0);
    if (c >= 48 && c <= 57) rest = (rest * 10 + (c - 48)) % 97;
    else if (c >= 65 && c <= 90) rest = (rest * 100 + (c - 55)) % 97;
    else return false;
  }
  return rest === 1;
}

interface Roh { s: number; e: number; art: TrefferArt; rang: number }   // UTF-16, Ende exklusiv; rang 0 = Name, 1 = Regel

function alle(re: RegExp, text: string): RegExpExecArray[] {
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  const aus: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = r.exec(text)) !== null) {
    aus.push(m);
    if (m[0].length === 0) r.lastIndex++;
  }
  return aus;
}

function urlKuerzen(u: string): string {
  let s = u;
  for (;;) {
    const l = s[s.length - 1];
    if (l === undefined) break;
    if ('.,;:!?\'"»'.includes(l)) { s = s.slice(0, -1); continue; }
    if (l === ')' && (s.match(/\)/g)?.length ?? 0) > (s.match(/\(/g)?.length ?? 0)) { s = s.slice(0, -1); continue; }
    if (l === ']' && (s.match(/\]/g)?.length ?? 0) > (s.match(/\[/g)?.length ?? 0)) { s = s.slice(0, -1); continue; }
    break;
  }
  return s;
}

/* ---------------------------------------------------------------------------------------------
 * Treffer in einem Text
 * ------------------------------------------------------------------------------------------- */

/** Reine Textsuche, Codepoints. Überlappende Funde: der längere gewinnt, bei Gleichstand Namen vor Regeln, dann der frühere. Ergebnis nach start sortiert. */
export function findeInText(text: string, o: { namen: Name[]; regeln: RegelArt[]; sprache?: 'de' | 'en' }): Fund[] {
  const roh: Roh[] = [];
  const genitiv = (o.sprache ?? 'de') === 'de';

  for (const n of o.namen) {
    const t = n.text.trim();
    if (!t) continue;
    const muster = t.split(/\s+/).map(maskiere).join('\\s+');
    const re = new RegExp(`${VOR}${muster}(?=${genitiv ? 's?' : ''}${NACH})`, 'giu');
    for (const m of alle(re, text)) roh.push({ s: m.index, e: m.index + m[0].length, art: n.art, rang: 0 });
  }

  const regeln = new Set(o.regeln);
  const nimm = (re: RegExp, art: RegelArt, zuschnitt?: (s: string) => string): void => {
    for (const m of alle(re, text)) {
      const f = zuschnitt ? zuschnitt(m[0]) : m[0];
      if (f) roh.push({ s: m.index, e: m.index + f.length, art, rang: 1 });
    }
  };
  if (regeln.has('email')) nimm(RE_EMAIL, 'email');
  if (regeln.has('url')) nimm(RE_URL, 'url', urlKuerzen);
  if (regeln.has('telefon')) { nimm(RE_TEL_INTL, 'telefon'); nimm(RE_TEL_US, 'telefon'); }
  if (regeln.has('datum')) for (const re of RE_DATUM) nimm(re, 'datum');
  if (regeln.has('plz')) {
    for (const m of alle(RE_PLZ, text)) roh.push({ s: m.index, e: m.index + (m[1] ?? '').length, art: 'plz', rang: 1 });
  }
  if (regeln.has('adresse')) for (const re of RE_ADRESSE) nimm(re, 'adresse');
  if (regeln.has('iban')) {
    for (const m of alle(RE_IBAN, text)) {
      // längste gültige Kürzung, die vor einem Nicht-Wortzeichen endet
      for (let k = m[0].length; k >= 15; k--) {
        const teil = m[0].slice(0, k);
        if (/\s$/.test(teil)) continue;
        const danach = text[m.index + k];
        if (danach !== undefined && /[\p{L}\p{N}]/u.test(danach)) continue;
        if (ibanGueltig(teil)) { roh.push({ s: m.index, e: m.index + k, art: 'iban', rang: 1 }); break; }
      }
    }
  }

  // Überlappungen: längster zuerst, dann Name vor Regel, dann früherer
  roh.sort((a, b) => (b.e - b.s) - (a.e - a.s) || a.rang - b.rang || a.s - b.s);
  const belegt = new Uint8Array(text.length + 1);
  const gewonnen: Roh[] = [];
  for (const r of roh) {
    let frei = true;
    for (let i = r.s; i < r.e; i++) if (belegt[i]) { frei = false; break; }
    if (!frei) continue;
    belegt.fill(1, r.s, r.e);
    gewonnen.push(r);
  }
  gewonnen.sort((a, b) => a.s - b.s);

  const karte = positionsKarte(text);
  return gewonnen.map(r => ({
    start: utf16ZuCp(karte, r.s), ende: utf16ZuCp(karte, r.e), text: text.slice(r.s, r.e), art: r.art,
  }));
}

/* ---------------------------------------------------------------------------------------------
 * Treffer im Projekt
 * ------------------------------------------------------------------------------------------- */

export interface Treffer extends Fund { id: string; dokument: string; ersatz: string; an: boolean }

export function findeTreffer(
  q: QualProjekt,
  o: { namen: Name[]; regeln: RegelArt[]; sprecherAlsPersonen: boolean },
  sprache: 'de' | 'en',
): Treffer[] {
  const namen: Name[] = [...o.namen];
  if (o.sprecherAlsPersonen) {
    const gesehen = new Set<string>();
    for (const d of q.dokumente) {
      for (const s of d.transkript?.sprecher ?? []) {
        if (s.rolle === 'interview') continue;
        const k = normName(s.name);
        if (!k || gesehen.has(k)) continue;
        gesehen.add(k);
        namen.push({ text: s.name, art: 'person' });
      }
    }
  }

  const nummern = new Map<string, number>();
  const zaehler: Record<NamensArt, number> = { person: 0, ort: 0, organisation: 0, sonstiges: 0 };
  const aus: Treffer[] = [];
  for (const d of q.dokumente) {
    for (const f of findeInText(d.text, { namen, regeln: o.regeln, sprache: d.sprache?.toLowerCase().startsWith('en') ? 'en' : 'de' })) {
      let ersatz: string;
      if (NAMENSARTEN.has(f.art)) {
        const art = f.art as NamensArt;
        const k = `${art}\u0000${normName(f.text)}`;
        let n = nummern.get(k);
        if (n === undefined) { n = ++zaehler[art]; nummern.set(k, n); }
        ersatz = `[${ERSATZ_NUMMERIERT[sprache][art]} ${n}]`;
      } else {
        ersatz = ERSATZ_FEST[sprache][f.art as RegelArt];
      }
      aus.push({ ...f, id: `${d.id}:${f.start}:${f.ende}`, dokument: d.id, ersatz, an: VORAUSWAHL[f.art] });
    }
  }
  return aus;
}

/* ---------------------------------------------------------------------------------------------
 * Verschieben und Ersetzen
 * ------------------------------------------------------------------------------------------- */

/**
 * Neue Position für p im Text nach den Ersetzungen. Ersatzstellen aufsteigend, nicht überlappend, Positionen im alten Text.
 * Innerhalb einer Stelle: Start auf deren Anfang, Ende ans Ende des Ersatzes. Ein Start genau am Ende der Stelle rückt mit,
 * ein Ende genau am Anfang bleibt.
 */
export function verschiebe(pos: number, ersatz: { start: number; ende: number; laenge: number }[], seite: 'start' | 'ende'): number {
  let summe = 0;
  for (const e of ersatz) {
    if (e.ende <= pos) summe += e.laenge - (e.ende - e.start);
    else if (e.start < pos) return e.start + (seite === 'ende' ? e.laenge : 0) + summe;
    else break;
  }
  return pos + summe;
}

/**
 * Feinstrukturanalysen zum Dokument (Architekturblatt Feinstruktur 2.1): `ausschnitt.start/ende` rücken mit; stimmte der Wortlaut der Analyse
 * mit dem Dokument überein, werden die Ersetzungen im Ausschnitt auch in `ausschnitt.text` gemacht und die relativen Grenzen verschoben.
 * Eine Grenze in einem ersetzten Namen rückt ans Ende des Ersatzes (Vermerk im Protokoll). Wird eine Sinneinheit dabei leer, gehen ihre
 * Einträge an die vorige Einheit (nichts wird still gelöscht). Hatte die Analyse schon einen eigenen Wortlaut, bleibt er unverändert.
 */
function verschiebeAnalysen(p: QualProjekt, dokId: string, altText: string, stellen: { start: number; ende: number; laenge: number; ersatz: string }[], jetzt: number) {
  for (const sa of p.sequenzanalysen ?? []) {
    if (sa.dokument !== dokId) continue;
    const a = sa.ausschnitt;
    const gleich = cpTeil(altText, a.start, a.ende) === a.text;
    const innen = stellen.filter(x => x.start >= a.start && x.ende <= a.ende).map(x => ({ ...x, start: x.start - a.start, ende: x.ende - a.start }));
    const neuStart = verschiebe(a.start, stellen, 'start'), neuEnde = verschiebe(a.ende, stellen, 'ende');
    if (gleich && innen.length) {
      const z = Array.from(a.text);
      let text = '', pos = 0;
      for (const x of innen) { text += z.slice(pos, x.start).join('') + x.ersatz; pos = x.ende; }
      a.text = text + z.slice(pos).join('');
      const n = cpLaenge(a.text);
      let verlegt = 0;
      const grenzen = sa.einheiten.slice(1).map(e => {
        const g = verschiebe(e.von, innen, 'ende');
        if (innen.some(x => x.start < e.von && e.von < x.ende)) verlegt++;
        return g;
      });
      const alt = sa.einheiten;
      const neu: Sinneinheit[] = [];
      alt.forEach((e, i) => {
        const von = i === 0 ? 0 : grenzen[i - 1]!, bis = i === alt.length - 1 ? n : grenzen[i]!;
        const vorige = neu[neu.length - 1];
        if (bis <= von && vorige) {
          const z = haengeEintraegeAn(vorige, e);
          z.gedeutet = vorige.gedeutet && e.gedeutet;
          neu[neu.length - 1] = z;
          return;
        }
        neu.push({ ...e, von: vorige ? vorige.bis : 0, bis: Math.max(bis, vorige ? vorige.bis : 0) });
      });
      neu[neu.length - 1]!.bis = n;
      sa.einheiten = neu;
      sa.aktuelleEinheit = Math.min(sa.aktuelleEinheit, neu.length - 1);
      if (verlegt) p.protokoll.push({ zeit: jetzt, was: `Feinstrukturanalyse „${sa.name}“: ${verlegt} Grenze(n) lagen in einem ersetzten Namen und liegen jetzt am Ende des Ersatzes` });
    }
    a.start = neuStart; a.ende = neuEnde;
    sa.geaendert = jetzt;
  }
}

export interface Zuordnung { ersatz: string; klartext: string; art: TrefferArt; stellen: number }

/** Ersetzt nur Treffer mit an=true; verschiebt Segmente und Transkript-Abschnitte; protokoll je Dokument. Die Eingabe bleibt unverändert. */
export function ersetze(q: QualProjekt, treffer: Treffer[], jetzt: number): { projekt: QualProjekt; zuordnung: Zuordnung[] } {
  const p = structuredClone(q);
  const aktiv = treffer.filter(t => t.an);

  for (const d of p.dokumente) {
    const meine = aktiv.filter(t => t.dokument === d.id).sort((a, b) => a.start - b.start);
    const stellen: { start: number; ende: number; laenge: number; ersatz: string }[] = [];
    let letzte = -1;
    for (const t of meine) {
      if (t.start < letzte || t.ende <= t.start) continue;   // überlappende Treffer überspringen
      stellen.push({ start: t.start, ende: t.ende, laenge: cpLaenge(t.ersatz), ersatz: t.ersatz });
      letzte = t.ende;
    }
    if (!stellen.length) continue;

    const karte = positionsKarte(d.text);
    const cpZuU = (cp: number): number => {
      // UTF-16-Index zum Codepoint-Index cp (lokal, über die Karte der Astralzeichen)
      let lo = 0, hi = karte.astral.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if ((karte.astral[m] ?? 0) < cp) lo = m + 1; else hi = m; }
      return cp + lo;
    };
    const altText = d.text;
    let neu = '';
    let pos = 0;
    for (const s of stellen) {
      neu += d.text.slice(cpZuU(pos), cpZuU(s.start)) + s.ersatz;
      pos = s.ende;
    }
    neu += d.text.slice(cpZuU(pos));
    d.text = neu;
    d.geaendert = jetzt;

    for (const s of p.segmente) {
      if (s.dokument !== d.id) continue;
      s.start = verschiebe(s.start, stellen, 'start');
      s.ende = verschiebe(s.ende, stellen, 'ende');
    }
    for (const a of d.transkript?.abschnitte ?? []) {
      a.start = verschiebe(a.start, stellen, 'start');
      a.ende = verschiebe(a.ende, stellen, 'ende');
    }
    verschiebeAnalysen(p, d.id, altText, stellen, jetzt);
    p.protokoll.push({ zeit: jetzt, was: `Dokument „${d.name}“: pseudonymisiert, ${stellen.length} Stellen` });
  }

  // Sprechernamen: ersetzt, wenn der Sprecher als Person zählt (nicht die Interview-Rolle)
  const personen = new Map<string, string>();
  for (const t of aktiv) if (t.art === 'person' && !personen.has(normName(t.text))) personen.set(normName(t.text), t.ersatz);
  for (const d of p.dokumente) {
    for (const s of d.transkript?.sprecher ?? []) {
      if (s.rolle === 'interview') continue;
      const e = personen.get(normName(s.name));
      if (e !== undefined) s.name = e;
    }
  }

  // Freitext-Felder der Stufe A1 (Architekturblatt Ausbau 2): KI-Angabe und Typen. Ersetzt werden die Namen (nicht Regeln wie E-Mail),
  // die in Dokumenten ersetzt wurden; dort, wo sie als ganzes Wort stehen.
  const namenPaare = new Map<string, string>();
  for (const t of aktiv) if (NAMENSARTEN.has(t.art) && t.text.trim() && !namenPaare.has(t.text)) namenPaare.set(t.text, t.ersatz);
  if (namenPaare.size) {
    const paare = [...namenPaare].sort((x, y) => y[0].length - x[0].length);
    const frei = (text: string): string => {
      let aus = text;
      for (const [klar, ersatz] of paare) {
        const re = new RegExp(`(?<![\\p{L}\\p{N}])${klar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'gu');
        aus = aus.replace(re, () => ersatz);
      }
      return aus;
    };
    // A6a: Namen von Dokumenten, Dateien und Fällen tragen oft den Klarnamen („Interview Mareike“)
    for (const d of p.dokumente) {
      d.name = frei(d.name);
      if (d.datei) d.datei.name = frei(d.datei.name);
      if (d.medium) d.medium.datei = frei(d.medium.datei);
    }
    for (const f of p.faelle ?? []) f.name = frei(f.name);
    // die Protokollzeilen dieses Laufs nennen die Dokumente noch beim alten Namen
    for (const z of p.protokoll) if (z.zeit === jetzt) z.was = frei(z.was);
    if (p.kiNutzung?.text !== undefined) p.kiNutzung.text = frei(p.kiNutzung.text);
    for (const ty of p.typen ?? []) {
      ty.name = frei(ty.name);
      if (ty.beschreibung !== undefined) ty.beschreibung = frei(ty.beschreibung);
    }
    // Stufe A3: Themen (Name, zentrales Konzept, Beschreibung, Verlauf mit alten Namen und Notizen)
    for (const th of p.themen ?? []) {
      th.name = frei(th.name);
      if (th.konzept !== undefined) th.konzept = frei(th.konzept);
      if (th.beschreibung !== undefined) th.beschreibung = frei(th.beschreibung);
      for (const sch of th.verlauf) {
        if (sch.vorher !== undefined) sch.vorher = frei(sch.vorher);
        if (sch.nachher !== undefined) sch.nachher = frei(sch.nachher);
        if (sch.notiz !== undefined) sch.notiz = frei(sch.notiz);
      }
    }
    // Stufe A2: Mixed Methods (Name und Texte der Joint Displays, Design-Beschreibung, Fundstellen und Notizen der Selbstprüfung, Item-Texte)
    for (const j of p.jointDisplays ?? []) {
      j.name = frei(j.name);
      for (const k of Object.keys(j.metaInferenz)) j.metaInferenz[k] = frei(j.metaInferenz[k]!);
      if (j.zahlen) for (const k of Object.keys(j.zahlen)) j.zahlen[k] = frei(j.zahlen[k]!);
    }
    if (p.mmDesign?.beschreibung !== undefined) p.mmDesign.beschreibung = frei(p.mmDesign.beschreibung);
    for (const l of p.selbstpruefung ?? []) for (const pt of l.punkte) {
      if (pt.fundstelle !== undefined) pt.fundstelle = frei(pt.fundstelle);
      if (pt.notiz !== undefined) pt.notiz = frei(pt.notiz);
    }
    for (const it of p.instrument ?? []) it.text = frei(it.text);
    // Stufe A5: Fundstellen und Notizen der Berichtshilfe
    for (const l of p.berichtshilfe ?? []) for (const pt of l.punkte) {
      if (pt.fundstelle !== undefined) pt.fundstelle = frei(pt.fundstelle);
      if (pt.notiz !== undefined) pt.notiz = frei(pt.notiz);
    }
    // Stufe A4: Einträge der Sequenzanalysen in allen Spalten (feste und frei definierte), mit Prüfkriterium und Verlauf der Lesarten
    for (const sa of p.sequenzanalysen ?? []) for (const e of sa.einheiten) {
      for (const f of FESTE_FELDER) for (const x of e[f]) {
        x.text = frei(x.text);
        if ('pruefung' in x) x.pruefung = frei(x.pruefung);
        if ('verlauf' in x) for (const v of x.verlauf) v.begruendung = frei(v.begruendung);
      }
      for (const l of Object.values(e.weitere ?? {})) for (const x of l) x.text = frei(x.text);
    }
    // Stufe A6a: übrige Freitexte der Sequenzanalysen (Frage, Kontext, Reflexionen, Zwischenfazit, Schlüsselentscheidungen)
    for (const sa of p.sequenzanalysen ?? []) {
      sa.name = frei(sa.name);
      sa.forschungsfrage = frei(sa.forschungsfrage);
      if (sa.ausschnitt.kontext !== undefined) sa.ausschnitt.kontext = frei(sa.ausschnitt.kontext);
      if (sa.schluesselentscheidungen !== undefined) sa.schluesselentscheidungen = frei(sa.schluesselentscheidungen);
      for (const rf of sa.reflexionen) { rf.begriffe = frei(rf.begriffe); rf.bisher = frei(rf.bisher); rf.pruefen = frei(rf.pruefen); }
      if (sa.fazit) {
        sa.fazit.bezugForschungsfrage = frei(sa.fazit.bezugForschungsfrage);
        if (sa.fazit.text !== undefined) sa.fazit.text = frei(sa.fazit.text);
        for (const m of sa.fazit.muster) { m.text = frei(m.text); for (const be of m.belege) be.zitat = frei(be.zitat); }
      }
    }
    // Stufe A6a: Memos, Protokolle, Einwilligungen, Zusammenfassungen und Codebuch-Texte (Definition, Regel, Ankerbeispiele sind Zitate)
    for (const m of p.memos) { if (m.titel !== undefined) m.titel = frei(m.titel); m.text = frei(m.text); }
    for (const pr of p.protokolle ?? []) {
      for (const k of ['ort', 'kontaktweg'] as const) if (pr.kopf[k] !== undefined) pr.kopf[k] = frei(pr.kopf[k]!);
      for (const k of Object.keys(pr.felder)) pr.felder[k] = frei(pr.felder[k]!);
      for (const st of pr.schwierigeStellen ?? []) st.text = frei(st.text);
      const sc = pr.schritte;
      if (sc?.s1) sc.s1.text = frei(sc.s1.text);
      if (sc?.s2) { sc.s2.text = frei(sc.s2.text); if (sc.s2.notizen !== undefined) sc.s2.notizen = frei(sc.s2.notizen); }
      for (const ab of sc?.s3?.abschnitte ?? []) { ab.beobachtung = frei(ab.beobachtung); ab.ueberlegung = frei(ab.ueberlegung); }
    }
    for (const e of p.einwilligungen ?? []) {
      e.fassung = frei(e.fassung);
      if (e.zugriffskreis !== undefined) e.zugriffskreis = frei(e.zugriffskreis);
      for (const pt of e.punkte) if (pt.notiz !== undefined) pt.notiz = frei(pt.notiz);
      for (const w of e.widerrufe ?? []) if (w.notiz !== undefined) w.notiz = frei(w.notiz);
      for (const w of e.wiedervorlage ?? []) w.anlass = frei(w.anlass);
    }
    for (const z of p.zusammenfassungen ?? []) z.text = frei(z.text);
    for (const c of p.codes) {
      if (c.definition !== undefined) c.definition = frei(c.definition);
      if (c.regel !== undefined) c.regel = frei(c.regel);
      for (const an of c.anker ?? []) an.text = frei(an.text);
    }
    // Verweise im Projekt-Protokoll (thema.*) tragen den Themen-Namen
    for (const a of p.protokoll) {
      const n = a.nachher as { thema?: unknown; text?: unknown } | undefined;
      if (a.was.startsWith('thema.') && n && typeof n === 'object' && typeof n.text === 'string') a.nachher = { ...n, text: frei(n.text) };
    }
  }

  // Zuordnung: Namen eine Zeile je Ersatz, Regeln je (Ersatz, Klartext); feste Reihenfolge der Arten, darin nach erstem Vorkommen
  const zeilen = new Map<string, Zuordnung>();
  for (const t of aktiv) {
    const schluessel = NAMENSARTEN.has(t.art) ? `${t.art}\u0000${t.ersatz}` : `${t.art}\u0000${t.ersatz}\u0000${t.text}`;
    const z = zeilen.get(schluessel);
    if (z) z.stellen++;
    else zeilen.set(schluessel, { ersatz: t.ersatz, klartext: t.text, art: t.art, stellen: 1 });
  }
  const zuordnung = [...zeilen.values()]
    .map((z, i) => ({ z, i }))
    .sort((a, b) => ARTEN.indexOf(a.z.art) - ARTEN.indexOf(b.z.art) || a.i - b.i)
    .map(x => x.z);

  return { projekt: p, zuordnung };
}

/* ---------------------------------------------------------------------------------------------
 * Zuordnungsliste als CSV
 * ------------------------------------------------------------------------------------------- */

export function zuordnungAlsCsv(z: Zuordnung[], sprache: 'de' | 'en'): string {
  const sp = sprache === 'en' ? 'en' : 'de';
  const trenner = sp === 'de' ? ';' : ',';
  const feld = (s: string): string => {
    const v = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return v.includes(trenner) || v.includes('"') || v.includes('\n') || v.includes('\r') ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const zeilen = [CSV_KOPF[sp].join(trenner)];
  for (const r of z) zeilen.push([feld(r.ersatz), feld(r.klartext), feld(ART_BESCHRIFTUNG[sp][r.art]), String(r.stellen)].join(trenner));
  return zeilen.join('\n') + '\n';
}
