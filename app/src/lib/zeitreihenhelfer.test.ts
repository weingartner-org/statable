import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f2-erwartet.json';
import { s } from './sitzung.svelte';
import { zeitreiheHelfer, lueckenSatz, ersterWertSatz, mittelBeschriftung, helferSaetze } from './zeitreihenhelfer';
import { ASSISTENTEN } from './datenassistenten';

/* ===== Später, Welle S-F2, Teil C.1: Daten-Assistent „Verschieben und glätten“ (Fachblatt SPAETER-F2-ERGAENZUNGEN Abschnitt C.1 und „Entscheidungen Opus (19.10.)“ 7 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer B darf diese Datei und die JSON nicht ändern. FESTGELEGT: reine JS-Funktionen in lib/zeitreihenhelfer.ts (kein R, kein PSPP), Oberfläche `bausteine/AssistentZeitreihe.svelte`, 15. Eintrag in
 * `ASSISTENTEN` (nach den zwölf alten und den zwei aus S-F2 D: eigenschaften, vergleichen) (lib/datenassistenten.ts, id 'zeitreihe', Name „Verschieben und glätten“ / „Shift and smooth“). Sollwerte: scripts/spaeter-f2-erwartet.R → testdaten/spaeter-f2-erwartet.json, Abschnitt `zeitreihen.verschieben`;
 * Quellen: eigene Schleifen = Basis-R (diff, embed, stats::filter) auf 1e-12; Definitionen der IBM-Seiten zu SPSS CREATE (LAG, LEAD, DIFF, MA, PMA, Version 23: gelesen); IBM-Tabelle zu LAG/LEAD (198, 220, 305, 470).
 * Toleranz: 1e-12 relativ (Ergebnisse sind einfache Rechnungen).
 *
 * SCHNITTSTELLE lib/zeitreihenhelfer.ts
 *   zeitreiheHelfer(e: { id: (string | number | null)[] | null; zeit: (number | null)[]; x: (number | null)[]; art: 'vorwert' | 'folgewert' | 'veraenderung' | 'prozent' | 'mittel-zentriert' | 'mittel-zurueck';
 *       k?: number (Verzögerung, ganz ≥ 1, Voreinstellung 1; nur vorwert/folgewert); spanne?: number (ganz ≥ 2, Voreinstellung 3; nur Mittel); abstand?: 'reihenfolge' | 'zeit' (Voreinstellung 'reihenfolge', Opus 7);
 *       schritt?: number (Zeiteinheit, > 0, Voreinstellung 1; die Messung „k Zeiteinheiten davor“ liegt bei zeit − k·schritt); mitAktuell?: boolean (nur mittel-zurueck, Voreinstellung true, Opus 7) }):
 *       { ok: true; werte: (number | null)[]; personen: number; personenMitLuecke: number; hinweise: ('zeitluecken' | 'prozent-null')[]; erstesFehlt: number }
 *     | { ok: false; code: 'doppelt' | 'k' | 'spanne' | 'schritt' | 'art' | 'laenge'; zeilen?: number[] }
 *      id null = eine einzige Reihe (alle Zeilen). Je Person nach `zeit` aufsteigend gerechnet; Ergebnis in der REIHENFOLGE DER EINGABEZEILEN (Zeile i ↔ werte[i]). Eine Zeile mit fehlender Person oder Zeit bekommt null (und zählt nicht für die anderen).
 *      Der Wert einer anderen Person geht NIE ein. Gleiche Person und gleiche Zeit zweimal: Fehler 'doppelt' mit den Zeilenindizes (0-basiert); Längen verschieden 'laenge'.
 *      vorwert/folgewert (SPSS LAG/LEAD): Wert der k-ten Messung davor/danach in der Reihenfolge der Messungen der Person; die ersten/letzten k Zeilen je Person null; ein fehlender Wert wandert mit (wird null).
 *        abstand 'zeit': nur wenn die Messung bei zeit − k·schritt (bzw. + k·schritt) existiert, sonst null.
 *      veraenderung (SPSS DIFF, Grad 1): x − Vorwert (Vorwert nach `abstand` mit k = 1); fehlt eines von beiden, null. prozent: 100·(x − Vorwert)/|Vorwert|; Vorwert 0 → null und Hinweis 'prozent-null'.
 *      mittel-zentriert (SPSS MA, Spanne s): s ungerade: Mittel der s Werte um die Zeile; s gerade: 2×s-Mittel (Randgewichte ½: (Σ der s + 1 Werte − ½ Anfang − ½ Ende)/s), keine Auffüllung am Rand, jedes Fenster mit fehlendem Wert null.
 *        (abstand wird hier nicht benutzt: Fenster in der Reihenfolge der Messungen.)
 *      mittel-zurueck: mitAktuell true: Mittel der letzten s Werte EINSCHLIESSLICH der Zeile (R filter sides = 1); mitAktuell false: Mittel der s Werte DAVOR OHNE die Zeile (SPSS PMA); die ersten s − 1 bzw. s Zeilen je Person null;
 *        Fenster mit fehlendem Wert null; bei mitAktuell false hat eine Zeile mit EIGENEM fehlenden Wert trotzdem ein Ergebnis, wenn die s Werte davor da sind (Vorschlag, am SPSS-Ausdruck offen).
 *      personen = verschiedene gültige Personen; personenMitLuecke = Personen, bei denen zwischen zwei aufeinanderfolgenden Messungen mehr als `schritt` liegt (Lücke in der Zeit); hinweise 'zeitluecken' wenn > 0;
 *      erstesFehlt = Zahl der Personen, deren erste (bzw. bei folgewert letzte) Zeile wegen fehlender Vorgängerin leer ist (für den Satz „Für 4 Personen …“).
 *   lueckenSatz(n: number): string       gut sichtbarer Hinweis über dem Ergebnis: „Bei 1 Person fehlen Zeitpunkte zwischen den Messungen; ‚davor‘ meint dort die Messung davor, nicht die Messung eine Zeiteinheit davor.“ (Plural: „Bei 3 Personen fehlen …“)
 *   ersterWertSatz(n: number, art: 'vorwert' | 'folgewert'): string       „Für 4 Personen fehlt sie in der ersten Zeile, weil es keine frühere Messung gibt.“ (folgewert: letzte Zeile, spätere Messung)
 *   mittelBeschriftung(mitAktuell: boolean): string      die Beschriftung der Wahl; sagt in Worten, ob der aktuelle Wert dabei ist; ohne aktuellen Wert nennt sie SPSS PMA
 *   helferSaetze(e: Ergebnis (ok: true), art, o: { spalte: string }): string[]      ganze Sätze für den Bericht (Name der neuen Spalte, was sie enthält, Zahl der leeren Zeilen, bei hinweise je ein Satz)
 *   ASSISTENTEN enthält { id: 'zeitreihe', icon: …, name: () => 'Verschieben und glätten' } als LETZTEN Eintrag (15 Einträge: 12 + eigenschaften + vergleichen + zeitreihe); Fallgewicht-Schlüssel `assistent:zeitreihe` (Test: gewichte-spaeter-f2.test.ts). */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const Zr = (ERW as unknown as Z).zeitreihen.verschieben as Z;
