/**
 * Holt die Rohdaten für die Diagramme aus den geladenen Daten (wie `zahlenZeilen` in diagrammbild.ts und `punkte` im Blatt):
 * Das Ergebnis des Blatts enthält nur PSPPs Tabellen, die Punkte, Reste und Kästen werden hier aus den Daten gezeichnet.
 * Beim Export rechnet Statable veraltete Blätter vorher neu (Abnahme 4, B1), die Daten passen dann zum Ergebnis.
 */
import { istFehlend, fehlendMenge, type Fehlmenge } from './fehlend';
import { s, spalteNach, type Blatt } from './sitzung.svelte';
import { werteVon } from './blatttitel';
import { istSetName } from './mehrfach';
import type { Faktoren, Haeufigkeit, Kennzahl, Kreuz, Verteilung, Vorhersage } from './ergebnis';
import { skalenArt, type SkalenArt } from './stufenfarben';
import { reste, mittel, type Reste } from './diagrammdaten';
import { shapiroWilk } from './normalitaet';
import { lilliefors } from './anpassung';
import { getrimmtesMittel } from './robust';
import { lesbar } from './verzeichnis';

const idx = (n: string) => s.spalten.findIndex(x => x.name === n);
/** Gültige Zahlen einer Spalte (ohne Lücken und ohne „keine Angabe“-Werte). */
export function zahlenDerSpalte(n: string): number[] {
  const i = idx(n), fehlend = fehlendMenge(spalteNach(n));
  if (i < 0) return [];
  return s.zeilen.flatMap(z => (typeof z[i] === 'number' && !fehlend.includes(z[i] as number) ? [z[i] as number] : []));
}
const verschiedene = (n: string) => { const i = idx(n), sp = spalteNach(n); return new Set(s.zeilen.map(z => z[i]).filter(v => v !== null && v !== undefined && !(typeof v === 'number' && istFehlend(sp, v)))).size; };

/** Die Zeilen der Daten für die genannten Spalten als Zahlen; Lücken und „keine Angabe“-Werte werden zu null (Reihenfolge = Reihenfolge der Namen). */
export function zahlenZeilenMitLuecken(namen: string[]): (number | null)[][] {
  const ix = namen.map(idx), fe = namen.map(n => fehlendMenge(spalteNach(n)));
  return s.zeilen.map(z => ix.map((i, k) => (i >= 0 && typeof z[i] === 'number' && !fe[k]!.includes(z[i] as number) ? (z[i] as number) : null)));
}

export interface VerteilungsDaten {
  /** Zahlenspalten (PSPP: DESCRIPTIVES) mit ihren Werten */
  zahlen: { kennzahl: Kennzahl; titel: string; werte: number[] }[];
  /** Kategorienspalten (PSPP: FREQUENCIES) */
  haeufig: Haeufigkeit[];
}
/** Zahlenspalten sind die, die der Befehl des Verfahrens mit DESCRIPTIVES rechnet (Zahl mit mehr als 12 verschiedenen Werten); sie stehen in der Reihenfolge der Auswahl. */
export function verteilungsDaten(b: Blatt, e: Verteilung, name: (n: string) => string): VerteilungsDaten {
  const echt = werteVon(b).l1.filter(n => !istSetName(n));
  const nur = echt.filter(n => spalteNach(n)?.art === 'zahl' && verschiedene(n) > 12);
  const kz = e.zahlen.filter(k => !k.stufen);   // gestufte Zahlen haben ihre Häufigkeitstabelle, kein Histogramm
  const zahlen = nur.length === kz.length ? kz.map((k, i) => ({ kennzahl: k, titel: name(nur[i]!), werte: zahlenDerSpalte(nur[i]!) })).filter(z => z.werte.length >= 2) : [];
  return { zahlen, haeufig: e.gruppen };
}

/** Hängt jeder Zahlenspalte den Shapiro-Wilk-Test und den Lilliefors-Test (Welle 7) an (dieselbe Auswahl der Spalten wie bei den Diagrammen); passt die Zuordnung nicht, bleibt das Ergebnis, wie es ist. */
export function mitNormalitaet(l1: string[], e: Verteilung, ohneTests = false): Verteilung {   // ohneTests: mit Fallgewicht zählen die Tests jede Zeile einmal - dann nicht rechnen
  // Welle 7: Kategorien (Text, Wertebeschriftungen, Niveau nominal/ordinal) bekommen den χ²-Anpassungstest, metrische Zahlenspalten mit wenigen Werten nie
  const spalten = l1.filter(n => !istSetName(n)).flatMap(n => spalteNach(n) ?? []);
  const istKat = (sp: (typeof spalten)[number]) => sp.art !== 'zahl' || Object.keys(sp.werteLabels).length > 0 || sp.niveau === 'nominal' || sp.niveau === 'ordinal';
  const passend = (h: Haeufigkeit) => spalten.find(sp => sp.name === h.name || sp.bezeichnung === h.name || lesbar(sp, true) === h.name);
  e = { ...e, gruppen: e.gruppen.map(h => { const sp = passend(h); return sp ? { ...h, kategorie: istKat(sp) } : h; }) };
  const nur = l1.filter(n => !istSetName(n) && spalteNach(n)?.art === 'zahl' && verschiedene(n) > 12);
  const kz = e.zahlen.filter(k => !k.stufen);
  if (ohneTests || nur.length !== kz.length) return e;
  const tests = new Map(kz.map((k, i) => { const w = zahlenDerSpalte(nur[i]!); return [k, { sw: shapiroWilk(w), lil: lilliefors(w) }] as const; }));
  return { ...e, zahlen: e.zahlen.map(k => { const r = tests.get(k); return r && (r.sw || r.lil) ? { ...k, ...(r.sw ? { sw: r.sw } : {}), ...(r.lil ? { lil: r.lil } : {}) } : k; }) };
}

