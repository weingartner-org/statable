<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import { achsenMarken, achsenBereich } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { zeitTeilstriche, type ZeitreiheE } from '../lib/zeitreiheblatt';
  import { hatBand, type PrognoseE } from '../lib/prognose';

  /**
   * Das Bild der Prognose (Fachblatt PROGNOSE-ARIMA, Abschnitt 3): die Werte als Linie, die Prognose gestrichelt, das 80- und das 95-%-Band und eine senkrechte Linie am letzten Wert.
   * Die Zeitachse läuft bis T + h (Teilstriche aus `zeitTeilstriche` über die verlängerte Positionsliste). Linienart und Band-Dichte unterscheiden die Teile (auch in Schwarz-Weiß).
   */
  let { e, p, wertText, zeitText = '', zeiten, stellen }: { e: Pick<ZeitreiheE, 'y' | 't' | 'erster' | 'raster'>; p: PrognoseE; wertText: string; zeitText?: string; zeiten: string[]; stellen: number } = $props();
  const uid = $props.id();
  const W = 720, H0 = 380, L0 = 66, R = 24, T = 54, U0 = 64;
  const zeitTitel = $derived(zeitText || Lx('Zeit', 'Time'));
  const L = $derived(L0 + yZusatz(wertText, H0 - T - U0, 14, true));
  const XZ = $derived(xZusatz(zeitTitel, W - L - R, 14, true));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);

  const a = $derived(p.antwort), h = $derived(a.mittel.length);
  const tLetzt = $derived(e.t[e.t.length - 1] ?? e.y.length);
  const tZukunft = $derived(Array.from({ length: h }, (_, i) => tLetzt + i + 1));
  const t0 = $derived(e.t[0] ?? 1), t1 = $derived(tLetzt + h);
  /** der letzte vorhandene Wert (die Reihe kann mit einer Lücke enden) und seine Position */
  const letzter = $derived((() => { for (let i = e.y.length - 1; i >= 0; i--) if (e.y[i] !== null) return { t: e.t[i] ?? tLetzt, v: e.y[i]! }; return { t: tLetzt, v: a.mittel[0]! }; })());
  const yLetzt = $derived(letzter.v), tWert = $derived(letzter.t);
  const alleY = $derived([...e.y.filter((v): v is number => v !== null), ...a.u95, ...a.o95, ...a.u80, ...a.o80, ...a.mittel]);
  const bereich = $derived(achsenBereich(Math.min(...alleY), Math.max(...alleY), 5));
  const unten = $derived(bereich[0]), oben = $derived(bereich[1]);
  const ticksY = $derived(achsenMarken(unten, oben, 5));
  const ticksX = $derived(zeitTeilstriche({ erster: e.erster, raster: e.raster, t: [...e.t, ...tZukunft] }, 8));
  const X = (t: number) => L + 8 + (W - L - R - 16) * (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - unten) / (oben - unten || 1));
  const pfad = (q: { t: number; v: number }[]) => q.map(z => `${X(z.t).toFixed(1)},${Y(z.v).toFixed(1)}`).join(' ');
  const stuecke = $derived.by(() => {
    const aus: { t: number; v: number }[][] = []; let akt: { t: number; v: number }[] = [];
    e.y.forEach((v, i) => { if (v === null) { if (akt.length) aus.push(akt); akt = []; } else akt.push({ t: e.t[i]!, v }); });
    if (akt.length) aus.push(akt);
    return aus;
  });
  /** Die Prognoselinie beginnt am letzten Wert, damit sie an die Linie der Werte anschließt. */
  const progLinie = $derived([{ t: tWert, v: yLetzt }, ...tZukunft.map((t, i) => ({ t, v: a.mittel[i]! }))]);
  const band = (u: number[], o: number[]) => {
    const vorn = tZukunft.map((t, i) => `${X(t).toFixed(1)},${Y(o[i]!).toFixed(1)}`), hinten = [...tZukunft].reverse().map((t, i) => `${X(t).toFixed(1)},${Y(u[h - 1 - i]!).toFixed(1)}`);
    return `M${X(tWert).toFixed(1)},${Y(yLetzt).toFixed(1)}L${vorn.join('L')}L${hinten.join('L')}Z`;
  };
  const punkte = $derived(e.y.length <= 150);
  const f = (v: number) => zahlDe(v, stellen);
  const band_ = $derived(hatBand(a));
  const beschreibung = $derived(!band_ ? Lx(`Prognose von ${wertText} für ${h} Zeitpunkte, ohne Intervall: ${zeiten[0] ?? ''} ${f(a.mittel[0]!)}, ${zeiten[h - 1] ?? ''} ${f(a.mittel[h - 1]!)}.`, `Forecast of ${wertText} for ${h} points in time, without an interval: ${zeiten[0] ?? ''} ${f(a.mittel[0]!)}, ${zeiten[h - 1] ?? ''} ${f(a.mittel[h - 1]!)}.`) : Lx(`Prognose von ${wertText} für ${h} Zeitpunkte: ${zeiten[0] ?? ''} ${f(a.mittel[0]!)} (95-%-Intervall von ${f(a.u95[0]!)} bis ${f(a.o95[0]!)}), ${zeiten[h - 1] ?? ''} ${f(a.mittel[h - 1]!)} (95-%-Intervall von ${f(a.u95[h - 1]!)} bis ${f(a.o95[h - 1]!)}).`,
    `Forecast of ${wertText} for ${h} points in time: ${zeiten[0] ?? ''} ${f(a.mittel[0]!)} (95% interval from ${f(a.u95[0]!)} to ${f(a.o95[0]!)}), ${zeiten[h - 1] ?? ''} ${f(a.mittel[h - 1]!)} (95% interval from ${f(a.u95[h - 1]!)} to ${f(a.o95[h - 1]!)}).`));
  const leg = $derived([
    { t: Lx('Werte', 'Values'), f: 'var(--dg-a)', s: '', band: 0 },
    { t: Lx('Prognose', 'Forecast'), f: 'var(--dg-b)', s: '9 5', band: 0 },
    ...(band_ ? [{ t: Lx('80-%-Band', '80% band'), f: 'var(--dg-b)', s: '', band: 0.28 }, { t: Lx('95-%-Band', '95% band'), f: 'var(--dg-b)', s: '', band: 0.13 }] : [])
  ]);
  const bt = $derived(bildtext('sonstiges', {
    artName: Lx('Prognose einer Zeitreihe', 'Forecast of a time series'), titel: Lx(`Prognose von ${wertText}`, `Forecast of ${wertText}`),
    xAchse: { name: zeitTitel }, yAchse: { name: wertText },
    saetze: [beschreibung, Lx(`Die Reihe hat ${e.y.length} Werte, der letzte Wert ist ${f(yLetzt)}. Die Prognose wird gestrichelt gezeichnet, dazu das 80-%-Band und das 95-%-Band.`, `The series has ${e.y.length} values, the last value is ${f(yLetzt)}. The forecast is drawn dashed, with the 80% band and the 95% band.`)],
    tabelle: { kopf: [zeitTitel, Lx('Prognose', 'Forecast'), ...(band_ ? [Lx('95 % unten', '95% lower'), Lx('95 % oben', '95% upper'), Lx('80 % unten', '80% lower'), Lx('80 % oben', '80% upper')] : [])],
      zeilen: a.mittel.map((m, i) => [zeiten[i] ?? String(i + 1), f(m), ...(band_ ? [f(a.u95[i]!), f(a.o95[i]!), f(a.u80[i]!), f(a.o80[i]!)] : [])]) }
  }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  {#each leg as l, i}
    {@const x0 = L + (i === 0 ? 0 : leg.slice(0, i).reduce((s, q) => s + 56 + q.t.length * 6.4, 0))}
    {#if l.band}<rect x={x0} y="14" width="28" height="16" fill={l.f} opacity={l.band * 1.6} />{:else}<line x1={x0} x2={x0 + 28} y1="22" y2="22" stroke={l.f} stroke-width="2.6" stroke-dasharray={l.s} />{/if}<text x={x0 + 34} y="26" style="font-size:12px">{l.t}</text>
  {/each}
  {#each ticksY as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each ticksX as k}<line x1={X(k.t)} x2={X(k.t)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(k.t)} y={H - U + 20} text-anchor="middle" class="klein">{k.label}</text>{/each}
  {#if band_}<path d={band(a.u95, a.o95)} fill="var(--dg-b)" opacity=".13" stroke="none" />
  <path d={band(a.u80, a.o80)} fill="var(--dg-b)" opacity=".28" stroke="none" />{/if}
  <line x1={X(tLetzt)} x2={X(tLetzt)} y1={T} y2={H - U} stroke="var(--tinte-2)" stroke-width="1.2" stroke-dasharray="2 4" />
  {#each stuecke as q}<polyline points={pfad(q)} fill="none" stroke="var(--dg-a)" stroke-width="2" stroke-linecap="round" />{/each}
  {#if punkte}{#each stuecke as q}{#each q as z}<circle cx={X(z.t)} cy={Y(z.v)} r="3" fill="var(--blatt)" stroke="var(--dg-a)" stroke-width="1.8" />{/each}{/each}{/if}
  <polyline points={pfad(progLinie)} fill="none" stroke="var(--dg-b)" stroke-width="2.6" stroke-dasharray="9 5" stroke-linecap="round" />
  <XTitel x={(L + W - R) / 2} y={H - 22 - XZ + 0} breite={W - L - R} text={zeitTitel} px={14} fett />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={wertText} px={14} fett />
  <text x={X(tLetzt) + 6} y={T + 12} class="klein" style="font-size:11px">{Lx('letzter Wert', 'last value')}</text>
</svg>
<BildBeschreibung {...bt} />
