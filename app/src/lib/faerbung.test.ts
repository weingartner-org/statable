import { describe, expect, it } from 'vitest';
import { faerbe } from './faerbung';

const art = (text: string, a: string) => faerbe(text).filter(x => x.art === a).map(x => x.t);

describe('Farbige Befehle', () => {
  const KURS = `* Aufgabe 1.
FREQUENCIES /VARIABLES=geschlecht.
T-TEST GROUPS=handy_im_bett('nein' 'ja')
  /VARIABLES=konzentration.
SELECT IF (geschlecht = 'w').
DATA LIST FREE /a b.
BEGIN DATA.
1 2
END DATA.
RECODE alter (LOWEST THRU 20=1) (ELSE=2) INTO alter_gr.`;

  it('ergibt Zeichen für Zeichen den Text (die Farbschicht liegt genau unter dem Feld)', () => {
    expect(faerbe(KURS).map(x => x.t).join('')).toBe(KURS);
    expect(faerbe('').map(x => x.t).join('')).toBe('');
    expect(faerbe("a 'offen\n\nb").map(x => x.t).join('')).toBe("a 'offen\n\nb");
  });
  it('erkennt Befehle, Unterbefehle, Text, Kommentar und Daten', () => {
    expect(art(KURS, 'befehl')).toEqual(['FREQUENCIES', 'T-TEST', 'SELECT IF', 'DATA LIST', 'BEGIN DATA', 'END DATA.', 'RECODE']);
    expect(art(KURS, 'unter')).toEqual(['/VARIABLES', '/VARIABLES', '/a', 'LOWEST', 'THRU', 'ELSE', 'INTO']);
    expect(art(KURS, 'text')).toEqual(["'nein'", "'ja'", "'w'"]);
    expect(art(KURS, 'kommentar')).toEqual(['* Aufgabe 1.']);
    expect(art(KURS, 'daten')).toEqual(['1 2']);
  });
  it('Fortsetzungszeile ist kein neuer Befehl, Zeile ganz links ohne Punkt davor schon', () => {
    expect(art('DESCRIPTIVES\n  VARIABLES=x.', 'befehl')).toEqual(['DESCRIPTIVES']);
    expect(art('LIST\nEXECUTE.', 'befehl')).toEqual(['LIST', 'EXECUTE']);
  });
});