const L = Zr.langformat as { id: string[]; t: number[]; x: (number | null)[] }, E = Zr.ergebnis as Record<string, (number | null)[]>;
const gleich = (ist: (number | null)[], soll: (number | null)[], was: string) => {
  expect(ist.length, `${was}: Länge`).toBe(soll.length);
  ist.forEach((v, i) => { if (soll[i] == null) expect(v, `${was}[${i}] soll fehlen`).toBeNull(); else { expect(typeof v, `${was}[${i}]: Zahl erwartet`).toBe('number'); expect(Math.abs((v as number) - soll[i]!), `${was}[${i}] (ist ${v}, soll ${soll[i]})`).toBeLessThanOrEqual(1e-12 * Math.max(Math.abs(soll[i]!), 1)); } });
};
const lauf = (o: Z) => { const r = zeitreiheHelfer({ id: L.id, zeit: L.t, x: L.x, ...o } as any); expect(r.ok, `Fehler: ${JSON.stringify(r)}`).toBe(true); return r as Z; };

describe('Beispieltabelle (13 Zeilen, vier Personen, Zeilen gemischt, A mit fehlendem Wert, B mit Lücke bei t = 3, C rückwärts, D eine Zeile)', () => {
  const faelle: [string, Z, string][] = [
    ['Vorwert nach Reihenfolge (SPSS LAG 1)', { art: 'vorwert', k: 1, abstand: 'reihenfolge' }, 'lag1_reihenfolge'], ['Vorwert nach Zeit', { art: 'vorwert', k: 1, abstand: 'zeit' }, 'lag1_zeit'],
    ['Folgewert nach Reihenfolge (SPSS LEAD 1)', { art: 'folgewert', k: 1, abstand: 'reihenfolge' }, 'lead1_reihenfolge'], ['Folgewert nach Zeit', { art: 'folgewert', k: 1, abstand: 'zeit' }, 'lead1_zeit'],
    ['Veränderung nach Reihenfolge (SPSS DIFF 1)', { art: 'veraenderung', abstand: 'reihenfolge' }, 'diff1_reihenfolge'], ['Veränderung nach Zeit', { art: 'veraenderung', abstand: 'zeit' }, 'diff1_zeit'],
    ['Vorwert 2', { art: 'vorwert', k: 2 }, 'lag2_reihenfolge'], ['gleitender Mittelwert zentriert, Spanne 3 (ungerade)', { art: 'mittel-zentriert', spanne: 3 }, 'ma3'], ['gleitender Mittelwert zentriert, Spanne 4 (gerade: 2×4-Mittel)', { art: 'mittel-zentriert', spanne: 4 }, 'ma4'],
    ['Mittelwert der 3 Werte davor OHNE aktuell (SPSS PMA 3)', { art: 'mittel-zurueck', spanne: 3, mitAktuell: false }, 'pma3_ohne_aktuell'], ['Mittelwert der letzten 3 Werte EINSCHLIESSLICH jetzt', { art: 'mittel-zurueck', spanne: 3, mitAktuell: true }, 'pma3_mit_aktuell'],
    ['Veränderung in Prozent', { art: 'prozent', abstand: 'reihenfolge' }, 'prozent1_reihenfolge']
  ];
  for (const [name, o, spalte] of faelle) it(`${name}: Spalte „${spalte}“ des Sollwerts, Zeile für Zeile in der Reihenfolge der Eingabe`, () => { gleich(lauf(o).werte, E[spalte]!, spalte); });
  it('Voreinstellungen (Opus 7): Vorwert ohne Angaben = Vorwert 1 nach Reihenfolge; zurückliegender Mittelwert ohne mitAktuell = einschließlich jetzt; Spanne 3', () => {
    gleich(lauf({ art: 'vorwert' }).werte, E.lag1_reihenfolge!, 'Vorwert'); gleich(lauf({ art: 'mittel-zurueck' }).werte, E.pma3_mit_aktuell!, 'zurück'); gleich(lauf({ art: 'mittel-zentriert' }).werte, E.ma3!, 'zentriert');
  });
  it('kein Wert geht über die Personengrenze: die erste Zeile jeder Person und die einzige Zeile von D haben keinen Vorwert; die Summe der Vorwerte ohne null gleich der Summe der Werte ohne letzte Zeile je Person', () => {
    const r = lauf({ art: 'vorwert' }); const idx = (p: string) => L.id.map((v, i) => (v === p ? i : -1)).filter(i => i >= 0); for (const p of ['A', 'B', 'C', 'D']) { const z = idx(p).sort((a, b) => L.t[a]! - L.t[b]!); expect(r.werte[z[0]!], `erste Zeile ${p}`).toBeNull(); }
    expect(r.personen).toBe(4);
  });
  it('Lücken in der Zeit: Person B (Zeiten 1, 2, 4, 5) wird gezählt, Hinweis „zeitluecken“; nach Zeit fehlt der Vorwert bei t = 4, nach Reihenfolge steht dort der Wert von t = 2 (6)', () => {
    const r = lauf({ art: 'vorwert' }); expect(r.personenMitLuecke).toBe(Zr.personen_mit_zeitluecke.length); expect(r.personenMitLuecke).toBe(1); expect(r.hinweise).toContain('zeitluecken');
    const i4 = L.id.findIndex((p, i) => p === 'B' && L.t[i] === 4); expect(r.werte[i4]).toBe(6); expect(lauf({ art: 'vorwert', abstand: 'zeit' }).werte[i4]).toBeNull();
    expect(lauf({ art: 'vorwert', schritt: 2, abstand: 'zeit' }).werte[i4], 'mit Zeiteinheit 2 ist t − 2 = 2 vorhanden').toBe(6);
  });
  it('erstesFehlt: für den Satz „Für 4 Personen fehlt sie in der ersten Zeile“ (alle vier Personen)', () => { expect(lauf({ art: 'vorwert' }).erstesFehlt).toBe(4); expect(lauf({ art: 'folgewert' }).erstesFehlt).toBe(4); });
  it('Prozent: Vorwert 0 gibt null und den Hinweis „prozent-null“; sonst keinen', () => {
    const r = zeitreiheHelfer({ id: ['a', 'a', 'a'], zeit: [1, 2, 3], x: [0, 5, 10], art: 'prozent' }) as Z; expect(r.ok).toBe(true); expect(r.werte).toEqual([null, null, 100]); expect(r.hinweise).toContain('prozent-null'); expect(lauf({ art: 'prozent' }).hinweise).not.toContain('prozent-null');
  });
});

