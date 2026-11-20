/**
 * Sollwerte F3B1 (Architekturblatt Datenmodell Feinstruktur, Abschnitte 2, 5, 6; Fachblatt Feinstruktur 2-4; Spaltensatz-Bitte Johannes 12.11.).
 * Modell `sequenzanalysen` (Prüfen, Fassung 2), Pseudonymisieren, Arbeitsplatz-Logik, Muster-Analyse aus docs/feinstruktur/beispiele.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cpLaenge, neuesQualProjekt, pruefeQualProjekt, qualFassung, type Dokument, type QualProjekt, type Sequenzanalyse } from './qualprojekt';
import { ersetze, type Treffer } from './pseudonym';
import {
  abweichungSatz, alleGedeutet, ausschnittAusBeitraegen, ausschnittInfo, beginneDeuten, einheitFertig, einheitHinweis, einheitSichtbar,
  entferneEintrag, aendereEintrag, fuegeEintragHinzu, neueAnalyse, nochEinheiten, schalteGrenze, sichtbar, zumEinteilen,
} from './feinstruktur-analyse';
import { SPALTENSATZ_FEINSTRUKTUR, spaltenText, spaltensatz } from './feinstruktur-spalten';

const muster = JSON.parse(readFileSync(fileURLToPath(new URL('../../../docs/feinstruktur/beispiele/muster-feinstruktur.json', import.meta.url)), 'utf8'));
const TEXT: string = muster.ausschnitt.text;
const EINHEITEN: string[] = muster.sinneinheiten.map((e: { text: string }) => e.text);
/** Grenzen der Musterlösung (Anfang der Einheiten 2-10, Codepoints): Einheiten sind mit einem Leerzeichen aneinandergereiht. */
const MUSTER_GRENZEN = EINHEITEN.slice(1).map((_, i) => cpLaenge(EINHEITEN.slice(0, i + 1).join(' ') + ' '));

const rund = (p: unknown): QualProjekt => pruefeQualProjekt(JSON.parse(JSON.stringify(p)));

function interview(): Dokument {
  const frage = 'I: Wie kam es dazu?\n';
  const text = frage + 'B: ' + TEXT + '\nI: Danke.\n';
  const a1 = cpLaenge(frage), a2 = a1 + cpLaenge('B: ' + TEXT + '\n');
  return {
    id: 'd1', name: 'Interview B', art: 'text', text, erstellt: 1, geaendert: 1,
    transkript: { sprecher: [{ id: 'i', name: 'I', rolle: 'interview' }, { id: 'b', name: 'B', rolle: 'befragt' }],
      abschnitte: [{ start: 0, ende: a1, sprecher: 'i' }, { start: a1, ende: a2, sprecher: 'b' }, { start: a2, ende: cpLaenge(text), sprecher: 'i' }] },
  };
}
function projekt(sa?: Sequenzanalyse): QualProjekt {
  const q = neuesQualProjekt('F3');
  q.dokumente.push(interview());
  if (sa) q.sequenzanalysen = [sa];
  return q;
}
function mitMuster(): Sequenzanalyse {
  let sa = neueAnalyse({ start: 3, ende: 3 + cpLaenge(TEXT), text: TEXT, forschungsfrage: muster.forschungsfrage, name: 'Muster', jetzt: 1 });
  for (const g of MUSTER_GRENZEN) { const r = schalteGrenze(sa, g, 2); if (r.art !== 'geaendert') throw new Error(r.art); sa = r.analyse; }
  return sa;
}

describe('Spaltensatz als Daten (Bitte Johannes 12.11.)', () => {
  it('fünf Spalten mit Kennung, Name de/en, Leitfragen; je Sprache gleich viele, an die Felder der Sinneinheit gebunden', () => {
    const s = SPALTENSATZ_FEINSTRUKTUR;
    expect(s.spalten.map(x => x.kennung)).toEqual(['paraphrase', 'intentionen', 'latent', 'rollen', 'anschluss']);
    expect(s.spalten.map(x => x.feld)).toEqual(['paraphrase', 'intentionen', 'lesarten', 'rollen', 'anschluss']);
    for (const x of s.spalten) {
      expect(x.name.de && x.name.en).toBeTruthy();
      expect(x.leitfragen.length).toBeGreaterThanOrEqual(2);
      for (const f of x.leitfragen) expect(f.de.length * f.en.length).toBeGreaterThan(0);
    }
    expect(s.spalten.filter(x => x.mitPruefung).map(x => x.kennung)).toEqual(['latent']);
    expect(spaltenText(s.spalten[1]!.name, 'de')).toBe('Intentionen (subjektiver Sinn)');
    expect(spaltenText(s.spalten[1]!.name, 'fr')).toBe('Intentions (subjective meaning)');   // fehlt die Sprache: Englisch
    expect(spaltensatz('gibt-es-nicht')).toBe(s);
  });
});

