import { describe, it, expect } from 'vitest';
import { artikelListe } from './artikel';
import { suche, suchwoerter } from './suche';
import { ALLTAG } from './alltagswoerter';

const de = artikelListe('de'), en = artikelListe('en');
const top = (q: string, sp: 'de' | 'en', n = 3) => suche(sp === 'de' ? de : en, q, sp).slice(0, n).map(t => t.artikel.id);

/** [Anfrage in Alltagssprache, erwartete Artikel-id unter den ersten drei Treffern] */
const DE: [string, string][] = [
  ['wie stark hängen zwei dinge zusammen', 'frage-zusammenhang'],
  ['sind meine gruppen verschieden', 'frage-gruppen'],
  ['zufall oder echt', 'p-wert'],
  ['passen meine fragen zusammen', 'reliabilitaet'],
  ['wie viele personen brauche ich', 'power'],
  ['werte die aus der reihe tanzen', 'ausreisser'],
  ['ja nein vorhersagen', 'logistische-regression'],
  ['vorher nachher', 'frage-praepost'],
  ['welcher test', 'blatt-seite'],
  ['ist mein ergebnis nur zufall', 'p-wert'],
  ['wie sicher ist mein ergebnis', 'konfidenzintervall'],
  ['wie groß ist der unterschied wirklich', 'effektstaerke'],
  ['ist mein ergebnis praktisch bedeutsam', 'effektstaerke'],
  ['was ist der durchschnitt', 'mittelwert'],
  ['wie sehr schwanken die werte', 'standardabweichung'],
  ['ist die glockenkurve erfüllt', 'normalverteilung-pruefen'],
  ['meine daten sind nicht normal verteilt', 'rangtest'],
  ['alternative zum t-test bei schiefen daten', 'rangtest'],
  ['mehrmals gemessen wie verändert es sich', 'frage-messwiederholung'],
  ['wirkt die schulung bei den teilnehmern', 'frage-praepost'],
  ['was beeinflusst die note', 'frage-vorhersage'],
  ['wie viel erklärt mein modell', 'r-quadrat'],
  ['welcher einfluss ist am größten', 'beta'],
  ['wie wahrscheinlich ist bestanden oder durchgefallen', 'logistische-regression'],
  ['wirkt der einfluss über einen zwischenschritt', 'frage-mediation'],
  ['gilt der zusammenhang nur für manche personen', 'frage-moderation'],
  ['schüler in klassen verschachtelt', 'frage-mehrebenen'],
  ['mehrere studien zusammenfassen', 'frage-meta'],
  ['wie lange dauert es bis zum rückfall', 'frage-kaplanmeier'],
  ['welche fragen gehören zusammen', 'frage-faktor'],
  ['sind sich zwei beurteiler einig', 'frage-uebereinstimmung'],
  ['zwei messgeräte vergleichen', 'bland-altman'],
  ['gibt es typen in meinen daten', 'frage-cluster'],
  ['wie geht es in den nächsten monaten weiter', 'zeitreihe-prognose'],
  ['entwicklung über die zeit', 'frage-zeitreihen'],
  ['antworten mit mehreren kreuzen', 'frage-mehrfachantworten'],
  ['freitext antworten sortieren', 'frage-kategorien'],
  ['excel datei laden', 'daten-oeffnen'],
  ['fehlende werte in meinen daten', 'keine-angabe-bereich'],
  ['neue variable berechnen', 'daten-vorbereiten'],
  ['altersgruppen bilden', 'klassen-bilden'],
  ['ergebnis als word speichern', 'bericht-seite'],
  ['wie schreibe ich das ergebnis auf', 'ergebnissatz'],
  ['wie zitiere ich statable', 'statable-zitieren'],
  ['funktioniert es ohne internet', 'installieren-offline'],
  ['wo werden meine daten gespeichert', 'datenschutz-projekt'],
  ['wo finde ich das menü von spss', 'spss-menue'],
  ['welche gruppen unterscheiden sich genau', 'frage-posthoc'],
  ['dritten faktor herausrechnen', 'frage-partialkorrelation'],
  ['zwei faktoren gleichzeitig', 'zweifaktorielle-varianzanalyse'],
  ['kinder mit gleichem startwert vergleichen', 'kovarianzanalyse'],
  ['wie ungleich ist das einkommen', 'frage-armut'],
  ['schwellenwert für einen test finden', 'roc-kurve'],
  ['wie viele muss man behandeln', 'nnt'],
  ['ist es gleichwertig', 'aequivalenztest-tost'],
  ['zufällig zuteilen', 'verstehen-zuteilung'],
  ['anzahl unfälle vorhersagen', 'zaehldaten-regression'],
  ['noten vorhersagen', 'ordinale-regression'],
  ['welche frage passt schlecht zur skala', 'trennschaerfe'],
  ['hat sich eine einzelne person wirklich verbessert', 'reliable-change-index'],
  ['kommt etwas in gruppen unterschiedlich oft vor', 'frage-kreuz'],
  ['daten auf fehler prüfen', 'daten-check'],
  ['breit in lang umwandeln', 'umstrukturieren'],
  ['tastenkürzel', 'tastatur'],
  ['wie sicher ist die schätzung', 'konfidenzintervall']
];
const EN: [string, string][] = [
  ['how strongly are two things related', 'frage-zusammenhang'],
  ['are my groups different', 'frage-gruppen'],
  ['is it chance or real', 'p-wert'],
  ['do my questions fit together', 'reliabilitaet'],
  ['how many people do I need', 'power'],
  ['values that stand out', 'ausreisser'],
  ['predict yes or no', 'logistische-regression'],
  ['before and after', 'frage-praepost'],
  ['which test should I use', 'blatt-seite'],
  ['how certain is my estimate', 'konfidenzintervall'],
  ['is the difference practically meaningful', 'effektstaerke'],
  ['what is the average', 'mittelwert'],
  ['my data are not normal', 'rangtest'],
  ['measured several times over time', 'frage-messwiederholung'],
  ['what influences the grade', 'frage-vorhersage'],
  ['why does the effect work through an intermediate step', 'frage-mediation'],
  ['pupils nested in classes', 'frage-mehrebenen'],
  ['combine several studies', 'frage-meta'],
  ['how long until the event', 'frage-kaplanmeier'],
  ['which questions belong together', 'frage-faktor'],
  ['do two raters agree', 'frage-uebereinstimmung'],
  ['forecast the next months', 'zeitreihe-prognose'],
  ['sort free text answers', 'frage-kategorien'],
  ['open an excel file', 'daten-oeffnen'],
  ['missing values in my data', 'keine-angabe-bereich'],
  ['save the result as word', 'bericht-seite'],
  ['does it work without internet', 'installieren-offline'],
  ['where is my data stored', 'datenschutz-projekt'],
  ['where is the spss menu', 'spss-menue'],
  ['income inequality', 'frage-armut']
];

