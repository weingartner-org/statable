<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import { kleinste, groesste } from '../lib/menge';
  import { zahlDe } from '../lib/format';
  import { L as Lx, Lp } from '../lib/sitzung.svelte';
  /** Scree-Plot: Eigenwerte der Komponenten der Reihe nach, waagrechte Linie bei 1 (Kaiser-Kriterium). Die extrahierten Faktoren sind gefüllt. */
  let { eigen, extrahiert }: { eigen: number[]; extrahiert: number } = $props();
  const kennung = $props.id();
  const W = 560, H = 340, L = 64, R = 28, T = 76, U = 58;
  const hoch = $derived(Math.max(1.2, Math.ceil(Math.max(groesste(eigen)) * 2) / 2));
  const Y = (v: number) => T + (H - T - U) * (1 - v / hoch);
  const X = (i: number) => L + 20 + (W - L - R - 40) * (eigen.length > 1 ? i / (eigen.length - 1) : 0.5);
  const marken = $derived(Array.from({ length: Math.floor(hoch / (hoch > 6 ? 2 : 1)) + 1 }, (_, i) => i * (hoch > 6 ? 2 : 1)));
  const schritt = $derived(eigen.length > 24 ? 5 : eigen.length > 12 ? 2 : 1);
  const beschriftet = $derived(eigen.length <= 12);
  const beschreibung = $derived(Lx(
    `Scree-Plot: Eigenwerte von ${eigen.length} Komponenten. ${eigen.slice(0, 8).map((v, i) => `${i + 1}: ${zahlDe(v, 2)}`).join('; ')}${eigen.length > 8 ? ' …' : ''}. Waagrechte Linie bei 1 (Kaiser-Kriterium). `,
    `Scree plot: eigenvalues of ${eigen.length} components. ${eigen.slice(0, 8).map((v, i) => `${i + 1}: ${zahlDe(v, 2)}`).join('; ')}${eigen.length > 8 ? ' …' : ''}. Horizontal line at 1 (Kaiser criterion). `) +
    Lp(extrahiert, `${extrahiert} Faktor hat einen Eigenwert über 1 und wird herausgezogen (gefüllte Punkte).`, `${extrahiert} Faktoren haben einen Eigenwert über 1 und werden herausgezogen (gefüllte Punkte).`, `${extrahiert} factor has an eigenvalue above 1 and is extracted (filled dots).`, `${extrahiert} factors have an eigenvalue above 1 and are extracted (filled dots).`));
  const bt = $derived(bildtext('scree', { eigen, extrahiert, titel: Lx('Scree-Plot der Eigenwerte', 'Scree plot of the eigenvalues') }));
</script>
{#if eigen.length >= 2}
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x="24" y="26" style="font-size:16px" font-weight="650">{Lx('Scree-Plot', 'Scree plot')}</text>
  <text x="24" y="50" class="klein">{Lx('Gefüllt: herausgezogen (Eigenwert über 1)', 'Filled: extracted (eigenvalue above 1)')}</text>
  {#each marken as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  <line x1={L} x2={W - R} y1={Y(1)} y2={Y(1)} stroke="var(--dg-b)" stroke-width="2.5" stroke-dasharray="7 5" />
  <text x={W - R - 2} y={Y(1) - 7} text-anchor="end" font-weight="600" style="font-size:13px;fill:var(--dg-b)">{Lx('Eigenwert 1 (Kaiser)', 'Eigenvalue 1 (Kaiser)')}</text>
  <polyline points={eigen.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} fill="none" stroke="var(--dg-a)" stroke-width="2.5" stroke-linecap="round" />
  {#each eigen as v, i}
    <circle cx={X(i)} cy={Y(v)} r="6" fill={i < extrahiert ? 'var(--dg-a)' : 'var(--blatt)'} stroke="var(--dg-a)" stroke-width="2.5"><title>{Lx(`Faktor ${i + 1}`, `Factor ${i + 1}`)}: {zahlDe(v, 2)}</title></circle>
    {#if beschriftet}<text x={X(i)} y={i < extrahiert ? Y(v) - 14 : Y(v) + 24} text-anchor="middle" font-weight="600" style="font-size:12px">{zahlDe(v, 2)}</text>{/if}
    {#if (i + 1) % schritt === 0 || i === 0}<text x={X(i)} y={H - U + 22} text-anchor="middle" class="klein">{i + 1}</text>{/if}
  {/each}
  <text x={(W + L) / 2} y={H - 8} text-anchor="middle" class="klein">{Lx('Faktor (Komponente)', 'Factor (component)')}</text>
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={Lx('Eigenwert', 'Eigenvalue')} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
{/if}
