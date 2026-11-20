import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-d-erwartet.json';
import { s } from './sitzung.svelte';
import { fallauswahl } from './fallauswahl';
import { begrenztSatz, begruendung, fehlerSatz as fallFehler, hinweisSaetze as fallHinweise, kopfSatz, methodenSatz, tabelleAuswahl } from './fallauswahlsaetze';
import { themenzahlen, type ThemaZustand } from './themenzahlen';
import { basisSatz, hinweisSaetze as themenHinweise, tabelleAntworten, tabelleThemen, ueberlappungSatz } from './themenzahlensaetze';
import { themenEingabe, zitatSchluessel, leereThemen } from './themenblatt';
import { leererKatZustand, neueKategorie, ordne, zustaende, type Antwort } from './kategorisieren';
import { boxCox, boxCoxAsync, nctIntervall, naeherungIntervall, referenzBoxCox, referenzGruppen, referenzHinweis, REFERENZ_HINWEIS, referenzNormal, referenzRang } from './referenzbereich';
import { ausreisserHinweisSaetze, lambdaSatz, nichtNormalSatz, rangHinweisSaetze, satzReferenzBoxCox, satzReferenzNormal, tabelleReferenz } from './referenzsaetze';
import { AUSREISSER_SATZ, ausreisserSatz, dixon, esd, grubbs, satzDixon, satzGrubbs } from './ausreisser';
import { tabelleAusreisser } from './ausreissersaetze';