describe('Modell sequenzanalysen (Architekturblatt 2, 5, 6)', () => {
  it('Hin- und Rückweg mit allen Feldern; Fassung 2 genau dann, wenn eine Sequenzanalyse da ist', () => {
    expect(qualFassung(projekt())).toBe(1);
    let sa = mitMuster();
    sa = fuegeEintragHinzu(sa, 0, 'lesarten', 'L1', 3, 'später Begründung').analyse;
    const lid = sa.einheiten[0]!.lesarten[0]!.id;
    sa.einheiten[0]!.lesarten[0]!.verlauf.push({ stand: 'haelt', beiEinheit: sa.einheiten[2]!.id, begruendung: 'kommt', zeit: 4 });
    sa.reflexionen.push({ id: 'r1', nachEinheit: sa.einheiten[3]!.id, begriffe: 'a', bisher: 'b', pruefen: 'c', zeit: 5 });
    sa.fazit = { muster: [{ id: 'm1', text: 'M', belege: [{ einheit: sa.einheiten[1]!.id, zitat: 'ich hab' }] }], bezugForschungsfrage: 'B', geaendert: 6 };
    sa.gruppe = { name: 'Gruppe A', mitglieder: ['x'] };
    sa.dokument = 'd1';
    const q = rund(projekt(sa));
    expect(q.version).toBe(2);
    expect(q.sequenzanalysen![0]).toEqual(JSON.parse(JSON.stringify(sa)));
    expect(q.sequenzanalysen![0]!.einheiten[0]!.lesarten[0]!.id).toBe(lid);
  });
  it('lehnt Lücke, Überlappung, falsches Ende, aktuelleEinheit außerhalb und fremde beiEinheit ab, mit Pfad', () => {
    const fehler = (f: (sa: Sequenzanalyse) => void, muster: RegExp) => { const sa = structuredClone(mitMuster()); f(sa); expect(() => rund(projekt(sa))).toThrow(muster); };
    fehler(sa => { sa.einheiten[3]!.von += 1; }, /sequenzanalysen\[0\]\.einheiten\[3\].*Lücke/);
    fehler(sa => { sa.einheiten[3]!.von -= 1; }, /sequenzanalysen\[0\]\.einheiten\[3\].*überlappt/);
    fehler(sa => { sa.einheiten[0]!.von = 1; }, /einheiten\[0\]/);
    fehler(sa => { sa.einheiten[9]!.bis -= 1; }, /einheiten\[9\].*Ende/);
    fehler(sa => { sa.aktuelleEinheit = 10; }, /aktuelleEinheit/);
    fehler(sa => { sa.einheiten[0]!.lesarten.push({ id: 'l', text: 't', pruefung: '', verlauf: [{ stand: 'verworfen', beiEinheit: 'fremd', begruendung: '', zeit: 1 }] }); }, /beiEinheit/);
    fehler(sa => { sa.dokument = 'fehlt'; }, /dokument/);
  });
  it('ältere Fassung ohne Sequenzanalyse bleibt Fassung 1', () => {
    expect(rund(projekt()).version).toBe(1);
  });
});

describe('Ausschnitt wählen (Fachblatt 2, Schritt 2)', () => {
  it('Ausschnitt aus Beiträgen, Frage davor als Kontext, Zähler nur befragte Person', () => {
    const d = interview();
    const a = ausschnittAusBeitraegen(d, 1, 1);
    const sa = neueAnalyse({ dok: d, ...a, forschungsfrage: 'F', name: 'A', jetzt: 1 });
    expect(sa.ausschnitt.text).toBe(TEXT);   // ohne Sprecherkennung (Befund A der Abnahme)
    expect(sa.ausschnitt.kontext).toBe('I: Wie kam es dazu?');
    expect(sa.einheiten).toHaveLength(1);
    expect(sa.phase).toBe('einteilen');
    const info = ausschnittInfo(d, a.start, a.ende, 'de');
    expect(info.woerterBefragt).toBe(61);
    expect(info.hinweise).toEqual([]);
  });
  it('Hinweis bei Frage der interviewenden Person im Ausschnitt und bei langem Ausschnitt; kein Hinweis ohne Grund', () => {
    const d = interview();
    const a = ausschnittAusBeitraegen(d, 0, 2);
    const info = ausschnittInfo(d, a.start, a.ende, 'de');
    expect(info.hinweise.some(h => h.includes('Gedeutet werden nur die Antworten.'))).toBe(true);
    const lang = { ...d, text: 'B: ' + (TEXT + ' ').repeat(3), transkript: { sprecher: d.transkript!.sprecher, abschnitte: [{ start: 0, ende: cpLaenge('B: ' + (TEXT + ' ').repeat(3)), sprecher: 'b' }] } };
    const li = ausschnittInfo(lang, 0, cpLaenge(lang.text), 'de');
    expect(li.woerterBefragt).toBe(183);
    expect(li.hinweise.some(h => h.includes('etwa 10 Zeilen'))).toBe(true);
  });
  it('Abweichung Ausschnitt/Dokument: Satz aus Architekturblatt 2.1, sonst nichts', () => {
    const d = interview();
    const sa = neueAnalyse({ dok: d, ...ausschnittAusBeitraegen(d, 1, 1), forschungsfrage: '', name: 'A', jetzt: 1 });
    const mitZeit = { ...d, text: d.text.replace('B: ', '[00:00:10] B: ') };
    mitZeit.transkript = { ...d.transkript!, abschnitte: d.transkript!.abschnitte.map((x, i) => (i === 0 ? x : { ...x, start: x.start + (i === 1 ? 0 : 11), ende: x.ende + 11 })) };
    const z = ausschnittAusBeitraegen(mitZeit, 1, 1);
    expect(Array.from(mitZeit.text).slice(z.start, z.ende).join('')).toBe(TEXT);
    expect(abweichungSatz(sa, d, 'de')).toBeUndefined();
    expect(abweichungSatz(sa, { ...d, text: d.text.replace('Tischlerin', 'Tischler') }, 'de')).toBe('Der Ausschnitt im Transkript hat sich geändert. Die Analyse nutzt weiter ihren eigenen Wortlaut.');
  });
});

