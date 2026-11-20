/**
 * „Weiter mit …“ (Fachblatt Stufe 5, Abschnitt 5.2; seit Usability Stufe 4a in die Gruppen Genauer hinsehen / Anders rechnen / Nächste Frage aufgeteilt): unter dem Ergebnis einer Karte höchstens zwei Verweise, jeweils als Alltagsfrage mit Fachbegriff in Klammern.
 * Ein Verweis führt in einen Hilfe-Artikel (`#hilfe/<Kennung>`) oder zu einer Karte. Keine Knöpfe, keine Ansage; die Zeile ist ein Absatz mit Links.
 * Die Zuordnung ist genau die Tabelle des Fachblatts; die Fälle ergeben sich aus dem Ergebnis (`erg.typ`).
 */
import { L } from './sitzung.svelte';
import { VERFAHREN } from './verfahren';

export type Ziel = { hilfe: string } | { karte: string };
/** Gruppe im Abschnitt „Weiter mit …“ unter dem Ergebnis: mehr über dasselbe Ergebnis, dieselbe Frage anders gerechnet, eine neue Frage. */
export type Gruppe = 'genauer' | 'anders' | 'naechste';
export interface Verweis { text: string; ziel: Ziel; gruppe: Gruppe }
export type Fall = 'zwei' | 'drei' | 'vorher-nachher' | 'messwiederholung' | 'zusammenhang' | 'linear' | 'faktor' | 'kreuz';

/** Der Fall zum Ergebnis einer Karte (`erg.typ` des Blatts); `null` = keine Zeile. */
export function fallVon(typ: string | undefined | null): Fall | null {
  switch (typ) {
    case 'zwei-gruppen': return 'zwei';
    case 'anova': return 'drei';
    case 'prae-post': return 'vorher-nachher';
    case 'messwiederholung': return 'messwiederholung';
    case 'zusammenhang': return 'zusammenhang';
    case 'vorhersage': return 'linear';
    case 'faktor': return 'faktor';
    case 'kreuz': return 'kreuz';
    default: return null;
  }
}

/** Die Verweise je Fall, in der Sprache der Oberfläche (höchstens zwei). `mehrere`: Regression mit zwei und mehr Einflussgrößen (sonst gibt es keine Kollinearität, der VIF-Verweis entfällt). */
export function verweise(fall: Fall | null, mehrere = true): Verweis[] {
  switch (fall) {
    case 'zwei': return [
      { text: L('Wie groß ist der Unterschied? (Effektstärke)', 'How big is the difference? (effect size)'), ziel: { hilfe: 'effektstaerke' }, gruppe: 'genauer' as const },
      { text: L('Sind die Voraussetzungen erfüllt? (Voraussetzungen)', 'Are the assumptions met? (assumptions)'), ziel: { hilfe: 'voraussetzungen-pruefen' }, gruppe: 'genauer' as const }
    ];
    case 'drei': return [
      { text: L('Welche Gruppen unterscheiden sich? (Post-hoc-Tests)', 'Which groups differ? (post hoc tests)'), ziel: { hilfe: 'frage-posthoc' }, gruppe: 'genauer' as const },
      { text: L('Gezielte Vergleiche statt aller Paare (Kontraste)', 'Targeted comparisons instead of all pairs (contrasts)'), ziel: { hilfe: 'vv-kontraste' }, gruppe: 'genauer' as const }
    ];
    case 'vorher-nachher': return [
      { text: L('Hat sich eine einzelne Person verändert? (Reliable Change Index)', 'Has a single person changed? (Reliable Change Index)'), ziel: { hilfe: 'reliable-change-index' }, gruppe: 'genauer' as const },
      { text: L('Wie groß ist die Veränderung? (Effektstärke)', 'How big is the change? (effect size)'), ziel: { hilfe: 'effektstaerke' }, gruppe: 'genauer' as const }
    ];
    case 'messwiederholung': return [
      { text: L('Gleich große Streuung der Differenzen? (Sphärizität)', 'Equal spread of the differences? (sphericity)'), ziel: { hilfe: 'vv-sphaerizitaet' }, gruppe: 'genauer' as const }
    ];
    case 'zusammenhang': return [
      { text: L('Bleibt der Zusammenhang ohne Drittvariable? (Partialkorrelation)', 'Does the relationship hold without a third variable? (partial correlation)'), ziel: { hilfe: 'frage-partialkorrelation' }, gruppe: 'naechste' as const }
    ];
    case 'linear': return [
      ...(mehrere ? [{ text: L('Stören sich die Einflüsse gegenseitig? (Kollinearität, VIF)', 'Do the predictors disturb each other? (collinearity, VIF)'), ziel: { hilfe: 'kollinearitaet' }, gruppe: 'genauer' as const }] : []),
      { text: L('Hängt das Ergebnis an wenigen Fällen? (Einflussreiche Fälle)', 'Does the result hang on a few cases? (influential cases)'), ziel: { hilfe: 'rp-einfluss' }, gruppe: 'genauer' as const }
    ];
    case 'faktor': return [
      { text: L('Wie zuverlässig ist die Skala? (Reliabilität)', 'How reliable is the scale? (reliability)'), ziel: { karte: 'skala' }, gruppe: 'naechste' as const }
    ];
    case 'kreuz': return [
      { text: L('Welche Zellen weichen ab? (Standardisierte Residuen)', 'Which cells deviate? (standardized residuals)'), ziel: { hilfe: 'residuen' }, gruppe: 'genauer' as const },
      { text: L('Wie viel häufiger? (Odds Ratio, Risikomaße)', 'How much more often? (odds ratio, risk measures)'), ziel: { hilfe: 'risikomasse' }, gruppe: 'genauer' as const }
    ];
    default: return [];
  }
}

/** Die Verweise eines Falls, die in eine Gruppe von „Weiter mit …“ gehören. */
export function verweiseGruppe(fall: Fall | null, gruppe: Gruppe, mehrere = true): Verweis[] {
  return verweise(fall, mehrere).filter(v => v.gruppe === gruppe);
}

/** Alle Kennungen, auf die die Zuordnung zeigt (für den Test): Hilfe-Artikel und Karten. */
export function alleZiele(): Ziel[] {
  const faelle: Fall[] = ['zwei', 'drei', 'vorher-nachher', 'messwiederholung', 'zusammenhang', 'linear', 'faktor', 'kreuz'];
  return faelle.flatMap(f => verweise(f).map(v => v.ziel));
}

/** Eine Karte öffnen: zu „Neue Auswertung“ wechseln und die Kachel der Karte anklicken (wie die Befehlspalette). */
export function oeffneKarte(id: string): void {
  const v = VERFAHREN.find(x => x.id === id); if (!v) return;
  const ziel = () => {
    const k = document.querySelector<HTMLButtonElement>(`#inhalt button.kachel[data-karte="${CSS.escape(id)}"]:not([data-qualitaet])`);
    if (k) { k.click(); return true; }
    const such = document.querySelector<HTMLInputElement>('#inhalt #karten-suche');
    if (such) {
      such.value = v.titel; such.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => [...document.querySelectorAll<HTMLButtonElement>('#inhalt .karten-suche ~ div .kachel')].find(b => b.textContent?.includes(v.titel))?.click(), 120);
      return true;
    }
    return false;
  };
  if (location.hash !== '#blatt/neu') location.hash = 'blatt/neu';
  let n = 0;
  const takt = setInterval(() => { if (ziel() || ++n > 60) clearInterval(takt); }, 50);
}
