import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f-erwartet.json';
import { s } from './sitzung.svelte';
import { umformenWechsel, pruefeIntervalle, coxZpDaten, coxZpAufruf, type ZpZeile } from './coxzeit';
import { umformSatz, unsterblichkeitSatz } from './coxzeitsaetze';

/* ===== Später, Welle S-F, Teil 2a: Cox mit zeitabhängiger Größe - der UMFORMER (Daten-Assistent „Zeitpunkte je Person → Intervalle“, Form A) und die Prüfungen
 * (Fachblatt SPAETER-F Abschnitt 2 und „Entscheidungen Opus (18.10.)“ 3 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer A darf diese Datei und die JSON nicht ändern. Die R-Rechnung der Modelle steht in engine/spaeter-f.webr.test.ts.
 * Sollwerte: scripts/spaeter-f-erwartet.R (Abschnitt coxzeit.umformer): die Umformung der Stanford-Herzdaten `survival::jasa` (survival-Vignette `timedep`, Abschnitt 3.3, S. 9-11) ist dort Zeile für Zeile
 * gleich `survival::tmerge` (Abweichung 0), mit beiden Regeln. Hand-Fälle unten sind im Test von Hand gerechnet.
 * FESTGELEGT (Opus 3): NUR Form A („ein Wechsel zu einer Zeit“: je Person Ende, Ereignis, Zeitpunkt des Wechsels; Wert 0 vor dem Wechsel, 1 ab dem Wechsel). Keine Form B (Messungen), keine späte Aufnahme (Linkstrunkierung).
 * Voreinstellung STRENG: ein Wechsel am Tag des Ereignisses gilt erst danach (= die Person bleibt ohne Wechsel; das Ereignis gehört noch zum alten Wert). Wahl „zaehlt“ (Regel der Vignette): der Wechsel am Ereignistag
 * wird eine halbe Zeiteinheit vorgezogen (w - 0,5). Abschnitte sind links offen, rechts geschlossen: (Start, Stopp]; der Wert gilt AB dem Start, das Ereignis geschieht AM Stopp.
 * Rechnung in JS, kein R; an R gehen nur Zahlen und eine Ganzzahl-Kennung je Person (die ursprüngliche Kennung bleibt in der Tabelle).
 *
 * SCHNITTSTELLE lib/coxzeit.ts
 *   umformenWechsel(e: { kennung: (string | number | null)[]; ende: (number | null)[]; ereignis: (number | null)[]; wechsel: (number | null)[]; fest?: Record<string, (number | null)[]> },
 *                   opt?: { regel?: 'streng' | 'zaehlt' }): { ok: true; zeilen: ZpZeile[]; hinweise: ZpHinweise } | { ok: false; code: 'keine-personen' }
 *      ZpZeile = { person: number (1-basierte POSITION der Person in der Eingabe; für R die Ganzzahl-Kennung); kennung: string | number; start: number; stopp: number; ereignis: 0 | 1; wert: 0 | 1; fest: Record<string, number | null> }
 *      Reihenfolge: nach Person, innerhalb der Person nach Zeit. Ausgeschlossen (nur gezählt): Ende fehlend/NaN/<= 0 (R9: (0, 0) ist keine gültige Zeit, es wird NICHT 0,5 geraten), Ereignis fehlend oder nicht 0/1, Kennung fehlend oder leer.
 *      Wechsel fehlend/NaN = nie. Regeln je Person (w = Wechsel, T = Ende):
 *        w <= 0                   (R3) → eine Zeile (0, T], Wert 1 von Anfang an
 *        w fehlt, w > T (R2)      → eine Zeile (0, T], Wert 0
 *        w = T      (R4)          → streng: eine Zeile (0, T], Wert 0 · zaehlt: w := T - vorzug (vorzug = Hälfte des kleinsten positiven Abstands zwischen verschiedenen Zeitwerten der Daten: Enden, Wechselzeiten, dazu 0; bei Tagen 0,5) und weiter wie unten
 *        0 < w < T                → zwei Zeilen (0, w] Wert 0, Ereignis 0 · (w, T] Wert 1, Ereignis = das Ereignis der Person
 *      Das Ereignis (0/1) steht nur in der LETZTEN Zeile der Person. Feste Größen werden in jede Zeile der Person kopiert.
 *   ZpHinweise = { personen (gültige), zeilen, ereignisse, wechselAmAnfang (w <= 0), wechselAmEnde (w = T > 0, bei beiden Regeln gezählt), wechselNachEnde (w > T), geteilt (Personen mit zwei Zeilen),
 *                  ohneWechsel (Personen mit Wert 0 in der einzigen Zeile), ausgeschlossen, regel }
 *   pruefeIntervalle(zeilen: { kennung: string | number; start: number; stopp: number; ereignis: number; wert: number | null }[]): { fehler: string[]; hinweise: string[]; ereignisseBeiWert0: number; ereignisseBeiWert1: number; personenMitWechsel: number }
 *      Eingabe: die Zeilen einer Tabelle in Intervall-Form in beliebiger Reihenfolge (je Person nach Start sortiert). fehler (die Karte rechnet nicht; jeder Code höchstens einmal, in dieser Reihenfolge):
 *        'start-nicht-kleiner' (Start >= Stopp) · 'ueberlappung' (nächster Start < voriger Stopp derselben Person) · 'luecke' (nächster Start > voriger Stopp) ·
 *        'mehrere-ereignisse' (Person mit mehr als einer Zeile mit Ereignis 1; Wiederholungsereignisse sind kein einfaches Cox-Modell) · 'ereignis-nicht-am-ende' (genau ein Ereignis, aber nicht in der letzten Zeile)
 *      hinweise (es wird gerechnet): 'ereignisse-nur-ein-wert' (alle Werte 0/1 und Ereignisse nur bei Wert 0 oder nur bei Wert 1 - die Schätzung ist dann nicht möglich) · 'wenig-wechsel' (weniger als 5 Personen mit Wechsel)
 *      personenMitWechsel = Personen, deren Wert sich zwischen ihren Zeilen ändert.
 *   coxZpDaten(zeilen: ZpZeile[], opt: { wertName: string; festNamen: string[] }): { spalten: RSpalte[]; praed: CoxPraed[]; personen: number }
 *      spalten (alle art 'zahl', R-Namen fest): id (= person), start, stopp, ereignis, p01 (= wert, die zeitabhängige Größe), p02 … (feste Größen in der Reihenfolge festNamen); praed[k].name = Anzeigename (wertName, festNamen).
 *   coxZpAufruf(dt, ties = 'efron'): string       tryCatch(sp_cox_zp(d, 'start', 'stopp', 'ereignis', 'id', c('p01', …), character(0), 'efron'), error = function(e) list(fehler = conditionMessage(e)))
 *      Im Code nur feste Wörter und Bezeichner; Spaltennamen und Beschriftungen aus den Daten stecken nie im Code (CLAUDE.md).
 * SCHNITTSTELLE lib/coxzeitsaetze.ts (deutsch, du; Zahlen über das Profil)
 *   umformSatz(h: ZpHinweise): string      „Aus 103 Personen sind 170 Zeilen geworden …“; nennt bei wechselAmEnde > 0 die Zahl der Personen und die Regel („er zählt nicht“ bei streng, „er zählt schon“ bei zaehlt), bei wechselNachEnde > 0
 *                                          den Hinweis auf den Wechsel nach dem Ende der Beobachtung, bei ausgeschlossen > 0 die Zahl; sagt NICHTS vom Ereignistag, wenn niemand betroffen ist
 *   unsterblichkeitSatz(): string          die Größe darf nur Werte haben, die zum Zeitpunkt schon bekannt waren (Immortal-time-Fehler: wer erst später wechselt, musste bis dahin überleben) */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const C = (ERW as unknown as Z).coxzeit.umformer as Z;
