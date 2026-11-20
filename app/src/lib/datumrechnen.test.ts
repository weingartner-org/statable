import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import { nodeEngine } from './testengine';
import { neuAufbauen } from './eingabe';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { parseCsv } from '../dialogs/csv';
import type { Daten } from './umformen';
import { AssistentFehler } from './datenassistent';
import { datumDiff, alter, datumTeil, liesDatum, datumBefehl, type Einheit } from './datumrechnen';

/* ===== Später, Welle S-C, Bauer B (Vorab: reine Funktionen): Datum und Zeit - Alter und Dauer wie PSPP/SPSS DATEDIFF =====
 * Fachblatt 4.5 und Entscheidung Opus 5 (Alter wie PSPP/SPSS): vollendete Einheiten, zur Null hin abgeschnitten; 29.2.2000 → 28.2.2023 sind 22 Jahre (23 erst am 1.3.; entspricht BGB §§ 187, 188), 31.1.2024 → 30.4.2024 sind 2 Monate.
 * `lubridate` weicht ab (23 Jahre, 3 Monate): abweichungen.datum_lubridate. Sollwerte: testdaten/spaeter-c-erwartet.json (daten.datum) aus scripts/spaeter-c-erwartet.R: erste Quelle die Handformel
 * (Jahre = Jahr₂ − Jahr₁ − (MMTT₂ < MMTT₁); Monate = 12·ΔJahr + ΔMonat − (Tag₂ < Tag₁); Wochen = floor(Tage/7)), zweite Quelle die echte PSPP-Engine: 278 Datumspaare × 5 Einheiten × 2 Richtungen und 7 Zeitpaare gleich.
 * Der Bauer ändert Test, Skript und JSON nicht. Alle Funktionen rechnen NAIV mit dem Datum, wie es dasteht (keine Zeitzone, keine Sommerzeit), und sind von der Zeitzone des Rechners unabhängig.
 *
 * ---------------------------------- Schnittstelle (festgelegt vom Prüfer; Modul lib/datumrechnen.ts, rein, ohne Oberfläche) ----------------------------------
 *  Datum als Text, nie als `Date` (Falle: lokale Mitternacht und Sommerzeit): `YYYY-MM-DD` oder `YYYY-MM-DD HH:MM:SS` (ISO, auch `T` statt Leerzeichen).
 *  type Einheit = 'years' | 'quarters' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds'
 *  datumDiff(spaeter: string, frueher: string, einheit: Einheit): number | null     vollendete Einheiten, ZUR NULL HIN abgeschnitten; negativ, wenn `spaeter` früher liegt (spiegelbildlich: datumDiff(a, b) = −datumDiff(b, a));
 *      null bei ungültigem Datum (31.4., 29.2. in Nicht-Schaltjahren, leer) und vor dem 15.10.1582 (SPSS-Kalender)
 *  alter(geburt: string | null, stichtag: string | null): number | null      = datumDiff(stichtag, geburt, 'years'); leer, wenn eines fehlt/ungültig ist ODER der Stichtag vor der Geburt liegt (nie ein negatives Alter)
 *  datumTeil(datum: string, teil: 'jahr' | 'monat' | 'tag' | 'wochentag'): number | null      Wochentag wie SPSS/PSPP XDATE.WKDAY: Sonntag = 1 … Samstag = 7
 *  liesDatum(text: string, reihenfolge: 'TMJ' | 'MTJ' | 'JMT'): { ok: true; iso: string } | { ok: false; grund: 'jahrZwei' | 'ungueltig' | 'leer' | 'vor1582'; kandidaten?: number[] }
 *      Trenner . / - ; Tag und Monat ein- oder zweistellig; ZWEISTELLIGE JAHRE werden nie geraten (grund 'jahrZwei', kandidaten die beiden Jahrhunderte um 2026: [1945, 2045]) - Frage an die Person; SPSS rechnet mit einem Fenster (EPOCH), das Statable nicht übernimmt
 *  datumBefehl(d: Daten, o: DatumOpt): { syntax: string; ziel: string; bezeichnung: string; format: string }      sichtbare PSPP-Syntax; AssistentFehler wie bei den anderen Assistenten (Zielname vergeben → 'ueberschreiben', ungültig → 'name', Spalte fehlt/ist kein Datum → 'spalte', ungültiger fester Stichtag → 'datum')
 *      DatumOpt = { art: 'differenz'; von: string; bis: string; einheit: Einheit; ziel: string; ueberschreiben?: boolean }                      // COMPUTE ziel = DATEDIFF(bis, von, "einheit")
 *               | { art: 'alter'; geburt: string; stichtag: { art: 'spalte'; spalte: string } | { art: 'datum'; datum: string }; ziel: string; ueberschreiben?: boolean }   // Jahre; Stichtag vor Geburt → leer
 *               | { art: 'teil'; datum: string; teil: 'jahr' | 'monat' | 'tag' | 'wochentag'; ziel: string; ueberschreiben?: boolean }              // XDATE.YEAR, XDATE.MONTH, XDATE.MDAY, XDATE.WKDAY
 *      NIE „heute“ still: ein fester Stichtag steht als `DATE.DMY(17,10,2026)` im Befehl und mit TT.MM.JJJJ in der Bezeichnung; `$TIME` und `$DATE` kommen nie vor.
 */
