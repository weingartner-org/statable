/**
 * Transkript-Prüfer nach Froschauer und Lueger (Feinstruktur F1A; Fachblatt `docs/feinstruktur/FACHBLATT-PRUEFER-VORLAGEN.md`, Abschnitt 1, Regeln a bis n).
 * Eigene Funktion für das dritte Regelwerk; `pruefeTranskript` in `transkript-pruefen.ts` ruft sie bei `'froschauer-lueger'` auf.
 * Der Prüfer meldet nur die Form, nie den Inhalt, und ändert nie selbst. Vorschläge gibt es nur, wo die richtige Form eindeutig ist.
 * Hörersignale (`mhm`, `äh`) sind hier normaler Text. Dialekt und schnelles Sprechen werden nie gemeldet.
 * Regel g (Betonung, unterstrichen) gibt es in reinem Text nicht und wird hier nicht geprüft.
 * Hinweis-Stellen zählen in Codepoints in `dokument.text`, Ende exklusiv.
 */
import type { Dokument } from './qualprojekt';
import type { Hinweis } from './transkript-pruefen';
import { codepoints, cpLen } from './transkript-text';

export type FlArt =
  | 'fl-zeitmarke-wechsel' | 'fl-zeitmarken-fehlen' | 'fl-kennung' | 'fl-kodierschema' | 'fl-pause-form' | 'fl-nonverbal-form' | 'fl-geraeusch-form'
  | 'fl-signal-klammer' | 'fl-unverstaendlich-form' | 'fl-vermutet-form' | 'fl-dehnung-form' | 'fl-unterbrechung-form' | 'fl-gleichzeitig-form'
  | 'fl-anonym-form' | 'fl-anonym-fehlt' | 'fl-gendern-form';

type Sprache = 'de' | 'en';

