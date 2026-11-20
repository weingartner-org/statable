/** Tastenweg in der Einzelwahl der Spalten (Usability, Befund 1): Pfeiltasten bewegen nur, übernommen wird mit Enter oder Leertaste, Klick oder Tab aus der Gruppe. */
export type WahlEreignis =
  | { art: 'change'; vonPfeil: boolean }
  | { art: 'keydown'; taste: string; aufRadio: boolean }
  | { art: 'focusout'; ausserhalb: boolean; vorgemerkt: boolean };

/** 'setzen': übernehmen und zur nächsten Frage springen; 'vormerken': nur merken; 'uebernehmen': Wert übernehmen ohne Sprung; 'nichts'. */
export type WahlAktion = 'setzen' | 'vormerken' | 'uebernehmen' | 'nichts';

export const istPfeil = (taste: string) => taste === 'ArrowDown' || taste === 'ArrowUp' || taste === 'ArrowLeft' || taste === 'ArrowRight';

export function wahlAktion(e: WahlEreignis): WahlAktion {
  if (e.art === 'change') return e.vonPfeil ? 'vormerken' : 'setzen';
  if (e.art === 'keydown') return e.aufRadio && (e.taste === 'Enter' || e.taste === ' ') ? 'setzen' : 'nichts';
  return e.ausserhalb && e.vorgemerkt ? 'uebernehmen' : 'nichts';
}