describe('Suche in Alltagssprache (Alltagswörter, Fragen)', () => {
  it('mindestens 60 Anfragen, etwa zwei Drittel Deutsch', () => {
    expect(DE.length + EN.length).toBeGreaterThanOrEqual(60);
    expect(DE.length / (DE.length + EN.length)).toBeGreaterThan(0.6);
  });
  for (const [q, id] of DE) it(`de: „${q}“ → ${id}`, () => { expect(top(q, 'de')).toContain(id); });
  for (const [q, id] of EN) it(`en: „${q}“ → ${id}`, () => { expect(top(q, 'en')).toContain(id); });

  it('jede Alltag-id gibt es als Artikel', () => {
    const alle = new Set(de.map(a => a.id));
    expect(ALLTAG.filter(x => !alle.has(x.id)).map(x => x.id)).toEqual([]);
    expect(new Set(ALLTAG.map(x => x.id)).size).toBe(ALLTAG.length);
  });
});

describe('Fachbegriffe bleiben an erster Stelle (Gegenproben)', () => {
  const erste = (q: string, sp: 'de' | 'en' = 'de') => top(q, sp, 1)[0];
  it('Cronbach', () => { expect(top('Cronbach', 'de', 2)).toContain('reliabilitaet'); expect(erste('Cronbachs Alpha')).toMatch(/reliabilitaet|frage-skala/); });
  it('t-Test', () => { expect(top('t-Test', 'de', 2)).toContain('frage-gruppen'); expect(top('t-Test', 'en', 2)).toContain('frage-gruppen'); });
  it('Kaplan-Meier', () => { expect(erste('Kaplan-Meier')).toMatch(/kaplan/); expect(erste('Kaplan Meier', 'en')).toMatch(/kaplan/); });
  it('Mittelwert, Konfidenzintervall, p-Wert, Korrelation', () => {
    expect(erste('Mittelwert')).toBe('mittelwert');
    expect(erste('Konfidenzintervall')).toBe('konfidenzintervall');
    expect(erste('p-Wert')).toBe('p-wert');
    expect(erste('Korrelation')).toBe('korrelation');
  });
  it('Fachbegriffe in Mehrwortform ohne Füllwörter', () => {
    expect(erste('logistische Regression')).toBe('logistische-regression');
    expect(erste('Odds Ratio')).toBe('odds-ratio');
  });
  it('ein unbekanntes Zusatzwort bei zwei Suchwörtern bleibt UND (kein Rauschen)', () => { expect(suche(de, 'Mittelwert Zebrafisch', 'de')).toEqual([]); });
});

describe('Füllwörter, Reihenfolge, Hinweis, Vorschläge', () => {
  it('Füllwörter fallen in Deutsch und Englisch weg, in anderen Sprachen nicht', () => {
    expect(suchwoerter('Wie ist das Das mit der Korrelation', 'de')).toEqual(['korrelation']);
    expect(suchwoerter('what is the correlation', 'en')).toEqual(['correlation']);
    expect(suchwoerter('wie ist das', 'de')).toEqual(['wie', 'ist', 'das']);
    expect(suchwoerter('wie ist die Korrelation', 'pl')).toEqual(['wie', 'ist', 'die', 'korrelation']);
  });
  it('Treffer mit allen Wörtern stehen vor Treffern mit weniger', () => {
    const r = suche(de, 'zufall oder echt signifikant gruppen', 'de');
    expect(r.length).toBeGreaterThan(3);
    const k = r.slice(0, 3).map(t => t.artikel.id);
    expect(k.includes('p-wert') || k.includes('signifikanz')).toBe(true);
  });
  it('Hinweis „Fachbegriff“ nur, wenn ein Alltagswort getroffen hat', () => {
    const r = suche(de, 'wie stark hängen zwei dinge zusammen', 'de');
    expect(r.find(t => t.artikel.id === 'korrelation')?.fach).toBe('Korrelation');
    const z = suche(de, 'zufall oder echt', 'de').find(t => t.artikel.id === 'p-wert');
    expect(z?.fach).toBe('p-Wert');
    expect(suche(de, 'Korrelation', 'de')[0]!.fach).toBeUndefined();
    expect(suche(de, 'Korrelation')[0]!.fach).toBeUndefined();
  });
  it('Ohne Sprachangabe wirken Alltagswörter nicht', () => { expect(suche(de, 'glockenkurve').find(t => t.artikel.id === 'normalverteilung-pruefen')).toBeUndefined(); });
});
