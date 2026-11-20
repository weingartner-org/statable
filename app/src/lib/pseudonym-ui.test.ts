/**
 * Paket 5E2: reine Hilfen der Oberfläche „Pseudonymisieren“ (Kontext, Gruppen, Zählen, Umbenennen) und der Weg Treffer → Ersetzen mit Umbenennung.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ersetze, findeTreffer, type Treffer } from './pseudonym';
import { beitragNr, gruppiere, gewaehlteSprecher, kontextAusschnitt, platzhalterListe, sprecherNamen, pruefeErsatzName, setzeArt, wendeErsatzAn, zaehleAn } from './pseudonym-ui';
import { neuesQualProjekt, type QualProjekt } from './qualprojekt';

const t = (o: Partial<Treffer>): Treffer => ({ start: 0, ende: 1, text: 'x', art: 'person', id: 'i', dokument: 'd1', ersatz: '[Person 1]', an: true, ...o });

describe('kontextAusschnitt', () => {
  it('40 Zeichen davor und danach, gekürzt mit Marken', () => {
    const text = 'a'.repeat(100) + 'Lena' + 'b'.repeat(100);
    const k = kontextAusschnitt(text, 100, 104, 40);
    expect(k.davor).toBe('a'.repeat(40)); expect(k.treffer).toBe('Lena'); expect(k.danach).toBe('b'.repeat(40));
    expect(k.davorGekuerzt).toBe(true); expect(k.danachGekuerzt).toBe(true);
  });
  it('am Textrand nicht gekürzt, Umbrüche werden Leerzeichen', () => {
    const k = kontextAusschnitt('Hallo\n\nLena\ngeht', 7, 11, 40);
    expect(k.davor).toBe('Hallo '); expect(k.danach).toBe(' geht'); expect(k.davorGekuerzt).toBe(false); expect(k.danachGekuerzt).toBe(false);
  });
  it('Positionen in Codepoints: Emoji davor verschiebt nicht', () => {
    const k = kontextAusschnitt('😀😀 Lena kommt', 3, 7, 40);
    expect(k.treffer).toBe('Lena'); expect(k.davor).toBe('😀😀 ');
  });
});

describe('gruppiere, zaehleAn, setzeArt', () => {
  const liste = [t({ id: 'a', art: 'email' }), t({ id: 'b', art: 'person' }), t({ id: 'c', art: 'person', an: false, dokument: 'd2' })];
  it('feste Reihenfolge, leere Arten fehlen', () => {
    const g = gruppiere(liste);
    expect(g.map(x => x.art)).toEqual(['person', 'email']);
    expect(g[0]!.treffer.map(x => x.id)).toEqual(['b', 'c']);
  });
  it('zählt nur angekreuzte Stellen und deren Dokumente', () => expect(zaehleAn(liste)).toEqual({ stellen: 2, dokumente: 1 }));
  it('Alle annehmen: nur diese Art, Eingabe bleibt', () => {
    const neu = setzeArt(liste, 'person', true);
    expect(neu.filter(x => x.an).length).toBe(3);
    expect(liste[2]!.an).toBe(false);
    expect(setzeArt(liste, 'email', false)[0]!.an).toBe(false);
  });
});

describe('beitragNr', () => {
  const d = { transkript: { sprecher: [], abschnitte: [{ start: 0, ende: 10 }, { start: 12, ende: 30 }] } };
  it('Nummer ab 1, außerhalb leer, ohne Transkript leer', () => {
    expect(beitragNr(d, 0)).toBe(1); expect(beitragNr(d, 12)).toBe(2); expect(beitragNr(d, 29)).toBe(2);
    expect(beitragNr(d, 10)).toBeUndefined(); expect(beitragNr({}, 3)).toBeUndefined();
  });
});

describe('Platzhalter umbenennen', () => {
  const liste = [t({ id: '1', text: 'Anna', ersatz: '[Person 1]' }), t({ id: '2', text: 'Annas', ersatz: '[Person 1]' }), t({ id: '3', text: 'Bob', ersatz: '[Person 2]' }), t({ id: '4', art: 'email', ersatz: '[E-Mail]' }), t({ id: '5', text: 'Cleo', ersatz: '[Person 3]', an: false })];
  it('Liste: nur angekreuzte Namen, je Platzhalter einmal mit Zahl', () => {
    expect(platzhalterListe(liste)).toEqual([
      { ersatz: '[Person 1]', art: 'person', klartext: 'Anna', stellen: 2 },
      { ersatz: '[Person 2]', art: 'person', klartext: 'Bob', stellen: 1 },
    ]);
  });
  it('Prüfung: leer, doppelt, ok', () => {
    expect(pruefeErsatzName('  ', '[Person 1]', ['[Person 1]', '[Person 2]'])).toBe('leer');
    expect(pruefeErsatzName('[Person 2]', '[Person 1]', ['[Person 1]', '[Person 2]'])).toBe('doppelt');
    expect(pruefeErsatzName('[Studentin A]', '[Person 1]', ['[Person 1]', '[Person 2]'])).toBe('ok');
    expect(pruefeErsatzName('[Person 1]', '[Person 1]', ['[Person 1]'])).toBe('ok');
  });
  it('wendeErsatzAn: alle gleichen Platzhalter, Eingabe bleibt', () => {
    const neu = wendeErsatzAn(liste, { '[Person 1]': ' [Studentin A] ' });
    expect(neu.filter(x => x.ersatz === '[Studentin A]').map(x => x.id)).toEqual(['1', '2']);
    expect(liste[0]!.ersatz).toBe('[Person 1]');
  });
});

describe('Sprechernamen einzeln wählen', () => {
  const projekt = (): QualProjekt => {
    const q = neuesQualProjekt('P');
    const text = 'Interviewerin: Hallo. Studentin: Ich bin Anna. Anna: ja.';
    q.dokumente = [{ id: 'd1', name: 'I', art: 'text', text, erstellt: 1, geaendert: 1, transkript: { sprecher: [
      { id: 'a', name: 'Interviewerin', rolle: 'interview' }, { id: 'b', name: 'Studentin', rolle: 'befragt' }, { id: 'c', name: 'Anna', rolle: 'befragt' }, { id: 'd', name: 'anna', rolle: 'andere' }], abschnitte: [] } }];
    return q;
  };
  it('Liste ohne Interview-Rolle, je Name einmal (Groß-/Kleinschreibung egal)', () => expect(sprecherNamen(projekt())).toEqual(['Studentin', 'Anna']));
  it('abgewählt geht nicht hinein', () => expect(gewaehlteSprecher(['Studentin', 'Anna'], ['Studentin'])).toEqual([{ text: 'Anna', art: 'person' }]));
  it('Kern: abgewähltes Rollenwort bleibt, gewählter Name wird ersetzt, auch sprecher.name', () => {
    const q = projekt();
    const treffer = findeTreffer(q, { namen: gewaehlteSprecher(['Studentin', 'Anna'], ['Studentin']), regeln: [], sprecherAlsPersonen: false }, 'de');
    expect(treffer.map(x => x.text)).toEqual(['Anna', 'Anna']);
    const erg = ersetze(q, treffer, 5).projekt;
    expect(erg.dokumente[0]!.text).toContain('Studentin: Ich bin [Person 1]. [Person 1]: ja.');
    const namen = erg.dokumente[0]!.transkript!.sprecher.map(s => s.name);
    expect(namen).toEqual(['Interviewerin', 'Studentin', '[Person 1]', '[Person 1]']);
  });
});

describe('Weg wie in der Oberfläche: finden, umbenennen, ersetzen', () => {
  const projekt = (): QualProjekt => {
    const q = neuesQualProjekt('P');
    const text = '😀 Ich habe mit Lena gesprochen. Lena sagt, schreib an lena@example.org.';
    q.dokumente = [{ id: 'd1', name: 'Interview 1', art: 'text', text, erstellt: 1, geaendert: 1 }];
    const s = text.indexOf('gesprochen');
    q.segmente = [{ id: 's1', dokument: 'd1', start: Array.from(text.slice(0, s)).length, ende: Array.from(text.slice(0, s + 10)).length, erstellt: 1 }];
    return q;
  };
  it('Lena wird zu [Studentin A], E-Mail zu [E-Mail], Zuordnung zählt, Segment bleibt auf „gesprochen“', () => {
    const q = projekt();
    const treffer = findeTreffer(q, { namen: [{ text: 'Lena', art: 'person' }], regeln: ['email'], sprecherAlsPersonen: false }, 'de');
    expect(treffer.length).toBe(3);
    const erg = ersetze(q, wendeErsatzAn(treffer, { '[Person 1]': '[Studentin A]' }), 5);
    const d = erg.projekt.dokumente[0]!;
    expect(d.text).toBe('😀 Ich habe mit [Studentin A] gesprochen. [Studentin A] sagt, schreib an [E-Mail].');
    const sg = erg.projekt.segmente[0]!;
    expect(Array.from(d.text).slice(sg.start, sg.ende).join('')).toBe('gesprochen');
    expect(erg.zuordnung.find(z => z.klartext === 'Lena')).toMatchObject({ ersatz: '[Studentin A]', stellen: 2 });
    expect(q.dokumente[0]!.text).toContain('Lena');   // Eingabe unverändert (Voraussetzung für „Rückgängig“)
  });
});

describe('Text für Menschen in der Pseudonymisieren-Oberfläche', () => {
  const quelle = readFileSync(new URL('../bausteine/Pseudonymisieren.svelte', import.meta.url), 'utf8');
  it('kein Pfeilzeichen im Text (NVDA liest „Pfeil nach rechts“): „wird zu“ / „becomes“', () => {
    expect(quelle).not.toContain('→');
    expect(quelle).toMatch(/\{L\('wird zu', 'becomes'[,)]/);   // (der Katalog-Lauf hängt einen Schlüssel an)
  });
  it('Zahlen mit Hauptwort über Einzahl/Mehrzahl (Dokument/Dokumenten, Name/Namen, Treffer)', () => {
    expect(quelle).not.toMatch(/\$\{[\w.]*dokumente\} Dokumenten/);
    expect(quelle).not.toMatch(/\$\{[\w.]+\.length\} (Namen|names)/);
    // (Der Quelltext steht hier als Teilstück ohne „Lp(“, damit der Katalog-Lauf diese Datei nicht umschreibt.)
    expect(quelle).toContain('`${n} Dokument`, `${n} Dokumenten`, `${n} document`, `${n} documents`');
    expect(quelle).toContain('`${n} Name`, `${n} Namen`, `${n} name`, `${n} names`');
  });
});