/** Welle S-B: hängt jeder Zahlenspalte das 5 %-getrimmte Mittel an (wie SPSS und PSPP, anteilig; lib/robust.ts). `gewichte`: je Zeile der Daten das Häufigkeitsgewicht (0 = zählt nicht); ohne: jede Zeile einmal.
 *  Die Zuordnung der Kennzahl zur Spalte geht über den Namen wie bei den Häufigkeitstabellen; passt sie nicht, bleibt die Kennzahl, wie sie ist. */
export function mitGetrimmtem(l1: string[], e: Verteilung, gewichte?: number[] | null): Verteilung {
  const spalten = l1.filter(n => !istSetName(n)).flatMap(n => spalteNach(n) ?? []);
  return { ...e, zahlen: e.zahlen.map(k => {
    const sp = spalten.find(x => x.name === k.name || x.bezeichnung === k.name || lesbar(x, true) === k.name);
    if (!sp || sp.art !== 'zahl') return k;
    const i = idx(sp.name), werte: number[] = [], w: number[] = [];
    s.zeilen.forEach((z, r) => {
      const v = z[i], g = gewichte ? gewichte[r] ?? 0 : 1;
      if (typeof v === 'number' && !istFehlend(sp, v) && g > 0) { werte.push(v); w.push(g); }
    });
    const t = getrimmtesMittel(werte, gewichte ? w : undefined);
    return t === null ? k : { ...k, getrimmt: t };
  }) };
}

/** Die Zeilen der Daten als Zahlen für die lineare Regression: Ziel zuerst, dann die Prädiktoren (Gruppen-Spalten als 0/1-Hilfsspalten, wie im Befehl); Lücken und „keine Angabe“-Werte sind null. Eine Zeile je Zeile der Daten
 *  (der Zeilenindex gehört zum Fallgewicht). `null`, wenn die Daten nicht (mehr) zum Ergebnis passen. */
export function designZeilen(b: Blatt, e: Vorhersage): (number | null)[][] | null {
  const w = werteVon(b), ziel = w.l1[0], x = w.l2;
  if (!ziel || !x.length) return null;
  // Gruppen-Spalten (regfaktor.ts): je Hilfsspalte 1 bei ihrer Stufe, 0 bei den anderen Stufen, sonst fehlend - wie RECODE … INTO im Befehl.
  if (e.faktoren?.length) {
    if (e.praediktoren.some(p => !p.spalte)) return null;
    const iz = idx(ziel), fz = fehlendMenge(spalteNach(ziel));
    const spalten = e.praediktoren.map(p => ({ i: idx(p.spalte!), fe: fehlendMenge(spalteNach(p.spalte!)), f: p.faktor, werte: e.faktoren!.find(f => f.spalte === p.spalte)?.werte }));
    if (iz < 0 || spalten.some(c => c.i < 0)) return null;
    const zahlOder = (v: unknown, fe: Fehlmenge) => (typeof v === 'number' && !fe.includes(v) ? v : null);
    return s.zeilen.map(z => [zahlOder(z[iz], fz), ...spalten.map(c => {
      const v = z[c.i];
      if (!c.f) return zahlOder(v, c.fe);
      if (v === null || v === undefined || (typeof v === 'number' && c.fe.includes(v))) return null;
      const t = String(v);
      return c.werte?.includes(t) ? (t === c.f.wert ? 1 : 0) : null;
    })]);
  }
  if (x.length !== e.praediktoren.length) return null;
  const namen = [ziel, ...x], ix = namen.map(idx), fe = namen.map(n => fehlendMenge(spalteNach(n)));
  if (ix.some(i => i < 0)) return null;
  return s.zeilen.map(z => ix.map((i, k) => (typeof z[i] === 'number' && !fe[k]!.includes(z[i] as number) ? (z[i] as number) : null)));
}
/** Vorhergesagte Werte und Reste der linearen Regression; null, wenn die Daten nicht (mehr) zum Ergebnis passen. */
export function restDaten(b: Blatt, e: Vorhersage): Reste | null {
  const zeilen = designZeilen(b, e);
  return zeilen ? mitGegenprobe(zeilen, e) : null;
}
function mitGegenprobe(zeilen: (number | null)[][], e: Vorhersage): Reste | null {
  const r = reste(zeilen, e.praediktoren.map(p => p.b));
  if (!r) return null;
  // Gegenprobe: R² aus den Resten muss zu dem von PSPP passen - sonst stimmen Reihenfolge oder Daten nicht, und es wird lieber nichts gezeichnet.
  const y = zeilen.filter(z => z.every(v => v !== null)).map(z => z[0]!), my = mittel(y);
  const sst = y.reduce((a, v) => a + (v - my) ** 2, 0), sse = r.rest.reduce((a, v) => a + v * v, 0);
  return sst > 0 && Math.abs(1 - sse / sst - e.r2) < 0.002 ? r : null;
}

/** Eigenwerte und Zahl der extrahierten Faktoren, wenn PSPP sie ausgegeben hat. */
export const screeDaten = (e: Faktoren): { eigen: number[]; extrahiert: number } | null => (e.eigen && e.eigen.length >= 2 ? { eigen: e.eigen, extrahiert: e.faktoren.length } : null);

/** Die gezählte Spalte der Kreuztabelle (erste Auswahl des Blatts): Ist sie ordinal, bekommen die Antworten im Diagramm eine Abstufung statt unverbundener Farben. */
export function antwortSkala(b: Blatt, e: Kreuz): SkalenArt {
  const n = werteVon(b).l1[0], sp = n ? spalteNach(n) : undefined;
  return skalenArt(sp?.niveau, e.zaehlung?.spalten ?? []);
}
