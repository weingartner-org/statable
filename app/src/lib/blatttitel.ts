/** Blatt-Titel in der aktuellen Sprache. Der Titel wird beim Rechnen gespeichert - nach einem Sprachwechsel
 *  stand er bisher in der alten Sprache („Scale (4 questions)“ im deutschen Heft, Test 07.10.). */
import { VERFAHREN, faAusErgebnis, type Werte } from './verfahren';
import { inSprache, aktuelleSprache, L, spalteNach, type Blatt } from './sitzung.svelte';
import { SPRACHNAMEN, geladen, type Sprache } from '../i18n/laufzeit';

/** Zeitreihe: Wert, Zeitpunkt ('' = Reihenfolge der Zeilen), zweite Reihe - der leere Platz bleibt, sonst rutscht die zweite Reihe in den Zeitpunkt (Abnahme 31.10. S2). */
export const zeitreiheSpalten = (w: Werte): string[] => [...w.l1, ...(!w.l2.length && w.l3.length ? [''] : w.l2), ...w.l3, ...w.l4];

/** Die Auswahl eines fertigen Blatts: `l3` hält alle Spalten, zuerst die der ersten Lücke. */
export function werteVon(b: Blatt): Werte {
  const alle = b.l3 ?? [b.l1, b.l2].filter((x): x is string => !!x);
  if (b.art === 'messwiederholung') return { l1: b.l2 ? alle.filter(n => n !== b.l2) : alle, l2: b.l2 ? [b.l2] : [], l3: [], l4: [] };
  if (b.art === 'mediation' || b.art === 'moderation') return { l1: alle.slice(0, 1), l2: alle.slice(1, 2), l3: alle.slice(2, 3), l4: b.art === 'mediation' ? alle.slice(3, 4) : [] };   // Später S-D: bei der bedingten und seriellen Mediation steht die vierte Größe (W oder M2) an vierter Stelle
  if (b.art === 'meta') return { l1: [], l2: [], l3: [], l4: [] };
  // Fälle vergleichen: l3 = [Kennung (oder ''), Zahlen-/Gruppenspalten …, '', Textspalten …]; die Lücken des Satzes sind l1 = Zahlen/Gruppen, l2 = Texte, l3 = Kennung (optional).
  if (b.art === 'faelle') {
    const trenn = alle.indexOf('', 1), q = alle.slice(1, trenn < 0 ? alle.length : trenn), t = trenn < 0 ? [] : alle.slice(trenn + 1);
    return { l1: q, l2: t, l3: alle[0] ? [alle[0]] : [], l4: [] };
  }
  if (b.art === 'mehrebenen') return { l1: alle.slice(0, 1), l2: alle.slice(1, 2), l3: alle.slice(2), l4: [] };
  // Einzelfall: vier feste Plätze (Messwert, Phase, Messzeitpunkt, Fall); leere Plätze sind ''.
  // Kaplan-Meier: drei feste Plätze (Zeit, Ereignis, Gruppe); ein leerer Platz ist ''.
  // Welle 7: ab dem vierten Platz stehen die Spalten der Cox-Regression (l4).
  if (b.art === 'kaplanmeier') return { l1: alle.slice(0, 1), l2: alle.slice(1, 2), l3: alle.slice(2, 3).filter(Boolean), l4: alle.slice(3).filter(Boolean) };
  if (b.art === 'zeitreihen') return { l1: alle.slice(0, 1), l2: alle.slice(1, 2).filter(Boolean), l3: alle.slice(2, 3).filter(Boolean), l4: [] };   // Später S-E: Wert, Zeitpunkt ('' = Reihenfolge der Zeilen); S-F2: dritter Platz = zweite Reihe
  // Kurs-Paket: Diskriminanz = Gruppe, dann die Zahlen; loglinear = Kategorien, zuletzt (nur wenn b.l2 gesetzt) die Häufigkeit; MANOVA = Zielgrößen, zuletzt die Gruppe
  if (b.art === 'diskriminanz') return { l1: alle.slice(0, 1), l2: alle.slice(1), l3: [], l4: [] };
  if (b.art === 'loglinear') return b.l2 && alle.length > 2 && alle.at(-1) === b.l2 ? { l1: alle.slice(0, -1), l2: [b.l2], l3: [], l4: [] } : { l1: alle, l2: [], l3: [], l4: [] };
  // Abschnitt 3: Armut = vier feste Plätze (Einkommen, Gewicht, Klumpen, Schicht); ein leerer Platz ist ''
  if (b.art === 'armut') return { l1: alle.slice(0, 1), l2: alle.slice(1, 2), l3: alle.slice(2, 3).filter(Boolean), l4: alle.slice(3, 4).filter(Boolean) };
  if (b.art === 'manova') return { l1: alle.slice(0, -1), l2: alle.slice(-1), l3: [], l4: [] };
  if (b.art === 'einzelfall') return { l1: alle.slice(0, 1), l2: alle.slice(1, 2), l3: alle.slice(2, 3).filter(Boolean), l4: alle.slice(3, 4).filter(Boolean) };
  // Gruppenvergleich: Messwert, Gruppe, dann feste Plätze für die zweite Gruppierung und die Kontrollvariable (G3, G6); ein leerer Platz ist ''. Alte Blätter haben nur zwei Einträge.
  if (b.art === 'gruppen') return { l1: alle.slice(0, 1), l2: alle.slice(1, 2), l3: alle.slice(2, 3).filter(Boolean), l4: alle.slice(3, 4).filter(Boolean) };
  // Zusammenhang: x, y, danach die herausgerechneten Spalten (optional).
  if (b.art === 'zusammenhang') return { l1: alle.slice(0, 1), l2: alle.slice(1, 2), l3: alle.slice(2), l4: [] };
  // Vorhersage mit Zähldaten-Regression: die Beobachtungszeit (Wahl am Blatt) steht hinten in `l3` und zählt zu den Spalten, die das Blatt braucht - nicht zu den Vorhersagespalten (Welle 3).
  if (b.art === 'vorhersage') {
    const zeit = b.zus?.modell?.art === 'zaehl' && b.zus.modell.zeit && alle.includes(b.zus.modell.zeit) ? b.zus.modell.zeit : '';
    const rest = zeit ? alle.filter(n => n !== zeit) : alle;
    return { l1: rest.slice(0, 1), l2: rest.slice(1), l3: zeit ? [zeit] : [], l4: [] };
  }
  return ['gruppen', 'praepost', 'zusammenhang', 'kreuz', 'vorhersage'].includes(b.art) ? { l1: alle.slice(0, 1), l2: alle.slice(1), l3: [], l4: [] } : { l1: alle, l2: [], l3: [], l4: [] };
}