const ok = (e: any) => { expect(e.ok, `Fehler: ${JSON.stringify(e)}`).toBe(true); return e; };
const spalten = (z: ZpZeile[]) => ({ person: z.map(r => r.person), start: z.map(r => r.start), stopp: z.map(r => r.stopp), ereignis: z.map(r => r.ereignis), wert: z.map(r => r.wert) });

describe('Stanford-Herzdaten (jasa, 103 Personen, 75 Tote, 69 Transplantierte): Umformung gleich survival::tmerge, Zeile für Zeile', () => {
  const J = C.jasa;
  const eingabe = { kennung: J.eingabe.kennung as number[], ende: J.eingabe.ende as number[], ereignis: J.eingabe.ereignis as number[], wechsel: J.eingabe.wechsel as (number | null)[], fest: { age: J.eingabe.age, surgery: J.eingabe.surgery, year: J.eingabe.year } };
  it('Regel „zaehlt“ (NEU nach der Fachprüfung): Verschiebung = HÄLFTE DES KLEINSTEN POSITIVEN ABSTANDS der Zeitwerte (jasa: 0,5 zwischen 0,5 und 1 → 0,25), nie vor den Beginn; 170 Zeilen, 75 Ereignisse; Start, Stopp, Ereignis, Wert und Person stimmen exakt gleich survival::tmerge mit entsprechend verschobenen Zeiten (Abweichung 0)', () => {
    const r = ok(umformenWechsel(eingabe, { regel: 'zaehlt' })); expect(r.vorzug).toBe(J.zaehlt.vorzug); expect(J.zaehlt.vorzug).toBe(0.25); expect(spalten(r.zeilen)).toEqual(J.zaehlt.zeilen); expect(r.zeilen.length).toBe(170);
    const p38 = r.zeilen.filter((z: ZpZeile) => z.person === 38); expect(p38.map((z: ZpZeile) => z.start)).toEqual([0, 3.75]);
  });
  it('strenge Regel (Voreinstellung): 169 Zeilen - der Patient mit Transplantation und Tod am selben Tag (Nr. 38) bleibt ohne Wechsel; Abweichung 0 gegen tmerge', () => {
    const r = ok(umformenWechsel(eingabe)); expect(spalten(r.zeilen)).toEqual(J.streng.zeilen); expect(r.zeilen.length).toBe(169);
    expect(ok(umformenWechsel(eingabe, { regel: 'streng' })).zeilen).toEqual(r.zeilen);
  });
  it('Hinweise mit Zahlen: 2 Wechsel am Anfang (Tag 0), 1 am Ereignistag, 0 nach dem Ende; 67 bzw. 66 geteilte Personen; 34 bzw. 35 ohne Wechsel', () => {
    for (const regel of ['zaehlt', 'streng'] as const) { const r = ok(umformenWechsel(eingabe, { regel })); expect(r.hinweise, regel).toEqual(J[regel].hinweise); }
    expect(J.zaehlt.hinweise).toMatchObject({ personen: 103, zeilen: 170, ereignisse: 75, wechselAmAnfang: 2, wechselAmEnde: 1, wechselNachEnde: 0, geteilt: 67, ohneWechsel: 34, ausgeschlossen: 0 });
  });
  it('feste Größen (Alter − 48, Operation, Jahr der Aufnahme) stehen in jeder Zeile der Person; die Kennung bleibt die ursprüngliche', () => {
    const r = ok(umformenWechsel(eingabe, { regel: 'zaehlt' }));
    r.zeilen.forEach((z: ZpZeile) => { const i = z.person - 1; expect(z.kennung).toBe(J.eingabe.kennung[i]); expect(z.fest.age).toBe(J.eingabe.age[i]); expect(z.fest.surgery).toBe(J.eingabe.surgery[i]); expect(z.fest.year).toBe(J.eingabe.year[i]); });
  });
  it('Eigenschaften je Person: lückenlos von 0 bis Ende, Ereignis nur in der letzten Zeile, Wert wechselt höchstens einmal von 0 auf 1', () => {
    for (const regel of ['zaehlt', 'streng'] as const) {
      const z = ok(umformenWechsel(eingabe, { regel })).zeilen as ZpZeile[]; const je = new Map<number, ZpZeile[]>(); z.forEach(r => je.set(r.person, [...(je.get(r.person) ?? []), r]));
      expect(je.size).toBe(103);
      je.forEach((zs, p) => {
        expect(zs[0]!.start, `Person ${p}: Anfang`).toBe(0); expect(zs[zs.length - 1]!.stopp, `Person ${p}: Ende`).toBe(eingabe.ende[p - 1]); expect(zs[zs.length - 1]!.ereignis).toBe(eingabe.ereignis[p - 1]);
        zs.forEach((r, k) => { if (k > 0) { expect(r.start).toBe(zs[k - 1]!.stopp); expect(r.wert).toBeGreaterThanOrEqual(zs[k - 1]!.wert); expect(zs[k - 1]!.ereignis).toBe(0); } expect(r.stopp).toBeGreaterThan(r.start); });
      });
    }
  });
  it('die Prüfung der Intervall-Form findet an der Umformung nichts (kein Fehler, kein Hinweis)', () => {
    const z = ok(umformenWechsel(eingabe, { regel: 'zaehlt' })).zeilen as ZpZeile[]; const p = pruefeIntervalle(z.map(r => ({ kennung: r.kennung, start: r.start, stopp: r.stopp, ereignis: r.ereignis, wert: r.wert })));
    expect(p.fehler).toEqual([]); expect(p.hinweise).toEqual([]); expect(p.ereignisseBeiWert0 + p.ereignisseBeiWert1).toBe(75); expect(p.personenMitWechsel).toBe(67);
  });
});

