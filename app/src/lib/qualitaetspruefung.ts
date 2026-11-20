/**
 * Qualitätsprüfung eines Fragebogen-Plans nach festen Regeln (Paket 2D). Hinweise, keine Urteile: Was passt, entscheidet die Person (Abhaken über `plan.geprueft`).
 *
 * Belege je Regel: docs/fachblaetter/BELEGE-ERHEBEN.json (Einträge `qp-*`). Gebaut sind nur Regeln mit gelesener Quelle; `skalenlaenge-wechselt` und
 * `umpolung-unmarkiert` gibt es bewusst nicht. Eine Lesbarkeitsformel wird nicht benutzt (Lenzner 2014). Die Wortlisten sind Näherungen und im Hilfe-Artikel
 * „eh-qualitaet“ benannt. Die Festlegungen stehen im Kopf von `qualitaetspruefung-2d.test.ts`.
 *
 * Rein: der Plan wird nicht verändert. Geprüft wird nur die verlangte Sprache; fehlt ein Text in ihr, wird er übergangen.
 */
import { L, inSprache } from './sitzung.svelte';
import { SKALEN } from './fragebogen';
import { planPruefen, unerreichbar, type Antwortliste, type Block, type Frage, type FragebogenPlan, type Lok, type Option } from './fragebogenplan';

export interface QualitaetsHinweis { regel: string; element: string; text: string; quelle: string }

const Q_LENZNER = (abschnitt: string) => `Lenzner & Menold 2016, Abschnitt ${abschnitt} (Question Wording, GESIS Survey Guidelines)`;
const Q_MENOLD = (abschnitt: string) => `Menold & Bogner 2016, Abschnitt ${abschnitt} (Design of Rating Scales in Questionnaires, GESIS Survey Guidelines)`;
const Q_COUPER = 'Couper, Tourangeau, Conrad & Zhang 2013 (The Design of Grids in Web Surveys, Social Science Computer Review 31(3))';
const Q_WCAG = (kriterium: string) => `WCAG 2.2, Erfolgskriterium ${kriterium} (W3C 2024)`;

