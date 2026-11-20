import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/welle4-erwartet.json';
import {
  baueFaelle, benenne, bildeGruppen, entmarkiere, gruppeJeFall, kennwerte, leererZustand, loescheGruppe, markiere, markierungen, median, neueGruppe, notiere, qArt, sortiere,
  teile, teilungInfo, verschiebe, zelleInStuecken, zitateDerGruppe,
  type Faelle, type Kenn, type RohSpalte, type Wert
} from './faelle';

/*
 * ROTE TESTS Welle 4, G1 „Fälle vergleichen“ (Prüfer). Der Bauer darf diese Datei NICHT ändern; sie wird grün, wenn app/src/lib/faelle.ts die unten festgelegte API liefert.
 * Sollwerte: scripts/welle4-erwartet.R → testdaten/welle4-erwartet.json (g1.faelle). Fachblatt docs/fachblaetter/WELLE4-FAELLE-OFFENE-ANTWORTEN.md (mit Nachtrag).
 * Ausgangspunkt: Zweig `bau` (`git show bau:app/src/lib/faelle.ts`). Dort übernehmen: baueFaelle, median, bildeGruppen, gruppeJeFall, Markierungen (markiere/entmarkiere/markierungen/zelleInStuecken/zitateDerGruppe),
 * verschiebe, neueGruppe, loescheGruppe, benenne, notiere, teile, sortiere, uebernimm (Zustand bleibt über die Kennung erhalten). Reine Logik, kein PSPP.
 *
 * API (alles aus './faelle'):
 *   type Wert = string | number | null
 *   interface RohSpalte { name; bezeichnung; art: 'zahl'|'text'|'datum'; fehlend: number[]; werteLabels: Record<string,string>; niveau?: string }
 *   baueFaelle(spalten: RohSpalte[], zeilen: Wert[][], wahl: { kennung: string; q: string[]; t: string[] }, bisher?: FaelleZustand): Faelle
 *        Faelle = { kennung; q: QSpalte[]; t: TSpalte[]; faelle: Fall[]; zeilen; ausgelassen; zustand }, Fall = { schluessel; kennung; zeile; q: Wert[]; t: string[] }
 *        Zeilen ohne jede Angabe in den gewählten Spalten fallen weg und werden in `ausgelassen` gezählt. Schlüssel = Kennung, sonst Zeilennummer.
 *   qArt(sp: Pick<RohSpalte,'art'|'niveau'|'werteLabels'>, verschieden: number): 'zahl' | 'gruppe'
 *        ÄNDERUNG gegen bau: Text, genau 2 verschiedene Werte oder beschriftete nominale Zahl = 'gruppe'; 0 oder 1 verschiedener Wert (Zahl) bleibt 'zahl' (keine Teilung, aber Kennwerte).
 *   median(w: number[]): number
 *   teilungInfo(e: Faelle, spalte: string): TeilungInfo | null     (null für Gruppenspalten)
 *        TeilungInfo = { modus: 'median'|'eigen'|'keine'; verschieden; nGueltig; median: number|null; schwelle: number|null; schwelleText: string|null  (2 Stellen, deutsches Komma, ohne Endnullen: „3“, „3,25“),
 *                        nUnter; nGleich; nUeber; nBis; bindungenAmMedian: boolean (nGleich >= 2); klassen: string[] }      (bei 'keine' sind die Zahlen/Listen leer bzw. null)
 *   teile(e: Faelle, spalte: string, t: { modus: 'median'|'eigen'; wert?: number }): void       eigene Schwelle: ebenfalls „bis einschließlich“
 *   bildeGruppen(e: Faelle): Gruppe[]
 *        Gruppe = { id; name; grundname; eigenerName; vorschlag: boolean; notiz; mitglieder: number[] (Stellen in e.faelle); fehlendBei: string[] (Bezeichnungen der Spalten ohne Wert, sonst []) }
 *        Reihenfolge: reguläre Gruppen nach Klassennummern (erste Spalte zuerst), dann „ohne Angabe bei …“ (erst eine fehlende Spalte, dann zwei), dann selbst angelegte.
 *        Namen: Zahl „<Bezeichnung> bis <s>“ / „<Bezeichnung> über <s>“, Gruppenspalte „<Bezeichnung>: <Label>“, mit „ · “ verbunden; Spalte ohne Teilung hat KEINEN Namensteil;
 *        Fall mit fehlendem Wert in einer Gruppierungsspalte → Gruppe „ohne Angabe bei A“ / „… bei A und B“ (kein weiteres Aufteilen). Leere vorgeschlagene Gruppen erscheinen nicht.
 *   gruppeJeFall(e: Faelle, gruppen?: Gruppe[]): Map<string, string>        Schlüssel des Falls → Gruppen-id
 *   kennwerte(e: Faelle, stellen: number[]): Kenn[]                          je gewählter Zahlen-/Gruppenspalte, in Spaltenreihenfolge
 *        KennZahl   = { art:'zahl'; spalte; n; fehlend; mean|null; sd|null (n − 1, null bei n < 2); median|null; min|null; max|null }
 *        KennGruppe = { art:'gruppe'; spalte; n; fehlend; stufen: { wert; name; n; prozent|null }[] }   (alle Stufen der ganzen Spalte, auch n = 0; Prozent 0-100, Basis: Fälle der Stellen mit Angabe)
 *   verschiebe(e, fallSchluessel, zielId) / neueGruppe(e, name?) → id / loescheGruppe(e, id) / benenne(e, id, name) / notiere(e, id, text)   (wie bau; ändert e.zustand)
 *   markiere(e, fallSchluessel, textspalte, von, bis) / entmarkiere(e, fall, spalte, stelle) / markierungen(e, fall, spalte): { von; bis; text }[] / zelleInStuecken(text, stellen) / zitateDerGruppe(e, gruppe)
 *   sortiere(e, stellen: number[], nach: SortSpalte | null, abwaerts: boolean, gruppeVon: (i: number) => string): number[]       Lücken am Ende, stabil
 *   leererZustand(): FaelleZustand
 * Zahlformat deutsch (Komma), Texte deutsch (Standardsprache der Tests).
 */

