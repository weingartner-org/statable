/**
 * Stufe A2: Joint Displays und Verknüpfung (auf dem Server gerendert, wie die anderen Oberflächentests; hier gibt es keine DOM-Umgebung).
 * Änderungen laufen über `aendere()` im Entwurfsprojekt (`ersetzeQualProjekt`), danach wird neu gerendert: so prüfen wir den Speicherweg der Knöpfe.
 * Geprüft: echte Tabelle mit caption und Köpfen, Zahl vor Zitat, nie ein automatisch gewähltes Zitat, Beschriftungen der Bedienelemente, Sätze bei fehlenden Angaben.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { readFileSync } from 'node:fs';
import { s } from '../lib/sitzung.svelte';
import { pruefeQualProjekt, type QualProjekt } from '../lib/qualprojekt';
import { aendere } from '../lib/kodieren.svelte';
import { ersetzeQualProjekt, qualProjekt } from '../lib/interviews.svelte';
import { umfrageDaten } from '../lib/mixed-beispiel';
import { aendereJd, jdAufbau, legeJdAn, setzeBeleg, setzeJdZahlen, setzeVerknuepfung, spaltenErgebnis, type DatenSicht } from '../lib/mixed';
import JointDisplays from './JointDisplays.svelte';
import MmVerknuepfung from './MmVerknuepfung.svelte';

s.einst.sprache = 'de'; s.einst.anrede = 'sie';
const html = (c: unknown, props: Record<string, unknown>) => (render(c as never, { props: props as never }).body as string).replace(/ ?svelte-\w+/g, '').replace(/ class=""/g, '');
const lies = (n: string) => readFileSync(new URL(`../../public/beispiel/mixed/${n}`, import.meta.url), 'utf8');

const daten: DatenSicht = (() => { const d = umfrageDaten(lies('umfrage.csv')); return { spalten: d.spalten, zeilen: d.zeilen } as unknown as DatenSicht; })();
const aktuell = (): QualProjekt => qualProjekt()!;
const varId = (n: string) => aktuell().variablen.find(v => v.name === n)!.id;
const themenIds = () => (aktuell().themen ?? []).map(t => t.id);

beforeEach(() => {
  ersetzeQualProjekt(pruefeQualProjekt(JSON.parse(lies('hilfe-projekt.json'))));
});

function anlegen(art: Parameters<typeof legeJdAn>[1], name: string): string {
  let id = '';
  aendere('zurück', q0 => { const r = legeJdAn(q0, art, name); id = r.id; return r.q; });
  return id;
}
function einrichten(id: string) {
  aendere('zurück', q0 => aendereJd(q0, id, j => ({ ...j, gruppierung: { quelle: 'variable', id: varId('first_generation') }, zeilen: themenIds().slice(0, 2).map(t => ({ art: 'thema' as const, id: t })) })));
}
const joint = (): string => html(JointDisplays, { q: aktuell(), daten });

describe('Joint Displays: ohne Display und Anlegen', () => {
  it('Satz, Formular mit Art als Optionsfelder in fieldset mit legend, Name mit Label', () => {
    const h = joint();
    expect(h).toContain('Es gibt noch kein Joint Display.');
    expect(h).toContain('<legend>Neues Joint Display</legend>');
    expect(h).toContain('<legend>Art</legend>');
    expect((h.match(/type="radio"/g) ?? []).length).toBe(3);
    for (const t of ['Themen oder Codes nach Gruppen', 'Zahlen nach qualitativen Gruppen (Typologietabelle)', 'Seite an Seite']) expect(h).toContain(t);
    expect(h).toMatch(/<label for="ko-mm-jd-neu-name">Name<\/label>/);
    expect(h).toContain('Joint Display anlegen');
    expect(h).not.toContain('<table');
  });
});

describe('Joint Displays: Tabelle Themen nach Gruppen', () => {
  it('echte Tabelle: caption, Spaltenköpfe mit n, Zeilenköpfe, Passung und Meta-Inferenz', () => {
    const id = anlegen('qual-nach-gruppen', 'Themen nach Erstakademiker');
    einrichten(id);
    const h = joint();
    expect(h).toContain('<table');
    expect(h).toMatch(/<caption[^>]*>Themen nach Erstakademiker \(Themen oder Codes nach Gruppen/);
    expect(h).toMatch(/<th scope="col">Thema oder Code<\/th>/);
    expect(h).toMatch(/<th scope="col"[^>]*>no \(n = \d+\)<\/th>/);
    expect(h).toMatch(/<th scope="col"[^>]*>yes \(n = \d+\)<\/th>/);
    expect(h).toContain('<th scope="col">Passung</th>');
    expect(h).toContain('<th scope="col">Meta-Inferenz</th>');
    expect((h.match(/<th scope="row"/g) ?? []).length).toBe(2);
    expect(h).toMatch(/\d+ von \d+ (Fall|Fällen)/);
    expect(h).toMatch(/<div class="rahmen" role="region" tabindex="0" aria-label="Joint Display Themen nach Erstakademiker, seitlich scrollbar">/);
    expect(h).toContain('Statable zählt nur; ob Zahlen und Aussagen zusammenpassen, entscheiden Sie.');
    expect(h).toContain('Die Fälle sind wenige und gezielt ausgewählt');
    expect(h).toContain('Als Word speichern'); expect(h).toContain('Als HTML speichern');
  });

  it('Bedienelemente in Zellen nennen Zeile und Spalte', () => {
    einrichten(anlegen('qual-nach-gruppen', 'T'));
    const h = joint();
    const name = (aktuell().themen ?? [])[0]!.name;
    expect(h).toContain(`aria-label="Belegstelle wählen für Thema: ${name}, yes (`);
    expect(h).toContain(`aria-label="Passung für Thema: ${name}"`);
    expect(h).toContain(`aria-label="Meta-Inferenz für Thema: ${name}"`);
    expect(h).toMatch(/<option value=""[^>]*>keine<\/option>/);
    expect(h).not.toMatch(/outline:\s*none/);
  });

  it('ohne Wahl steht kein Zitat; nach der Wahl Zahl, dann Zitat mit Quelle; „keine“ nimmt es wieder weg', () => {
    const id = anlegen('qual-nach-gruppen', 'T');
    einrichten(id);
    expect(joint()).not.toContain('<blockquote');
    const j = aktuell().jointDisplays!.find(x => x.id === id)!;
    const a = jdAufbau(aktuell(), j, { daten });
    const z = a.zeilen[0]!, zelle = z.zellen.find(c => c.kandidaten?.length)!;
    expect(zelle.beleg).toBeUndefined();   // nie automatisch gewählt
    aendere('zurück', q0 => setzeBeleg(q0, id, z.schluessel, zelle.gruppe!, zelle.kandidaten![0]!));
    const nach = jdAufbau(aktuell(), aktuell().jointDisplays!.find(x => x.id === id)!, { daten }).zeilen[0]!.zellen.find(c => c.beleg)!.beleg!;
    const h = joint();
    expect(h).toContain('<blockquote');
    expect(h).toContain(nach.quelle);
    expect(h.indexOf(zelle.text)).toBeLessThan(h.indexOf('<blockquote'));
    expect(h).toContain(`<option value="${nach.segment}" selected`);
    aendere('zurück', q0 => setzeBeleg(q0, id, z.schluessel, zelle.gruppe!, null));
    expect(joint()).not.toContain('<blockquote');
  });

  it('zwei Displays: Auswahl mit Label; Gruppierung als Auswahl mit der gewählten Fallvariable', () => {
    einrichten(anlegen('qual-nach-gruppen', 'Erstes'));
    anlegen('seite-an-seite', 'Zweites');
    const h = joint();
    expect(h).toMatch(/<label for="ko-mm-jd-wahl">Joint Display<\/label>/);
    expect(h).toContain('Erstes (Themen oder Codes');
    expect(h).toContain('Zweites (Seite an Seite');
    expect(h).toContain(`<option value="variable:${varId('first_generation')}" selected`);
  });

  it('Zeilen: Codes und Themen als Kästchen in fieldset; gewählte Themen angehakt', () => {
    einrichten(anlegen('qual-nach-gruppen', 'T'));
    const h = joint();
    expect(h).toContain('<legend>Zeilen: Codes und Themen</legend>');
    expect(h).toMatch(/<input type="checkbox" checked[^>]*><span[^>]*>Thema: /);
    expect(h).toMatch(/Code: A Barriers/);
  });
});

describe('Joint Displays: was fehlt', () => {
  it('ohne Gruppierung und Zeilen: Sätze; ohne Verknüpfung bei Zahlen: Satz mit Sprungknopf', () => {
    anlegen('qual-nach-gruppen', 'Leer');
    let h = joint();
    expect(h).toContain('Was noch fehlt');
    expect(h).toContain('Wählen Sie, wonach die Gruppen gebildet werden.');
    expect(h).toContain('Wählen Sie mindestens einen Code oder ein Thema für die Zeilen.');
    expect(h).toContain('Die Tabelle erscheint, sobald oben alles gewählt ist.');
    expect(h).not.toContain('<table');
    anlegen('zahlen-nach-qual', 'Zahlen');
    aendere('zurück', q0 => aendereJd(q0, q0.jointDisplays![1]!.id, x => x));
    h = html(JointDisplays, { q: aktuell(), daten });
    // das zweite Display ist nicht gewählt: der Satz zur Verknüpfung erscheint erst nach Auswahl (ersten Eintrag prüfen: gleiche Art ohne Sprung)
    expect(h).not.toContain('Zur Verknüpfung');
  });

  it('Zahlen nach qualitativen Gruppen ohne Verknüpfung: „noch nicht verknüpft“ mit Knopf „Zur Verknüpfung“', () => {
    anlegen('zahlen-nach-qual', 'Zahlen');
    const h = joint();
    expect(h).toContain('Die Fälle sind noch nicht mit dem Datensatz verknüpft.');
    expect(h).toContain('Zur Verknüpfung');
    expect(h).toContain('Wählen Sie mindestens eine Spalte des Datensatzes.');
    expect(h).toContain('<legend>Spalten des Datensatzes (Kennwerte je Gruppe)</legend>');
  });

  it('Zahlen nach qualitativen Gruppen mit Verknüpfung, Typologie über Fallvariable: Zeilenköpfe „Gruppe“, Kennwerte', () => {
    aendere('zurück', q0 => setzeVerknuepfung(q0, { variable: varId('survey_id'), spalte: 'survey_id' }));
    const id = anlegen('zahlen-nach-qual', 'Zahlen');
    aendere('zurück', q0 => aendereJd(q0, id, j => ({ ...j, gruppierung: { quelle: 'variable', id: varId('first_generation') }, spalten: ['gpa_first_term'] })));
    const h = joint();
    expect(h).toMatch(/<th scope="col">Gruppe<\/th>/);
    expect(h).toMatch(/Grade point average, first term \(higher = better\) \(gpa_first_term\)/);
    expect(h).toMatch(/M = [\d,]+/);
    expect(h).not.toContain('Belegstelle wählen');
    expect(h).toContain('Passung für ');
  });
});

describe('Joint Displays: Seite an Seite', () => {
  it('Textfeld mit Label, Spaltenauswahl und Knopf; Übernahme aus einer Spalte steht danach im Feld', () => {
    const id = anlegen('seite-an-seite', 'Nebeneinander');
    aendere('zurück', q0 => aendereJd(q0, id, j => ({ ...j, zeilen: themenIds().slice(0, 1).map(t => ({ art: 'thema' as const, id: t })) })));
    let h = joint();
    expect(h).toMatch(/<th scope="col"[^>]*>Ergebnis aus den Zahlen<\/th>/);
    expect(h).toMatch(/<th scope="col"[^>]*>Ergebnis aus den Interviews<\/th>/);
    expect(h).toMatch(/<label[^>]*for="ko-mm-jd-z-[^"]+"[^>]*>Ergebnis aus den Zahlen für Thema: /);
    expect(h).toContain('Aus einer Spalte übernehmen');
    expect(h).toContain('<textarea');
    expect(h).not.toContain('Gruppierung');
    const text = spaltenErgebnis(daten, 'gpa_first_term')!;
    const schl = jdAufbau(aktuell(), aktuell().jointDisplays![0]!, { daten }).zeilen[0]!.schluessel;
    aendere('zurück', q0 => setzeJdZahlen(q0, id, schl, text));
    h = joint();
    expect(h).toContain('gpa_first_term');
    expect(h).toMatch(/<textarea[^>]*>[^<]*gpa_first_term/);
  });
});

describe('Verknüpfung', () => {
  const vk = (d: DatenSicht = daten) => html(MmVerknuepfung, { q: aktuell(), daten: d });

  it('ohne Verknüpfung: zwei Auswahlfelder mit Label, gleiche Namen vorausgewählt (survey_id), kein Ergebnis', () => {
    const h = vk();
    expect(h).toMatch(/<label for="ko-mm-vk-var">Fallvariable der Interviews<\/label>/);
    expect(h).toMatch(/<label for="ko-mm-vk-sp">Spalte im Datensatz<\/label>/);
    expect(h).toContain(`<option value="${varId('survey_id')}" selected`);
    expect(h).toMatch(/<option value="survey_id" selected[^>]*>Number in the survey \(survey_id\)<\/option>/);
    expect(h).toContain('Vorausgewählt, weil beide');
    expect(h).toContain('>Verknüpfen<');
    expect(h).not.toContain('Verknüpfung lösen');
    expect(h).not.toContain('Ergebnis der Verknüpfung');
    expect(aktuell().verknuepfung).toBeUndefined();   // Voreinstellung wird nie gespeichert
  });

  it('mit Verknüpfung: „5 von 5 Fällen verknüpft“, Tabelle in details, Knopf „Verknüpfung lösen“', () => {
    aendere('zurück', q0 => setzeVerknuepfung(q0, { variable: varId('survey_id'), spalte: 'survey_id' }));
    const h = vk();
    expect(h).toContain('5 von 5 Fällen verknüpft.');
    expect(h).toContain('Verknüpfung lösen');
    expect(h).toContain('<details');
    expect(h).toMatch(/<th scope="col">Fall<\/th><th scope="col">Wert<\/th><th scope="col">Zeile im Datensatz<\/th>/);
    expect((h.match(/<th scope="row"/g) ?? []).length).toBe(5);
    expect(h).not.toContain('Ohne Treffer');
    expect(h).toMatch(/role="region" tabindex="0" aria-label="Verknüpfung je Fall, seitlich scrollbar"/);
  });

  it('Probleme als Liste mit Fallnamen (Wert ohne Treffer)', () => {
    const q0 = aktuell();
    const f = q0.faelle[0]!;
    ersetzeQualProjekt({ ...q0, faelle: q0.faelle.map(x => (x.id === f.id ? { ...x, werte: { ...x.werte, [varId('survey_id')]: 'S99' } } : x)) });
    aendere('zurück', q => setzeVerknuepfung(q, { variable: varId('survey_id'), spalte: 'survey_id' }));
    const h = vk();
    expect(h).toContain('4 von 5 Fällen verknüpft.');
    expect(h).toMatch(/<ul[^>]*aria-labelledby="ko-mm-vk-erg-t"/);
    expect(h).toContain(`Ohne Treffer im Datensatz: ${f.name}.`);
  });

  it('ohne Datensatz: Satz statt der zweiten Auswahl; ohne Fallvariablen: Satz', () => {
    const h = vk({ spalten: [], zeilen: [] });
    expect(h).toContain('Öffnen Sie zuerst Daten');
    expect(h).not.toContain('ko-mm-vk-sp');
    ersetzeQualProjekt({ ...aktuell(), variablen: [] });
    expect(vk()).toContain('Es gibt noch keine Fallvariablen.');
  });
});