const D = (erwartet as any).daten.datum, ABW = (erwartet as any).abweichungen;
const EIN: Einheit[] = ['years', 'quarters', 'months', 'weeks', 'days'];

describe('datumDiff: 128 Datumspaare in fünf Einheiten und beiden Richtungen (Handformel = PSPP DATEDIFF auf allen 278 Paaren)', () => {
  it('vor und zurück, alle Einheiten (die 16 Prüfwerte des Fachblatts stehen vorn)', () => {
    for (const p of D.paare) for (const u of EIN) {
      expect(datumDiff(p.bis, p.von, u), `${p.von} → ${p.bis} ${u}`).toBe(p[u]);
      expect(datumDiff(p.von, p.bis, u), `${p.bis} → ${p.von} ${u} (rückwärts)`).toBe(p[`${u}_rueck`]);
    }
  });
  it('Fachblatt: 29.2.2000 → 28.2.2023: Jahre 22, Monate 275, Wochen 1200, Tage 8400; → 1.3.2023: Jahre 23, Tage 8401', () => {
    expect([datumDiff('2023-02-28', '2000-02-29', 'years'), datumDiff('2023-02-28', '2000-02-29', 'months'), datumDiff('2023-02-28', '2000-02-29', 'weeks'), datumDiff('2023-02-28', '2000-02-29', 'days')]).toEqual([22, 275, 1200, 8400]);
    expect([datumDiff('2023-03-01', '2000-02-29', 'years'), datumDiff('2023-03-01', '2000-02-29', 'days')]).toEqual([23, 8401]);
  });
  it('Monatsende: 31.1.2024 → 29.2.2024 sind 0 Monate (der 31. wird nicht erreicht), → 30.4.2024 sind 2 Monate (lubridate: 3); 15.3.2020 → 14.3.2021: 0 Jahre, 11 Monate, 52 Wochen; → 15.3.2021: 1 Jahr', () => {
    expect(datumDiff('2024-02-29', '2024-01-31', 'months')).toBe(0); expect(datumDiff('2024-04-30', '2024-01-31', 'months')).toBe(2); expect(datumDiff('2024-04-30', '2024-01-31', 'days')).toBe(90);
    expect([datumDiff('2021-03-14', '2020-03-15', 'years'), datumDiff('2021-03-14', '2020-03-15', 'months'), datumDiff('2021-03-14', '2020-03-15', 'weeks')]).toEqual([0, 11, 52]); expect(datumDiff('2021-03-15', '2020-03-15', 'years')).toBe(1);
    expect(ABW.datum_lubridate.lubridate.jahre_29_2).toBe(23); expect(ABW.datum_lubridate.lubridate.monate_31_1).toBe(3); expect(ABW.datum_lubridate.pspp).toEqual({ jahre: 22, monate: 2 });
  });
  it('Wochen: 1.1.2024 → 7.1.2024 sind 0 Wochen (6 Tage), → 8.1.2024 1 Woche; umgekehrt zur Null hin: −23 Jahre, −8401 Tage', () => {
    expect([datumDiff('2024-01-07', '2024-01-01', 'weeks'), datumDiff('2024-01-08', '2024-01-01', 'weeks'), datumDiff('2024-01-07', '2024-01-01', 'days')]).toEqual([0, 1, 6]);
    expect([datumDiff('2000-02-29', '2023-03-01', 'years'), datumDiff('2000-02-29', '2023-03-01', 'days')]).toEqual([-23, -8401]); expect(Object.is(datumDiff('2024-01-01', '2024-01-01', 'days'), -0)).toBe(false);
  });
  it('Stunden, Minuten, Sekunden und Tage zwischen Zeitpunkten (7 Paare gleich PSPP)', () => {
    for (const z of D.zeit) for (const u of ['days', 'hours', 'minutes', 'seconds'] as Einheit[]) expect(datumDiff(z.bis, z.von, u), `${z.von} → ${z.bis} ${u}`).toBe(z[u]);
  });
  it('Zeitumstellung (Hinweis in der Hilfe): 26.3.2023 01:00 → 04:00 sind naiv 3 Stunden (die Wanduhr zeigt real 2); 25.3. → 27.3. sind 2 Tage, ohne die Stunde der Umstellung', () => {
    const z = D.zeitumstellung; expect(datumDiff(z.bis, z.von, 'hours')).toBe(z.naiv_stunden); expect(z.wanduhr_stunden_real).toBe(2); expect(datumDiff(z.tage_ueber_umstellung.bis, z.tage_ueber_umstellung.von, 'days')).toBe(z.tage_ueber_umstellung.tage);
    expect(datumDiff('2023-10-29 04:00:00', '2023-10-29 01:00:00', 'hours')).toBe(3);   // Rückstellung: real 4 Stunden
  });
  it('Dauer in Minuten über Mitternacht braucht Datum UND Zeit: 25.3. 23:30 → 26.3. 00:15 sind 45 Minuten', () => { expect(datumDiff('2023-03-26 00:15:00', '2023-03-25 23:30:00', 'minutes')).toBe(45); });
  it('unabhängig von der Zeitzone des Rechners (Date.UTC / Kalendertage, nie lokale Mitternacht)', () => {
    const alt = process.env.TZ;
    try {
      for (const tz of ['Europe/Vienna', 'America/New_York', 'Pacific/Auckland', 'UTC']) {
        process.env.TZ = tz;
        expect(datumDiff('2023-03-27', '2023-03-25', 'days'), tz).toBe(2); expect(datumDiff('2023-10-30', '2023-10-28', 'days'), tz).toBe(2); expect(datumDiff('2023-03-26 04:00:00', '2023-03-26 01:00:00', 'hours'), tz).toBe(3);
        expect(datumDiff('2023-02-28', '2000-02-29', 'days'), tz).toBe(8400); expect(datumTeil('2000-02-29', 'wochentag'), tz).toBe(3);
      }
    } finally { if (alt === undefined) delete process.env.TZ; else process.env.TZ = alt; }
  });
  it('Ränder: ungültige oder fehlende Daten → null (nie NaN), Daten vor dem 15.10.1582 → null', () => {
    for (const [a, b] of [['2023-04-31', '2023-01-01'], ['2023-02-29', '2023-01-01'], ['', '2023-01-01'], ['2023-13-01', '2023-01-01'], ['abc', '2023-01-01'], ['2023-01-01', '']] as [string, string][]) expect(datumDiff(a, b, 'days'), `${a} / ${b}`).toBeNull();
    expect(datumDiff('1500-01-01', '1400-01-01', 'years')).toBeNull(); expect(datumDiff('1582-10-14', '1500-01-01', 'days')).toBeNull(); expect(datumDiff('1582-10-15', '1582-10-15', 'days')).toBe(0);
    expect(datumDiff('2023-02-29', '2023-01-01', 'years')).toBeNull(); expect(datumDiff('2024-02-29', '2023-01-01', 'years')).toBe(1);
    expect(datumDiff('2023-01-01T10:00:00', '2023-01-01 09:00:00', 'hours')).toBe(1);   // ISO mit T
  });
});