describe('Hand-Fälle (von Hand gerechnet): vier Personen, beide Regeln, Wechsel am Ereignistag und nach dem Ende', () => {
  const e = { kennung: ['A', 'B', 'C', 'D'], ende: [10, 8, 12, 5], ereignis: [1, 0, 1, 1], wechsel: [4, NaN as any, 12, 7], fest: { alter: [30, 40, 50, 60] } };
  it('streng: A (0,4] Wert 0, (4,10] Wert 1 mit Ereignis · B (0,8] · C (0,12] mit Ereignis, Wert 0 · D (0,5] mit Ereignis, Wert 0 (Wechsel 7 liegt nach dem Ende)', () => {
    const r = ok(umformenWechsel(e));
    expect(spalten(r.zeilen)).toEqual({ person: [1, 1, 2, 3, 4], start: [0, 4, 0, 0, 0], stopp: [4, 10, 8, 12, 5], ereignis: [0, 1, 0, 1, 1], wert: [0, 1, 0, 0, 0] });
    expect(r.hinweise).toEqual({ personen: 4, zeilen: 5, ereignisse: 3, wechselAmAnfang: 0, wechselAmEnde: 1, wechselNachEnde: 1, geteilt: 1, ohneWechsel: 3, ausgeschlossen: 0, regel: 'streng' });
    expect(r.zeilen.map((z: ZpZeile) => z.fest.alter)).toEqual([30, 30, 40, 50, 60]); expect(r.zeilen.map((z: ZpZeile) => z.kennung)).toEqual(['A', 'A', 'B', 'C', 'D']);
  });
  it('zaehlt: C wechselt bei 11,5 (eine halbe Zeiteinheit vor dem Tod): (0,11,5] Wert 0 · (11,5; 12] Wert 1 mit Ereignis; sonst wie oben', () => {
    const r = ok(umformenWechsel(e, { regel: 'zaehlt' }));
    expect(spalten(r.zeilen)).toEqual({ person: [1, 1, 2, 3, 3, 4], start: [0, 4, 0, 0, 11.5, 0], stopp: [4, 10, 8, 11.5, 12, 5], ereignis: [0, 1, 0, 0, 1, 1], wert: [0, 1, 0, 0, 1, 0] });
    expect(r.hinweise).toEqual({ personen: 4, zeilen: 6, ereignisse: 3, wechselAmAnfang: 0, wechselAmEnde: 1, wechselNachEnde: 1, geteilt: 2, ohneWechsel: 2, ausgeschlossen: 0, regel: 'zaehlt' });
  });
  it('zaehlt bei Zeit in JAHREN: Verschiebung = halber kleinster Abstand (Werte 0; 0,4; 1; 2 → 0,2), nicht 0,5 (das wäre bei Ende 0,4 ein Unsterblichkeitsfehler: der Wechsel läge vor dem Beginn)', () => {
    const r = ok(umformenWechsel({ kennung: ['A', 'B', 'C'], ende: [1, 0.4, 2], ereignis: [1, 1, 1], wechsel: [1, 0.4, null] }, { regel: 'zaehlt' }));
    expect(r.vorzug).toBeCloseTo(0.2, 12); expect(r.zeilen.map((z: ZpZeile) => [z.person, z.wert])).toEqual([[1, 0], [1, 1], [2, 0], [2, 1], [3, 0]]);
    expect(r.zeilen[0]!.stopp).toBeCloseTo(0.8, 12); expect(r.zeilen[1]!.start).toBeCloseTo(0.8, 12); expect(r.zeilen[2]!.stopp).toBeCloseTo(0.2, 12); expect(r.zeilen.every((z: ZpZeile) => z.start >= 0 && z.stopp > z.start)).toBe(true);
    const nur = ok(umformenWechsel({ kennung: ['A'], ende: [0.3], ereignis: [1], wechsel: [0.3] }, { regel: 'zaehlt' })); expect(nur.zeilen.every((z: ZpZeile) => z.start >= 0 && z.stopp > z.start), 'nie vor den Beginn 0').toBe(true);
  });
  it('Wechsel zum Beginn (0 oder früher): eine Zeile mit Wert 1 von Anfang an, keine zusätzliche Zeile (R3)', () => {
    const r = ok(umformenWechsel({ kennung: [1, 2], ende: [6, 6], ereignis: [0, 1], wechsel: [0, -3] }));
    expect(spalten(r.zeilen)).toEqual({ person: [1, 2], start: [0, 0], stopp: [6, 6], ereignis: [0, 1], wert: [1, 1] }); expect(r.hinweise).toMatchObject({ wechselAmAnfang: 2, geteilt: 0, ohneWechsel: 0, zeilen: 2, ereignisse: 1 });
  });
  it('ungültige Personen werden ausgelassen und gezählt, die Nummer bleibt die Position in der Eingabe: Ende 0, Ende fehlend, Ereignis 2, Ende negativ, Kennung fehlend', () => {
    const r = ok(umformenWechsel({ kennung: ['A', 'B', 'C', 'D', 'E', null, 'G', ''], ende: [10, 0, null, 7, -2, 5, 5, 5], ereignis: [1, 1, 1, 2, 0, 1, 1, 1], wechsel: [3, 1, 1, 1, 1, 1, null, 1] }));
    expect(r.hinweise).toMatchObject({ personen: 2, ausgeschlossen: 6, zeilen: 3, ereignisse: 2 }); expect(spalten(r.zeilen)).toEqual({ person: [1, 1, 7], start: [0, 3, 0], stopp: [3, 10, 5], ereignis: [0, 1, 1], wert: [0, 1, 0] });
  });
  it('keine gültige Person → { ok: false, code: "keine-personen" }, kein Absturz', () => {
    expect(umformenWechsel({ kennung: ['A', 'B'], ende: [0, null], ereignis: [1, 1], wechsel: [null, null] })).toEqual({ ok: false, code: 'keine-personen' });
    expect(umformenWechsel({ kennung: [], ende: [], ereignis: [], wechsel: [] })).toEqual({ ok: false, code: 'keine-personen' });
  });
  it('1000 Personen: sofort fertig (Zeitgrenze 1 s); Zeilen = Personen + geteilte Personen; keine NaN', () => {
    const n = 1000, ende = Array.from({ length: n }, (_, i) => 1 + ((i * 37) % 90)), wechsel = Array.from({ length: n }, (_, i) => (i % 3 === 0 ? null : ((i * 53) % 100) - 5));
    const t0 = performance.now(); const r = ok(umformenWechsel({ kennung: Array.from({ length: n }, (_, i) => `P${i}`), ende, ereignis: ende.map((_, i) => i % 2), wechsel })); expect(performance.now() - t0).toBeLessThan(1000);
    expect(r.zeilen.length).toBe(n + r.hinweise.geteilt); expect(r.zeilen.every((z: ZpZeile) => Number.isFinite(z.start) && Number.isFinite(z.stopp))).toBe(true);
  });
});