describe('Einteilen und Deuten', () => {
  it('Muster: 10 Einheiten mit den Wortlauten der Musterlösung', () => {
    const sa = mitMuster();
    expect(sa.einheiten.map(e => Array.from(TEXT).slice(e.von, e.bis).join('').trimEnd())).toEqual(EINHEITEN);
  });
  it('nicht vorauslesen: in Phase Deuten nie Text nach der aktuellen Einheit; „Noch n“; alles gedeutet zeigt alles', () => {
    let sa = beginneDeuten(mitMuster(), 3);
    for (let k = 0; k < 10; k++) {
      expect(sa.aktuelleEinheit).toBe(k);
      expect(sichtbar(sa)).toBe(Array.from(TEXT).slice(0, sa.einheiten[k]!.bis).join(''));
      expect(nochEinheiten(sa)).toBe(9 - k);
      expect(einheitSichtbar(sa, k)).toBe(EINHEITEN[k]);
      if (k < 9) expect(einheitSichtbar(sa, k + 1)).toBe('');
      sa = einheitFertig(sa, 4);
    }
    expect(alleGedeutet(sa)).toBe(true);
    expect(sichtbar(sa)).toBe(TEXT);
    expect(sichtbar(zumEinteilen(beginneDeuten(mitMuster(), 1), 2))).toBe(TEXT);
  });
  it('gedeutet setzt nur „Einheit fertig“; Einträge hinzufügen, ändern, löschen; mehrere Lesarten', () => {
    let sa = beginneDeuten(mitMuster(), 1);
    let r = fuegeEintragHinzu(sa, 0, 'lesarten', 'Lesart 1', 2, 'Prüfung 1'); sa = r.analyse; const l1 = r.id;
    r = fuegeEintragHinzu(sa, 0, 'lesarten', 'Lesart 2', 2); sa = r.analyse;
    r = fuegeEintragHinzu(sa, 0, 'paraphrase', 'P', 2); sa = r.analyse; const p = r.id;
    expect(sa.einheiten[0]!.gedeutet).toBe(false);
    expect(sa.einheiten[0]!.lesarten.map(l => [l.text, l.pruefung, l.verlauf.length])).toEqual([['Lesart 1', 'Prüfung 1', 0], ['Lesart 2', '', 0]]);
    sa = aendereEintrag(sa, 0, 'lesarten', l1, { pruefung: 'neu' }, 3);
    sa = aendereEintrag(sa, 0, 'paraphrase', p, { text: 'P2' }, 3);
    expect(sa.einheiten[0]!.lesarten[0]!.pruefung).toBe('neu');
    expect(sa.einheiten[0]!.paraphrase[0]!.text).toBe('P2');
    sa = entferneEintrag(sa, 0, 'lesarten', l1, 4);
    expect(sa.einheiten[0]!.lesarten.map(l => l.text)).toEqual(['Lesart 2']);
  });
  it('Grenze an einer gedeuteten oder gefüllten Einheit braucht Rückfrage; danach bleiben die Einträge erhalten', () => {
    let sa = beginneDeuten(mitMuster(), 1);
    sa = fuegeEintragHinzu(sa, 1, 'paraphrase', 'P zu 2', 2).analyse;
    const g = MUSTER_GRENZEN[1]!;   // Grenze zwischen Einheit 2 und 3
    const r = schalteGrenze(sa, g, 3);
    expect(r).toEqual({ art: 'rueckfrage', gesetzt: false, einheiten: [1] });
    const b = schalteGrenze(sa, g, 3, true);
    if (b.art !== 'geaendert') throw new Error(b.art);
    expect(b.analyse.einheiten).toHaveLength(9);
    expect(b.analyse.einheiten[1]!.paraphrase.map(x => x.text)).toEqual(['P zu 2']);
    expect(b.vermerk).toContain('nach dem Deuten');
    // leere, nicht gedeutete Einheit: ohne Rückfrage
    const c = schalteGrenze(sa, MUSTER_GRENZEN[5]!, 3);
    expect(c.art).toBe('geaendert');
    expect(schalteGrenze({ ...sa, grenzenGesperrt: true }, 5, 3).art).toBe('gesperrt');
  });
  it('Formhinweis ab 9 Wörtern je Einheit, darunter keiner', () => {
    const sa = neueAnalyse({ start: 0, ende: 0, text: 'eins zwei drei vier fünf sechs sieben acht neun', forschungsfrage: '', name: 'x', jetzt: 1 });
    expect(einheitHinweis(sa, 0, 'de')).toBe('Diese Sinneinheit hat 9 Wörter. Kleinere Einheiten machen die Deutung genauer.');
    expect(einheitHinweis(mitMuster(), 0, 'de')).toBeUndefined();
  });
});

