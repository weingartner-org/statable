<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import { achsenMarken, achsenBereich } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { zeitTeilstriche, type ZeitreiheE } from '../lib/zeitreiheblatt';
  import type { MassnahmeE } from '../lib/massnahme';

  /**
   * Das Bild zu „Hat die Maßnahme gewirkt?“ (Fachblatt MASSNAHME, Abschnitt 1): die Werte als Linie, eine senkrechte Linie am Zeitpunkt der Maßnahme, die Prognose gestrichelt (die Stufe bleibt bestehen) mit 95-%-Band.
   * Linienart und Band-Dichte unterscheiden die Teile (auch in Schwarz-Weiß). Nichts wird aufgefüllt: Lücken unterbrechen die Linie.
   */
  let { e, m, wertText, zeitText = '', zeiten, stellen, zeitMassnahme }: { e: ZeitreiheE; m: MassnahmeE; wertText: string; zeitText?: string; zeiten: string[]; stellen: number; zeitMassnahme: string } = $props();
  const uid = $props.id();
  const W = 720, H0 = 380, L0 = 66, R = 24, T = 54, U0 = 64;
  const zeitTitel = $derived(zeitText || Lx('Zeit', 'Time'));
  const L = $derived(L0 + yZusatz(wertText, H0 - T - U0, 14, true));
  const XZ = $derived(xZusatz(zeitTitel, W - L - R, 14, true));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);

  const a = $derived(m.antwort), h = $derived(a.mittel.length);
  const tLetzt = $derived(e.t[e.t.length - 1] ?? e.y.length);
  const tZukunft = $derived(Array.from({ length: h }, (_, i) => tLetzt + i + 1));
  const t0 = $derived(e.t[0] ?? 1), t1 = $derived(tLetzt + h);
  /** der letzte vorhandene Wert (die Reihe kann mit einer Lücke enden) und seine Position */
  const letzter = $derived((() => { for (let i = e.y.length - 1; i >= 0; i--) if (e.y[i] !== null) return { t: e.t[i] ?? tLetzt, v: e.y[i]! }; return { t: tLetzt, v: a.mittel[0]! }; })());
  const yLetzt = $derived(letzter.v), tWert = $derived(letzter.t);
  const tMassnahme = $derived(e.t[m.wahl.t0 - 1] ?? m.wahl.t0);
  const alleY = $derived([...e.y.filter((v): v is number => v !== null), ...a.u95, ...a.o95, ...a.mittel]);
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
  const beschreibung = $derived(Lx(`Verlauf von ${wertText} mit der Maßnahme ab ${zeitMassnahme} und Prognose für ${h} Zeitpunkte: ${zeiten[0] ?? ''} ${f(a.mittel[0]!)} (95-%-Intervall von ${f(a.u95[0]!)} bis ${f(a.o95[0]!)}), ${zeiten[h - 1] ?? ''} ${f(a.mittel[h - 1]!)} (95-%-Intervall von ${f(a.u95[h - 1]!)} bis ${f(a.o95[h - 1]!)}).`,
    `Course of ${wertText} with the measure from ${zeitMassnahme} and forecast for ${h} points in time: ${zeiten[0] ?? ''} ${f(a.mittel[0]!)} (95% interval from ${f(a.u95[0]!)} to ${f(a.o95[0]!)}), ${zeiten[h - 1] ?? ''} ${f(a.mittel[h - 1]!)} (95% interval from ${f(a.u95[h - 1]!)} to ${f(a.o95[h - 1]!)}).`));
  const leg = $derived([
    { t: Lx('Werte', 'Values'), f: 'var(--dg-a)', s: '', band: 0 },
    { t: Lx('Prognose', 'Forecast'), f: 'var(--dg-b)', s: '9 5', band: 0 },
    { t: Lx('95-%-Band', '95% band'), f: 'var(--dg-b)', s: '', band: 0.13 }
  ]);
  const bt = $derived.by(() => {
    const leer = Array<number | null>(e.y.length).fill(null);
    const t = bildtext('linie', { titel: Lx('Zeitreihe mit Maßnahme', 'Time series with a measure'), xAchse: { name: zeitTitel }, yAchse: { name: wertText }, x: [...e.t, ...zeiten],
      reihen: [{ name: Lx('Werte', 'Values'), werte: [...e.y, ...zeiten.map(() => null)] }, { name: Lx('Prognose', 'Forecast'), werte: [...leer, ...a.mittel] },
        { name: Lx('95-%-Band unten', '95% band lower'), werte: [...leer, ...a.u95] }, { name: Lx('95-%-Band oben', '95% band upper'), werte: [...leer, ...a.o95] }] });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  {#each leg as l, i}
    {@const x0 = L + (i === 0 ? 0 : leg.slice(0, i).reduce((s, q) => s + 56 + q.t.length * 6.4, 0))}
    {#if l.band}<rect x={x0} y="14" width="28" height="16" fill={l.f} opacity={l.band * 1.6} />{:else}<line x1={x0} x2={x0 + 28} y1="22" y2="22" stroke={l.f} stroke-width="2.6" stroke-dasharray={l.s} />{/if}<text x={x0 + 34} y="26" style="font-size:12px">{l.t}</text>
  {/each}
  {#each ticksY as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each ticksX as k}<line x1={X(k.t)} x2={X(k.t)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(k.t)} y={H - U + 20} text-anchor="middle" class="klein">{k.label}</text>{/each}
  <path d={band(a.u95, a.o95)} fill="var(--dg-b)" opacity=".13" stroke="none" />
  <line x1={X(tMassnahme)} x2={X(tMassnahme)} y1={T} y2={H - U} stroke="var(--tinte)" stroke-width="1.6" stroke-dasharray="6 3" />
  {#each stuecke as q}<polyline points={pfad(q)} fill="none" stroke="var(--dg-a)" stroke-width="2" stroke-linecap="round" />{/each}
  {#if punkte}{#each stuecke as q}{#each q as z}<circle cx={X(z.t)} cy={Y(z.v)} r="3" fill="var(--blatt)" stroke="var(--dg-a)" stroke-width="1.8" />{/each}{/each}{/if}
  <polyline points={pfad(progLinie)} fill="none" stroke="var(--dg-b)" stroke-width="2.6" stroke-dasharray="9 5" stroke-linecap="round" />
  <XTitel x={(L + W - R) / 2} y={H - 22 - XZ + 0} breite={W - L - R} text={zeitTitel} px={14} fett />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={wertText} px={14} fett />
  <text x={X(tMassnahme) + 6} y={T + 12} class="klein" style="font-size:11px">{Lx('Maßnahme', 'measure')}</text>
</svg>
<BildBeschreibung {...bt} />