describe('Prüfung der Intervall-Form (Fehler vor der Rechnung, Hinweise)', () => {
  const z = (kennung: string, start: number, stopp: number, ereignis: number, wert: number | null) => ({ kennung, start, stopp, ereignis, wert });
  it('Überlappung und Lücke je Person', () => {
    expect(pruefeIntervalle([z('A', 0, 5, 0, 0), z('A', 4, 8, 1, 1)]).fehler).toEqual(['ueberlappung']);
    expect(pruefeIntervalle([z('A', 0, 5, 0, 0), z('A', 6, 8, 1, 1)]).fehler).toEqual(['luecke']);
    expect(pruefeIntervalle([z('A', 4, 8, 1, 1), z('A', 0, 4, 0, 0)]).fehler, 'beliebige Reihenfolge der Zeilen, je Person nach Start sortiert').toEqual([]);
  });
  it('Start nicht kleiner als Stopp', () => { expect(pruefeIntervalle([z('A', 5, 5, 1, 0)]).fehler).toEqual(['start-nicht-kleiner']); expect(pruefeIntervalle([z('A', 6, 5, 1, 0)]).fehler).toEqual(['start-nicht-kleiner']); });
  it('mehrere Einsen je Person: „mehrere-ereignisse“ (Wiederholungsereignisse sind kein einfaches Cox-Modell); genau ein Ereignis, aber nicht in der letzten Zeile: „ereignis-nicht-am-ende“', () => {
    expect(pruefeIntervalle([z('A', 0, 5, 1, 0), z('A', 5, 8, 1, 1)]).fehler).toEqual(['mehrere-ereignisse']);
    expect(pruefeIntervalle([z('A', 0, 5, 1, 0), z('A', 5, 8, 0, 1)]).fehler).toEqual(['ereignis-nicht-am-ende']);
    expect(pruefeIntervalle([z('A', 0, 5, 1, 0), z('A', 5, 8, 0, 1), z('B', 0, 5, 1, 0), z('B', 5, 8, 1, 1)]).fehler).toEqual(['mehrere-ereignisse', 'ereignis-nicht-am-ende']);
  });
  it('Ereignisse nur bei Wert 0: Hinweis „ereignisse-nur-ein-wert“ (die Schätzung ist nicht möglich); nur bei Wert 1 ebenso; in beiden Zuständen: kein Hinweis', () => {
    const viele = (ereignisBei: (0 | 1)[]) => ereignisBei.flatMap((w, i) => [z(`P${i}`, 0, 4, 0, 0), z(`P${i}`, 4, 9, w === 1 ? 1 : 0, 1)]);
    const nur0 = [...Array.from({ length: 8 }, (_, i) => [z(`Q${i}`, 0, 9, 1, 0)]).flat(), ...Array.from({ length: 6 }, (_, i) => [z(`R${i}`, 0, 4, 0, 0), z(`R${i}`, 4, 9, 0, 1)]).flat()];
    const a = pruefeIntervalle(nur0); expect(a.hinweise).toContain('ereignisse-nur-ein-wert'); expect([a.ereignisseBeiWert0, a.ereignisseBeiWert1]).toEqual([8, 0]);
    const b = pruefeIntervalle(viele([1, 1, 1, 1, 1, 1, 1, 1])); expect(b.hinweise).toContain('ereignisse-nur-ein-wert'); expect([b.ereignisseBeiWert0, b.ereignisseBeiWert1]).toEqual([0, 8]);
    const c = pruefeIntervalle([...nur0, ...viele([1, 1, 1, 1, 1, 1])]); expect(c.hinweise).not.toContain('ereignisse-nur-ein-wert'); expect([c.ereignisseBeiWert0, c.ereignisseBeiWert1]).toEqual([8, 6]);
  });
  it('wenig Wechsel (weniger als 5 Personen): Hinweis „wenig-wechsel“; mit 5 Personen nicht', () => {
    const mk = (m: number) => Array.from({ length: 12 }, (_, i) => (i < m ? [z(`P${i}`, 0, 4, 0, 0), z(`P${i}`, 4, 9, i % 2, 1)] : [z(`P${i}`, 0, 9, i % 2, 0)])).flat();
    const a = pruefeIntervalle(mk(4)); expect(a.hinweise).toContain('wenig-wechsel'); expect(a.personenMitWechsel).toBe(4); const b = pruefeIntervalle(mk(5)); expect(b.hinweise).not.toContain('wenig-wechsel'); expect(b.personenMitWechsel).toBe(5);
  });
  it('leere Eingabe: nichts gefunden, keine NaN', () => { expect(pruefeIntervalle([])).toEqual({ fehler: [], hinweise: [], ereignisseBeiWert0: 0, ereignisseBeiWert1: 0, personenMitWechsel: 0 }); });
});

