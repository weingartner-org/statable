/**
 * Befehle-Seite: ein REGRESSION-Befehl mit genau einer abhängigen und einer unabhängigen Zahlenspalte bekommt das Streudiagramm mit Regressionsgerade.
 * PSPP selbst zeichnet in REGRESSION nichts (kein /SCATTERPLOT); Statable zeichnet es aus denselben Daten wie die Tabelle (nur vollständige Fälle, Lücken und „keine Angabe“ fallen heraus).
 * Die Punkte werden zur Zeit des Laufs festgehalten, damit Tabelle und Bild zusammenpassen. Mit Fallgewicht gibt es kein Bild (kein Gewicht im Streudiagramm).
 */
import { s } from './sitzung.svelte';
import { fehlendMenge } from './fehlend';
import { gewichtLage } from './fallgewicht.svelte';

export interface RegStreu { x: string; y: string; punkte: [number, number][] }

/** Die Namen hinter `/NAME=`; Unterbefehle werden am „/“ getrennt, `TO`-Listen und `ALL` lassen das Bild weg. */
function unterbefehl(befehl: string, name: string): string[] | null {
  const m = new RegExp(`/\\s*${name}\\s*=?\\s*([^/]*)`, 'i').exec(befehl);
  if (!m) return null;
  const w = m[1]!.replace(/\.\s*$/, '').trim().split(/[\s,]+/).filter(Boolean);
  return w.some(x => /^(TO|ALL)$/i.test(x)) ? null : w;
}

/** Aus dem Befehlstext: alle REGRESSION-Befehle, die genau y und genau ein x haben. */
export function regressionZuLauf(syntax: string): RegStreu[] {
  const gl = gewichtLage();
  if (!s.projekt || gl.art !== 'aus') return [];
  const erg: RegStreu[] = [];
  const spalte = (n: string) => s.spalten.find(c => c.name.toLowerCase() === n.toLowerCase());
  for (const teil of syntax.split(/\.\s*(?:\r?\n|$)/)) {
    if (!/^\s*REGRESSION\b/i.test(teil)) continue;
    const dep = unterbefehl(teil, 'DEPENDENT'), vars = unterbefehl(teil, 'VARIABLES');
    if (!dep || dep.length !== 1 || !vars) continue;
    const y = spalte(dep[0]!), xs = vars.filter(v => v.toLowerCase() !== dep[0]!.toLowerCase());
    if (!y || y.art !== 'zahl' || xs.length !== 1) continue;
    const x = spalte(xs[0]!);
    if (!x || x.art !== 'zahl') continue;
    const ix = s.spalten.indexOf(x), iy = s.spalten.indexOf(y), fx = fehlendMenge(x), fy = fehlendMenge(y);
    const punkte = s.zeilen.flatMap(z => (typeof z[ix] === 'number' && typeof z[iy] === 'number' && !fx.includes(z[ix] as number) && !fy.includes(z[iy] as number) ? [[z[ix] as number, z[iy] as number] as [number, number]] : []));
    if (punkte.length >= 3) erg.push({ x: x.name, y: y.name, punkte });
  }
  return erg;
}
