/**
 * Transkript-Prüfer (Fachblatt Stufe 4, 4B, mit den Entscheiden nach den Prüfer-Tests).
 * Regeln nach Dresing und Pehl (einfaches und erweitertes System, 8. Auflage 2018) und einige Prüfungen von Statable.
 * Der Prüfer gibt nur Hinweise und ändert nie etwas; `uebernimmVorschlag` ändert genau die Stelle eines Hinweises.
 * Hinweis-Stellen zählen in Codepoints in `dokument.text`, Ende exklusiv.
 */
import type { Dokument } from './qualprojekt';
import { zaehleWoerter } from './redeanteile';
import { pruefeFroschauerLueger, type FlArt, type FlOptionen } from './transkript-pruefen-fl';
import { alleInhalte, beitragTeile, codepoints, cpLen, hatMarke, markeImText, inhaltVon } from './transkript-text';

export { inhaltVon };

type AltArt =
  | 'sprecher-fehlt' | 'sprecherwechsel-im-absatz' | 'zeitmarke-fehlt' | 'zeit-rueckwaerts' | 'unverstaendlich-ohne-zeit'
  | 'rezeptionssignal' | 'schreibweise' | 'wortabbruch' | 'pause-form' | 'lautaeusserung-form' | 'langer-beitrag' | 'name-unbenannt';

export type RegelArt = AltArt | FlArt;
export type Regelwerk = 'einfach' | 'erweitert' | 'froschauer-lueger';
export type { FlOptionen };

export interface Hinweis {
  art: RegelArt;
  abschnitt: number;
  start: number;
  ende: number;
  satz: string;
  vorschlag?: string;
  herkunft: 'dresing-pehl' | 'statable' | 'froschauer-lueger';
}

type Sprache = 'de' | 'en';

const STATABLE: AltArt[] = ['zeit-rueckwaerts', 'langer-beitrag', 'name-unbenannt'];

const SAETZE: Record<AltArt, { de: string; en: string }> = {
  'sprecher-fehlt': { de: 'Bei diesem Beitrag steht keine Sprecherkennung, obwohl andere Beiträge eine haben.', en: 'This contribution has no speaker label, although other contributions do.' },
  'sprecherwechsel-im-absatz': { de: 'Mitten in diesem Absatz steht eine zweite Sprecherkennung. Jeder Sprecherwechsel braucht einen neuen Absatz.', en: 'A second speaker label appears in the middle of this paragraph. Every change of speaker needs a new paragraph.' },
  'zeitmarke-fehlt': { de: 'Dieser Beitrag hat keine Zeitmarke, obwohl andere Beiträge eine haben.', en: 'This contribution has no time stamp, although other contributions do.' },
  'zeit-rueckwaerts': { de: 'Die Zeit springt zurück: Dieser Beitrag beginnt früher, als der vorige endet.', en: 'The time jumps back: this contribution starts before the previous one ends.' },
  'unverstaendlich-ohne-zeit': { de: 'Unverständliche Stelle ohne Zeitmarke in einem langen Beitrag. Mit Zeitmarke ist sie in der Aufnahme leichter zu finden.', en: 'Unintelligible passage without a time stamp in a long contribution. A time stamp makes it easier to find in the recording.' },
  'rezeptionssignal': { de: 'Solche Hörersignale werden im einfachen System nicht geschrieben, wenn sie den Redefluss nicht unterbrechen.', en: '' },
  'schreibweise': { de: 'Diese Schreibweise weicht von der einheitlichen Schreibweise ab.', en: '' },
  'wortabbruch': { de: 'Abgebrochene Wörter werden im einfachen System weggelassen.', en: '' },
  'pause-form': { de: 'Pausen werden in Klammern geschrieben, zum Beispiel (...).', en: 'Pauses are written in brackets, for example (...).' },
  'lautaeusserung-form': { de: 'Lautäußerungen werden in runden Klammern geschrieben, zum Beispiel (lacht).', en: 'Vocal sounds are written in round brackets, for example (laughs).' },
  'langer-beitrag': { de: 'Dieser Beitrag ist sehr lang (über 400 Wörter). Wurde ein Sprecherwechsel überhört?', en: 'This contribution is very long (over 400 words). Was a change of speaker missed?' },
  'name-unbenannt': { de: 'Diese Person heißt noch wie vom Programm vergeben. Bitte einen sprechenden Namen vergeben, zum Beispiel „Person 1“.', en: 'This speaker still has the label given by the program. Please give a meaningful name, for example "Person 1".' }
};