/** Der Titel in der aktuellen Sprache - nur, wenn er der von Statable vorgeschlagene ist (in der anderen Sprache). Sonst null. */
export function titelInSprache(b: Blatt): string | null {
  // Jede andere Sprache, die geladen ist (Deutsch und Englisch immer): in einer davon kann der Titel entstanden sein.
  const andere = (Object.keys(SPRACHNAMEN) as Sprache[]).filter(sp => sp !== aktuelleSprache() && sp !== 'xx' && sp !== 'xr' && geladen(sp));
  if (b.art === 'befehle') return andere.some(sp => b.titel === inSprache(sp, () => L('Befehle', 'Commands'))) ? L('Befehle', 'Commands') : null;
  const v = VERFAHREN.find(x => x.id === b.art); if (!v) return null;
  const w = werteVon(b), c = { fa: faAusErgebnis(b.ergebnis), prozess: b.zus?.prozess?.modell };
  try {
    if (!andere.some(sp => b.titel === inSprache(sp, () => v.titelBlatt(w, spalteNach, c)))) return null;
    const neu = v.titelBlatt(w, spalteNach, c);
    return neu !== b.titel ? neu : null;
  } catch { return null; }
}

/** Alle Blätter nachziehen. Gibt zurück, ob sich etwas geändert hat. */
export function titelNachziehen(blaetter: Blatt[]): boolean {
  let geaendert = false;
  for (const b of blaetter) { const t = titelInSprache(b); if (t) { b.titel = t; geaendert = true; } }
  return geaendert;
}