describe('IBM-Beispiel und Gegenprobe mit Basis-R-Formeln (eine einzige Reihe, id = null)', () => {
  it('IBM Knowledge Center (LAG, Tabelle 1): X = 198, 220, 305, 470 → LAG ., 198, 220, 305; LEAD 220, 305, 470, .', () => {
    const b = Zr.ibm_beispiel as Z; const t = [1, 2, 3, 4]; const lag = zeitreiheHelfer({ id: null, zeit: t, x: b.x, art: 'vorwert' }) as Z, lead = zeitreiheHelfer({ id: null, zeit: t, x: b.x, art: 'folgewert' }) as Z; gleich(lag.werte, b.lag1, 'LAG'); gleich(lead.werte, b.lead1, 'LEAD');
  });
  const xv = [198, 220, 305, 470, 301, 288, 410, 395, 360, 342], t = xv.map((_, i) => i + 1);
  it('Differenz = diff(); Vorwert k; zentrierte Mittel gleich stats::filter (Spannen 2 bis 5: gerade mit Gewichten ½ an den Enden); zurück mit aktuell gleich filter(sides = 1)', () => {
    gleich((zeitreiheHelfer({ id: null, zeit: t, x: xv, art: 'veraenderung' }) as Z).werte, [null, ...xv.slice(1).map((v, i) => v - xv[i]!)], 'diff');
    for (const k of [1, 2, 3]) gleich((zeitreiheHelfer({ id: null, zeit: t, x: xv, art: 'vorwert', k }) as Z).werte, xv.map((_, i) => (i < k ? null : xv[i - k]!)), `lag ${k}`);
    for (let sp = 2; sp <= 5; sp++) {
      const h = Math.floor(sp / 2), soll = xv.map((_, i) => { if (i - h < 0 || i + h >= xv.length) return null; const w = xv.slice(i - h, i + h + 1); return sp % 2 ? w.reduce((a, b) => a + b, 0) / sp : (w.reduce((a, b) => a + b, 0) - 0.5 * w[0]! - 0.5 * w[w.length - 1]!) / sp; });
      gleich((zeitreiheHelfer({ id: null, zeit: t, x: xv, art: 'mittel-zentriert', spanne: sp }) as Z).werte, soll, `MA ${sp}`);
    }
    gleich((zeitreiheHelfer({ id: null, zeit: t, x: xv, art: 'mittel-zurueck', spanne: 3, mitAktuell: true }) as Z).werte, xv.map((_, i) => (i < 2 ? null : (xv[i]! + xv[i - 1]! + xv[i - 2]!) / 3)), 'filter sides = 1');
    gleich((zeitreiheHelfer({ id: null, zeit: t, x: xv, art: 'mittel-zurueck', spanne: 3, mitAktuell: false }) as Z).werte, xv.map((_, i) => (i < 3 ? null : (xv[i - 1]! + xv[i - 2]! + xv[i - 3]!) / 3)), 'PMA');
  });
  it('AirPassengers-3er-Mittel der Karte Zeitreihen: gleich lib/zeitreihe.gleitenderMittelwert (der Assistent und die Karte rechnen dasselbe)', async () => {
    const { gleitenderMittelwert } = await import('./zeitreihe'); const y = [112, 118, 132, 129, 121, 135, 148, 148, 136, 119, 104, 118, 115, 126]; const a = (zeitreiheHelfer({ id: null, zeit: y.map((_, i) => i + 1), x: y, art: 'mittel-zentriert', spanne: 3 }) as Z).werte; gleich(a, gleitenderMittelwert(y, 3), 'Karte');
    gleich((zeitreiheHelfer({ id: null, zeit: y.map((_, i) => i + 1), x: y, art: 'mittel-zentriert', spanne: 4 }) as Z).werte, gleitenderMittelwert(y, 4), 'Karte, gerade Spanne');
  });
  it('fehlender Wert: jedes Fenster, das ihn enthält, ist leer (SPSS teilt die Reihe an der Lücke); Vorwert und Differenz mit Lücke wandern mit', () => {
    const x = [1, 2, null, 4, 5, 6, 7], t7 = x.map((_, i) => i + 1);
    expect((zeitreiheHelfer({ id: null, zeit: t7, x, art: 'mittel-zentriert', spanne: 3 }) as Z).werte).toEqual([null, null, null, null, 5, 6, null]);
    expect((zeitreiheHelfer({ id: null, zeit: t7, x, art: 'mittel-zurueck', spanne: 2, mitAktuell: true }) as Z).werte).toEqual([null, 1.5, null, null, 4.5, 5.5, 6.5]);
    expect((zeitreiheHelfer({ id: null, zeit: t7, x, art: 'veraenderung' }) as Z).werte).toEqual([null, 1, null, null, 1, 1, 1]); expect((zeitreiheHelfer({ id: null, zeit: t7, x, art: 'vorwert' }) as Z).werte).toEqual([null, 1, 2, null, 4, 5, 6]);
  });
});