const WORTABBRUCH_ERWEITERT = 'Abgebrochene Wörter werden im erweiterten System mit / statt - geschrieben.';
const SIGNAL = /^\s*(?:hm+|mhm+|aha|ja|genau|okay|ok)\s*[.!?,…]*\s*$/iu;
const SCHREIB: Record<string, string> = { mhm: 'hm', hmh: 'hm', mhh: 'hm', 'äm': 'ähm', ehm: 'ähm', 'öhm': 'ähm', ähem: 'ähm' };
const SCHREIB_RE = /(?<![\p{L}\p{N}])(mhm|hmh|mhh|äm|ehm|öhm|ähem)(?![\p{L}\p{N}])/giu;
const LAUT = /^(?:lach\p{L}*|seufz\p{L}*|wein\p{L}*|hust\p{L}*|räusper\p{L}*|flüster\p{L}*|stöhn\p{L}*|schmunzel\p{L}*|kicher\p{L}*|schnauf\p{L}*|atm\p{L}*|gähn\p{L}*|schnief\p{L}*|laugh\p{L}*|sigh\p{L}*|cr(?:y|ies|ying)|cough\p{L}*|whisper\p{L}*|giggl\p{L}*|groan\p{L}*|sob\p{L}*)(?:\s+\p{L}+)?$/iu;
const UNV = /\((?:unv\.?|unverst[aä]ndlich|inaudible|unintelligible)([^()]*)\)/giu;
const UNBENANNT = /^(?:SPEAKER[ _]?\d+|S\d{1,2})$/i;
/** Kurze Kennungen wie `B:`, `I:`, `B1:`, `SPEAKER_01:` mitten im Text */
const KENNUNG_KURZ = /(?<=\s)(?:[A-ZÄÖÜ]\d{0,2}|SPEAKER_\d+):(?=\s|$)/gu;