describe('alter: Alter am Stichtag (Fachblatt: 28.2.1990 / 1.3.1990 / 29.2.2000 / 31.12.1985, Stichtag 28.2.2024 → 34 / 33 / 23 / 38)', () => {
  for (const a of D.alter) it(`geboren ${a.geburt}, Stichtag ${a.stichtag}: ${a.alter ?? 'leer'}`, () => { expect(alter(a.geburt, a.stichtag)).toBe(a.alter); });
  it('Schalttagsgeburtstag: am 28.2. noch nicht, am 1.3. erreicht', () => { expect(alter('2000-02-29', '2023-02-28')).toBe(22); expect(alter('2000-02-29', '2023-03-01')).toBe(23); expect(alter('2000-02-29', '2024-02-29')).toBe(24); });
  it('Stichtag vor dem Geburtsdatum → leer und nie negativ; fehlendes Datum → leer', () => {
    expect(alter(D.stichtag_vor_geburt.geburt, D.stichtag_vor_geburt.stichtag)).toBeNull(); expect(alter(null, '2024-01-01')).toBeNull(); expect(alter('2000-01-01', null)).toBeNull(); expect(alter('2000-01-01', '2000-01-01')).toBe(0);
  });
});

describe('datumTeil: Jahr, Monat, Tag, Wochentag (SPSS: Sonntag = 1)', () => {
  for (const a of D.alter) it(`${a.geburt}`, () => { expect([datumTeil(a.geburt, 'jahr'), datumTeil(a.geburt, 'monat'), datumTeil(a.geburt, 'tag'), datumTeil(a.geburt, 'wochentag')]).toEqual([a.jahr, a.monat, a.tag, a.wochentag_spss]); });
  it('ungültig → null', () => { expect(datumTeil('2023-02-30', 'tag')).toBeNull(); expect(datumTeil('', 'jahr')).toBeNull(); });
});