describe('Fehler und Randfälle', () => {
  it('doppelter Zeitpunkt bei einer Person: Fehler „doppelt“ mit den Zeilen (SPSS rechnet still weiter - Statable sperrt)', () => {
    const r = zeitreiheHelfer({ id: ['a', 'a', 'b', 'a'], zeit: [1, 2, 1, 2], x: [1, 2, 3, 4], art: 'vorwert' }) as Z; expect(r.ok).toBe(false); expect(r.code).toBe('doppelt'); expect(r.zeilen).toEqual([1, 3]);
    expect((zeitreiheHelfer({ id: ['a', 'b'], zeit: [1, 1], x: [1, 2], art: 'vorwert' }) as Z).ok, 'gleiche Zeit bei verschiedenen Personen ist erlaubt').toBe(true);
  });
  it('ungültige Wahl: k = 0 oder nicht ganz, Spanne 1 oder nicht ganz, Schritt ≤ 0, unbekannte Art, verschiedene Längen', () => {
    const b = { id: null, zeit: [1, 2, 3], x: [1, 2, 3] };
    expect((zeitreiheHelfer({ ...b, art: 'vorwert', k: 0 }) as Z).code).toBe('k'); expect((zeitreiheHelfer({ ...b, art: 'vorwert', k: 1.5 }) as Z).code).toBe('k'); expect((zeitreiheHelfer({ ...b, art: 'mittel-zentriert', spanne: 1 }) as Z).code).toBe('spanne');
    expect((zeitreiheHelfer({ ...b, art: 'mittel-zurueck', spanne: 2.5 }) as Z).code).toBe('spanne'); expect((zeitreiheHelfer({ ...b, art: 'vorwert', abstand: 'zeit', schritt: 0 }) as Z).code).toBe('schritt'); expect((zeitreiheHelfer({ ...b, art: 'summe' as any }) as Z).code).toBe('art');
    expect((zeitreiheHelfer({ id: null, zeit: [1, 2], x: [1, 2, 3], art: 'vorwert' }) as Z).code).toBe('laenge');
  });
  it('fehlende Person oder fehlende Zeit: die Zeile bekommt null und stört die anderen nicht; Spanne länger als die Reihe: alles null', () => {
    const r = zeitreiheHelfer({ id: ['a', null, 'a', 'a'], zeit: [1, 2, null, 3], x: [10, 20, 30, 40], art: 'vorwert' }) as Z; expect(r.ok).toBe(true); expect(r.werte).toEqual([null, null, null, 10]);
    expect((zeitreiheHelfer({ id: null, zeit: [1, 2, 3], x: [1, 2, 3], art: 'mittel-zentriert', spanne: 9 }) as Z).werte).toEqual([null, null, null]);
  });
  it('Zeit als Dezimalzahl (Tage, Jahre) und beliebige Reihenfolge der Zeilen: die Rechnung sortiert, das Ergebnis steht an der Eingabezeile', () => {
    const r = zeitreiheHelfer({ id: ['p', 'p', 'p'], zeit: [2.5, 0.5, 1.5], x: [30, 10, 20], art: 'vorwert' }) as Z; expect(r.werte).toEqual([20, null, 10]); expect((zeitreiheHelfer({ id: ['p', 'p', 'p'], zeit: [2.5, 0.5, 1.5], x: [30, 10, 20], art: 'vorwert', abstand: 'zeit', schritt: 1 }) as Z).werte).toEqual([20, null, 10]);
  });
});