const gleichGross = (alt: string, neu: string): string => (alt.charAt(0) !== alt.charAt(0).toLowerCase() ? neu.charAt(0).toUpperCase() + neu.slice(1) : neu);
const maskiere = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function pruefeTranskript(dok: Dokument, regeln: Regelwerk, sprache: Sprache, optionen?: FlOptionen): Hinweis[] {
  if (regeln === 'froschauer-lueger') return pruefeFroschauerLueger(dok, sprache, optionen);
  const t = dok.transkript;
  if (!t) return [];
  const de = sprache === 'de';
  const cps = codepoints(dok.text);
  const inhalte = alleInhalte(dok);
  const teile = t.abschnitte.map((_, i) => beitragTeile(cps, dok, i));
  const text = (i: number) => cps.slice(t.abschnitte[i]!.start, t.abschnitte[i]!.ende).join('');
  const hinweise: Hinweis[] = [];
  const melde = (art: AltArt, abschnitt: number, start: number, ende: number, vorschlag?: string, satzText?: string) =>
    hinweise.push({ art, abschnitt, start, ende, satz: satzText ?? (SAETZE[art][sprache] || SAETZE[art].de), ...(vorschlag !== undefined ? { vorschlag } : {}), herkunft: STATABLE.includes(art as AltArt) ? 'statable' : 'dresing-pehl' });
  /** Stelle eines Treffers im Inhalt von Beitrag i → Codepoints im ganzen Text */
  const stelle = (i: number, inhalt: string, idx: number, laenge: number): [number, number] => {
    const von = teile[i]!.inhalt.start + cpLen(inhalt.slice(0, idx));
    return [von, von + cpLen(inhalt.slice(idx, idx + laenge))];
  };
  const jeTreffer = (re: RegExp, inhalt: string, f: (m: RegExpExecArray) => void) => {
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (let m = r.exec(inhalt); m; m = r.exec(inhalt)) { f(m); if (m[0] === '') r.lastIndex++; }
  };

  const hatZeit = (i: number) => { const a = t.abschnitte[i]!; return a.zeitMs !== undefined || a.bisMs !== undefined || hatMarke(text(i)); };
  const jemandKennung = t.abschnitte.some((a) => a.sprecher);
  const jemandZeit = t.abschnitte.some((_, i) => hatZeit(i));
  const bekannteNamen = new Set<string>();
  for (const s of t.sprecher) for (const k of [s.id, s.name]) if (k.length >= 2 && !/^[A-ZÄÖÜ]\d{0,2}$/.test(k) && !/^SPEAKER_\d+$/.test(k)) bekannteNamen.add(k);
  const bekanntRe = bekannteNamen.size ? new RegExp(`(?<=\\s)(?:${[...bekannteNamen].sort((a, b) => b.length - a.length).map(maskiere).join('|')}):(?=\\s|$)`, 'gu') : null;

  let letzte: number | undefined;
  const unbenanntGemeldet = new Set<string>();

  t.abschnitte.forEach((a, i) => {
    const inh = inhalte[i]!;

    if (jemandKennung && !a.sprecher) melde('sprecher-fehlt', i, a.start, a.ende);
    if (jemandZeit && !hatZeit(i)) melde('zeitmarke-fehlt', i, a.start, a.ende);

    // Zeit läuft rückwärts (Beginn = zeitMs, Ende = bisMs oder letzte Marke im Text)
    const anfang = a.zeitMs, ende = a.bisMs ?? markeImText(text(i));
    if ((anfang !== undefined && letzte !== undefined && anfang < letzte) || (anfang === undefined && ende !== undefined && letzte !== undefined && ende < letzte) || (anfang !== undefined && ende !== undefined && ende < anfang)) melde('zeit-rueckwaerts', i, a.start, a.ende);
    letzte = ende ?? anfang ?? letzte;

    // Sprecherwechsel mitten im Absatz (der Inhalt beginnt nach der eigenen Kennung)
    const gesehen = new Set<number>();
    for (const re of [KENNUNG_KURZ, bekanntRe]) {
      if (!re) continue;
      jeTreffer(re, ' ' + inh, (m) => {
        if (gesehen.has(m.index)) return;
        gesehen.add(m.index);
        const [von, bis] = stelle(i, ' ' + inh, m.index, m[0].length);
        melde('sprecherwechsel-im-absatz', i, von - 1, bis - 1);
      });
    }

    // Unverständliches ohne Zeit (Beitrag über 60 s oder Dauer unbekannt)
    const dauer = a.zeitMs !== undefined && a.bisMs !== undefined ? a.bisMs - a.zeitMs : undefined;
    if (dauer === undefined || dauer > 60_000) {
      jeTreffer(UNV, inh, (m) => {
        if (hatMarke(m[1] ?? '') || hatMarke(inh.slice(m.index + m[0].length).match(/^\s*\S*/)?.[0] ?? '')) return;
        const [von, bis] = stelle(i, inh, m.index, m[0].length);
        melde('unverstaendlich-ohne-zeit', i, von, bis);
      });
    }

    // Pausen: freistehende Punkte
    jeTreffer(/(?<=^|\s)(?:\.{2,3}|…)(?=\s|$)/u, inh, (m) => {
      const [von, bis] = stelle(i, inh, m.index, m[0].length);
      melde('pause-form', i, von, bis, m[0] === '..' ? '(..)' : '(...)');
    });

    // Lautäußerungen in eckigen Klammern oder Sternchen
    jeTreffer(/\[([^[\]]{1,40})\]|(?<![\p{L}\p{N}*])\*([^\s*](?:[^*]{0,38}[^\s*])?)\*(?![\p{L}\p{N}*])/u, inh, (m) => {
      const innen = (m[1] ?? m[2] ?? '').trim();
      if (!LAUT.test(innen)) return;
      const [von, bis] = stelle(i, inh, m.index, m[0].length);
      melde('lautaeusserung-form', i, von, bis, `(${innen})`);
    });

    // Lange Beiträge
    if (zaehleWoerter(inh) > 400) melde('langer-beitrag', i, a.start, a.ende);

    // Unbenannte Sprecher: einmal je Person, am ersten Beitrag
    if (a.sprecher && !unbenanntGemeldet.has(a.sprecher)) {
      const sp = t.sprecher.find((x) => x.id === a.sprecher);
      if (UNBENANNT.test(sp?.name ?? a.sprecher)) {
        unbenanntGemeldet.add(a.sprecher);
        const k = teile[i]!.kennung;
        melde('name-unbenannt', i, k.start === k.ende ? a.start : k.start, k.start === k.ende ? a.start : k.ende);
      }
    }

    // Nur Deutsch: Schreibweisen, Hörersignale, Wortabbrüche
    if (de) {
      jeTreffer(SCHREIB_RE, inh, (m) => {
        const [von, bis] = stelle(i, inh, m.index, m[0].length);
        const soll = gleichGross(m[0], SCHREIB[m[0].toLowerCase()]!);
        melde('schreibweise', i, von, bis, soll, `Einheitliche Schreibweise: „${soll}“ statt „${m[0]}“.`);
      });
      jeTreffer(/(?<![\p{L}\p{N}\-/])\p{L}+[-/](?=[\s.,;:!?)]|$)(?!\s+(?:und|oder|bzw\.?)(?![\p{L}]))/u, inh, (m) => {
        const [von, bis] = stelle(i, inh, m.index, m[0].length);
        if (regeln === 'einfach') melde('wortabbruch', i, von, bis);
        else if (m[0].endsWith('-')) melde('wortabbruch', i, von, bis, m[0].slice(0, -1) + '/', WORTABBRUCH_ERWEITERT);
      });
      if (regeln === 'einfach' && i > 0 && i < t.abschnitte.length - 1 && a.sprecher) {
        const sp = t.sprecher.find((x) => x.id === a.sprecher);
        const vor = t.abschnitte[i - 1]!.sprecher, nach = t.abschnitte[i + 1]!.sprecher;
        const rolleVor = t.sprecher.find((x) => x.id === vor)?.rolle;
        if (sp?.rolle === 'interview' && SIGNAL.test(inh) && vor && vor === nach && vor !== a.sprecher && rolleVor !== 'interview') melde('rezeptionssignal', i, a.start, a.ende);
      }
    }
  });

  return hinweise.sort((x, y) => x.abschnitt - y.abschnitt || x.start - y.start);
}

