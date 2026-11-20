/** Prototyp F3a: reine Funktionen der Feinstruktur-Probe (Sollwerte 1-5 und 8, Eigenschaftstest) - Fachblatt docs/feinstruktur/FACHBLATT-PROTOTYP-F3A.md Abschnitt 3. */
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { s } from './sitzung.svelte';
import {
  woerter, neueEinheiten, grenzenAus, einheitenAus, grenzeAnWort, umschalten, ansageGrenze, ansageOrt, sichtbarerText, einheitText,
  type Einheit
} from './feinstruktur';

const muster = JSON.parse(readFileSync(fileURLToPath(new URL('../../../docs/feinstruktur/beispiele/muster-feinstruktur.json', import.meta.url)), 'utf8'));
const TEXT: string = muster.ausschnitt.text;
const EINHEITEN_TEXTE: string[] = muster.sinneinheiten.map((e: { text: string }) => e.text);
const cp = (t: string) => Array.from(t);
/** Anfänge der Einheiten 2-10 der Musterlösung (Codepoints), aus den Texten der Musterdatei abgeleitet. */
const MUSTER_GRENZEN: number[] = (() => {
  const a: number[] = []; let ab = 0;
  for (const t of EINHEITEN_TEXTE) { const i = TEXT.indexOf(t, ab); a.push(cp(TEXT.slice(0, i)).length); ab = i + t.length; }
  return a.slice(1);
})();
const mitte = (w: string) => cp(TEXT.slice(0, TEXT.indexOf(w))).length;

beforeAll(() => { s.einst.sprache = 'de'; });

describe('woerter', () => {
  it('Sollwert 1: 61 Wörter, erstes „Naja,“, letztes „funktioniert.“', () => {
    const w = woerter(TEXT);
    expect(w.length).toBe(61);
    expect(w.length).toBe(muster.ausschnitt.woerter);
    expect(w[0]!.wort).toBe('Naja,');
    expect(w[60]!.wort).toBe('funktioniert.');
  });
  it('Apostroph und Bindestrich bleiben im Wort', () => {
    expect(woerter("Ich hab's in der Tischler-Lehre").map(x => x.wort)).toEqual(['Ich', "hab's", 'in', 'der', 'Tischler-Lehre']);
  });
  it('Sollwert 5: Codepoints bei Emoji', () => {
    const w = woerter("Ich 😀 hab's");
    expect(w).toEqual([{ von: 0, bis: 3, wort: 'Ich' }, { von: 4, bis: 5, wort: '😀' }, { von: 6, bis: 11, wort: "hab's" }]);
  });
});

describe('Einheiten', () => {
  it('neueEinheiten: eine Einheit über den ganzen Text', () => {
    expect(neueEinheiten('Ich 😀 hab')).toEqual([{ von: 0, bis: 9 }]);
    expect(grenzenAus(neueEinheiten(TEXT))).toEqual([]);
  });
  it('einheitenAus: sortiert, ohne Doppelte, ohne 0 und Länge; lückenlos', () => {
    const n = cp(TEXT).length;
    const e = einheitenAus([20, 5, 20, 0, n, 5], TEXT);
    expect(e.map(x => [x.von, x.bis])).toEqual([[0, 5], [5, 20], [20, n]]);
    expect(grenzenAus(e)).toEqual([5, 20]);
  });
  it('Sollwert 2: die Grenzen der Musterlösung ergeben genau die 10 Texte der Musterdatei', () => {
    expect(MUSTER_GRENZEN.length).toBe(9);
    const e = einheitenAus(MUSTER_GRENZEN, TEXT);
    expect(e.map(x => einheitText(TEXT, x))).toEqual(EINHEITEN_TEXTE);
    expect(e.map(x => woerter(einheitText(TEXT, x)).length)).toEqual(muster.sinneinheiten.map((x: { woerter: number }) => x.woerter));
  });
});