/* Eigene Prüfungen des Bauers B (Welle S-D) zu Sätzen, Tabellen und Verbindungen - die roten Tests des Prüfers (fallauswahl, themenzahlen, referenzbereich, ausreisser) bleiben unverändert. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const E = erwartet as any;
const zellen = (t: any): string[] => [...t.cells.map((c: any) => c.t), ...t.footnotes.map((c: any) => c.t)];
const ohneMist = (t: string) => expect(t).not.toMatch(/NaN|undefined|Infinity/);

describe('Fälle vorschlagen: Sätze und Tabelle', () => {
  const y = E.g11.faelle[0].eingabe.y as number[];
  const a = fallauswahl('extrem', [y]);
  it('der Kopfsatz nennt Regel, Spalte, n und die Zahl der Ausgeschlossenen', () => {
    const t = kopfSatz(a, ['wohlbefinden']);
    expect(t).toContain('Extrem'); expect(t).toContain('wohlbefinden'); expect(t).toContain('n = 150'); expect(t).toContain('ausgeschlossen wegen fehlender Werte: 0'); ohneMist(t);
  });
  it('Gleichstände: der Satz nennt die Zeilennummer als Regel; die Begründung nennt z', () => {
    expect(fallHinweise(a).join(' ')).toContain('nach der Zeilennummer entschieden'); expect(begruendung(a, a.vorschlaege[0]!)).toContain('2,59');
  });
  it('die Tabelle hat nur Kennung und Rechenwerte (keine Namen), den festen Satz und keine Wertung', () => {
    const t = tabelleAuswahl(a, a.vorschlaege.map(v => ({ v, kennung: `Zeile ${v.zeile}`, weitere: [] })));
    const z = zellen(t).join('|');
    expect(z).toContain('Zeile 23'); expect(z).toContain('Rechenwert'); expect(z).toContain('keine Bewertung der Personen und keine Einladung'); expect(z).toContain('keine Zufallsstichprobe'); ohneMist(z);
  });
  it('Fehler und Methodensatz', () => {
    expect(fallFehler('zu-wenige-werte')).toContain('weniger als 3 verschiedene Werte'); expect(methodenSatz(a, ['wohlbefinden'])).toContain('Für die Interviews wurden Fälle nach einer Rechenregel vorgeschlagen');
  });
});

describe('Zahlen nach Themen: Sätze, Tabelle, Verbindung zu den Kategorien', () => {
  const D = E.g12.daten, th = ['t1', 't2', 't3'].map((n, i) => ({ name: n, werte: D[n] as (number | null)[] }));
  const t = themenzahlen(th, D.zustand as ThemaZustand[], { frage: { art: 'zahl', werte: D.score }, ohne: true });
  it('Basis- und Überlappungssatz mit Zahlen (Fachblatt 3.7)', () => {
    expect(basisSatz(t)).toBe('Basis: 40 Personen mit mindestens einem Thema; 5 ohne Antwort, 3 noch nicht zugeordnet.');
    expect(ueberlappungSatz(t)).toContain('Summe der n: 59, Basis: 40 Personen'); expect(themenHinweise(t, 3)).toHaveLength(1);
  });
  it('die Tabelle: Zeile je Thema, Gesamt, „ohne“; keine Tests, kein p, keine Sternchen', () => {
    const tab = tabelleThemen(t, { name: 'score', art: 'zahl' }, { t1: [{ kennung: '4', text: 'Zu viel Zeitdruck' }] }), z = zellen(tab).join('|');
    expect(z).toContain('t1'); expect(z).toContain('Alle Personen mit Thema'); expect(z).toContain('ohne das Thema'); expect(z).toContain('Zu viel Zeitdruck'); expect(z).toContain('Summe der n: 59');
    expect(z).not.toMatch(/\*|p-Wert|Signifikanz/); ohneMist(z);
  });
  it('ohne Zahlenfrage und ohne Zitate: nur Thema, n und Prozent', () => {
    const tab = tabelleThemen(themenzahlen(th, D.zustand), null); expect(tab.cols).toBe(3); ohneMist(zellen(tab).join('|'));
  });
  it('die Tabelle aller Antworten enthält nur Kennung, Wortlaut und Wert', () => {
    const tab = tabelleAntworten([{ name: 'a', werte: [1, 0, 1] }], ['x1', 'x2', 'x3'], ['eins', 'zwei', 'drei'], { name: 'score', werte: [3, 4, null] }), z = zellen(tab);
    expect(z).toContain('x1'); expect(z).toContain('drei'); expect(z).not.toContain('zwei');
  });
  const antw: Antwort[] = ['a', 'b', 'c', 'd', 'e'].map((k, i) => ({ schluessel: k, text: i === 4 ? null : `Text ${k}` }));
  it('themenEingabe: mehrfach gibt 0/1, eins gibt 0/1 je Thema; leer und offen sind fehlend', () => {
    for (const mehrfach of [true, false]) {
      const z = leererKatZustand(); z.mehrfach = mehrfach; const k1 = neueKategorie(z, 'Eins'), k2 = neueKategorie(z, 'Zwei');
      ordne(z, 'a', k1); ordne(z, 'b', k2); if (mehrfach) ordne(z, 'a', k2);
      const e = themenEingabe(z, antw, zustaende(antw, z));
      expect(e.zustand).toEqual(['zugeordnet', 'zugeordnet', 'offen', 'offen', 'leer']); expect(e.themen[0]!.werte).toEqual([1, 0, null, null, null]); expect(e.themen[1]!.werte).toEqual([mehrfach ? 1 : 0, 1, null, null, null]);
    }
  });
  it('Zitate: höchstens 3 und nur Antworten, die noch zum Thema gehören', () => {
    const w = { ...leereThemen(), zitate: { k1: ['a', 'b', 'c', 'd', 'x'] } }, thema = { name: 'Eins', werte: [1, 1, 1, 0, null] as (number | null)[] };
    expect(zitatSchluessel(w, 'k1', thema, antw)).toEqual(['a', 'b', 'c']);
  });
});

describe('Referenzbereich: Sätze, Tabelle, große n', () => {
  const X120 = (E.m7.werte240 as number[]).slice(0, 120);
  it('Normal- und Box-Cox-Satz nennen Bereich, Intervalle und Verfahren', () => {
    const nrm = satzReferenzNormal(referenzNormal(X120), 'U/l');
    expect(nrm).toContain('29,7 bis 69,4 U/l'); expect(nrm).toContain('26,8 bis 32,1'); expect(nrm).toContain('nichtzentrale t-Verteilung'); ohneMist(nrm);
    const r = referenzBoxCox(X120)!, bc = boxCox(X120);
    if ('fehler' in r || 'fehler' in bc) throw new Error('Box-Cox sollte rechnen');
    const sb = satzReferenzBoxCox(r, 120); expect(sb).toContain('λ = ,47'); expect(sb).toContain('31,3 bis 70,9'); ohneMist(sb);
    const ls = lambdaSatz(bc, bc.lambda); expect(ls).toContain('Im Intervall liegen 0 (Logarithmus)'); expect(ls).toContain('behandelt λ als bekannt'); ohneMist(ls);
  });
  it('Hinweise: Rangmethode unter 119 Werten verweist auf die Normalverteilung; nicht normal nennt p', () => {
    expect(rangHinweisSaetze(referenzRang(X120.slice(0, 80))).join(' ')).toContain('gibt es ab 20 Werten ein Konfidenzintervall'); expect(nichtNormalSatz(0.0004)).toContain('p < ,001');
  });
  it('Ausreißer-Hinweis: kein Verdacht beim Beispiel, Verdacht mit 260; nennt keine Löschung', () => {
    const t = ausreisserHinweisSaetze({ dr: { oben: 0.021, unten: 0.021 }, verdacht: false, tukey: { unten: [], oben: [85, 89] } }).join(' ');
    expect(t).toContain('kein Verdacht'); expect(t).toContain('Zeilen 85, 89'); expect(t).toContain('entfernt nichts'); expect(t).not.toMatch(/löschen|entfernen Sie/);
  });
  it('Tabelle: Rang- und Normalverfahren, Gruppenspalte nur bei Gruppen', () => {
    const g = referenzGruppen(E.m7.gruppen.daten_x, E.m7.gruppen.daten_g), r = referenzRang(X120), n = referenzNormal(X120);
    const tab = tabelleReferenz([{ art: 'rang', n: 120, unten: r.unten, oben: r.oben, kiUnten: r.ki!.unten, kiOben: r.ki!.oben }, { art: 'normal', n: 120, unten: n.unten, oben: n.oben, kiUnten: n.kiUnten, kiOben: n.kiOben }], 'wert', 'U/l');
    const z = zellen(tab).join('|'); expect(z).toContain('Rangmethode (Typ 6)'); expect(z).toContain('Normalverteilung, exakt'); expect(z).not.toContain('Gruppe'); ohneMist(z); expect(g).toHaveLength(3);
    expect(zellen(tabelleReferenz([{ gruppe: 'A', art: 'rang', n: 30, unten: null, oben: null, kiUnten: null, kiOben: null }], 'wert')).join('|')).toContain('Gruppe');
  });
  it('REFERENZ_HINWEIS (feste deutsche Fassung) gleicht dem Text der Oberfläche', () => { expect(referenzHinweis()).toBe(REFERENZ_HINWEIS); });
  it('große n: das exakte Intervall bleibt sinnvoll (n = 600: δ über 30, Integration statt AS 243)', () => {
    const rng = (() => { let q = 7; return () => (q = (q * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
    const x = Array.from({ length: 600 }, () => 50 + 10 * (rng() + rng() + rng() + rng() + rng() + rng() - 3) * 1.4142);
    const r = referenzNormal(x), nae = naeherungIntervall(r.unten, r.sd, 600, -1.959964), ex = nctIntervall(r.mittel, r.sd, 600, -1.959964);
    expect(ex[0]).toBeLessThan(r.unten); expect(ex[1]).toBeGreaterThan(r.unten); expect(Math.abs(ex[0] - nae[0])).toBeLessThan(0.15 * r.sd / Math.sqrt(600) * 4); expect(Math.abs(ex[1] - nae[1])).toBeLessThan(0.15 * r.sd / Math.sqrt(600) * 4);
  });
});

describe('Ausreißertests: Tabelle und Sätze', () => {
  const g = grubbs(E.t2.grubbs_nist.daten), e = esd(E.t2.esd_nist.daten, { k: 10 }), d = dixon(E.t2.dixon_wiki.daten);
  it('Tabelle mit allen drei Tests, ohne Löschknopf-Wörter; der feste Satz steht in der Anmerkung', () => {
    const z = zellen(tabelleAusreisser('messung', { grubbs: g, esd: e, dixon: d })).join('|');
    expect(z).toContain('Grubbs'); expect(z).toContain('Generalisierter ESD'); expect(z).toContain('Dixon r10'); expect(z).toContain('Der Fall bleibt in den Daten.'); expect(z).not.toMatch(/Entfernen|Löschen/); ohneMist(z);
  });
  it('Sie-Anrede für den festen Satz; Dixon-Satz ohne Fund', () => {
    s.einst.anrede = 'sie'; expect(ausreisserSatz()).toContain('Prüfen Sie zuerst'); s.einst.anrede = 'du'; expect(ausreisserSatz()).toBe(AUSREISSER_SATZ);
    expect(satzDixon(d)).toMatch(/kein Hinweis/);
  });
});

describe('Nachbesserung (Koordinator): Box-Cox mit λ < 0, Lücken im Satz, wenige Stufen, k je Liste, Mehrzahl', () => {
  const X = (E.m7.werte240 as number[]).slice(0, 118);
  it('Box-Cox mit λ = −,014: unten bleibt unten (R 4.6.1, referenz.csv, erste 118 Werte; qt mit ncp, Rücktransformation (λz + 1)^(1/λ))', () => {
    // R: z <- (x^l - 1)/l; Grenze m ∓ qnorm(.975)·s; Intervalle m - qt(.95/.05, n-1, ncp = -qnorm(p)·√n)·s/√n; zurück mit (l·z + 1)^(1/l)
    const r = referenzBoxCox(X, -0.014) as any;
    expect(Math.abs(r.unten.orig - 32.4174326497)).toBeLessThan(1e-6); expect(Math.abs(r.oben.orig - 73.2892327274)).toBeLessThan(1e-6);
    expect(r.unten.orig).toBeLessThan(r.oben.orig);
    [30.5440204513, 34.0453568282].forEach((v, i) => expect(Math.abs(r.unten.origKi[i] - v)).toBeLessThan(1e-6));
    [69.7479323695, 77.8415462810].forEach((v, i) => expect(Math.abs(r.oben.origKi[i] - v)).toBeLessThan(1e-6));
  });
  it('boxCoxAsync gibt dasselbe wie boxCox', async () => {
    const a = boxCox(X) as any, b = (await boxCoxAsync(X)) as any; expect(b.lambda).toBe(a.lambda); expect(b.lambdaKi).toEqual(a.lambdaKi);
  });
  it('„wenige Stufen“ nur bei vielen Gleichständen, nicht wegen kleinem n', () => {
    expect(grubbs([10.1, 9.8, 10.3, 9.9, 10.0, 10.2, 9.7, 10.4]).hinweise).not.toContain('wenige-stufen');   // 8 verschiedene Werte bei n = 8
    expect(grubbs(E.t2.likert).hinweise).toContain('wenige-stufen');
  });
  it('fehlende Werte stehen im Satz mit ihrer Zahl', () => {
    const t = satzGrubbs(grubbs(E.t2.luecke.daten)); expect(t).toContain('2 Zeilen ohne Wert wurden nicht geprüft (n = 8)');
    expect(satzGrubbs(grubbs(E.t2.grubbs_nist.daten))).not.toContain('ohne Wert');
    expect(satzDixon(dixon([null, ...E.t2.dixon_wiki.daten]))).toContain('1 Zeile ohne Wert wurde nicht geprüft');
  });
  it('Kopfsatz: Einzahl bei k = 1 und begrenztSatz', () => {
    const y = E.g11.faelle[0].eingabe.y as number[];
    expect(kopfSatz(fallauswahl('extrem', [y], { k: 1 }), ['w'])).toContain('der höchste und der niedrigste Wert');
    expect(kopfSatz(fallauswahl('typisch', [y], { k: 1 }), ['w'])).toContain('der Fall mit dem kleinsten Abstand');
    expect(kopfSatz(fallauswahl('extrem', [y], { k: 4 }), ['w'])).toContain('die 4 höchsten und die 4 niedrigsten Werte');
    expect(begrenztSatz(8, 4, 5)).toContain('je Liste 4 Fälle'); expect(begrenztSatz(3, 1, 3)).toContain('je Liste 1 Fall vorgeschlagen');
  });
});
