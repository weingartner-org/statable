<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz, yZeilen } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import type { Anova2 } from '../lib/anova2';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  /** Interaktionsdiagramm der zweifaktoriellen Varianzanalyse (G3): Zellmittelwerte mit 95 %-KI, verbunden; eine Linie je Stufe des einen Faktors, auf der Waagerechten die Stufen des anderen.
   *  Parallele Linien: keine Wechselwirkung; sich kreuzende oder auseinanderlaufende Linien: Wechselwirkung. Auf der Waagerechten steht der Faktor mit den meisten Stufen (bei Gleichstand B),
   *  damit nicht viele Linien übereinanderliegen. Farbe, Punktform und Strichart unterscheiden die Linien (auch in Schwarz-Weiß). */
  let { e, aText, bText, yText = '', bereich }: { e: Pick<Anova2, 'zellen'>; aText: string; bText: string; yText?: string; /** gemeinsame Skala mehrerer Felder (Dreifaktoren-Diagramm): [kleinster, größter] Wert */ bereich?: [number, number] } = $props();
  const uid = $props.id();
  /** Faktor A auf der Waagerechten, wenn er mehr Stufen hat als B; sonst B. */
  const aWaag = $derived(new Set(e.zellen.map(z => z.a)).size > new Set(e.zellen.map(z => z.b)).size);
  const xStufen = $derived([...new Set(e.zellen.map(z => (aWaag ? z.a : z.b)))]), linien = $derived([...new Set(e.zellen.map(z => (aWaag ? z.b : z.a)))]);
  const xName = $derived(aWaag ? aText : bText), linienName = $derived(aWaag ? bText : aText);
  const punkt = (q: number, j: number) => e.zellen.find(z => (aWaag ? z.b === linien[q] && z.a === xStufen[j] : z.a === linien[q] && z.b === xStufen[j]))!;
  const k = $derived(xStufen.length), g = $derived(linien.length);
  const W = $derived(Math.max(560, 150 + k * 90)), H0 = 404, L0 = 64, R = 24, T = 52, U0 = 94;
  const L = $derived(L0 + yZusatz(yText, H0 - T - U0, 13, false));
  const FARBEN = ['var(--dg-a)', 'var(--dg-b)', 'var(--tinte)', 'var(--tinte-2)'];
  const STRICH = ['', '7 5', '2 5', '10 4 2 4'];
  const alle = $derived([...e.zellen.flatMap(z => [z.lo, z.hi, z.mittel]), ...(bereich ?? [])]);
  const lo = $derived(Math.min(kleinste(alle))), hi = $derived(Math.max(groesste(alle)));
  const schritt = $derived.by(() => { const roh = (hi - lo || 1) / 5, m = 10 ** Math.floor(Math.log10(roh)); return [1, 2, 5, 10].map(f => f * m).find(f => f >= roh) ?? m; });
  const oben = $derived(Math.ceil(hi / schritt - 1e-9) * schritt), unten = $derived(Math.floor(lo / schritt + 1e-9) * schritt);
  const y = (v: number) => T + (H - T - U) * (1 - (v - unten) / (oben - unten || 1));
  const x = (j: number) => L + 40 + (W - L - R - 80) * (k === 1 ? 0.5 : j / (k - 1));
  const versatz = (q: number) => (g === 1 ? 0 : (q - (g - 1) / 2) * 9);
  const ticks = $derived(Array.from({ length: Math.round((oben - unten) / schritt) + 1 }, (_, i) => unten + i * schritt));
  const kurz = (t: string) => (t.length > 16 ? t.slice(0, 15) + '…' : t);
  const schraeg = $derived(k > 6 || (xStufen.some(t => t.length > 12) && k > 4));
  const platzJe = $derived((W - L - R - 80) / Math.max(1, k - 1) * 0.92);
  const XZt = $derived(schraeg ? 0 : Math.max(0, ...xStufen.map(t => xZusatz(t, platzJe, 14, true))));
  const nMin = $derived(Math.min(...e.zellen.map(z => z.n))), nMax = $derived(Math.max(...e.zellen.map(z => z.n)));
  const fuss = $derived(Lx('Punkte: Mittelwerte. Striche: 95 %-KI.', 'Dots: means. Whiskers: 95% CI.') + ' ' + (nMin === nMax ? `n = ${nMin} ${Lx('je Zelle', 'per cell')}` : `n = ${nMin} ${Lx('bis', 'to')} ${nMax} ${Lx('je Zelle', 'per cell')}`));
  const XZn = $derived(xZusatz(xName, W - L - R, 13, true)), XZf = $derived(xZusatz(fuss, W - L - R));
  const H = $derived(H0 + XZt + XZn + XZf), U = $derived(U0 + XZt + XZn + XZf);
  const form = (q: number, cx: number, cy: number) => (q === 0 ? '' : q === 1 ? `M${cx - 5.5} ${cy - 5.5}h11v11h-11z` : q === 2 ? `M${cx} ${cy - 7}l7 12h-14z` : `M${cx} ${cy - 7}l6.5 7-6.5 7-6.5-7z`);
  const beschreibung = $derived(Lx(`Mittelwerte je Stufe von ${xName} und ${linienName} mit 95 %-KI. `, `Means by level of ${xName} and ${linienName} with 95% CI. `)
    + linien.map((l, q) => `${l}: ${xStufen.map((_, j) => `${xStufen[j]} ${zahlDe(punkt(q, j).mittel, 1)}`).join(', ')}.`).join(' '));
  const breiteJe = $derived(Math.min(150, (W - L - R - 16) / (g + 1)));
  const bt = $derived.by(() => {
    const t = bildtext('linie', { titel: Lx('Interaktionsdiagramm', 'Interaction plot'), xAchse: { name: xName }, yAchse: { name: yText || Lx('Mittelwert', 'Mean') }, x: xStufen,
      reihen: linien.map((l, q) => ({ name: l, werte: xStufen.map((_, j) => punkt(q, j).mittel) })) });
    return { ...t, beschreibung: [...t.beschreibung, Lx(`Eine Linie je Stufe von ${linienName}. ${fuss}`, `One line per level of ${linienName}. ${fuss}`)] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each ticks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  {#if yText}<YTitel x={16} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />{/if}
  {#each linien as _l, q}
    {@const f = FARBEN[q % 4]!}
    <polyline points={xStufen.map((_, j) => `${x(j) + versatz(q)},${y(punkt(q, j).mittel)}`).join(' ')} fill="none" stroke={f} stroke-width="2.5" stroke-dasharray={STRICH[q % 4]} stroke-linejoin="round" stroke-linecap="round" />
    {#each xStufen as _x, j}
      {@const c = punkt(q, j)}
      {@const cx = x(j) + versatz(q)}
      <line x1={cx} x2={cx} y1={y(c.hi)} y2={y(c.lo)} stroke={f} stroke-width="2" />
      <line x1={cx - 5} x2={cx + 5} y1={y(c.hi)} y2={y(c.hi)} stroke={f} stroke-width="2" /><line x1={cx - 5} x2={cx + 5} y1={y(c.lo)} y2={y(c.lo)} stroke={f} stroke-width="2" />
      {#if q % 4 === 0}<circle {cx} cy={y(c.mittel)} r="5.5" fill={f} stroke="var(--tinte)" stroke-width="1.2" />{:else}<path d={form(q % 4, cx, y(c.mittel))} fill={f} stroke="var(--tinte)" stroke-width="1.2" />{/if}
    {/each}
  {/each}
  {#each xStufen as t, j}
    <text x={x(j)} y={H - U + 22} text-anchor={schraeg ? 'end' : 'middle'} transform={schraeg ? `rotate(-30 ${x(j)} ${H - U + 22})` : undefined} font-weight="600" style="font-size:14px"><title>{t}</title>{#if schraeg}{kurz(t)}{:else}{#each yZeilen(t, platzJe, 14, true) as zl, zi}<tspan x={x(j)} dy={zi ? '1.25em' : 0}>{zl}</tspan>{/each}{/if}</text>
  {/each}
  <XTitel x={(L + W - R) / 2} y={H0 + XZt - 30} breite={W - L - R} text={xName} fett />
  <XTitel x={(L + W - R) / 2} y={H0 + XZt + XZn - 8} breite={W - L - R} text={fuss} klasse="klein" />
  <text x={L + 8} y="27" font-weight="600" style="font-size:14px"><title>{linienName}</title>{#each yZeilen(linienName, breiteJe - 8, 14, true, 2) as zl, zi}<tspan x={L + 8} dy={zi ? '1.25em' : 0}>{zl}</tspan>{/each}</text>
  {#each linien as l, q}
    {@const lx = L + 8 + (q + 1) * breiteJe}
    <g><line x1={lx} x2={lx + 26} y1="22" y2="22" stroke={FARBEN[q % 4]} stroke-width="2.5" stroke-dasharray={STRICH[q % 4]} />
      {#if q % 4 === 0}<circle cx={lx + 13} cy="22" r="5" fill={FARBEN[0]} stroke="var(--tinte)" stroke-width="1.2" />{:else}<path d={form(q % 4, lx + 13, 22)} fill={FARBEN[q % 4]} stroke="var(--tinte)" stroke-width="1.2" />{/if}
      <text x={lx + 32} y="27" style="font-size:14px"><title>{l}</title>{#each yZeilen(l, breiteJe - 36, 14, false, 2) as zl, zi}<tspan x={lx + 32} dy={zi ? '1.25em' : 0}>{zl}</tspan>{/each}</text></g>
  {/each}
</svg>
<BildBeschreibung {...bt} />
