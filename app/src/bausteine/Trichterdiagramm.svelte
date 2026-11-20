<script lang="ts">
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import { metaTicks, rueck, massKurz, META_K_EGGER, type Meta } from '../lib/metaanalyse';
  import { zahlDe } from '../lib/format';
  import { komma, ohneNull, pWert } from '../lib/ergebnis';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /** Funnel-Plot: Standardfehler (nach unten, umgekehrte Achse; oben die genauesten Studien) gegen den Effekt. Der Trichter zeigt um den gepoolten Effekt die Grenzen
   *  ± 1,96 · SE, in denen 95 % der Studien liegen, wenn es nur Zufallsstreuung gibt. Ist er nicht symmetrisch gefüllt, kann das auf Verzerrung hindeuten (oder echte Unterschiede). */
  let { e }: { e: Meta } = $props();
  /** Achsenmarke in der gewählten Zahlenschreibweise (Komma oder Punkt). */
  const tz = (t: string) => zahlDe(Number(t.replace('−', '-')), (t.split('.')[1] ?? '').length);
  const f = $derived(rueck(e));
  const zeig = (v: number) => (e.ein.art === 'r' ? ohneNull(f(v), 2) : komma(f(v), 2));
  const W = 560, H0 = 420, L0 = 62, R = 24, T = 26, U0 = 78;
  const maxSe = $derived(Math.max(groesste(e.studien.map(s => s.sei))) * 1.08);
  const spanne = $derived(Math.max(groesste(e.studien.map(s => Math.abs(s.yi - e.est))), 1.96 * maxSe));
  const lo = $derived(e.est - spanne * 1.05), hi = $derived(e.est + spanne * 1.05);
  const x = (v: number) => L + (W - L - R) * ((v - lo) / (hi - lo || 1));
  const y = (se: number) => T + (H - T - U) * (se / maxSe);
  const ticks = $derived(metaTicks(lo, hi, e.ein));
  const sTicks = $derived.by(() => { const roh = maxSe / 4, m = 10 ** Math.floor(Math.log10(roh)), st = [1, 2, 5, 10].map(q => q * m).find(q => q >= roh) ?? m; const o: number[] = []; for (let v = 0; v <= maxSe + 1e-9; v += st) o.push(v); return o; });
  const mk = $derived(massKurz(e.ein, Lx));
  const sk = $derived(e.ein.art === 'r' ? Lx('Standardfehler (von Fisher z)', 'Standard error (of Fisher z)') : e.ein.verhaeltnis ? Lx('Standardfehler (log-Skala)', 'Standard error (log scale)') : Lx('Standardfehler', 'Standard error'));
  /** Linker Rand wächst mit, wenn der senkrechte Titel umbricht (Regel lib/ytitel.ts). */
  const L = $derived(L0 + yZusatz(sk, H0 - T - U0, 13, true));
  const egger = $derived(Number.isFinite(e.eggerP) ? `${Lx('Egger-Test', 'Egger test')}: p ${pWert(e.eggerP)}${e.k < META_K_EGGER ? Lx(` (nur ${e.k} Studien: wenig aussagekräftig)`, ` (only ${e.k} studies: of little value)`) : ''}` : '');
  /** Waagrechte Titel brechen um (Regel lib/ytitel.ts): Höhe und unterer Rand wachsen mit, die Zeichenfläche bleibt. */
  const XZ1 = $derived(xZusatz(mk, W - L - R, 13, true)), XZ2 = $derived(xZusatz(egger, W - L - R, 12));
  const H = $derived(H0 + XZ1 + XZ2), U = $derived(U0 + XZ1 + XZ2);
  const beschreibung = $derived(Lx(
    `Trichterdiagramm mit ${e.studien.length} Studien: Effekt (${mk}) auf der waagerechten, Standardfehler auf der senkrechten Achse. Gepoolter Effekt ${zeig(e.est)}. `,
    `Funnel plot of ${e.studien.length} studies: effect (${mk}) on the horizontal axis, standard error on the vertical axis. Pooled effect ${zeig(e.est)}. `) +
    (Number.isFinite(e.eggerP) ? Lx(`Egger-Test auf Asymmetrie: p ${pWert(e.eggerP)}.`, `Egger test for asymmetry: p ${pWert(e.eggerP)}.`) : ''));
  const bt = $derived(bildtext('sonstiges', {
    artName: Lx('Trichterdiagramm (Funnel-Plot)', 'Funnel plot'), titel: Lx('Trichterdiagramm (Funnel-Plot)', 'Funnel plot'),
    xAchse: { name: mk }, yAchse: { name: sk },
    saetze: [beschreibung, Lx('Die senkrechte Achse ist umgekehrt: oben stehen die genauesten Studien. Der Trichter zeigt um den gepoolten Effekt die Grenzen von plus und minus 1,96 Standardfehlern.', 'The vertical axis is reversed: the most precise studies are at the top. The funnel shows the limits of plus and minus 1.96 standard errors around the pooled effect.'), ...(egger ? [egger + '.'] : [])],
    tabelle: { kopf: [Lx('Studie', 'Study'), mk, sk], zeilen: e.studien.map(st => [st.name, zeig(st.yi), komma(st.sei, 3)]) }
  }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each sTicks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={y(v) + 4} text-anchor="end" class="klein">{komma(v, v < 1 ? 2 : 1)}</text>{/each}
  <polygon points="{x(e.est)},{y(0)} {x(e.est - 1.96 * maxSe)},{y(maxSe)} {x(e.est + 1.96 * maxSe)},{y(maxSe)}" fill="var(--dg-a)" opacity="0.08" />
  <line x1={x(e.est)} y1={y(0)} x2={x(e.est - 1.96 * maxSe)} y2={y(maxSe)} stroke="var(--dg-achse)" stroke-dasharray="4 3" />
  <line x1={x(e.est)} y1={y(0)} x2={x(e.est + 1.96 * maxSe)} y2={y(maxSe)} stroke="var(--dg-achse)" stroke-dasharray="4 3" />
  <line x1={x(e.est)} x2={x(e.est)} y1={y(0)} y2={y(maxSe)} stroke="var(--dg-achse)" stroke-width="1.5" />
  {#each e.studien as st, i (i)}<circle cx={x(st.yi)} cy={y(st.sei)} r="5" fill="var(--dg-a)" stroke="var(--blatt)" stroke-width="1"><title>{st.name}: {zeig(st.yi)}, SE {komma(st.sei, 3)}</title></circle>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each ticks as t}<line x1={x(t.pos)} x2={x(t.pos)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={x(t.pos)} y={H - U + 19} text-anchor="middle" class="klein">{tz(t.text)}</text>{/each}
  <XTitel x={(L + W - R) / 2} y={H0 - 30} breite={W - L - R} text={mk} fett />
  <YTitel x={16} y={(T + H - U) / 2} laenge={H - T - U} text={sk} px={13} fett />
  <XTitel x={(L + W - R) / 2} y={H0 + XZ1 - 8} breite={W - L - R} text={egger} px={12} />
</svg>
<BildBeschreibung {...bt} />