describe('grenzeAnWort (Sollwert 3)', () => {
  const w = woerter(TEXT);
  const anfang = (wort: string, nr = 0) => w.filter(x => x.wort.startsWith(wort))[nr]!.von;
  it('mitten in „irgendwann“ → Anfang von „hab“', () => {
    expect(grenzeAnWort(TEXT, mitte('irgendwann') + 4)).toBe(w.find(x => x.von > mitte('irgendwann'))!.von);
  });
  it('direkt nach „Naja,“ → Anfang von „ich“', () => {
    expect(grenzeAnWort(TEXT, w[0]!.bis)).toBe(w[1]!.von);
    expect(TEXT.startsWith('ich', w[1]!.von)).toBe(true);
  });
  it('im Leerraum → nächstes Wort', () => {
    expect(grenzeAnWort(TEXT, w[3]!.bis + 0)).toBe(w[4]!.von);
  });
  it('am Wortanfang → dieses Wort (Grenze löschen an derselben Stelle möglich)', () => {
    expect(grenzeAnWort(TEXT, w[7]!.von)).toBe(w[7]!.von);
  });
  it('am Textende → null', () => {
    expect(grenzeAnWort(TEXT, cp(TEXT).length)).toBeNull();
    expect(grenzeAnWort(TEXT, w[60]!.von + 3)).toBeNull();
  });
  it('vor oder am ersten Wort → null (kein gültiger Ort)', () => {
    expect(grenzeAnWort(TEXT, 0)).toBeNull();
    expect(grenzeAnWort('  ' + TEXT, 1)).toBeNull();
    expect(grenzeAnWort(TEXT, 2)).toBe(w[1]!.von);   // mitten im ersten Wort: Anfang des zweiten
  });
});

describe('umschalten', () => {
  it('setzt die Grenze, löscht sie beim zweiten Mal', () => {
    const e0 = neueEinheiten(TEXT);
    const a = umschalten(e0, TEXT, 6);
    expect(a.gesetzt).toBe(true);
    expect(a.einheiten.map(x => [x.von, x.bis])).toEqual([[0, 6], [6, cp(TEXT).length]]);
    const b = umschalten(a.einheiten, TEXT, 6);
    expect(b.gesetzt).toBe(false);
    expect(b.einheiten).toEqual(e0);
  });
});

describe('Ansagen (Sollwert 4)', () => {
  const vorIrgendwann = mitte('irgendwann');
  const voll = einheitenAus(MUSTER_GRENZEN, TEXT);
  it('gesetzt: Wort vor der Grenze ohne Satzzeichen, Nummer der folgenden Einheit, Wörter', () => {
    expect(MUSTER_GRENZEN).toContain(vorIrgendwann);
    expect(ansageGrenze(TEXT, voll, vorIrgendwann, true)).toBe('Grenze nach ‚Naja‘. Sinneinheit 5 von 10, 8 Wörter.');
  });
  it('gelöscht: neue Zahl der Sinneinheiten', () => {
    const ohne = umschalten(voll, TEXT, vorIrgendwann);
    expect(ohne.gesetzt).toBe(false);
    expect(ansageGrenze(TEXT, ohne.einheiten, vorIrgendwann, false)).toBe('Grenze nach ‚Naja‘ gelöscht. Jetzt 9 Sinneinheiten.');
  });
  it('englisch', () => {
    s.einst.sprache = 'en';
    try { expect(ansageGrenze(TEXT, voll, vorIrgendwann, true)).toMatch(/^Boundary after .Naja.\. Unit 5 of 10, 8 words\.$/); }
    finally { s.einst.sprache = 'de'; }
  });
  it('ansageOrt: Sinneinheit, Wort x von y; am Anfang einer Einheit „Beginn“', () => {
    const w = woerter(TEXT);
    const i = w.findIndex(x => x.von === vorIrgendwann);          // „irgendwann“, erstes Wort der Einheit 5
    expect(ansageOrt(TEXT, voll, i)).toBe('Beginn Sinneinheit 5, Wort 1 von 8');
    expect(ansageOrt(TEXT, voll, i + 2)).toBe('Sinneinheit 5, Wort 3 von 8');
    expect(ansageOrt(TEXT, voll, 0)).toBe('Sinneinheit 1, Wort 1 von 1');
  });
});