const SAETZE: Record<FlArt, { de: string; en: string }> = {
  'fl-zeitmarke-wechsel': {
    de: 'Hier wechselt die Person, aber es steht keine Zeitmarke. Nach Froschauer und Lueger steht die Zeitmarke spätestens bei jedem Sprecherwechsel, zum Beispiel [00:01:27] I1: …',
    en: 'The speaker changes here, but there is no time stamp. After Froschauer and Lueger, a time stamp stands at every change of speaker at the latest, for example [00:01:27] I1: …'
  },
  'fl-zeitmarken-fehlen': {
    de: 'In diesem Transkript steht nirgends eine Zeitmarke. Nach Froschauer und Lueger steht sie spätestens bei jedem Sprecherwechsel, in der Form Stunde:Minute:Sekunde, zum Beispiel [00:01:27].',
    en: 'This transcript has no time stamps. After Froschauer and Lueger, a time stamp stands at every change of speaker at the latest, in the form hours:minutes:seconds, for example [00:01:27].'
  },
  'fl-kennung': {
    de: 'Die Sprecherkennung heißt hier anders. Nach Froschauer und Lueger heißen Interviewende I1, I2 und Befragte B1, B2, zum Beispiel „B1:“.',
    en: 'The speaker label is different here. After Froschauer and Lueger, interviewers are I1, I2 and respondents are B1, B2, for example "B1:".'
  },
  'fl-kodierschema': {
    de: 'Zu den Sprechern gibt es kein Kodierschema. Nach Froschauer und Lueger gehört eine Liste an den Anfang, die sagt, wer I1 und B1 ist (Rolle in Statable eintragen).',
    en: 'There is no coding scheme for the speakers. After Froschauer and Lueger, a list at the start says who I1 and B1 are (enter the role in Statable).'
  },
  'fl-pause-form': {
    de: 'Eine Pause schreibt man als einzelne Punkte, ein Punkt je Sekunde, mit Leerzeichen dazwischen und zwei Leerzeichen davor und danach, zum Beispiel „  . . .  “ für drei Sekunden.',
    en: 'A pause is written as single dots, one dot per second, with spaces between them and two spaces before and after, for example "  . . .  " for three seconds.'
  },
  'fl-nonverbal-form': {
    de: 'Nichtverbales der sprechenden Person steht in runden Klammern mit der Kennung, zum Beispiel „(B1 lacht)“.',
    en: 'Non-verbal sounds of the speaker go in round brackets with the label, for example "(B1 laughs)".'
  },
  'fl-geraeusch-form': {
    de: 'Geräusche der Situation stehen in spitzen Klammern nach außen, zum Beispiel „>Telefon läutet<“.',
    en: 'Noises of the situation go in angle brackets pointing outwards, for example ">phone rings<".'
  },
  'fl-signal-klammer': {
    de: 'Hörersignale und Füllwörter wie „mhm“ oder „äh“ sind normaler Text und stehen ohne Klammern.',
    en: 'Listener signals and fillers such as "mhm" or "uh" are normal text and stand without brackets.'
  },
  'fl-unverstaendlich-form': {
    de: 'Unverständliches steht als Punkte in runden Klammern, ein Punkt je Sekunde, zum Beispiel „(. . . .)“.',
    en: 'Unintelligible passages are written as dots in round brackets, one dot per second, for example "(. . . .)".'
  },
  'fl-vermutet-form': {
    de: 'Ist das ein vermuteter Wortlaut? Dann steht er in runden Klammern, Alternativen mit Schrägstrich, zum Beispiel „(Huhn/Hund)“.',
    en: 'Is this an assumed wording? Then it goes in round brackets, alternatives separated by a slash, for example "(hen/dog)".'
  },
  'fl-dehnung-form': {
    de: 'Ist das ein gedehntes Wort? Dann stehen Leerzeichen zwischen den Buchstaben und zwei Leerzeichen davor und danach, zum Beispiel „  s o  “.',
    en: 'Is this a drawn-out word? Then spaces stand between the letters and two spaces before and after, for example "  s o  ".'
  },
  'fl-unterbrechung-form': {
    de: 'Eine Unterbrechung der anderen Person steht im Satz zwischen Schrägstrichen, zum Beispiel „/I1: mhm/“.',
    en: 'An interruption by the other person stands in the sentence between slashes, for example "/I1: mhm/".'
  },
  'fl-gleichzeitig-form': {
    de: 'Gleichzeitiges Sprechen beginnt in der zweiten Zeile mit einem Schrägstrich und der Kennung, zum Beispiel „/I1: ja genau“.',
    en: 'Simultaneous speech starts in the second line with a slash and the label, for example "/I1: yes exactly".'
  },
  'fl-anonym-form': {
    de: 'Anonymisiertes steht in spitzen Klammern nach innen, zum Beispiel „<Schule A>“.',
    en: 'Anonymised items go in angle brackets pointing inwards, for example "<School A>".'
  },
  'fl-anonym-fehlt': {
    de: 'Dieser Name steht in Ihrer Namensliste, aber noch im Klartext. Anonymisiert wird in spitzen Klammern nach innen, zum Beispiel „<Name B>“.',
    en: 'This name is on your list of names but is still written out. Anonymise it in angle brackets pointing inwards, for example "<Name B>".'
  },
  'fl-gendern-form': {
    de: 'Wenn gegendert wird, schreibt man hier mit Doppelpunkt, zum Beispiel „Schüler:innen“. Das ist ein Hinweis auf die Schreibweise, kein Fehler.',
    en: 'If gendered, the form with a colon is used here, for example "Schüler:innen". This is a note on spelling, not an error.'
  }
};

/** Die Fragen, die kein sicherer Fehler sind, stehen als Frage (Fachblatt: Hinweis, nicht Fehler). */
const KENNUNG_SATZ = (k: string, s: Sprache): string => (s === 'de'
  ? `Die Sprecherkennung „${k}:“ weicht ab. Nach Froschauer und Lueger heißen Interviewende I1, I2 und Befragte B1, B2, zum Beispiel „B1:“.`
  : `The speaker label "${k}:" is different. After Froschauer and Lueger, interviewers are I1, I2 and respondents are B1, B2, for example "B1:".`);