describe('Daten und Aufruf für R: nur Zahlen und feste Wörter', () => {
  const GEFAHR = [`x'); assign('.pwned', TRUE, globalenv()); ('`, 'a`; assign(".pwned", TRUE, globalenv()); `b'];
  const zeilen = (): ZpZeile[] => ok(umformenWechsel({ kennung: ['A', 'B', 'C'], ende: [10, 8, 12], ereignis: [1, 0, 1], wechsel: [4, null, 6], fest: { alter: [30, 40, 50], op: [0, 1, 1] } })).zeilen;
  it('Spalten mit festen R-Namen: id (Ganzzahl-Kennung), start, stopp, ereignis, p01 = zeitabhängige Größe, p02/p03 = feste Größen; Anzeigenamen in praed', () => {
    const dt = coxZpDaten(zeilen(), { wertName: 'Transplantation', festNamen: ['alter', 'op'] });
    expect(dt.spalten.map(x => x.name)).toEqual(['id', 'start', 'stopp', 'ereignis', 'p01', 'p02', 'p03']); expect(dt.spalten.every(x => x.art === 'zahl')).toBe(true);
    expect(dt.spalten[0]!.werte).toEqual([1, 1, 2, 3, 3]); expect(dt.spalten[1]!.werte).toEqual([0, 4, 0, 0, 6]); expect(dt.spalten[2]!.werte).toEqual([4, 10, 8, 6, 12]); expect(dt.spalten[3]!.werte).toEqual([0, 1, 0, 0, 1]);
    expect(dt.spalten[4]!.werte).toEqual([0, 1, 0, 0, 1]); expect(dt.spalten[5]!.werte).toEqual([30, 30, 40, 50, 50]); expect(dt.spalten[6]!.werte).toEqual([0, 0, 1, 1, 1]);
    expect(dt.praed.map(p => p.name)).toEqual(['Transplantation', 'alter', 'op']); expect(dt.personen).toBe(3);
  });
  it('der Aufruf: genau die vereinbarte Form von sp_cox_zp, Efron voreingestellt, Breslow wählbar', () => {
    const dt = coxZpDaten(zeilen(), { wertName: 'T', festNamen: ['alter', 'op'] });
    expect(coxZpAufruf(dt)).toContain("sp_cox_zp(d, 'start', 'stopp', 'ereignis', 'id', c('p01', 'p02', 'p03'), character(0), 'efron')"); expect(coxZpAufruf(dt, 'breslow')).toContain("'breslow'");
    expect(coxZpAufruf(dt)).toMatch(/^tryCatch\(sp_cox_zp\(/);
  });
  it('gefährliche Spaltennamen und Kennungen (Anführungszeichen, Backticks): kommen nie in den Code; die Daten sind dieselben wie mit harmlosen Namen', () => {
    const z = ok(umformenWechsel({ kennung: GEFAHR.concat(['C']), ende: [10, 8, 12], ereignis: [1, 0, 1], wechsel: [4, null, 6], fest: { [GEFAHR[0]!]: [30, 40, 50] } })).zeilen as ZpZeile[];
    const dt = coxZpDaten(z, { wertName: GEFAHR[1]!, festNamen: [GEFAHR[0]!] }); const code = coxZpAufruf(dt);
    for (const g of GEFAHR) expect(code).not.toContain(g); expect(code).not.toContain('pwned'); expect(dt.praed.map(p => p.name)).toEqual([GEFAHR[1], GEFAHR[0]]);
    const harmlos = coxZpDaten(zeilen(), { wertName: 'T', festNamen: ['alter'] }); expect(dt.spalten.map(x => x.werte)).toEqual(harmlos.spalten.map(x => x.werte));
  });
  it('mit einer festen Größe ohne Wert in einer Zeile (null) bleibt die Lücke eine Lücke (R rechnet listenweise), nie NaN', () => {
    const z = ok(umformenWechsel({ kennung: ['A', 'B'], ende: [10, 8], ereignis: [1, 0], wechsel: [4, null], fest: { alter: [null, 40] } })).zeilen as ZpZeile[];
    const dt = coxZpDaten(z, { wertName: 'T', festNamen: ['alter'] }); expect(dt.spalten[5]!.werte).toEqual([null, null, 40]); expect(dt.spalten.flatMap(x => x.werte).some(v => typeof v === 'number' && Number.isNaN(v))).toBe(false);
  });
});

describe('Sätze (deutsch, du)', () => {
  const J = C.jasa;
  it('Umformsatz (Vignette-Regel): 103 Personen, 170 Zeilen, ein Wechsel am Ereignistag, „zählt schon“', () => {
    const t = umformSatz(J.zaehlt.hinweise); expect(t).toContain('103 Personen'); expect(t).toContain('170 Zeilen'); expect(t).toMatch(/Tag des Ereignisses/); expect(t).toMatch(/zählt schon/); expect(t).not.toMatch(/NaN|undefined|null/);
  });
  it('Umformsatz (streng): „zählt nicht“ und 169 Zeilen', () => { const t = umformSatz(J.streng.hinweise); expect(t).toContain('169 Zeilen'); expect(t).toMatch(/zählt nicht/); });
  it('niemand am Ereignistag: der Satz erwähnt den Ereignistag nicht; Wechsel nach dem Ende und ausgeschlossene Personen werden mit Zahl genannt', () => {
    const h = { ...J.streng.hinweise, wechselAmEnde: 0 }; expect(umformSatz(h)).not.toMatch(/Tag des Ereignisses/);
    const k = umformSatz({ ...J.streng.hinweise, wechselNachEnde: 3, ausgeschlossen: 2 }); expect(k).toMatch(/(^|[^\d])3 Personen/); expect(k).toMatch(/nach dem Ende/); expect(k).toMatch(/(^|[^\d])2 Personen/); expect(k).toMatch(/ausgeschlossen/);
  });
  it('Satz zum Unsterblichkeitsfehler: nur Werte, die zum Zeitpunkt schon bekannt waren', () => { const t = unsterblichkeitSatz(); expect(t).toMatch(/bekannt/); expect(t).toMatch(/Zeitpunkt/); expect(t).toMatch(/Werte/); });
});
