/**
 * Später S-E: die Prüfliste vor dem Rechnen für die Quantilregression und die Strafregression - aus den Daten (`KatDaten`) die Zahlen, daraus die Sperren und Hinweise
 * (quantil.ts: `quantilPruefung`, strafreg.ts: `strafPruefung`, jeweils mit festen Sätzen). Reine Funktionen.
 */
import type { KatDaten } from './kategreg';
import { quantilPruefung, quantilCodeSatz, quantilTauPruefung, QR_TAU_STANDARD } from './quantil';
import { strafPruefung, strafCodeSatz } from './strafreg';

export interface VorhFaelle {
  /** Zeilen der Tabelle */ zeilen: number; /** vollständige Fälle */ n: number; ausgeschlossen: number;
  /** Koeffizienten mit Konstante */ pKoef: number; /** Vorhersagegrößen mit den Hilfsspalten der Gruppen (ohne Konstante) */ pGroessen: number;
  verschiedeneZiel: number; /** kleinste Gruppe unter den Gruppen-Vorhersagegrößen (Fälle), `undefined` ohne Gruppe */ kleinsteGruppe?: number;
  /** Zahlen-Spalten, die überall denselben Wert haben */ konstante: number; /** Zahlen-Spalten mit weniger als 3 verschiedenen Werten (und mehr als einem) */ wenigWerte: number;
}
/** Die Zahlen der Prüfung aus den R-Spalten (Ziel `y`, Vorhersagegrößen p01 …): nur Zeilen ohne Lücke in Ziel und Vorhersagegrößen zählen. */
export function vorhFaelle(dt: KatDaten): VorhFaelle {
  const sp = dt.spalten, zeilen = sp[0]?.werte.length ?? 0, voll: number[] = [];
  for (let i = 0; i < zeilen; i++) if (sp.every(s => s.werte[i] !== null && s.werte[i] !== undefined)) voll.push(i);
  let pGroessen = 0, konstante = 0, wenigWerte = 0, klein: number | undefined;
  dt.praed.forEach((p, k) => {
    const s = sp[1 + k]!, werte = voll.map(i => s.werte[i] as number), verschieden = new Set(werte);
    if (p.art === 'faktor') {
      const je = new Map<number, number>(); for (const v of werte) je.set(v, (je.get(v) ?? 0) + 1);
      pGroessen += Math.max(1, je.size - 1);
      for (const c of je.values()) klein = klein === undefined ? c : Math.min(klein, c);
    } else {
      pGroessen += 1;
      if (verschieden.size === 1) konstante++; else if (verschieden.size < 3) wenigWerte++;
    }
  });
  const verschiedeneZiel = new Set(voll.map(i => sp[0]!.werte[i])).size;
  return { zeilen, n: voll.length, ausgeschlossen: zeilen - voll.length, pKoef: pGroessen + 1, pGroessen, verschiedeneZiel, kleinsteGruppe: klein, konstante, wenigWerte };
}

export interface VorhBefund { art: 'sperre' | 'hinweis'; code: string; text: string }
/** Quantilregression: Sperren und Hinweise mit Sätzen. */
export function quantilBefunde(f: VorhFaelle, taus: number[] = QR_TAU_STANDARD): VorhBefund[] {
  const r = quantilPruefung({ n: f.n, p: f.pKoef, verschiedeneZiel: f.verschiedeneZiel, kleinsteGruppe: f.kleinsteGruppe, taus });
  const hinweisCodes = ['wenig-faelle', 'wenige-werte', 'kleine-gruppe', 'tau-hinweis'];
  const sperrTau = taus.find(t => quantilTauPruefung(f.n, f.pKoef, t) === 'sperre'), hinweisTau = taus.find(t => quantilTauPruefung(f.n, f.pKoef, t) === 'hinweis');
  return r.codes.map(c => ({ art: hinweisCodes.includes(c) ? 'hinweis' as const : 'sperre' as const, code: c, text: quantilCodeSatz(c, { n: f.n, p: f.pKoef, tau: c === 'tau-sperre' ? sperrTau : hinweisTau }) }));
}
/** Strafregression: Sperren und Hinweise mit Sätzen. */
export function strafBefunde(f: VorhFaelle, ohneStandardisierung = false): VorhBefund[] {
  const e = { n: f.n, p: f.pGroessen - f.konstante, konstante: f.konstante, ausgeschlossen: f.ausgeschlossen, wenigWerte: f.wenigWerte, ohneStandardisierung };
  const r = strafPruefung(e), sperren = ['gewicht', 'zu-wenig-faelle', 'zu-wenige-groessen', 'zu-viele-hilfsspalten'];
  return r.codes.map(c => ({ art: sperren.includes(c) ? 'sperre' as const : 'hinweis' as const, code: c, text: strafCodeSatz(c, e) }));
}