describe('sichtbarerText', () => {
  const voll = einheitenAus(MUSTER_GRENZEN, TEXT);
  it('Einteilen: ganzer Text', () => {
    expect(sichtbarerText({ text: TEXT, einheiten: voll, phase: 'einteilen', aktuell: 0 })).toBe(TEXT);
  });
  it('Deuten: nur bis zum Ende der aktuellen Einheit', () => {
    for (let k = 0; k < voll.length; k++) {
      const t = sichtbarerText({ text: TEXT, einheiten: voll, phase: 'deuten', aktuell: k });
      expect(cp(t).length).toBe(voll[k]!.bis);
      expect(TEXT.startsWith(t)).toBe(true);
    }
    expect(sichtbarerText({ text: TEXT, einheiten: voll, phase: 'deuten', aktuell: 0 }).includes('funktioniert')).toBe(false);
  });
  it('Deuten: ganzer Text bei vorauslesenErlaubt oder wenn alle gedeutet sind', () => {
    expect(sichtbarerText({ text: TEXT, einheiten: voll, phase: 'deuten', aktuell: 0, vorauslesenErlaubt: true })).toBe(TEXT);
    const alle = voll.map(e => ({ ...e, gedeutet: true }));
    expect(sichtbarerText({ text: TEXT, einheiten: alle, phase: 'deuten', aktuell: 9 })).toBe(TEXT);
  });
  it('Sollwert 5: zählt Codepoints (Emoji)', () => {
    const t = "Ich 😀 hab's gern";
    const e = einheitenAus([6], t);   // vor „hab's“
    expect(sichtbarerText({ text: t, einheiten: e, phase: 'deuten', aktuell: 0 })).toBe('Ich 😀 ');
  });
});

describe('Sollwert 8: beide Konzepte, dieselben Grenzen → dieselben Einheiten', () => {
  const w = woerter(TEXT);
  it('Konzept 1 (Schreibmarke im Leerraum vor dem Wort) = Konzept 2 (Wortnummer)', () => {
    let k1: Einheit[] = neueEinheiten(TEXT), k2: Einheit[] = neueEinheiten(TEXT);
    for (const g of MUSTER_GRENZEN) {
      const ziel1 = grenzeAnWort(TEXT, g - 1)!;
      k1 = umschalten(k1, TEXT, ziel1).einheiten;
      const wi = w.findIndex(x => x.von === g);
      k2 = umschalten(k2, TEXT, w[wi]!.von).einheiten;
    }
    expect(k1).toEqual(k2);
    expect(k1.map(x => einheitText(TEXT, x))).toEqual(EINHEITEN_TEXTE);
  });
});

/** Eigenschaftstest ohne fast-check (nicht installiert): 500 Zufallsfälle mit festem Startwert (mulberry32). */
describe('Eigenschaften (500 Zufallsfälle, fester Startwert)', () => {
  const zufall = (a: number) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const teile = ['Naja,', 'ich', 'hab', "hab's", 'Tischler-Lehre', '😀', 'Ärger', 'école', 'x.', 'ja,'];
  const trenner = [' ', '  ', ' \n', '\t'];
  it('lückenlos, nie im Wort, doppeltes Umschalten = Ausgang, Deuten zeigt nichts nach dem Ende', () => {
    const r = zufall(20261112);
    for (let fall = 0; fall < 500; fall++) {
      const n = 1 + Math.floor(r() * 25);
      let text = r() < 0.2 ? ' ' : '';
      for (let i = 0; i < n; i++) text += teile[Math.floor(r() * teile.length)] + trenner[Math.floor(r() * trenner.length)]!.repeat(i === n - 1 && r() < 0.5 ? 0 : 1);
      const len = cp(text).length, ws = woerter(text), starts = new Set(ws.map(x => x.von));
      let e = neueEinheiten(text);
      for (let z = 0; z < 12; z++) {
        const pos = Math.floor(r() * (len + 2));
        const g = grenzeAnWort(text, pos);
        if (g === null) continue;
        expect(starts.has(g), `Grenze ${g} im Wort: ${JSON.stringify(text)}`).toBe(true);
        const vorher = grenzenAus(e);
        const a = umschalten(e, text, g);
        const b = umschalten(a.einheiten, text, g);
        expect(grenzenAus(b.einheiten)).toEqual(vorher);
        expect(a.gesetzt).toBe(!vorher.includes(g));
        e = a.einheiten;
        expect(e[0]!.von).toBe(0);
        expect(e[e.length - 1]!.bis).toBe(len);
        for (let i = 1; i < e.length; i++) expect(e[i]!.von).toBe(e[i - 1]!.bis);
        const k = Math.floor(r() * e.length);
        const sicht = sichtbarerText({ text, einheiten: e, phase: 'deuten', aktuell: k });
        expect(cp(sicht).length).toBe(e[k]!.bis);
        expect(text.startsWith(sicht)).toBe(true);
      }
    }
  });
});