/* ------------------------------------------------------------------ Textbausteine */
const norm = (t: string) => t.normalize('NFC').replace(/[’‘`´]/g, "'");
const text = (l: Lok | undefined, sprache: string): string | undefined => { const t = l?.[sprache]; return typeof t === 'string' && t.trim() !== '' ? t : undefined; };
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WORTRAND = '(?<![\\p{L}\\p{N}])', WORTENDE = '(?![\\p{L}\\p{N}])';

/** Vorbehandlung der Textregeln: Klammern raus, dann jedes Vorkommen eines Optionstexts (als ganzes Wort bzw. ganze Wortfolge) raus. */
function vorbehandeln(t: string, optionsTexte: string[]): string {
  let r = norm(t), vorher = '';
  while (r !== vorher) { vorher = r; r = r.replace(/\([^()]*\)|\[[^[\]]*\]/g, ' '); }
  for (const o of [...new Set(optionsTexte.map(x => norm(x).trim()).filter(Boolean))].sort((a, b) => b.length - a.length)) {
    r = r.replace(new RegExp(`${WORTRAND}${esc(o)}${WORTENDE}`, 'giu'), ' ');
  }
  return r;
}
const RAND = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
/** Wörter = durch Leerraum getrennte Stücke mit mindestens einem Buchstaben oder einer Ziffer; Vergleichsform klein und ohne Randzeichen. */
const woerter = (t: string): string[] => t.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).map(w => w.toLowerCase().replace(RAND, ''));

const BINDEWORT: Record<'de' | 'en', string[]> = { de: ['und', 'oder'], en: ['and', 'or'] };
const NACH_BINDEWORT: Record<'de' | 'en', Set<string>> = {
  de: new Set('ihr ihre ihrem ihren ihrer ihres die der das den dem mit in für bei sind haben ist hat würden sollen'.split(' ')),
  en: new Set('your the their his her my our with in for at do does did are is should would will can'.split(' '))
};
const VERNEINUNG: Record<'de' | 'en', Set<string>> = {
  de: new Set('nicht kein keine keinen keinem keiner keines nie niemals niemand nichts unzufrieden unwichtig unmöglich unnötig unfair ungerecht unglücklich unwahrscheinlich'.split(' ')),
  en: new Set('not no never none nobody nothing nowhere unhappy unimportant unlikely unfair unnecessary unsatisfied'.split(' '))
};
const istVerneinung = (w: string, sp: 'de' | 'en') => VERNEINUNG[sp].has(w) || (sp === 'en' && w.endsWith("n't"));
const ZUSTIMMUNG_VERNEINT: Record<'de' | 'en', RegExp[]> = {
  de: [/(?<![\p{L}])lehne\b.*\bab(?![\p{L}])/iu, /\bstimme\b.*\bnicht\b.*\bzu(?![\p{L}])/iu, /\btrifft\b.*\bnicht\b.*\bzu(?![\p{L}])/iu],
  en: [/disagree/i]
};
const SUGGESTIV: Record<'de' | 'en', string[]> = {
  de: ['stimmen sie nicht auch zu', 'finden sie nicht auch', 'sind sie nicht der meinung', 'sind sie nicht auch'],
  en: ["wouldn't you agree", "don't you think", "don't you agree", "isn't it true"]
};
const FARBE: Record<'de' | 'en', RegExp> = {
  de: new RegExp(`${WORTRAND}(grün|rot|gelb|blau)(e|en|em|er|es)?${WORTENDE}`, 'iu'),
  en: new RegExp(`${WORTRAND}(green|red|yellow|blue)${WORTENDE}`, 'iu')
};
const FARBE_ORT: Record<'de' | 'en', RegExp> = {
  de: new RegExp(`${WORTRAND}(markiert\\p{L}*|felde?r?n?|kreise?n?)${WORTENDE}`, 'iu'),
  en: new RegExp(`${WORTRAND}(marked|fields?|circles?)${WORTENDE}`, 'iu')
};
const SCHWELLE_WOERTER = 25, SCHWELLE_MATRIX = 7;

/** Skalen, die auf Zustimmung oder Zufriedenheit laufen (Häufigkeitsskalen „Nie … Immer“ werden nicht beurteilt). */
const BEURTEILTE_SKALEN = SKALEN.filter(sk => !['nie', 'never'].includes((sk[0]?.[0] ?? '').toLowerCase()));
const skalenNorm = (t: string) => norm(t).trim().replace(/\s+/g, ' ').toLowerCase();
const stufeIn = (skala: string[][], t: string) => skala.findIndex(st => st.some(x => skalenNorm(x) === skalenNorm(t)));

/* ------------------------------------------------------------------ Hauptfunktion */
export function pruefeQualitaet(plan: FragebogenPlan, sprache: string): QualitaetsHinweis[] {
  const sp: 'de' | 'en' = sprache === 'en' ? 'en' : 'de';
  const T = <R>(f: () => R): R => inSprache(sp, f);
  const listen = new Map<string, Antwortliste>(plan.antwortlisten.map(l => [l.id, l]));
  const roh: { h: QualitaetsHinweis; pos: number }[] = [];
  const abgehakt = (element: string, regel: string) => plan.geprueft?.[element]?.includes(regel) === true;
  const posVon = new Map<string, number>();
  let n = 0;
  for (const s of plan.elemente) {
    posVon.set(s.id, n++);
    for (const e of s.elemente) {
      posVon.set(e.id, n++);
      if (e.art === 'block') for (const it of e.items) posVon.set(it.id, n++);
      const l = e.art === 'frage' ? e.liste : e.art === 'block' ? e.liste : undefined;
      for (const o of listen.get(l ?? '')?.optionen ?? []) if (!posVon.has(o.id)) posVon.set(o.id, n++);
    }
  }
  const melde = (regel: string, element: string, textFn: () => string, quelle: string) => {
    if (abgehakt(element, regel)) return;
    if (roh.some(x => x.h.regel === regel && x.h.element === element)) return;
    roh.push({ h: { regel, element, text: T(textFn), quelle }, pos: posVon.get(element) ?? n });
  };

  /* ---- Textregeln: Fragetext, Blocktext, Block-Items ---- */
  const textRegeln = (element: string, t: string | undefined, optionen: Option[]) => {
    if (t === undefined) return;
    const rest = vorbehandeln(t, optionen.map(o => text(o.text, sprache)).filter((x): x is string => x !== undefined));
    const w = woerter(rest);
    // doppelfrage: Bindewort, danach (unmittelbar) ein Wort der festen Liste
    if (w.some((x, i) => BINDEWORT[sp].includes(x) && NACH_BINDEWORT[sp].has(w[i + 1] ?? ''))) melde('doppelfrage', element, () => L(
      'Doppelfrage (double-barreled question): Die Frage fragt vielleicht nach zwei Dingen zugleich. Dann ist nicht klar, worauf sich eine Antwort bezieht. Vorschlag: nur eine Sache fragen oder jede einzeln bewerten lassen. Die Regel arbeitet mit einer Wortliste und kann sich irren.',
      'Double-barreled question: The question may ask about two things at once. Then it is unclear what an answer refers to. Suggestion: ask about one thing only, or have each one rated separately. The rule uses a word list and can be wrong.'), Q_LENZNER('2.6'));
    // doppelte-verneinung: zwei Verneinungswörter, oder eines plus eine Option, die Zustimmung verneint
    const neg = w.filter(x => istVerneinung(x, sp)).length;
    const optNeg = optionen.some(o => !o.fehlend && ZUSTIMMUNG_VERNEINT[sp].some(re => re.test(text(o.text, sprache) ?? '')));
    if (neg >= 2 || (neg >= 1 && optNeg)) melde('doppelte-verneinung', element, () => L(
      'Doppelte Verneinung (double negative): Der Text enthält mehrere Verneinungswörter oder verneint etwas, das mit einer Zustimmungsskala beantwortet wird. Das verlangt gedankliche Umformung und wird leicht überlesen. Vorschlag: positiv formulieren.',
      'Double negative: The text contains several negation words, or negates something that is answered on an agreement scale. This needs mental translation and is easily overlooked. Suggestion: word it positively.'), Q_LENZNER('2.7'));
    // suggestiv: Anfang aus fester Liste (Beispiele)
    const anfang = rest.replace(/\s+/g, ' ').trim().toLowerCase();
    if (SUGGESTIV[sp].some(a => anfang.startsWith(a))) melde('suggestiv', element, () => L(
      'Suggestivfrage (leading question): Der Anfang der Frage erinnert an eine Formulierung, die eine Antwort nahelegt. Die geprüften Anfänge sind nur Beispiele; Suggestion gibt es auch in anderen Formen, etwa mit Verweis auf Mehrheiten oder Autoritäten. Vorschlag: neutral formulieren.',
      'Leading question: The opening of the question resembles a wording that suggests an answer. The openings checked are only examples; leading questions also take other forms, such as appeals to majorities or authorities. Suggestion: word it neutrally.'), Q_LENZNER('2.9'));
    // lang: mehr als 25 Wörter
    if (w.length > SCHWELLE_WOERTER) melde('lang', element, () => L(
      `Lange Frage (long question): Der Text hat ${w.length} Wörter. Als Faustregel gelten mehr als ${SCHWELLE_WOERTER} Wörter als lang; die Zahl ist eine eigene Festlegung von Statable und steht nicht in der Quelle. Belegt ist nur, dass einfache Satzstrukturen leichter zu verstehen sind. Vorschlag: kürzen oder teilen.`,
      `Long question: The text has ${w.length} words. As a rule of thumb, more than ${SCHWELLE_WOERTER} words count as long; the number is Statable's own choice and is not in the source. What is supported is only that simple sentence structures are easier to understand. Suggestion: shorten or split.`), Q_LENZNER('2.4'));
  };

  /* ---- Skalenregeln ---- */
  const skalenRegeln = (element: string, liste: Antwortliste | undefined) => {
    if (!liste?.geordnet) return;
    const stufen = liste.optionen.filter(o => !o.fehlend);
    // skala-unausgewogen: nur bekannte Zustimmungs-/Zufriedenheitsskalen
    const texte = stufen.map(o => text(o.text, sprache));
    if (stufen.length >= 2 && texte.every((t): t is string => t !== undefined)) {
      const skala = BEURTEILTE_SKALEN.find(sk => texte.every(t => stufeIn(sk, t) >= 0));
      if (skala) {
        const pos = texte.map(t => stufeIn(skala, t)), mitteIdx = (skala.length - 1) / 2;
        const negativ = pos.filter(p => p < mitteIdx).length, positiv = pos.filter(p => p > mitteIdx).length;
        if (negativ !== positiv) melde('skala-unausgewogen', element, () => L(
          `Unausgewogene Skala (unbalanced scale): Die Skala hat ${negativ} negative und ${positiv} positive Stufen. Beschriftete Skalen sollen gleich viele positive und negative Stufen haben (Symmetrie). Beurteilt werden nur bekannte Zustimmungs- und Zufriedenheitsskalen.`,
          `Unbalanced scale: The scale has ${negativ} negative and ${positiv} positive levels. Labelled scales should have as many positive as negative levels (symmetry). Only known agreement and satisfaction scales are assessed.`), Q_MENOLD('3'));
      }
    }
    // mitte: gerade Zahl von Stufen
    if (stufen.length >= 4 && stufen.length % 2 === 0) melde('mitte', element, () => L(
      `Skala ohne Mitte (scale with no midpoint): Die Skala hat ${stufen.length} Stufen, also keine neutrale Mitte. Das kann Absicht sein; dann zwingt sie zu einer Richtung. Vorschlag: bewusst entscheiden, ob eine Mitte fehlen soll.`,
      `Scale with no midpoint: The scale has ${stufen.length} levels, so there is no neutral midpoint. This may be intended; then it forces a direction. Suggestion: decide deliberately whether a midpoint should be missing.`), Q_MENOLD('6'));
    // barriere-skala: Stufen nur als Zahl
    if (stufen.length >= 3 && texte.some(t => t !== undefined && /^\s*\d+\s*$|^\s*\d+\s+(von|of)\s+\d+\s*$/i.test(t))) melde('barriere-skala', element, () => L(
      'Skala nur mit Zahlen (scale with numbers only): Mindestens eine Stufe hat als Text nur eine Zahl oder die automatische Form „3 von 5“. Sichtbar sind dann nur Zahlen; mit Screenreader fehlt die Bedeutung der Stufe. Vorschlag: jede Stufe beschriften.',
      'Scale with numbers only: At least one level has only a number or the automatic form "3 of 5" as its text. Only numbers are visible then; with a screen reader the meaning of the level is missing. Suggestion: label every level.'), `${Q_WCAG('1.3.1')}; ${Q_MENOLD('3')}`);
  };

  const farbe = (element: string, texte: (string | undefined)[]) => {
    if (texte.some(t => t !== undefined && FARBE[sp].test(norm(t)) && FARBE_ORT[sp].test(norm(t)))) melde('barriere-farbe', element, () => L(
      'Farbe als Unterscheidung (colour only): Ein Text nennt eine Farbe zusammen mit einem Feld, Kreis oder einer Markierung. Wer Farben nicht sehen kann, erkennt den Unterschied dann nicht. Vorschlag: zusätzlich Text oder Beschriftung verwenden. Die Regel sucht nur Wörter; ob die Farbe allein unterscheidet, beurteilt die Person.',
      'Colour only: A text names a colour together with a field, circle or marking. Anyone who cannot see colours will not recognise the difference then. Suggestion: also use text or a label. The rule only looks for words; whether colour alone distinguishes is for the person to judge.'), Q_WCAG('1.4.1'));
  };

  /* ---- Elemente in Plan-Reihenfolge ---- */
  for (const s of plan.elemente) for (const e of s.elemente) {
    if (e.art === 'frage') {
      const liste = listen.get(e.liste ?? '');
      textRegeln(e.id, text((e as Frage).text, sprache), liste?.optionen ?? []);
      skalenRegeln(e.id, liste);
      farbe(e.id, [text(e.text, sprache), text(e.hilfe, sprache), ...(liste?.optionen ?? []).map(o => text(o.text, sprache))]);
    } else if (e.art === 'block') {
      const b: Block = e, liste = listen.get(b.liste);
      textRegeln(b.id, text(b.text, sprache), liste?.optionen ?? []);
      const stufen = (liste?.optionen ?? []).filter(o => !o.fehlend).length;
      if (b.items.length > SCHWELLE_MATRIX || stufen > SCHWELLE_MATRIX) melde('matrix-gross', b.id, () => L(
        `Große Matrix (large grid): Der Block hat ${b.items.length} Items und ${stufen} Stufen. Als Faustregel gelten mehr als ${SCHWELLE_MATRIX} Items oder Stufen als viel; die Zahl ${SCHWELLE_MATRIX} ist eine eigene Festlegung von Statable. Untersuchungen zu Matrizen (grids) in Webumfragen berichten Abbrüche, fehlende Angaben und gleichförmige Antworten. Vorschlag: den Block aufteilen.`,
        `Large grid: The block has ${b.items.length} items and ${stufen} levels. As a rule of thumb, more than ${SCHWELLE_MATRIX} items or levels count as many; the number ${SCHWELLE_MATRIX} is Statable's own choice. Studies of grids in web surveys report break-offs, missing answers and straight-lining. Suggestion: split the block.`), Q_COUPER);
      skalenRegeln(b.id, liste);
      farbe(b.id, [text(b.text, sprache), text(b.hilfe, sprache), ...(liste?.optionen ?? []).map(o => text(o.text, sprache))]);
      for (const it of b.items) textRegeln(it.id, text(it.text, sprache), liste?.optionen ?? []);
    }
  }

  /* ---- weitergereicht aus planPruefen und unerreichbar ---- */
  const befunde = T(() => planPruefen(plan));
  for (const bf of befunde) {
    if (bf.element === undefined) continue;
    const el = bf.element;
    if (bf.regel.startsWith('name-')) melde('namen', el, () => bf.text, '');
    else if (bf.regel === 'option-text' || bf.regel === 'item-text') melde('wertelabels', el, () => bf.text, '');
    else if (bf.regel === 'bild-alt') melde('barriere-bild', el, () => bf.text, Q_WCAG('1.1.1'));
  }
  for (const id of unerreichbar(plan)) melde('unerreichbar', id, () => L(
    'Bedingung nie erfüllbar (unreachable condition): Nach dem Wertebereich der Antworten kann die Bedingung dieses Elements nie wahr werden. Das Element würde nie gezeigt. Vorschlag: die Bedingung prüfen.',
    'Condition can never be met (unreachable condition): Given the range of possible answers, the condition of this element can never become true. The element would never be shown. Suggestion: check the condition.'), '');

  // Plan-Reihenfolge; bei gleicher Stelle bleibt die Reihenfolge des Entstehens
  return roh.map((x, i) => ({ ...x, i })).sort((a, b) => a.pos - b.pos || a.i - b.i).map(x => x.h);
}