const IB = /^[IB]\d+$/;
const MARKE_START = /^(?:#\d{2,}:\d{2}:\d{2}-\d#|\[\d{2,}:\d{2}:\d{2}\]|\(\d{2,}:\d{2}:\d{2}\)|\d{2,}:\d{2}:\d{2}(?=\s))[ \t]*/;
const KENNUNG_MUSTER = /^(\S[^:\n]{0,29}?):(?=\s|$)/;
/** Kennungen, die mitten im Beitrag (in einer Folgezeile) wie ein Sprecherwort aussehen */
const LABEL = /^(?:Interview\p{L}*|Befragt\p{L}*|Frau\s.{1,20}|Herr\s.{1,20}|Moderator\p{L}*|Sprecher\p{L}*|Proband\p{L}*|Teilnehmer\p{L}*|Person\s?\d*|Interviewer|Interviewee|Respondent|Speaker\s?\d*|[A-ZÄÖÜ]\d{0,2}|SPEAKER_\d+)$/u;
const SIGNAL = /^(?:mhm+|hm+|hmh|mhh|äh+m*|ähm+|öh+m*|ehm|aha|ah|uh+m*|um+)[.!?,]*$/iu;
const LAUT = /^(?:lach|seufz|wein|hust|räusper|flüster|stöhn|schmunzel|kicher|schnauf|atm|gähn|schnief|lächel|nick|schweig|pfeif|sing|laugh|sigh|cr(?:y|ies|ying)|cough|whisper|giggl|groan|sob|smil|nod)\p{L}*(?:\s+\p{L}+)?$/iu;
const GERAEUSCH_NOMEN = /^(?:Telefon|Handy|Tür|Stuhl|Klingel|Schritte|Lärm|Musik|Glocke|Wecker|Sirene|Geräusch|Klopfen|Baustelle|Verkehr|phone|door|chair|noise|music|bell|alarm)\b/iu;
const GERAEUSCH_VERB = /\b(?:geht|gehen|läutet|klingelt|summt|knarrt|klopft|piept|rauscht|knallt|ertönt|quietscht|brummt|bellt|klappert|fällt|schlägt|poltert|dröhnt|vibriert|rings|buzzes|opens|closes|knocks|creaks)\b/iu;
const ANONYM = /^\p{L}[\p{L}-]*(?: \p{L}[\p{L}-]*)? [A-ZÄÖÜ]\d?$/u;
const PLATZHALTER = /^(?:Name|Vorname|Nachname|Ort|Firma|Anonym|Person)$/u;
const UNVERSTAENDLICH = /^(?:unv\.?|unverst\.?|unverst[aä]ndlich|inaudible|unintelligible)$/iu;
const GLEICHZEITIG = /^(?:gleichzeitig|überlappend|simultan|overlap(?:ping)?|simultaneous)$/iu;
const SEKUNDEN = /^(\d{1,2})\s*(?:Sek\.?|Sekunden?|s|sec\.?|seconds?)$/iu;
const ALTERNATIVE = /^([\p{L}\p{N}-]+) (?:oder|bzw\.?|or) ([\p{L}\p{N}-]+)$/iu;

const punkte = (n: number): string => Array.from({ length: n }, () => '.').join(' ');
const maskiere = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Fund { von: number; bis: number; art: FlArt; vorschlag?: string; satz?: string }

export interface FlOptionen {
  /** Namen, die der Mensch angegeben hat und die anonymisiert werden müssen; Statable rät keine Namen. */
  namen?: string[];
}

export function pruefeFroschauerLueger(dok: Dokument, sprache: Sprache, optionen: FlOptionen = {}): Hinweis[] {
  const t = dok.transkript;
  if (!t) return [];
  const cps = codepoints(dok.text);
  const englisch = (dok.sprache ?? '').toLowerCase().startsWith('en');
  const namen = (optionen.namen ?? []).map(n => n.trim()).filter(n => n.length > 0);
  const namenRe = namen.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...namen].sort((a, b) => b.length - a.length).map(maskiere).join('|')})(?:s)?(?![\\p{L}\\p{N}])`, 'gu') : null;
  const hinweise: Hinweis[] = [];
  const melde = (art: FlArt, abschnitt: number, start: number, ende: number, vorschlag?: string, satz?: string) =>
    hinweise.push({ art, abschnitt, start, ende, satz: satz ?? SAETZE[art][sprache], ...(vorschlag !== undefined ? { vorschlag } : {}), herkunft: 'froschauer-lueger' });

  // Der Kopf (Kodierschema) steht vor dem ersten Beitrag mit Sprecher und ist kein Beitrag.
  const ersterMitSprecher = t.abschnitte.findIndex(a => a.sprecher);
  const kopfAnzahl = ersterMitSprecher > 0 ? ersterMitSprecher : 0;

  const hatZeit: boolean[] = [];
  const ersteKennung: ({ von: number; bis: number } | null)[] = [];
  const kennungen = new Set<string>();

  t.abschnitte.forEach((a, i) => {
    hatZeit[i] = a.zeitMs !== undefined || a.bisMs !== undefined;
    ersteKennung[i] = null;
    if (i < kopfAnzahl) return;
    const s = cps.slice(a.start, a.ende).join('');
    const cp = (idx: number): number => a.start + cpLen(s.slice(0, idx));
    const zeilen: { text: string; von: number }[] = [];
    for (let pos = 0; pos <= s.length;) {
      let e = s.indexOf('\n', pos);
      if (e < 0) e = s.length;
      const ende = e > pos && s.charCodeAt(e - 1) === 13 ? e - 1 : e;
      zeilen.push({ text: s.slice(pos, ende), von: pos });
      pos = e + 1;
    }
    let eigeneKennung: string | undefined;

    zeilen.forEach((z, li) => {
      let pos = 0;
      const m1 = MARKE_START.exec(z.text);
      if (m1) { pos = m1[0].length; if (li === 0) hatZeit[i] = true; }
      // Kennung am Zeilenanfang
      const km = KENNUNG_MUSTER.exec(z.text.slice(pos));
      if (km) {
        const k = km[1]!.trim();
        const ersteZeileMitSprecher = li === 0 && a.sprecher !== undefined;
        const nichtSchraeg = !k.startsWith('/') && !k.startsWith('\\');
        if (nichtSchraeg && (ersteZeileMitSprecher || LABEL.test(k))) {
          if (li === 0) eigeneKennung = k;
          const von = z.von + pos;
          if (!IB.test(k) && (!ersteZeileMitSprecher || !kennungen.has(k))) {
            kennungen.add(k);
            melde('fl-kennung', i, cp(von), cp(von + km[0].length), undefined, KENNUNG_SATZ(k, sprache));
          }
          if (li === 0) ersteKennung[i] = { von: cp(von), bis: cp(von + km[0].length) };
          pos += km[0].length;
          while (z.text[pos] === ' ' || z.text[pos] === '\t') pos++;
          const m2 = MARKE_START.exec(z.text.slice(pos));
          if (m2) { pos += m2[0].length; if (li === 0) hatZeit[i] = true; }
        }
      }
      // gleichzeitiges Sprechen mit falschem Zeichen: \I1:
      const rueck = /^\s*(\\)[IB]\d+:/.exec(z.text.slice(pos));
      if (rueck) {
        const von = z.von + pos + rueck[0].indexOf('\\');
        melde('fl-gleichzeitig-form', i, cp(von), cp(von + 1), '/');
      }
      analysiereZeile(z.text.slice(pos), z.von + pos);
    });

    function analysiereZeile(inh: string, basis: number): void {
      const fund: Fund[] = [];
      const belegt: [number, number][] = [];
      const frei = (v: number, b: number) => !belegt.some(([x, y]) => v < y && b > x);
      const setze = (v: number, b: number, art: FlArt, vorschlag?: string, satz?: string) => {
        if (!frei(v, b)) return;
        belegt.push([v, b]);
        fund.push({ von: v, bis: b, art, ...(vorschlag !== undefined ? { vorschlag } : {}), ...(satz !== undefined ? { satz } : {}) });
      };
      const merke = (v: number, b: number) => { if (frei(v, b)) belegt.push([v, b]); };
      /** Leerzeichen rundherum in den Bereich nehmen, damit der Vorschlag mit zwei Leerzeichen genau passt */
      const weite = (v: number, b: number): [number, number, boolean, boolean] => {
        let l = v, r = b, n = 0;
        while (l > 0 && inh[l - 1] === ' ' && n < 3) { l--; n++; }
        n = 0;
        while (r < inh.length && inh[r] === ' ' && n < 3) { r++; n++; }
        return [l, r, l === 0, r === inh.length];
      };
      const mitLeer = (v: number, b: number, kern: string): { von: number; bis: number; vorschlag: string } => {
        const [l, r, randL, randR] = weite(v, b);
        return { von: l, bis: r, vorschlag: (randL ? '' : '  ') + kern + (randR ? '' : '  ') };
      };
      const zwei = (v: number, davor: boolean): boolean => (davor ? (v === 0 || inh.slice(Math.max(0, v - 2), v) === '  ') : (v === inh.length || inh.slice(v, v + 2) === '  '));

      // 1. Klammern: rund, eckig, Sternchen
      const klammern = /\(([^()\n]*)\)|\[([^[\]\n]*)\]|(?<![\p{L}\p{N}*])\*([^\s*][^*\n]{0,38}?[^\s*]|[^\s*])\*(?![\p{L}\p{N}*])/gu;
      for (let m = klammern.exec(inh); m; m = klammern.exec(inh)) {
        const von = m.index, bis = von + m[0].length;
        const art: '(' | '[' | '*' = m[1] !== undefined ? '(' : m[2] !== undefined ? '[' : '*';
        const innen = (m[1] ?? m[2] ?? m[3] ?? '').trim();
        const r = klassiere(innen, art);
        if (r === null) { merke(von, bis); continue; }
        if (r.art === 'fl-pause-form' && r.vorschlag !== undefined) {
          const w = mitLeer(von, bis, r.vorschlag);
          setze(w.von, w.bis, r.art, w.vorschlag);
        } else setze(von, bis, r.art, r.vorschlag);
      }

      // 2. spitze Klammern: >…< ist ein Geräusch, <…> ist Anonymisiertes
      const aussen = /(?<=^|\s)>([^<>\n]+?)<(?=$|[\s.,;:!?)])/g;
      for (let m = aussen.exec(inh); m; m = aussen.exec(inh)) {
        const innen = m[1]!.trim();
        if (ANONYM.test(innen)) setze(m.index, m.index + m[0].length, 'fl-anonym-form', `<${innen}>`);
        else merke(m.index, m.index + m[0].length);
      }
      const innen = /<(?=\S)([^<>\n]*?\S)>/g;
      for (let m = innen.exec(inh); m; m = innen.exec(inh)) {
        const v = m.index, b = v + m[0].length;
        if (!frei(v, b)) continue;
        const x = m[1]!;
        if (ANONYM.test(x) || /^(?:Name|Ort|Person|Schule|Firma)\s?[A-ZÄÖÜ0-9]?\d?$/u.test(x)) { merke(v, b); continue; }
        if (istGeraeusch(x)) setze(v, b, 'fl-geraeusch-form', `>${x}<`);
        else merke(v, b);
      }

      // 3. Unterbrechung im Satz: /I1: mhm/ ist richtig, /I1 mhm/ nicht
      const richtig = /\/[IB]\d+:[^/\n]*\//g;
      for (let m = richtig.exec(inh); m; m = richtig.exec(inh)) merke(m.index, m.index + m[0].length);
      const ohneDoppelpunkt = /(?<![\p{L}\p{N}/])\/([IB]\d+)\s+([^/:\n]{1,40}?)\/(?![\p{L}\p{N}/])/gu;
      for (let m = ohneDoppelpunkt.exec(inh); m; m = ohneDoppelpunkt.exec(inh)) setze(m.index, m.index + m[0].length, 'fl-unterbrechung-form', `/${m[1]}: ${m[2]!.trim()}/`);

      // 4. gleichzeitig mit //
      const doppelt = /(?<=^|\s)\/\/(?=\s|$)/g;
      for (let m = doppelt.exec(inh); m; m = doppelt.exec(inh)) setze(m.index, m.index + 2, 'fl-gleichzeitig-form');

      // 5. Pausen: frei stehende Punkte (Buchstaben davor schließen Satzende und Abkürzungen wie „z. B.“ aus)
      const pause = /(?<=^|\s)(?:\.{2,}|…|\.(?: \.)+)(?=\s|[,;:!?]|$)/gu;
      for (let m = pause.exec(inh); m; m = pause.exec(inh)) {
        const v = m.index, b = v + m[0].length;
        const n = m[0] === '…' ? 3 : (m[0].match(/\./g) ?? []).length;
        const spaced = /^\.(?: \.)+$/.test(m[0]);
        if (spaced && zwei(v, true) && zwei(b, false)) { merke(v, b); continue; }
        const w = mitLeer(v, b, punkte(Math.min(n, 30)));
        setze(w.von, w.bis, 'fl-pause-form', w.vorschlag);
      }

      // 6. gedehnt: so::, s-o, sooo, w i r k l i c h mit nur einem Leerzeichen
      const doppelpunkte = /(?<![\p{L}\p{N}])(\p{L}{1,8})::+(?=\s|[.,;!?]|$)/gu;
      for (let m = doppelpunkte.exec(inh); m; m = doppelpunkte.exec(inh)) {
        const w = mitLeer(m.index, m.index + m[0].length, Array.from(m[1]!).join(' '));
        setze(w.von, w.bis, 'fl-dehnung-form', w.vorschlag);
      }
      const strich = /(?<![\p{L}\p{N}-])\p{L}(?:-\p{L}){1,}(?![\p{L}\p{N}-])/gu;
      for (let m = strich.exec(inh); m; m = strich.exec(inh)) {
        const w = mitLeer(m.index, m.index + m[0].length, Array.from(m[0].replace(/-/g, '')).join(' '));
        setze(w.von, w.bis, 'fl-dehnung-form', w.vorschlag);
      }
      const buchstaben = /(?<=^|\s)\p{L}(?: \p{L}){2,}(?=\s|[.,;!?]|$)/gu;
      for (let m = buchstaben.exec(inh); m; m = buchstaben.exec(inh)) {
        const v = m.index, b = v + m[0].length;
        if (zwei(v, true) && zwei(b, false)) { merke(v, b); continue; }
        const w = mitLeer(v, b, m[0]);
        setze(w.von, w.bis, 'fl-dehnung-form', w.vorschlag);
      }
      const wiederholt = /(?<![\p{L}\p{N}])\p{L}*?([aeiouäöüy])\1{2,}\p{L}*(?![\p{L}\p{N}])/gu;
      for (let m = wiederholt.exec(inh); m; m = wiederholt.exec(inh)) setze(m.index, m.index + m[0].length, 'fl-dehnung-form');

      // 7. Gendern (nur Hinweis auf die Schreibweise)
      if (!englisch) {
        const gender = /(?<![\p{L}\p{N}])\p{L}*\p{Ll}(?:[*_/]-?innen|[*_/]in|Innen|In)(?![\p{L}\p{N}:])/gu;
        for (let m = gender.exec(inh); m; m = gender.exec(inh)) {
          const w = m[0];
          const g = /([*_/]-?innen|[*_/]in|Innen|In)$/.exec(w)!;
          const stamm = w.slice(0, w.length - g[0].length);
          const ende = /innen$/i.test(g[0]) ? ':innen' : ':in';
          setze(m.index, m.index + w.length, 'fl-gendern-form', stamm + ende);
        }
      }

      // 8. Namen der Namensliste im Klartext (nicht in <…>)
      if (namenRe) {
        const r = new RegExp(namenRe.source, namenRe.flags);
        for (let m = r.exec(inh); m; m = r.exec(inh)) {
          const davor = inh.slice(0, m.index);
          if (davor.lastIndexOf('<') > davor.lastIndexOf('>')) continue;
          setze(m.index, m.index + m[0].length, 'fl-anonym-fehlt');
        }
      }

      for (const f of fund) melde(f.art, i, cp(basis + f.von), cp(basis + f.bis), f.vorschlag, f.satz);
    }

    function klassiere(x: string, art: '(' | '[' | '*'): { art: FlArt; vorschlag?: string } | null {
      if (x === '' || /^\d{2,}:\d{2}:\d{2}$/.test(x)) return null;
      if (art === '*') return LAUT.test(x) ? { art: 'fl-nonverbal-form', ...(eigeneKennung && IB.test(eigeneKennung) ? { vorschlag: `(${eigeneKennung} ${x})` } : {}) } : null;
      // nur Punkte
      if (/^[.\s…]+$/.test(x)) {
        if (art === '(' && /^\.(?: \.)*$/.test(x)) return null;   // (. . .) ist richtig: Unverständliches
        const n = x === '…' ? 3 : (x.match(/\./g) ?? []).length || 3;
        return { art: 'fl-pause-form', vorschlag: punkte(Math.min(n, 30)) };
      }
      if (/^\?+$/.test(x) || UNVERSTAENDLICH.test(x)) return { art: 'fl-unverstaendlich-form' };
      const sek = SEKUNDEN.exec(x);
      if (sek) return { art: 'fl-pause-form', ...(+sek[1]! >= 1 ? { vorschlag: punkte(+sek[1]!) } : {}) };
      if (GLEICHZEITIG.test(x)) return { art: 'fl-gleichzeitig-form' };
      if (SIGNAL.test(x)) return { art: 'fl-signal-klammer', vorschlag: x };
      const unt = /^([IB]\d+)\s*:\s*(.+)$/.exec(x);
      if (unt) return { art: 'fl-unterbrechung-form', vorschlag: `/${unt[1]}: ${unt[2]!.trim()}/` };
      const kennung = /^([IB]\d+)\s+\S/.exec(x);
      if (kennung) return art === '(' ? null : { art: 'fl-nonverbal-form', vorschlag: `(${x})` };
      if (PLATZHALTER.test(x) || ANONYM.test(x)) return { art: 'fl-anonym-form', vorschlag: `<${x}>` };
      if (istGeraeusch(x)) return { art: 'fl-geraeusch-form', vorschlag: `>${x}<` };
      if (LAUT.test(x)) return { art: 'fl-nonverbal-form', ...(eigeneKennung && IB.test(eigeneKennung) ? { vorschlag: `(${eigeneKennung} ${x})` } : {}) };
      const alt = ALTERNATIVE.exec(x.replace(/\?$/, ''));
      if (alt) return { art: 'fl-vermutet-form', vorschlag: `(${alt[1]}/${alt[2]})` };
      if (x.endsWith('?')) return { art: 'fl-vermutet-form' };
      return null;
    }
  });

  // Regel a: Zeitmarke bei jedem Sprecherwechsel
  const inhalt: number[] = [];
  t.abschnitte.forEach((a, i) => {
    if (i < kopfAnzahl) return;
    const anfang = cps.slice(a.start, Math.min(a.ende, a.start + 24)).join('');
    if (/^\s*\/[IB]\d+:/.test(anfang.replace(MARKE_START, ''))) return;   // gleichzeitiges Sprechen braucht keine Zeitmarke
    inhalt.push(i);
  });
  if (inhalt.length > 0) {
    const erster = inhalt[0]!;
    const ea = t.abschnitte[erster]!;
    if (!inhalt.some(i => hatZeit[i])) {
      const k = ersteKennung[erster];
      melde('fl-zeitmarken-fehlen', erster, k?.von ?? ea.start, k?.bis ?? ea.start);
    } else {
      inhalt.forEach((i, n) => {
        const a = t.abschnitte[i]!;
        if (hatZeit[i]) return;
        const vor = n > 0 ? t.abschnitte[inhalt[n - 1]!]! : undefined;
        if (vor && vor.sprecher === a.sprecher) return;
        const k = ersteKennung[i];
        melde('fl-zeitmarke-wechsel', i, k?.von ?? a.start, k?.bis ?? a.start);
      });
    }
    // Kodierschema: weder ein Kopf noch Rollen der Sprecher
    if (kopfAnzahl === 0 && t.sprecher.length > 0 && t.sprecher.every(s => s.rolle === undefined)) melde('fl-kodierschema', erster, ea.start, ea.start);
  }

  return hinweise.sort((x, y) => x.abschnitt - y.abschnitt || x.start - y.start);
}

function istGeraeusch(x: string): boolean {
  if (GERAEUSCH_NOMEN.test(x)) return true;
  return /\s/.test(x) && GERAEUSCH_VERB.test(x);
}