describe('liesDatum: Formate, zweistellige Jahre nie raten, ungültige Tage', () => {
  for (const l of D.lesen) it(`„${l.text}“ (${l.format}) → ${l.ok ? l.iso : l.grund}`, () => {
    const r = liesDatum(l.text, l.format); expect(r.ok).toBe(l.ok);
    if (l.ok) expect((r as any).iso).toBe(l.iso); else { expect((r as any).grund).toBe(l.grund); if (l.kandidaten) expect((r as any).kandidaten).toEqual(l.kandidaten); }
  });
  it('Pflichtfall 13: bei „17.10.45“ ist die Antwort eine FRAGE (1945 oder 2045), kein Ergebnis', () => { const r = liesDatum('17.10.45', 'TMJ'); expect(r.ok).toBe(false); expect((r as any).kandidaten.length).toBe(2); });
});

/* ------------------------------------------------------------------------------------------------ Befehl in der echten Engine */
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
const dsp = (name: string, format = 'SDATE10') => sp(name, { art: 'datum', format, niveau: 'metrisch' });
const sd = (iso: string | null) => (iso === null ? null : iso.replace(/-/g, '/'));
let m: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { m = await nodeEngine(); });
function lade(d: Daten) { const { syntax, csv } = neuAufbauen(d.spalten, d.zeilen); const out = m.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv }); expect(out.filter(i => i.type === 'message' && (i as any).severity === 'error').map((i: any) => i.text)).toEqual([]); }
function spalte(name: string): (number | null)[] {
  m.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const z = parseCsv(new TextDecoder().decode(m.lies('/t.csv'))), j = z[0]!.map(s => s.toLowerCase()).indexOf(name.toLowerCase()); expect(j, `Spalte ${name}`).toBeGreaterThanOrEqual(0);
  return z.slice(1).map(r => (r[j]!.trim() === '' ? null : Number(r[j]) + 0));   // + 0: aus „-0“ wird 0
}
const ok = (syntax: string) => { const out = m.run(syntax); expect(out.filter(i => i.type === 'message' && /error|warning/.test((i as any).severity ?? '')).map((i: any) => i.text), syntax).toEqual([]); };

