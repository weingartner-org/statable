/**
 * Datum und Zeit (Später S-C; Fachblatt 4.5, Entscheidung Opus 5): Alter und Dauer wie PSPP/SPSS `DATEDIFF` - vollendete Einheiten, zur Null hin abgeschnitten.
 * 29.2.2000 → 28.2.2023 sind 22 Jahre (23 erst am 1.3.; entspricht BGB §§ 187, 188), 31.1.2024 → 30.4.2024 sind 2 Monate. `lubridate` weicht ab (23 und 3).
 * Alle Funktionen rechnen NAIV mit dem Datum, wie es dasteht (keine Zeitzone, keine Sommerzeit): intern mit `Date.UTC` bzw. Kalenderzahlen, nie mit lokaler Mitternacht.
 * Daten sind Text (`YYYY-MM-DD`, auch mit Uhrzeit), nie `Date`. „Heute“ gibt es nicht still: ein fester Stichtag steht als `DATE.DMY(17,10,2026)` im Befehl.
 */
import { AssistentFehler } from './datenassistent';
import { zit } from './befehlstext';
import { gueltigerName } from './skalabau';
import { L } from './sitzung.svelte';
import type { Daten } from './umformen';

export type Einheit = 'years' | 'quarters' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';
interface Zeit { y: number; m: number; d: number; s: number }   // s: Sekunden seit Mitternacht

const tageImMonat = (y: number, m: number) => [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
/** Erster Tag des SPSS-Kalenders (gregorianisch ab dem 15.10.1582). */
const vor1582 = (y: number, m: number, d: number) => y < 1582 || (y === 1582 && (m < 10 || (m === 10 && d < 15)));

function lies(t: string | null | undefined): Zeit | null {
  if (typeof t !== 'string') return null;
  const m = /^\s*(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?\s*$/.exec(t);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])], h = Number(m[4] ?? 0), mi = Number(m[5] ?? 0), se = Number(m[6] ?? 0);
  if (mo < 1 || mo > 12 || d < 1 || d > tageImMonat(y, mo) || h > 23 || mi > 59 || se > 59 || vor1582(y, mo, d)) return null;
  return { y, m: mo, d, s: h * 3600 + mi * 60 + se };
}
/** Sekunden seit 1970 (naiv, UTC). */
const sekunden = (z: Zeit) => Date.UTC(z.y, z.m - 1, z.d) / 1000 + z.s;
const abgeschnitten = (x: number) => { const r = Math.trunc(x); return r === 0 ? 0 : r; };

/** Vollendete Einheiten von `frueher` bis `spaeter`, zur Null hin abgeschnitten; negativ, wenn `spaeter` früher liegt. null bei ungültigem Datum oder vor dem 15.10.1582. */
export function datumDiff(spaeter: string, frueher: string, einheit: Einheit): number | null {
  const b = lies(spaeter), a = lies(frueher);
  if (!a || !b) return null;
  const diff = sekunden(b) - sekunden(a);
  switch (einheit) {
    case 'seconds': return diff;
    case 'minutes': return abgeschnitten(diff / 60);
    case 'hours': return abgeschnitten(diff / 3600);
    case 'days': return abgeschnitten(diff / 86400);
    case 'weeks': return abgeschnitten(abgeschnitten(diff / 86400) / 7);
  }
  // Kalendereinheiten: immer vom früheren zum späteren Zeitpunkt rechnen und das Vorzeichen zuletzt setzen
  const vorzeichen = diff < 0 ? -1 : 1;
  const [x, y] = diff < 0 ? [b, a] : [a, b];   // x früher, y später
  const vorMonate = y.d < x.d || (y.d === x.d && y.s < x.s) ? 1 : 0;
  const monate = 12 * (y.y - x.y) + (y.m - x.m) - vorMonate;
  const mmtt = (z: Zeit) => (z.m * 40 + z.d) * 100000 + z.s;
  const jahre = y.y - x.y - (mmtt(y) < mmtt(x) ? 1 : 0);
  const r = einheit === 'years' ? jahre : einheit === 'months' ? monate : abgeschnitten(monate / 3);
  return r === 0 ? 0 : vorzeichen * r;
}