describe('Sätze, Beschriftungen und Assistent (de und en)', () => {
  it('Lückensatz (gut sichtbar über dem Ergebnis, mit Zahl der Personen): Singular und Plural, de und en', () => {
    const a = lueckenSatz(1); expect(a).toMatch(/Bei 1 Person fehlen Zeitpunkte zwischen den Messungen/); expect(a).toMatch(/die Messung davor/); expect(a).toMatch(/nicht die Messung eine Zeiteinheit davor/); expect(lueckenSatz(3)).toMatch(/Bei 3 Personen fehlen Zeitpunkte/);
    s.einst.sprache = 'en'; try { expect(lueckenSatz(1)).toMatch(/1 person has missing time points between measurements|1 person/); expect(lueckenSatz(3)).toMatch(/3 people/); } finally { s.einst.sprache = 'de'; }
  });
  it('Satz zur ersten Zeile: „Für 4 Personen fehlt sie in der ersten Zeile, weil es keine frühere Messung gibt.“; Folgewert: letzte Zeile', () => {
    expect(ersterWertSatz(4, 'vorwert')).toMatch(/4 Personen/); expect(ersterWertSatz(4, 'vorwert')).toMatch(/ersten Zeile/); expect(ersterWertSatz(4, 'vorwert')).toMatch(/keine frühere Messung/); expect(ersterWertSatz(1, 'vorwert')).toMatch(/1 Person/);
    expect(ersterWertSatz(4, 'folgewert')).toMatch(/letzten Zeile/); expect(ersterWertSatz(4, 'folgewert')).toMatch(/keine spätere Messung/);
  });
  it('Beschriftungen des zurückliegenden Mittelwerts sagen in Worten, ob der aktuelle Wert dabei ist; ohne aktuellen Wert wird SPSS PMA genannt (die App sagt nur bei PMA „SPSS“, sonst nicht)', () => {
    const a = mittelBeschriftung(true), b = mittelBeschriftung(false); expect(a).toMatch(/einschließlich/); expect(a).toMatch(/aktuell/); expect(a).not.toMatch(/SPSS/); expect(b).toMatch(/ohne den aktuellen Wert/); expect(b).toMatch(/SPSS PMA/);
  });
  it('Berichtssätze: nennen die neue Spalte, die Art, die Zahl der leeren Zeilen und je Hinweis einen Satz', () => {
    const r = lauf({ art: 'vorwert' }) as any; const t = helferSaetze(r, 'vorwert', { spalte: 'Wert_davor' }).join(' '); for (const re of [/Wert_davor/, /vorige Messung/, /4 Personen/, /Bei 1 Person fehlen Zeitpunkte/]) expect(t).toMatch(re);
  });
  it('der Assistent steht in der Liste: 15 Einträge (zuletzt „zeitreihe“), Name „Verschieben und glätten“, englisch übersetzt', () => {
    expect(ASSISTENTEN).toHaveLength(21);   // dazu „index“ (Abschnitt 3) und „winsor“ (Field-Stufe 3b)
     expect(ASSISTENTEN.map(x => x.id).slice(12, 15)).toEqual(['eigenschaften', 'vergleichen', 'zeitreihe']); const a = ASSISTENTEN.find(x => x.id === 'zeitreihe')!; expect(a, 'Eintrag fehlt').toBeDefined(); expect(a.name()).toBe('Verschieben und glätten'); s.einst.sprache = 'en'; try { expect(a.name()).not.toBe('Verschieben und glätten'); } finally { s.einst.sprache = 'de'; }
  });
});
