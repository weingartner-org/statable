<script lang="ts">
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz, yZeilen } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import type { Messwiederholung } from '../lib/messwiederholung';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /** Mittelwert je Zeitpunkt mit 95 %-KI, verbunden; bei Gruppen eine Linie je Gruppe (Farbe, Punktform und Strichart unterscheiden sie). */
  let { e, zeitTexte, gruppenTexte, yText = '' }: { e: Messwiederholung; zeitTexte: string[]; gruppenTexte: string[]; yText?: string } = $props();
  const k = $derived(e.zeitpunkte.length), g = $derived(e.zellen.length);
  const W = $derived(Math.max(560, 150 + k * 90)), H0 = 380, L0 = 64, R = 24, T = $derived(g > 1 ? 52 : 24), U0 = 70;
  /** Linker Rand wächst mit, wenn der senkrechte Titel umbricht (Regel lib/ytitel.ts). */
  const L = $derived(L0 + yZusatz(yText, H0 - T - U0, 13, false));
  const FARBEN = ['var(--dg-a)', 'var(--dg-b)', 'var(--tinte)', 'var(--tinte-2)'];
  const STRICH = ['', '7 5', '2 5', '10 4 2 4'];
  const alle = $derived(e.zellen.flatMap(z => z.flatMap(c => [c.kiLo, c.kiHi, c.m])));
  const lo = $derived(Math.min(kleinste(alle))), hi = $derived(Math.max(groesste(alle)));
  const schritt = $derived.by(() => { const roh = (hi - lo || 1) / 5, m = 10 ** Math.floor(Math.log10(roh)); return [1, 2, 5, 10].map(f => f * m).find(f => f >= roh) ?? m; });
  const oben = $derived(Math.ceil(hi / schritt - 1e-9) * schritt), unten = $derived(Math.floor(lo / schritt + 1e-9) * schritt);
  const y = (v: number) => T + (H - T - U) * (1 - (v - unten) / (oben - unten || 1));
  const x = (j: number) => L + 40 + (W - L - R - 80) * (k === 1 ? 0.5 : j / (k - 1));
  const versatz = (q: number) => (g === 1 ? 0 : (q - (g - 1) / 2) * 9);
  const ticks = $derived(Array.from({ length: Math.round((oben - unten) / schritt) + 1 }, (_, i) => unten + i * schritt));
  const kurz = (t: string) => (t.length > 16 ? t.slice(0, 15) + '…' : t);
  const schraeg = $derived(k > 6 || zeitTexte.some(t => t.length > 12) && k > 4);
  /** Waagrechte Zeitpunkt-Namen brechen um statt abzuschneiden (Regel lib/ytitel.ts); schräge bleiben gekürzt, sie haben keinen Platz für Zeilen. */
  const platzJe = $derived((W - L - R - 80) / Math.max(1, k - 1) * 0.92);
  const XZt = $derived(schraeg ? 0 : Math.max(0, ...zeitTexte.map(t => xZusatz(t, platzJe, 14, true))));
  const fuss = $derived(Lx('Punkte: Mittelwerte. Striche: 95 %-KI.', 'Dots: means. Whiskers: 95% CI.') + (g > 1 ? ' ' + `n = ${e.gruppen.map(x => x.n).join(' / ')}` : ` n = ${e.n}`));
  const XZf = $derived(xZusatz(fuss, W - L - R));
  const H = $derived(H0 + XZt + XZf), U = $derived(U0 + XZt + XZf);
  /** Form der Punkte: Kreis, Quadrat, Dreieck, Raute */
  const form = (q: number, cx: number, cy: number) => (q === 0 ? '' : q === 1 ? `M${cx - 5.5} ${cy - 5.5}h11v11h-11z` : q === 2 ? `M${cx} ${cy - 7}l7 12h-14z` : `M${cx} ${cy - 7}l6.5 7-6.5 7-6.5-7z`);
  const bt = $derived(bildtext('linie', {
    titel: Lx('Verlauf über die Zeit', 'Change over time'),
    xAchse: { name: Lx('Zeitpunkt', 'Time point') }, yAchse: { name: yText || Lx('Mittelwert', 'Mean') }, x: zeitTexte.slice(0, k),
    reihen: e.zellen.map((zs, q) => ({ name: g > 1 ? gruppenTexte[q] : undefined, werte: zs.map(c => c.m) }))
  }));
  const beschreibung = $derived((g > 1
    ? Lx(`Mittelwerte je Gruppe über ${k} Zeitpunkte mit 95 %-KI. `, `Means by group over ${k} time points with 95% CI. `)
    : Lx(`Mittelwerte über ${k} Zeitpunkte mit 95 %-KI. `, `Means over ${k} time points with 95% CI. `)) +
    e.zellen.map((z, q) => `${g > 1 ? gruppenTexte[q] + ': ' : ''}${z.map((c, j) => `${zeitTexte[j]} ${zahlDe(c.m, 1)}`).join(', ')}.`).join(' '));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each ticks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  {#if yText}<YTitel x={16} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />{/if}
  {#each e.zellen as zs, q}
    {@const f = g === 1 ? 'var(--dg-a)' : FARBEN[q % 4]!}
    <polyline points={zs.map((c, j) => `${x(j) + versatz(q)},${y(c.m)}`).join(' ')} fill="none" stroke={f} stroke-width="2.5" stroke-dasharray={STRICH[q % 4]} stroke-linejoin="round" stroke-linecap="round" />
    {#each zs as c, j}
      {@const cx = x(j) + versatz(q)}
      <line x1={cx} x2={cx} y1={y(c.kiHi)} y2={y(c.kiLo)} stroke={f} stroke-width="2" />
      <line x1={cx - 5} x2={cx + 5} y1={y(c.kiHi)} y2={y(c.kiHi)} stroke={f} stroke-width="2" /><line x1={cx - 5} x2={cx + 5} y1={y(c.kiLo)} y2={y(c.kiLo)} stroke={f} stroke-width="2" />
      {#if q % 4 === 0}<circle {cx} cy={y(c.m)} r="5.5" fill={f} stroke="var(--tinte)" stroke-width="1.2" />{:else}<path d={form(q % 4, cx, y(c.m))} fill={f} stroke="var(--tinte)" stroke-width="1.2" />{/if}
      {#if g === 1}<text x={cx + 10} y={y(c.m) - 10} font-weight="650" style="font-size:14px">{zahlDe(c.m, 1)}</text>{/if}
    {/each}
  {/each}
  {#each zeitTexte as t, j}
    <text x={x(j)} y={H - U + 22} text-anchor={schraeg ? 'end' : 'middle'} transform={schraeg ? `rotate(-30 ${x(j)} ${H - U + 22})` : undefined} font-weight="600" style="font-size:14px"><title>{t}</title>{#if schraeg}{kurz(t)}{:else}{#each yZeilen(t, platzJe, 14, true) as zl, zi}<tspan x={x(j)} dy={zi ? '1.25em' : 0}>{zl}</tspan>{/each}{/if}</text>
  {/each}
  <XTitel x={(L + W - R) / 2} y={H0 + XZt - 8} breite={W - L - R} text={fuss} klasse="klein" />
  {#if g > 1}
    {#each e.zellen as _, q}
      {@const lx = L + 8 + q * Math.min(140, (W - L - R - 16) / g)}
      <g><line x1={lx} x2={lx + 26} y1="22" y2="22" stroke={FARBEN[q % 4]} stroke-width="2.5" stroke-dasharray={STRICH[q % 4]} />
        {#if q % 4 === 0}<circle cx={lx + 13} cy="22" r="5" fill={FARBEN[0]} stroke="var(--tinte)" stroke-width="1.2" />{:else}<path d={form(q % 4, lx + 13, 22)} fill={FARBEN[q % 4]} stroke="var(--tinte)" stroke-width="1.2" />{/if}
        <text x={lx + 32} y="27" style="font-size:14px"><title>{gruppenTexte[q]}</title>{#each yZeilen(gruppenTexte[q] ?? '', Math.min(140, (W - L - R - 16) / g) - 36, 14, false, 2) as zl, zi}<tspan x={lx + 32} dy={zi ? '1.25em' : 0}>{zl}</tspan>{/each}</text></g>
    {/each}
  {/if}
</svg>
<BildBeschreibung {...bt} beschreibung={[...bt.beschreibung, Lx('Punkte sind Mittelwerte, die Striche das 95-%-Konfidenzintervall (KI).', 'Dots are means, the whiskers the 95% confidence interval (CI).')]} />
