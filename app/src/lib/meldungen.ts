/** Übersetzt PSPP-Meldungen in freundliche Texte (Regeln aus docs/entwurf-opus/sprache/messages.de.json). */
import { meldungsRegeln, rueckfallText } from './texte';
import { s, d, L, aktuelleSprache } from './sitzung.svelte';
import { spssMeldung } from './spssbefehle';

export interface Freundlich { titel: string; text: string; tun: string; original: string; art: string }

function vorschlag(wort: string, kandidaten: string[]): string {
  const ab = (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]); for (let j = 1; j <= b.length; j++) d[0]![j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length]![b.length]!; };
  const w = wort.toLowerCase();
  const best = kandidaten.map(k => [k, k.toLowerCase().startsWith(w) || w.startsWith(k.toLowerCase()) ? 0 : ab(w, k.toLowerCase())] as const).sort((a, b) => a[1] - b[1])[0];
  return best && best[1] <= Math.max(2, w.length / 3) ? best[0] : '';
}
const BEFEHLE = ['FREQUENCIES', 'DESCRIPTIVES', 'CROSSTABS', 'T-TEST', 'ONEWAY', 'CORRELATIONS', 'REGRESSION', 'FACTOR', 'RELIABILITY', 'EXAMINE', 'COMPUTE', 'RECODE', 'SELECT IF', 'SORT CASES', 'NPAR TESTS', 'GLM', 'MEANS', 'LIST', 'SAVE', 'GET', 'VARIABLE LABELS', 'VALUE LABELS', 'MISSING VALUES', 'EXECUTE'];

export function freundlich(text: string, schwere?: string): Freundlich {
  const kopf = text.split('\n')[0]!.replace(/^[\d.:\-]+: /, '').replace(/^(error|warning|note): /, '');
  // Sprache: du/Sie gibt es nur im Deutschen; jede andere Sprache hat eine Fassung (in der Datei unter „du“ und „sie“ gleich)
  const a = aktuelleSprache() === 'de' ? s.einst.anrede : 'du';
  const rueckfall = rueckfallText();
  // SPSS-Befehle, die PSPP nicht kennt, und Meldungen von Statable selbst (lib/spssbefehle.ts)
  const sp = spssMeldung(text);
  if (sp) return { ...sp, original: text };
  for (const m of meldungsRegeln()) {
    const t = new RegExp(m.muster).exec(text);
    if (!t) continue;
    const werte: Record<string, string> = {
      vorschlag: vorschlag(t[1] ?? '', m.id === 'befehl-unbekannt' ? BEFEHLE : s.spalten.map(x => x.name)),
      datei: (t[1] ?? '').replace(/^\//, '')
    };
    // PSPP schreibt „A, B, or C“ - auf Deutsch „A, B oder C“
    if ((m.id === 'auswahl-oder' || m.id === 'auswahl-erwartet') && aktuelleSprache() === 'de') t[1] = (t[1] ?? '').replace(/,?\s+or\s+/g, ' oder ');
    // Kein ähnlicher Name: den Satz mit dem Vorschlag ganz weglassen.
    const fuell = (x: string) => (werte.vorschlag ? x : x.replace(/[^.!?]*\{vorschlag\}[^.]*\.\s*/, '').trim()).replace(/\{(\d)\}/g, (_, i) => t[Number(i)] ?? '').replace(/\{(\w+)\}/g, (_, k) => werte[k] ?? '');
    return { titel: m.titel, text: fuell(m.text[a]), tun: fuell(m.tun[a]), original: text, art: m.art };
  }
  // Ein bloßer Hinweis (note) ohne eigene Regel ist kein Fehler - die Rechnung ist durchgelaufen (Prüfung A7: Konvergenzhinweis der logistischen Regression).
  // Eine Warnung von PSPP ist kein Fehler: der Befehl ist gelaufen, Ergebnisse stehen darunter.
  if (schwere === 'warning' || /^([\d.:\-]+: )?warning: /i.test(text)) return { titel: L('Warnung von PSPP', 'Warning from PSPP'), text: L('PSPP hat gerechnet und warnt vor etwas. Die Ergebnisse stehen in den Tabellen.', 'PSPP has calculated and warns about something. The results are in the tables.'), tun: d('Unter „Details“ steht die Warnung im Original. Lies sie, bevor du dem Ergebnis traust.', 'Unter „Details“ steht die Warnung im Original. Lesen Sie sie, bevor Sie dem Ergebnis trauen.', 'The warning is under "Details" in the original. Read it before you trust the result.'), original: text, art: 'hinweis' };
  if (schwere === 'note' || /^([\d.:\-]+: )?note: /i.test(text)) return { titel: L('Hinweis von PSPP', 'Note from PSPP'), text: L('Die Rechnung ist durchgelaufen. PSPP gibt dazu einen Hinweis.', 'The calculation has finished. PSPP adds a note.'), tun: L('Unter „Details“ steht er im Original. Meist ist nichts zu tun.', 'The original is under "Details". Usually nothing needs to be done.'), original: text, art: 'hinweis' };
  return { titel: rueckfall.titel, text: rueckfall.text[a], tun: rueckfall.tun[a] + (kopf ? '' : ''), original: text, art: 'unbekannt' };
}