/** Übernimmt den Vorschlag eines Hinweises: ersetzt genau diese Stelle, alle späteren Positionen rücken nach. Das Original bleibt unverändert. */
export function uebernimmVorschlag(dok: Dokument, hinweis: Hinweis): Dokument {
  const t = dok.transkript;
  if (!t) throw new Error('Dieses Dokument hat kein Transkript.');
  if (hinweis.vorschlag === undefined) throw new Error('Zu diesem Hinweis gibt es keinen Vorschlag.');
  const a = t.abschnitte[hinweis.abschnitt];
  if (!a || hinweis.start < a.start || hinweis.ende > a.ende || hinweis.ende < hinweis.start) throw new Error('Die Stelle liegt nicht in diesem Beitrag. Bitte den Text neu prüfen.');
  const cps = codepoints(dok.text);
  const neu = codepoints(hinweis.vorschlag);
  const delta = neu.length - (hinweis.ende - hinweis.start);
  const text = [...cps.slice(0, hinweis.start), ...neu, ...cps.slice(hinweis.ende)].join('');
  const abschnitte = t.abschnitte.map((x, i) => (i < hinweis.abschnitt ? { ...x } : i === hinweis.abschnitt ? { ...x, ende: x.ende + delta } : { ...x, start: x.start + delta, ende: x.ende + delta }));
  return { ...dok, text, geaendert: Date.now(), transkript: { ...t, abschnitte } };
}