interface SollKennZahl { n: number; fehlend: number; mean: number | null; sd: number | null; median: number | null; min: number | null; max: number | null }
interface SollKennGruppe { n: number; fehlend: number; stufen: { wert: number; label: string; n: number; prozent: number | null }[] }
interface SollGruppe { name: string; fehlend_in: string[]; n: number; mitglieder: string[]; kennwerte: Record<string, SollKennZahl | SollKennGruppe> }
interface SollTeilung { spalte: string; modus: string; verschieden: number; n_gueltig: number; median: number | null; schwelle: number | null; schwelle_text: string | null; n_unter?: number; n_gleich?: number; n_ueber?: number; n_bis?: number; bindungen_am_median?: boolean; klassen?: string[]; klasse_n?: number[] }
interface SollFall {
  name: string; n_faelle: number; eigene_schwellen: Record<string, number> | never[];
  spalten: { name: string; bezeichnung: string; art: 'zahl' | 'gruppe'; labels: { wert: number; label: string }[] }[];
  daten: Record<string, (string | number | null)[]>;
  teilung: SollTeilung[]; gruppen: SollGruppe[]; gesamt: Record<string, SollKennZahl | SollKennGruppe>;
}
const faelleSoll = (erwartet as unknown as { g1: { faelle: SollFall[] } }).g1.faelle;
const soll = (n: string) => faelleSoll.find(f => f.name === n)!;