describe('datumBefehl in der echten PSPP-Engine (DATEDIFF, XDATE): dieselben Zahlen wie die Handformel', () => {
  it('Differenz in allen fünf Einheiten, vorwärts und rückwärts, für 40 Paare', () => {
    const P = D.paare.slice(0, 40) as any[], d: Daten = { spalten: [dsp('von'), dsp('bis')], zeilen: P.map(p => [sd(p.von), sd(p.bis)]) } as Daten;
    for (const u of EIN) {
      lade(d); const b = datumBefehl(d, { art: 'differenz', von: 'von', bis: 'bis', einheit: u, ziel: 'dif' }); ok(b.syntax); expect(b.format).toBe('F8.0'); expect(b.bezeichnung).toContain('von');
      spalte('dif').forEach((v, i) => expect(v, `${P[i].von} → ${P[i].bis} ${u}`).toBe(P[i][u]));
      lade(d); ok(datumBefehl(d, { art: 'differenz', von: 'bis', bis: 'von', einheit: u, ziel: 'dif' }).syntax); spalte('dif').forEach((v, i) => expect(v, `rückwärts ${u}`).toBe(P[i][`${u}_rueck`]));
    }
  });
  it('Alter am Stichtag aus einer Spalte; Stichtag vor der Geburt und fehlende Daten ergeben leer; das fehlende Datum macht keinen Fehler', () => {
    const A = D.alter as any[], d: Daten = { spalten: [dsp('geb'), dsp('stich')], zeilen: [...A.map(a => [sd(a.geburt), sd(a.stichtag)]), [null, '2024/02/28'], ['2000/01/01', null]] } as Daten;
    lade(d); ok(datumBefehl(d, { art: 'alter', geburt: 'geb', stichtag: { art: 'spalte', spalte: 'stich' }, ziel: 'alt' }).syntax);
    const got = spalte('alt'); A.forEach((a, i) => expect(got[i], `${a.geburt} / ${a.stichtag}`).toBe(a.alter)); expect(got[A.length]).toBeNull(); expect(got[A.length + 1]).toBeNull();
  });
  it('Alter an einem festen Stichtag: „heute“ steht IM Befehl (DATE.DMY(17,10,2026)) und in der Bezeichnung, nie $TIME', () => {
    const d: Daten = { spalten: [dsp('geb')], zeilen: [['1990/10/17'], ['1990/10/18'], ['2030/01/01']] } as Daten; lade(d);
    const b = datumBefehl(d, { art: 'alter', geburt: 'geb', stichtag: { art: 'datum', datum: D.heute.stichtag }, ziel: 'alt' }); ok(b.syntax);
    expect(b.syntax).toContain(D.heute.datum_dmy); expect(b.syntax).not.toMatch(/\$TIME|\$DATE/); expect(b.bezeichnung).toContain('17.10.2026'); expect(spalte('alt')).toEqual([36, 35, null]);
  });
  it('Datumsbestandteile: Jahr, Monat, Tag, Wochentag (Sonntag = 1)', () => {
    const A = D.alter as any[], d: Daten = { spalten: [dsp('dat')], zeilen: A.map(a => [sd(a.geburt)]) } as Daten;
    for (const [teil, f] of [['jahr', 'jahr'], ['monat', 'monat'], ['tag', 'tag'], ['wochentag', 'wochentag_spss']] as const) { lade(d); ok(datumBefehl(d, { art: 'teil', datum: 'dat', teil, ziel: 'tl' }).syntax); spalte('tl').forEach((v, i) => expect(v, `${teil} ${A[i].geburt}`).toBe(A[i][f])); }
  });
  it('Zeitpunkte (Datum und Uhrzeit): Stunden, Minuten, Sekunden, Tage wie datumDiff', () => {
    const Z = D.zeit as any[], d: Daten = { spalten: [dsp('t1', 'YMDHMS19'), dsp('t2', 'YMDHMS19')], zeilen: Z.map(z => [z.von, z.bis]) } as Daten;
    for (const u of ['days', 'hours', 'minutes', 'seconds'] as Einheit[]) { lade(d); ok(datumBefehl(d, { art: 'differenz', von: 't1', bis: 't2', einheit: u, ziel: 'dz' }).syntax); spalte('dz').forEach((v, i) => expect(v, `${Z[i].von} ${u}`).toBe(Z[i][u])); }
  });
  it('Fehler: Zielname vergeben → ueberschreiben; ungültiger Name → name; Spalte fehlt oder ist kein Datum → spalte; ungültiger fester Stichtag → datum', () => {
    const d: Daten = { spalten: [dsp('a'), dsp('b'), sp('zahl')], zeilen: [['2000/01/01', '2001/01/01', 5]] } as Daten, code = (f: () => unknown) => { try { f(); } catch (e) { return e instanceof AssistentFehler ? e.code : 'anderer'; } return 'kein Fehler'; };
    expect(code(() => datumBefehl(d, { art: 'differenz', von: 'a', bis: 'b', einheit: 'days', ziel: 'a' }))).toBe('ueberschreiben'); expect(code(() => datumBefehl(d, { art: 'differenz', von: 'a', bis: 'b', einheit: 'days', ziel: '1x' }))).toBe('name');
    expect(code(() => datumBefehl(d, { art: 'differenz', von: 'a', bis: 'zahl', einheit: 'days', ziel: 'z' }))).toBe('spalte'); expect(code(() => datumBefehl(d, { art: 'alter', geburt: 'gibt_es_nicht', stichtag: { art: 'datum', datum: '2026-10-17' }, ziel: 'z' }))).toBe('spalte');
    expect(code(() => datumBefehl(d, { art: 'alter', geburt: 'a', stichtag: { art: 'datum', datum: '2026-02-30' }, ziel: 'z' }))).toBe('datum');   // ungültiger fester Stichtag
  });
});