describe('Pseudonymisieren verschiebt Ausschnitt und Grenzen (Architekturblatt 2.1, 6)', () => {
  const treffer = (q: QualProjekt, wort: string, ersatz: string): Treffer[] => {
    const d = q.dokumente[0]!; const z = Array.from(d.text); const t = Array.from(wort);
    const out: Treffer[] = [];
    for (let i = 0; i + t.length <= z.length; i++) if (z.slice(i, i + t.length).join('') === wort) out.push({ id: 't' + i, dokument: d.id, start: i, ende: i + t.length, text: wort, art: 'person', ersatz, an: true });
    return out;
  };
  function mitDok(): QualProjekt {
    const d = interview();
    const a = ausschnittAusBeitraegen(d, 1, 1);
    let sa = neueAnalyse({ dok: d, ...a, forschungsfrage: '', name: 'A', jetzt: 1 });
    // Grenze vor „ich“ und vor „als“ (Einheit 2: „ich hab zuerst eine Lehre gemacht, “)
    for (const w of ['ich hab zuerst', 'als Tischlerin']) { const r = schalteGrenze(sa, Array.from(sa.ausschnitt.text).join('').indexOf(w), 1); if (r.art === 'geaendert') sa = r.analyse; }
    return projekt(sa);
  }
  const teile = (sa: Sequenzanalyse) => sa.einheiten.map(e => Array.from(sa.ausschnitt.text).slice(e.von, e.bis).join(''));
  it('Ersatz länger und kürzer als das Original; Ausschnitt bleibt gleich dem Dokument', () => {
    for (const ersatz of ['[Beruf einer sehr langen Art]', '[B]']) {
      const q = mitDok();
      const r = ersetze(q, treffer(q, 'Tischlerin', ersatz), 9).projekt;
      const sa = r.sequenzanalysen![0]!;
      expect(abweichungSatz(sa, r.dokumente[0], 'de')).toBeUndefined();
      expect(teile(sa)[2]).toContain(ersatz);
      expect(teile(sa).join('')).toBe(sa.ausschnitt.text);
      expect(() => rund(r)).not.toThrow();
    }
  });
  it('Ersatz vor dem Ausschnitt verschiebt nur start/ende', () => {
    const q = mitDok();
    const vorher = q.sequenzanalysen![0]!;
    const r = ersetze(q, treffer(q, 'Wie', '[Frage-Wort lang]'), 9).projekt.sequenzanalysen![0]!;
    expect(r.ausschnitt.start - vorher.ausschnitt.start).toBe(cpLaenge('[Frage-Wort lang]') - 3);
    expect(r.ausschnitt.text).toBe(vorher.ausschnitt.text);
    expect(r.einheiten.map(e => [e.von, e.bis])).toEqual(vorher.einheiten.map(e => [e.von, e.bis]));
  });
  it('Ersatz über eine Grenze hinweg: Grenze ans Ende des Ersatzes, Vermerk im Protokoll', () => {
    const q = mitDok();
    const r = ersetze(q, treffer(q, 'gemacht, als Tisch', '[X]'), 9).projekt;
    const sa = r.sequenzanalysen![0]!;
    expect(teile(sa)[1]!.endsWith('[X]')).toBe(true);
    expect(teile(sa)[2]!.startsWith('lerin')).toBe(true);
    expect(r.protokoll.some(p => p.was.includes('Grenze'))).toBe(true);
    expect(() => rund(r)).not.toThrow();
  });
});
