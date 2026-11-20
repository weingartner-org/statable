/**
 * Daten ansehen (Field-Stufe 3, Daten-Bedienung d): „Gehe zu Zeile“ und „Suchen und Ersetzen“ in einer Spalte oder in allen.
 * Reine Funktionen; die Oberfläche (bausteine/DatenSuchen.svelte) zeigt die Treffer vorab und ersetzt über `aendereDaten` (ein Rückgängig-Schritt, ein Protokolleintrag).
 * Regeln: gesucht wird, was in der Zelle STEHT (Johannes 08.11.): Text, bei Zahlen mit Beschriftung („2 weiblich“) auch die Beschriftung und der angezeigte Wert.
 * Ganze Zelle: Zahlen exakt (1,5 = 1.5, nie 15), Beschriftung ganz. Teiltext: auch Teile von Zahl und Beschriftung. Ersetzt wird nur ein exakter Zahlenwert durch eine Zahl und Text in Textspalten;
 * Treffer in Beschriftungen und Zahlenteilen werden gefunden, aber nicht ersetzt (nichtErsetzbar).
 * Datumsspalten bleiben außen vor (ein Ersetzen könnte ungültige Daten erzeugen). Es gibt keinen Befehl: der Suchtext wird nie als Code gelesen.
 */
import type { Wert } from './eingabe';
import type { Daten } from './umformen';
import { liesZahlText } from './spaltenbedienung';
import { zahlDe } from './format';

export type SuchModus = 'zelle' | 'teil';
export interface SuchOpt { /** Spaltennamen; null = alle */ spalten: string[] | null; suche: string; ersatz: string; modus: SuchModus; gross: boolean }
export interface Treffer { zeile: number; spalte: number; name: string; vorher: string; nachher: Wert; /** false: der Ersatz passt nicht zur Spalte (kein Zahlenwert) */ ersetzbar: boolean }
export interface SuchPlan {
  fehler?: 'suche-leer' | 'keine-spalte'; treffer: Treffer[]; anzahl: number;
  /** Spalten ohne Suche: Datum, oder Zahl bei einem Suchtext, der keine Zahl ist */ uebersprungen: { name: string; grund: 'datum' | 'keine-zahl' }[];
  /** Spalten mit Treffern */ inSpalten: string[];
  /** Treffer, die nicht ersetzt werden (Ersatz ist keine Zahl) */ nichtErsetzbar: number;
}

const maskiert = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function suchen(d: Daten, o: SuchOpt): SuchPlan {
  const plan: SuchPlan = { treffer: [], anzahl: 0, uebersprungen: [], inSpalten: [], nichtErsetzbar: 0 };
  if (o.suche === '') { plan.fehler = 'suche-leer'; return plan; }
  const idx = d.spalten.map((_, i) => i).filter(i => !o.spalten || o.spalten.includes(d.spalten[i]!.name));
  if (!idx.length) { plan.fehler = 'keine-spalte'; return plan; }
  const zahl = liesZahlText(o.suche), ersatzZahl = o.ersatz.trim() === '' ? null : liesZahlText(o.ersatz);
  const ersatzOk = o.ersatz.trim() === '' || ersatzZahl !== null;
  const re = o.modus === 'teil' ? new RegExp(maskiert(o.suche), o.gross ? 'g' : 'gi') : null;
  const gleich = (a: string, b: string) => (o.gross ? a === b : a.toLowerCase() === b.toLowerCase());
  const mit = new Set<string>();
  for (const i of idx) {
    const sp = d.spalten[i]!;
    if (sp.art === 'datum') { plan.uebersprungen.push({ name: sp.name, grund: 'datum' }); continue; }
    for (let r = 0; r < d.zeilen.length; r++) {
      const v = d.zeilen[r]![i] ?? null;
      if (v === null || v === undefined) continue;
      if (sp.art === 'zahl') {
        if (typeof v !== 'number') continue;
        if (zahl !== null && v === zahl) {
          plan.anzahl++; mit.add(sp.name);
          if (!ersatzOk) plan.nichtErsetzbar++;
          plan.treffer.push({ zeile: r, spalte: i, name: sp.name, vorher: String(v), nachher: ersatzOk ? ersatzZahl : v, ersetzbar: ersatzOk });
          continue;
        }
        // Beschriftung und angezeigter Wert: wie auf dem Bildschirm („2 weiblich“); gefunden, aber nicht ersetzt
        const lbl = sp.werteLabels[String(v)];
        const kandidaten = lbl ? [lbl, `${zahlDe(v)} ${lbl}`, zahlDe(v)] : (o.modus === 'teil' ? [zahlDe(v), String(v)] : []);
        const treffer = kandidaten.some(k => (o.modus === 'zelle' ? gleich(k, o.suche) : (() => { re!.lastIndex = 0; return re!.test(k); })()));
        if (!treffer) continue;
        plan.anzahl++; mit.add(sp.name); plan.nichtErsetzbar++;
        plan.treffer.push({ zeile: r, spalte: i, name: sp.name, vorher: lbl ? `${zahlDe(v)} ${lbl}` : zahlDe(v), nachher: v, ersetzbar: false });
        continue;
      }
      const t = String(v);
      let neu: string | null = null;
      if (o.modus === 'zelle') { if (gleich(t, o.suche)) neu = o.ersatz; }
      else if (re) { re.lastIndex = 0; if (re.test(t)) neu = t.replace(new RegExp(re.source, re.flags), () => o.ersatz); }
      if (neu === null) continue;
      plan.anzahl++; mit.add(sp.name);
      plan.treffer.push({ zeile: r, spalte: i, name: sp.name, vorher: t, nachher: neu === '' ? null : neu, ersetzbar: true });
    }
  }
  plan.inSpalten = [...mit];
  return plan;
}

/** Die Daten mit allen ersetzbaren Treffern ersetzt (Spalten bleiben, Zeilen bleiben). */
export function ersetzeTreffer(d: Daten, plan: SuchPlan): { daten: Daten; ersetzt: number } {
  const zeilen = d.zeilen.map(z => [...z]) as Wert[][];
  let n = 0;
  for (const t of plan.treffer) if (t.ersetzbar) { zeilen[t.zeile]![t.spalte] = t.nachher; n++; }
  return { daten: { spalten: d.spalten, zeilen }, ersetzt: n };
}

/** „Gehe zu Zeile“: die Zeilennummer (1-basiert wie in der Tabelle) als 0-basierter Index, sonst ein Grund. Tausenderpunkte und Leerraum sind erlaubt. */
export function zeileNummer(text: string, anzahl: number): { index: number } | { fehler: 'leer' | 'keine-zahl' | 'zu-klein' | 'zu-gross' } {
  const t = text.trim().replace(/[\s'.]/g, '');
  if (t === '') return { fehler: 'leer' };
  if (!/^\d+$/.test(t)) return { fehler: 'keine-zahl' };
  const n = Number(t);
  if (n < 1) return { fehler: 'zu-klein' };
  if (n > anzahl) return { fehler: 'zu-gross' };
  return { index: n - 1 };
}