const nah = (ist: number | null | undefined, s: number | null, was: string, tol = 1e-9) => {
  if (s === null) { expect(ist, was).toBeNull(); return; }
  expect(ist, was).toBeTypeOf('number');
  expect(Math.abs(ist! - s), `${was}: ${ist} gegen ${s}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(s)));
};

/** Eine Textspalte für die Zitate (nicht aus dem JSON): ein Satz je Fall, mit Leerraum am Rand der zweiten Hälfte. */
const zitatText = (k: string) => `Das sagt ${k} im Interview. Zweiter Satz mit mehr Inhalt, dritter Teil.`;

function rohspalten(f: SollFall): RohSpalte[] {
  const q: RohSpalte[] = f.spalten.map(s => ({
    name: s.name, bezeichnung: s.bezeichnung, art: 'zahl', fehlend: [],
    werteLabels: Object.fromEntries(s.labels.map(l => [String(l.wert), l.label])), niveau: s.art === 'gruppe' && s.labels.length ? 'nominal' : 'metrisch'
  }));
  return [{ name: 'kennung', bezeichnung: 'Kennung', art: 'text', fehlend: [], werteLabels: {} }, ...q, { name: 'interview', bezeichnung: 'Interview', art: 'text', fehlend: [], werteLabels: {} }];
}
function zeilen(f: SollFall): Wert[][] {
  const kn = f.daten.kennung as string[];
  return kn.map((k, i) => [k, ...f.spalten.map(s => f.daten[s.name]![i] as Wert), zitatText(k)]);
}
function bauen(f: SollFall, mitKennung = true): Faelle {
  const e = baueFaelle(rohspalten(f), zeilen(f), { kennung: mitKennung ? 'kennung' : '', q: f.spalten.map(s => s.name), t: ['interview'] });
  for (const [sp, wert] of Object.entries(f.eigene_schwellen)) teile(e, sp, { modus: 'eigen', wert: wert as number });
  return e;
}
const gruppeMitName = (e: Faelle, name: string) => bildeGruppen(e).find(g => g.name === name)!;
const kennungen = (e: Faelle, stellen: number[]) => stellen.map(i => e.faelle[i]!.kennung).sort();

function pruefeKenn(ist: Kenn[], s: Record<string, SollKennZahl | SollKennGruppe>, was: string) {
  expect(ist.map(k => k.spalte), `${was}: Spalten`).toEqual(Object.keys(s));
  for (const k of ist) {
    const z = s[k.spalte]!;
    expect(k.n, `${was} ${k.spalte} n`).toBe(z.n);
    expect(k.fehlend, `${was} ${k.spalte} fehlend`).toBe(z.fehlend);
    if ('stufen' in z) {
      expect(k.art).toBe('gruppe');
      if (k.art !== 'gruppe') continue;
      expect(k.stufen.map(x => x.wert), `${was} ${k.spalte} Stufen`).toEqual(z.stufen.map(x => x.wert));
      z.stufen.forEach((st, i) => {
        expect(k.stufen[i]!.name, `${was} ${k.spalte} Stufe ${st.wert} Name`).toBe(st.label);
        expect(k.stufen[i]!.n, `${was} ${k.spalte} Stufe ${st.wert} n`).toBe(st.n);
        nah(k.stufen[i]!.prozent, st.prozent, `${was} ${k.spalte} Stufe ${st.wert} Prozent`);
      });
    } else {
      expect(k.art).toBe('zahl');
      if (k.art !== 'zahl') continue;
      for (const f of ['mean', 'sd', 'median', 'min', 'max'] as const) nah(k[f], z[f], `${was} ${k.spalte} ${f}`);
    }
  }
}

describe('Hilfsfunktionen', () => {
  it('median: gerade Zahl = Mittel der beiden mittleren Werte, ungerade = mittlerer Wert, Bindungen', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([3, 3, 3, 1, 5])).toBe(3);
    expect(median([2.3, 2.7])).toBe(2.5);
  });
  it('qArt: Text, genau 2 Werte und beschriftete nominale Zahlen sind Gruppen; 0 oder 1 Wert und viele Werte sind Zahlen', () => {
    const z = { art: 'zahl' as const, niveau: 'metrisch', werteLabels: {} };
    expect(qArt(z, 11)).toBe('zahl');
    expect(qArt(z, 3)).toBe('zahl');
    expect(qArt(z, 2)).toBe('gruppe');
    expect(qArt(z, 1)).toBe('zahl');
    expect(qArt(z, 0)).toBe('zahl');
    expect(qArt({ art: 'text', niveau: 'nominal', werteLabels: {} }, 40)).toBe('gruppe');
    expect(qArt({ art: 'zahl', niveau: 'nominal', werteLabels: { '1': 'a', '2': 'b', '3': 'c' } }, 3)).toBe('gruppe');
  });
});

describe('G1 Sollwerte aus R: Spaltenarten, Teilung, Gruppen, Kennwerte', () => {
  for (const f of faelleSoll) {
    describe(f.name, () => {
      it('Spaltenarten wie im JSON; Zahl der Fälle', () => {
        const e = bauen(f);
        expect(e.faelle.length).toBe(f.n_faelle);
        expect(e.ausgelassen).toBe(0);
        expect(e.q.map(s => [s.name, s.art])).toEqual(f.spalten.map(s => [s.name, s.art]));
      });
      it('Teilung der Zahlenspalten: Modus, Median, Schwelle, Größen, Hinweis „Bindungen am Median“', () => {
        const e = bauen(f);
        for (const t of f.teilung) {
          const ist = teilungInfo(e, t.spalte)!;
          expect(ist, t.spalte).not.toBeNull();
          expect(ist.modus, `${t.spalte} Modus`).toBe(t.modus);
          expect(ist.verschieden, `${t.spalte} verschiedene Werte`).toBe(t.verschieden);
          expect(ist.nGueltig, `${t.spalte} n`).toBe(t.n_gueltig);
          nah(ist.median, t.median, `${t.spalte} Median`);
          nah(ist.schwelle, t.schwelle, `${t.spalte} Schwelle`);
          expect(ist.schwelleText, `${t.spalte} Schwellentext`).toBe(t.schwelle_text);
          if (t.modus === 'keine') { expect(ist.klassen).toEqual([]); continue; }
          expect([ist.nUnter, ist.nGleich, ist.nUeber, ist.nBis], `${t.spalte} Größen`).toEqual([t.n_unter, t.n_gleich, t.n_ueber, t.n_bis]);
          expect(ist.bindungenAmMedian, `${t.spalte} Hinweis`).toBe(t.bindungen_am_median);
          expect(ist.klassen, `${t.spalte} Klassen`).toEqual(t.klassen);
        }
      });
      it('Gruppenspalten haben keine Teilung (teilungInfo = null)', () => {
        const e = bauen(f);
        for (const s of f.spalten.filter(x => x.art === 'gruppe')) expect(teilungInfo(e, s.name), s.name).toBeNull();
      });
      it('Gruppen: Namen exakt und in der festgelegten Reihenfolge, nur nicht-leere, alle Fälle genau einmal', () => {
        const e = bauen(f);
        const g = bildeGruppen(e);
        expect(g.map(x => x.name)).toEqual(f.gruppen.map(x => x.name));
        expect(g.every(x => x.vorschlag && !x.eigenerName && x.notiz === '')).toBe(true);
        expect(g.flatMap(x => x.mitglieder).sort((a, b) => a - b)).toEqual(e.faelle.map((_, i) => i));
      });
      it('Gruppen: Mitglieder (Kennungen), n und fehlendBei', () => {
        const e = bauen(f);
        const g = bildeGruppen(e);
        f.gruppen.forEach((s, i) => {
          expect(kennungen(e, g[i]!.mitglieder), `${s.name} Mitglieder`).toEqual([...s.mitglieder].sort());
          expect(g[i]!.mitglieder.length, `${s.name} n`).toBe(s.n);
          expect(g[i]!.fehlendBei, `${s.name} fehlendBei`).toEqual(s.fehlend_in);
        });
      });
      it('Kennwerte je Gruppe (n, Mittelwert, SD mit n − 1, Median, Min, Max; Häufigkeiten mit Prozent) wie R, 1e-9', () => {
        const e = bauen(f);
        const g = bildeGruppen(e);
        f.gruppen.forEach((s, i) => pruefeKenn(kennwerte(e, g[i]!.mitglieder), s.kennwerte, `${f.name} / ${s.name}`));
      });
      it('Kennwerte über alle Fälle (Gesamt)', () => {
        const e = bauen(f);
        pruefeKenn(kennwerte(e, e.faelle.map((_, i) => i)), f.gesamt, `${f.name} / Gesamt`);
      });
    });
  }
});

describe('G1 festgelegte Randfälle (Entscheidungen des Prüfers)', () => {
  it('n = 1: SD ist null (nicht 0), Mittelwert/Median/Min/Max sind der Wert', () => {
    const e = bauen(soll('v_zwei_zahlen_eine_gruppe'));
    const g = gruppeMitName(e, 'Note bis 2 · Selbstwirksamkeit bis 3,5 · Schulform: Sekundar');
    expect(g.mitglieder.length).toBe(1);
    const k = kennwerte(e, g.mitglieder)[1]!;
    expect(k.art).toBe('zahl');
    if (k.art === 'zahl') { expect(k.sd).toBeNull(); expect(k.mean).toBe(3); expect(k.median).toBe(3); expect([k.min, k.max]).toEqual([3, 3]); }
  });
  it('Fachblatt-Beispiel: „Note bis 2 · Selbstwirksamkeit über 3,5“ steht im Gruppennamen (n = 4 mit Schulform Primar)', () => {
    const e = bauen(soll('v_zwei_zahlen_eine_gruppe'));
    expect(gruppeMitName(e, 'Note bis 2 · Selbstwirksamkeit über 3,5 · Schulform: Primar').mitglieder.length).toBe(4);
  });
  it('leere Kombinationen erscheinen nicht (v: 6 von 8)', () => {
    expect(bildeGruppen(bauen(soll('v_zwei_zahlen_eine_gruppe'))).length).toBe(6);
  });
  it('Median = Maximum: nur eine Gruppe; „über“ ist leer, der Hinweis hat beide Größen (9 und 0)', () => {
    const e = bauen(soll('iv_median_gleich_maximum'));
    expect(bildeGruppen(e).map(g => g.name)).toEqual(['Selbstwirksamkeit bis 4']);
    const t = teilungInfo(e, 'sw')!;
    expect([t.nBis, t.nUeber, t.nGleich, t.bindungenAmMedian]).toEqual([9, 0, 6, true]);
  });
  it('Spalte mit einem Wert: kein Namensteil, Kennwerte trotzdem (SD 0 bei n = 5)', () => {
    const e = bauen(soll('iv_spalte_ohne_variation'));
    expect(bildeGruppen(e).map(g => g.name)).toEqual(['Selbstwirksamkeit bis 3,25', 'Selbstwirksamkeit über 3,25']);
    const k = kennwerte(e, bildeGruppen(e)[0]!.mitglieder)[0]!;
    expect(k.art === 'zahl' && k.sd).toBe(0);
  });
  it('Anzeige der Schwelle ist auf zwei Stellen genau, der Vergleich läuft mit dem exakten Median', () => {
    const e = bauen(soll('iv_spalte_ohne_variation'));
    const t = teilungInfo(e, 'sw')!;
    expect(t.schwelle).toBe(3.25);
    expect(t.schwelleText).toBe('3,25');
  });
  it('eigene Schwelle: „bis einschließlich“, ein Datenwert genau auf der Schwelle gehört nach „bis“', () => {
    const e = bauen(soll('ii_eigene_schwelle'));
    expect(teilungInfo(e, 'sw')!.modus).toBe('eigen');
    const g = bildeGruppen(e);
    expect(g.map(x => [x.name, x.mitglieder.length])).toEqual([['Selbstwirksamkeit bis 3,4', 11], ['Selbstwirksamkeit über 3,4', 4]]);
  });
  it('zurück zur Medianteilung: teile(median) hebt die eigene Schwelle auf', () => {
    const e = bauen(soll('ii_eigene_schwelle'));
    teile(e, 'sw', { modus: 'median' });
    expect(bildeGruppen(e).map(x => x.name)).toEqual(['Selbstwirksamkeit bis 3', 'Selbstwirksamkeit über 3']);
  });
  it('Zeilen ohne jede Angabe in den gewählten Spalten fallen weg und werden gezählt', () => {
    const f = soll('iii_fehlende_werte');
    const z = zeilen(f); z.push(['X99', null, null, '']);
    const e = baueFaelle(rohspalten(f), z, { kennung: 'kennung', q: ['schulform', 'sw'], t: ['interview'] });
    expect(e.faelle.length).toBe(f.n_faelle);
    expect(e.ausgelassen).toBe(1);
    expect(e.zeilen).toBe(f.n_faelle + 1);
  });
});

describe('G1 Gruppen bearbeiten', () => {
  const V = 'v_zwei_zahlen_eine_gruppe';
  const QUELLE = 'Note über 2 · Selbstwirksamkeit bis 3,5 · Schulform: Sekundar';   // S08 S09 S10 S13 S14
  const ZIEL = 'Note bis 2 · Selbstwirksamkeit über 3,5 · Schulform: Sekundar';       // S01 S07
  const fall = (e: Faelle, k: string) => e.faelle.find(x => x.kennung === k)!;
  const mittel = (f: SollFall, ks: string[], sp: string) => { const v = ks.map(k => f.daten[sp]![(f.daten.kennung as string[]).indexOf(k)] as number); return v.reduce((a, b) => a + b, 0) / v.length; };
  const sdn = (f: SollFall, ks: string[], sp: string) => { const v = ks.map(k => f.daten[sp]![(f.daten.kennung as string[]).indexOf(k)] as number), m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };

  it('Verschieben: der Fall wechselt die Gruppe, beide Gruppen rechnen neu (n, Mittelwert, SD)', () => {
    const f = soll(V), e = bauen(f);
    const quelle = gruppeMitName(e, QUELLE), ziel = gruppeMitName(e, ZIEL);
    verschiebe(e, fall(e, 'S10').schluessel, ziel.id);
    const q2 = gruppeMitName(e, QUELLE), z2 = gruppeMitName(e, ZIEL);
    expect(kennungen(e, q2.mitglieder)).toEqual(['S08', 'S09', 'S13', 'S14']);
    expect(kennungen(e, z2.mitglieder)).toEqual(['S01', 'S07', 'S10']);
    expect(gruppeJeFall(e).get(fall(e, 'S10').schluessel)).toBe(ziel.id);
    const kq = kennwerte(e, q2.mitglieder)[0]!, kz = kennwerte(e, z2.mitglieder)[0]!;
    expect(kq.n).not.toBe(kennwerte(e, quelle.mitglieder)[0]!.n);
    if (kq.art === 'zahl' && kz.art === 'zahl') {
      nah(kq.mean, mittel(f, ['S08', 'S09', 'S13', 'S14'], 'note'), 'Quelle Mittelwert Note');
      nah(kq.sd, sdn(f, ['S08', 'S09', 'S13', 'S14'], 'note'), 'Quelle SD Note');
      nah(kz.mean, mittel(f, ['S01', 'S07', 'S10'], 'note'), 'Ziel Mittelwert Note');
      nah(kz.sd, sdn(f, ['S01', 'S07', 'S10'], 'note'), 'Ziel SD Note');
      expect(kz.n).toBe(3);
    }
    // die Gruppen werden nicht neu benannt: die vorgeschlagenen Namen bleiben
    expect(q2.vorschlag && z2.vorschlag).toBe(true);
  });
  it('Zurückschieben in die vorgeschlagene Gruppe hebt die Verschiebung auf', () => {
    const e = bauen(soll(V));
    const quelle = gruppeMitName(e, QUELLE), ziel = gruppeMitName(e, ZIEL);
    verschiebe(e, fall(e, 'S10').schluessel, ziel.id);
    verschiebe(e, fall(e, 'S10').schluessel, quelle.id);
    expect(Object.keys(e.zustand.zuordnung)).toEqual([]);
    expect(kennungen(e, gruppeMitName(e, QUELLE).mitglieder).length).toBe(5);
  });
  it('Einzelner Fall einer Gruppe verschoben: die leere vorgeschlagene Gruppe verschwindet', () => {
    const e = bauen(soll(V));
    const n0 = bildeGruppen(e).length;
    const einzel = gruppeMitName(e, 'Note über 2 · Selbstwirksamkeit über 3,5 · Schulform: Sekundar');   // S11 allein
    verschiebe(e, fall(e, 'S11').schluessel, gruppeMitName(e, ZIEL).id);
    expect(bildeGruppen(e).length).toBe(n0 - 1);
    expect(bildeGruppen(e).some(g => g.id === einzel.id)).toBe(false);
  });
  it('Umbenennen: eigener Name, Grundname bleibt; leerer Name stellt den Vorschlag wieder her', () => {
    const e = bauen(soll(V));
    const g = gruppeMitName(e, ZIEL);
    benenne(e, g.id, 'Zögerliche Planer');
    const neu = bildeGruppen(e).find(x => x.id === g.id)!;
    expect([neu.name, neu.grundname, neu.eigenerName]).toEqual(['Zögerliche Planer', ZIEL, true]);
    benenne(e, g.id, '');
    const zurueck = bildeGruppen(e).find(x => x.id === g.id)!;
    expect([zurueck.name, zurueck.eigenerName]).toEqual([ZIEL, false]);
  });
  it('Notiz je Gruppe', () => {
    const e = bauen(soll(V)), g = gruppeMitName(e, ZIEL);
    notiere(e, g.id, 'Hypothese: viel Planung, wenig Zutrauen');
    expect(bildeGruppen(e).find(x => x.id === g.id)!.notiz).toBe('Hypothese: viel Planung, wenig Zutrauen');
    notiere(e, g.id, '  ');
    expect(bildeGruppen(e).find(x => x.id === g.id)!.notiz).toBe('');
  });
  it('Neue Gruppe anlegen (leer, nach den vorgeschlagenen), Fall hineinschieben, leere Gruppe löschen', () => {
    const e = bauen(soll(V));
    const n0 = bildeGruppen(e).length;
    const id = neueGruppe(e, 'Sonderfälle');
    let g = bildeGruppen(e);
    expect(g.length).toBe(n0 + 1);
    expect(g.at(-1)!.id).toBe(id);
    expect([g.at(-1)!.name, g.at(-1)!.vorschlag, g.at(-1)!.mitglieder.length]).toEqual(['Sonderfälle', false, 0]);
    verschiebe(e, fall(e, 'S01').schluessel, id);
    g = bildeGruppen(e);
    expect(kennungen(e, g.find(x => x.id === id)!.mitglieder)).toEqual(['S01']);
    // Gruppe löschen: die Fälle gehen zurück in ihre vorgeschlagenen Gruppen
    loescheGruppe(e, id);
    g = bildeGruppen(e);
    expect(g.length).toBe(n0);
    expect(g.some(x => x.id === id)).toBe(false);
    expect(kennungen(e, gruppeMitName(e, ZIEL).mitglieder)).toEqual(['S01', 'S07']);
  });
  it('Vorgeschlagene Gruppen lassen sich nicht löschen', () => {
    const e = bauen(soll(V)), n0 = bildeGruppen(e).length;
    loescheGruppe(e, gruppeMitName(e, ZIEL).id);
    expect(bildeGruppen(e).length).toBe(n0);
  });
  it('Zeilen im Fall „ohne Angabe“ lassen sich verschieben wie alle anderen', () => {
    const f = soll('iii_fehlende_werte'), e = bauen(f);
    const ohne = gruppeMitName(e, 'ohne Angabe bei Selbstwirksamkeit'), ziel = gruppeMitName(e, 'Schulform: Primar · Selbstwirksamkeit bis 3');
    const f13 = e.faelle.find(x => x.kennung === 'F13')!;
    verschiebe(e, f13.schluessel, ziel.id);
    expect(kennungen(e, gruppeMitName(e, 'Schulform: Primar · Selbstwirksamkeit bis 3').mitglieder)).toEqual(['F01', 'F02', 'F03', 'F13']);
    expect(kennungen(e, gruppeMitName(e, 'ohne Angabe bei Selbstwirksamkeit').mitglieder)).toEqual(['F14']);
    expect(ohne.mitglieder.length).toBe(2);
  });
});

describe('G1 Zustand bleibt, wenn sich die Daten ändern', () => {
  const V = soll('v_zwei_zahlen_eine_gruppe');
  const ZIEL = 'Note bis 2 · Selbstwirksamkeit über 3,5 · Schulform: Sekundar';
  it('mit Kennung: Verschiebung, Name und Notiz bleiben, auch wenn die Zeilen umsortiert werden', () => {
    const e = bauen(V);
    const g = gruppeMitName(e, ZIEL);
    verschiebe(e, e.faelle.find(x => x.kennung === 'S10')!.schluessel, g.id);
    benenne(e, g.id, 'Meine Gruppe'); notiere(e, g.id, 'Notiz');
    const e2 = baueFaelle(rohspalten(V), [...zeilen(V)].reverse(), { kennung: 'kennung', q: V.spalten.map(s => s.name), t: ['interview'] }, e.zustand);
    const g2 = bildeGruppen(e2).find(x => x.name === 'Meine Gruppe')!;
    expect(kennungen(e2, g2.mitglieder)).toEqual(['S01', 'S07', 'S10']);
    expect(g2.notiz).toBe('Notiz');
  });
  it('ohne Kennung: Zuordnung über die Zeilennummer', () => {
    const e = bauen(V, false);
    const g = gruppeMitName(e, ZIEL);
    const zehn = e.faelle.find(x => x.zeile === zeilen(V).findIndex(z => z[0] === 'S10') + 1)!;
    verschiebe(e, zehn.schluessel, g.id);
    const e2 = baueFaelle(rohspalten(V), zeilen(V), { kennung: '', q: V.spalten.map(s => s.name), t: ['interview'] }, e.zustand);
    expect(e2.faelle.length).toBe(14);
    expect(bildeGruppen(e2).find(x => x.name === ZIEL)!.mitglieder.length).toBe(3);
  });
  it('Zuordnungen zu Fällen, die es nicht mehr gibt, fallen weg', () => {
    const e = bauen(V), g = gruppeMitName(e, ZIEL);
    verschiebe(e, e.faelle.find(x => x.kennung === 'S10')!.schluessel, g.id);
    const ohneS10 = zeilen(V).filter(z => z[0] !== 'S10');
    const e2 = baueFaelle(rohspalten(V), ohneS10, { kennung: 'kennung', q: V.spalten.map(s => s.name), t: ['interview'] }, e.zustand);
    expect(Object.keys(e2.zustand.zuordnung)).toEqual([]);
    expect(e2.faelle.length).toBe(13);
  });
});

describe('G1 Markierungen (Zitate) und Sortieren', () => {
  const V = soll('v_zwei_zahlen_eine_gruppe');
  const k = 'S02', text = zitatText(k);   // „Das sagt S02 im Interview. Zweiter Satz mit mehr Inhalt, dritter Teil.“
  const schluessel = (e: Faelle) => e.faelle.find(x => x.kennung === k)!.schluessel;

  it('Satzteil markieren: Zeichenbereich und Wortlaut werden gespeichert; Leerraum am Rand zählt nicht', () => {
    const e = bauen(V);
    const von = text.indexOf('Zweiter'), bis = text.indexOf(', dritter');
    markiere(e, schluessel(e), 'interview', von - 1, bis);   // mit Leerzeichen davor
    expect(markierungen(e, schluessel(e), 'interview')).toEqual([{ von, bis, text: text.slice(von, bis) }]);
  });
  it('überlappende Markierungen werden zusammengefasst; Entmarkieren entfernt eine Stelle', () => {
    const e = bauen(V);
    markiere(e, schluessel(e), 'interview', 0, 10);
    markiere(e, schluessel(e), 'interview', 5, 20);
    markiere(e, schluessel(e), 'interview', 40, 50);
    expect(markierungen(e, schluessel(e), 'interview').map(m => [m.von, m.bis])).toEqual([[0, 20], [40, 50]]);
    entmarkiere(e, schluessel(e), 'interview', 0);
    expect(markierungen(e, schluessel(e), 'interview').map(m => [m.von, m.bis])).toEqual([[40, 50]]);
  });
  it('zelleInStuecken: markierte und unmarkierte Teile ergeben zusammen wieder den ganzen Text', () => {
    const e = bauen(V);
    markiere(e, schluessel(e), 'interview', 9, 12);
    const teile = zelleInStuecken(text, markierungen(e, schluessel(e), 'interview'));
    expect(teile.map(t => t.t).join('')).toBe(text);
    expect(teile.filter(t => t.marke >= 0).map(t => t.t)).toEqual([text.slice(9, 12)]);
  });
  it('Die Markierung bleibt beim Sortieren am Fall (Sortieren ändert nur die Anzeige-Reihenfolge)', () => {
    const e = bauen(V);
    markiere(e, schluessel(e), 'interview', 4, 11);
    const alle = e.faelle.map((_, i) => i);
    const gm = gruppeJeFall(e);
    const nachNote = sortiere(e, alle, { art: 'q', i: 0 }, true, i => gm.get(e.faelle[i]!.schluessel)!);
    expect(e.faelle[nachNote[0]!]!.kennung).toBe('S14');   // höchste Note 4,0
    expect(nachNote.slice().sort((a, b) => a - b)).toEqual(alle);
    expect(markierungen(e, schluessel(e), 'interview')).toEqual([{ von: 4, bis: 11, text: text.slice(4, 11) }]);
    const nachKennung = sortiere(e, alle, { art: 'kennung' }, false, () => '');
    expect(nachKennung.map(i => e.faelle[i]!.kennung)).toEqual([...(V.daten.kennung as string[])].sort());
    expect(markierungen(e, schluessel(e), 'interview').length).toBe(1);
  });
  it('Die Markierung folgt dem Fall in neu gebaute Daten (Kennung, Zeilen umsortiert)', () => {
    const e = bauen(V);
    markiere(e, schluessel(e), 'interview', 4, 11);
    const e2 = baueFaelle(rohspalten(V), [...zeilen(V)].reverse(), { kennung: 'kennung', q: V.spalten.map(s => s.name), t: ['interview'] }, e.zustand);
    expect(markierungen(e2, e2.faelle.find(x => x.kennung === k)!.schluessel, 'interview')).toEqual([{ von: 4, bis: 11, text: text.slice(4, 11) }]);
    expect(markierungen(e2, e2.faelle.find(x => x.kennung === 'S03')!.schluessel, 'interview')).toEqual([]);
  });
  it('Zitate der Gruppe: markierte Stellen der Mitglieder, mit Kennung und Wortlaut', () => {
    const e = bauen(V);
    markiere(e, schluessel(e), 'interview', 4, 11);
    const g = bildeGruppen(e).find(x => kennungen(e, x.mitglieder).includes(k))!;
    const z = zitateDerGruppe(e, g);
    expect(z.map(x => [x.kennung, x.text])).toEqual([[k, text.slice(4, 11)]]);
    const andere = bildeGruppen(e).find(x => x.id !== g.id)!;
    expect(zitateDerGruppe(e, andere)).toEqual([]);
  });
  it('Sortieren nach einer Zahlenspalte mit Lücken: Lücken am Ende, stabil bei Gleichstand', () => {
    const f = soll('iii_fehlende_werte'), e = bauen(f);
    const alle = e.faelle.map((_, i) => i);
    const ist = sortiere(e, alle, { art: 'q', i: 1 }, false, () => '').map(i => e.faelle[i]!.kennung);
    const swWert = (kn: string) => f.daten.sw![(f.daten.kennung as string[]).indexOf(kn)] as number | null;
    const reihe = e.faelle.map(x => x.kennung);
    const erwartet = [...reihe].sort((a, b) => { const x = swWert(a), y = swWert(b); if (x === null || y === null) return x === y ? reihe.indexOf(a) - reihe.indexOf(b) : x === null ? 1 : -1; return x - y || reihe.indexOf(a) - reihe.indexOf(b); });
    expect(ist).toEqual(erwartet);
    expect(ist.slice(-3).every(kn => swWert(kn) === null)).toBe(true);
    // abwärts: Lücken bleiben am Ende
    const ab = sortiere(e, alle, { art: 'q', i: 1 }, true, () => '').map(i => e.faelle[i]!.kennung);
    expect(ab.slice(-3).every(kn => swWert(kn) === null)).toBe(true);
    expect(swWert(ab[0]!)).toBe(4.8);
  });
  it('leererZustand: leer', () => {
    expect(leererZustand()).toMatchObject({ eigene: [], namen: {}, notizen: {}, zuordnung: {}, zitate: {} });
  });
});