/** Alter in Jahren am Stichtag; leer, wenn eines fehlt/ungültig ist oder der Stichtag vor der Geburt liegt (nie ein negatives Alter). */
export function alter(geburt: string | null, stichtag: string | null): number | null {
  if (!geburt || !stichtag) return null;
  const j = datumDiff(stichtag, geburt, 'years');
  const tage = datumDiff(stichtag, geburt, 'days');
  return j === null || tage === null || tage < 0 ? null : j;
}

/** Jahr, Monat, Tag oder Wochentag (wie SPSS/PSPP XDATE.WKDAY: Sonntag = 1 … Samstag = 7). */
export function datumTeil(datum: string, teil: 'jahr' | 'monat' | 'tag' | 'wochentag'): number | null {
  const z = lies(datum);
  if (!z) return null;
  return teil === 'jahr' ? z.y : teil === 'monat' ? z.m : teil === 'tag' ? z.d : new Date(Date.UTC(z.y, z.m - 1, z.d)).getUTCDay() + 1;
}

/** Ein getipptes Datum lesen. Zweistellige Jahre werden NIE geraten (Frage an die Person: 1945 oder 2045?); SPSS rechnet mit einem Fenster, das Statable nicht übernimmt. */
export function liesDatum(text: string, reihenfolge: 'TMJ' | 'MTJ' | 'JMT'): { ok: true; iso: string } | { ok: false; grund: 'jahrZwei' | 'ungueltig' | 'leer' | 'vor1582'; kandidaten?: number[] } {
  const t = (text ?? '').trim();
  if (t === '') return { ok: false, grund: 'leer' };
  const m = /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})\.?$/.exec(t);
  if (!m) return { ok: false, grund: 'ungueltig' };
  const [a, b, c] = [m[1]!, m[2]!, m[3]!];
  const [tg, mo, jj] = reihenfolge === 'TMJ' ? [a, b, c] : reihenfolge === 'MTJ' ? [b, a, c] : [c, b, a];
  if (tg.length > 2 || mo.length > 2) return { ok: false, grund: 'ungueltig' };
  if (jj.length === 2) { const zwei = Number(jj); return { ok: false, grund: 'jahrZwei', kandidaten: [1900 + zwei, 2000 + zwei] }; }
  if (jj.length !== 4) return { ok: false, grund: 'ungueltig' };
  const [y, mn, d] = [Number(jj), Number(mo), Number(tg)];
  if (mn < 1 || mn > 12 || d < 1 || d > tageImMonat(y, mn)) return { ok: false, grund: 'ungueltig' };
  if (vor1582(y, mn, d)) return { ok: false, grund: 'vor1582' };
  return { ok: true, iso: `${String(y).padStart(4, '0')}-${String(mn).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

/* ------------------------------------------------------------------ Befehl */
export type DatumOpt =
  | { art: 'differenz'; von: string; bis: string; einheit: Einheit; ziel: string; ueberschreiben?: boolean }
  | { art: 'alter'; geburt: string; stichtag: { art: 'spalte'; spalte: string } | { art: 'datum'; datum: string }; ziel: string; ueberschreiben?: boolean }
  | { art: 'teil'; datum: string; teil: 'jahr' | 'monat' | 'tag' | 'wochentag'; ziel: string; ueberschreiben?: boolean };

const EINHEIT = () => ({ years: L('Jahre', 'Years'), quarters: L('Quartale', 'Quarters'), months: L('Monate', 'Months'), weeks: L('Wochen', 'Weeks'), days: L('Tage', 'Days'), hours: L('Stunden', 'Hours'), minutes: L('Minuten', 'Minutes'), seconds: L('Sekunden', 'Seconds') });
const TEIL = () => ({ jahr: L('Jahr', 'Year'), monat: L('Monat', 'Month'), tag: L('Tag', 'Day'), wochentag: L('Wochentag (Sonntag = 1)', 'Weekday (Sunday = 1)') });
const XDATE = { jahr: 'XDATE.YEAR', monat: 'XDATE.MONTH', tag: 'XDATE.MDAY', wochentag: 'XDATE.WKDAY' } as const;

/** Der PSPP-Befehl für die Oberfläche (sichtbare Syntax). Fehler als AssistentFehler: ueberschreiben, name, spalte, datum. */
export function datumBefehl(d: Daten, o: DatumOpt): { syntax: string; ziel: string; bezeichnung: string; format: string } {
  const finde = (n: string) => d.spalten.findIndex(s => s.name.toUpperCase() === n.toUpperCase());
  const datumSpalte = (n: string) => { const i = finde(n); if (i < 0 || d.spalten[i]!.art !== 'datum') throw new AssistentFehler('spalte', n); return d.spalten[i]!.name; };
  if (!gueltigerName(o.ziel)) throw new AssistentFehler('name', o.ziel);
  if (finde(o.ziel) >= 0 && !o.ueberschreiben) throw new AssistentFehler('ueberschreiben', o.ziel);
  const zeilen: string[] = [];
  let bezeichnung: string;
  if (o.art === 'differenz') {
    const von = datumSpalte(o.von), bis = datumSpalte(o.bis);
    zeilen.push(`COMPUTE ${o.ziel} = DATEDIFF(${bis}, ${von}, "${o.einheit}").`);
    bezeichnung = `${EINHEIT()[o.einheit]} ${L(`von ${von} bis ${bis}`, `from ${von} to ${bis}`)}`;   // zwei feste Texte: die Einheit und „von … bis …“
  } else if (o.art === 'alter') {
    const geb = datumSpalte(o.geburt);
    if (o.stichtag.art === 'spalte') {
      const st = datumSpalte(o.stichtag.spalte);
      zeilen.push(`COMPUTE ${o.ziel} = DATEDIFF(${st}, ${geb}, "years").`, `IF (${st} < ${geb}) ${o.ziel} = $SYSMIS.`);   // Stichtag vor der Geburt: leer, nie ein negatives Alter
      bezeichnung = L(`Alter in Jahren (${geb} bis ${st})`, `Age in years (${geb} to ${st})`);
    } else {
      const z = lies(o.stichtag.datum);
      if (!z) throw new AssistentFehler('datum', o.stichtag.datum);
      zeilen.push(`COMPUTE ${o.ziel} = DATEDIFF(DATE.DMY(${z.d},${z.m},${z.y}), ${geb}, "years").`, `IF (DATE.DMY(${z.d},${z.m},${z.y}) < ${geb}) ${o.ziel} = $SYSMIS.`);
      const tt = `${String(z.d).padStart(2, '0')}.${String(z.m).padStart(2, '0')}.${z.y}`;
      bezeichnung = L(`Alter in Jahren am ${tt} (${geb})`, `Age in years on ${tt} (${geb})`);
    }
  } else {
    const dat = datumSpalte(o.datum);
    zeilen.push(`COMPUTE ${o.ziel} = ${XDATE[o.teil]}(${dat}).`);
    bezeichnung = `${TEIL()[o.teil]} ${L(`von ${dat}`, `of ${dat}`)}`;
  }
  zeilen.push(`VARIABLE LABELS ${o.ziel} ${zit(bezeichnung.slice(0, 250))}.`, `FORMATS ${o.ziel} (F8.0).`, `VARIABLE LEVEL ${o.ziel} (SCALE).`, 'EXECUTE.');
  return { syntax: zeilen.join('\n'), ziel: o.ziel, bezeichnung, format: 'F8.0' };
}
