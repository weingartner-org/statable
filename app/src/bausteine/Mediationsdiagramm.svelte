<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import type { Mediation, MedPfad } from '../lib/mediation';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  /** Das klassische Dreieck X → M → Y mit den Pfadkoeffizienten (B). Durchgezogen: p < ,05; gestrichelt: nicht belegt. */
  let { e, xText, mText, yText }: { e: Mediation; xText: string; mText: string; yText: string } = $props();
  const W = 680, H = 362;
  const kurz = (t: string) => (t.length > 24 ? t.slice(0, 23) + '…' : t);
  const stern = (p: number) => (p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '');
  const zahl = (p: MedPfad) => zahlDe(p.b, 2);
  const linie = (p: MedPfad) => (p.p < 0.05 ? '' : '7 5');
  const farbe = (p: MedPfad) => (p.p < 0.05 ? 'var(--tinte)' : 'var(--tinte-2)');
  const kiText = $derived(`${zahlDe(e.abLo, 2)}${Lx("; ", ", ")}${zahlDe(e.abHi, 2)}`);
  const beschreibung = $derived(Lx(
    `Pfaddiagramm: ${xText} → ${mText} (a = ${zahl(e.a)}), ${mText} → ${yText} (b = ${zahl(e.b)}), direkter Pfad ${xText} → ${yText} (c′ = ${zahl(e.direkt)}, gesamt c = ${zahl(e.total)}). Indirekter Effekt ab = ${zahlDe(e.ab, 2)}, 95 %-Bootstrap-KI [${kiText}].`,
    `Path diagram: ${xText} → ${mText} (a = ${zahl(e.a)}), ${mText} → ${yText} (b = ${zahl(e.b)}), direct path ${xText} → ${yText} (c′ = ${zahl(e.direkt)}, total c = ${zahl(e.total)}). Indirect effect ab = ${zahlDe(e.ab, 2)}, 95% bootstrap CI [${kiText}].`));
  const bt = $derived.by(() => {
    const t = bildtext('pfad', { titel: Lx('Pfaddiagramm der Mediation', 'Path diagram of the mediation'), knoten: [{ id: 'x', name: xText }, { id: 'm', name: mText }, { id: 'y', name: yText }],
      pfade: [{ von: 'x', nach: 'm', wert: e.a.b, p: e.a.p }, { von: 'm', nach: 'y', wert: e.b.b, p: e.b.p }, { von: 'x', nach: 'y', wert: e.direkt.b, p: e.direkt.p }] });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  <defs>
    <marker id="md-pf1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--tinte)" /></marker>
    <marker id="md-pf2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--tinte-2)" /></marker>
  </defs>
  {#each [[20, 222, xText, 'X'], [245, 30, mText, 'M'], [470, 222, yText, 'Y']] as [bx, by, t, k]}
    <g><rect x={bx as number} y={by as number} width="190" height="62" rx="8" fill="var(--flaeche, transparent)" stroke="var(--tinte)" stroke-width="1.8" />
      <text x={(bx as number) + 95} y={(by as number) + 27} text-anchor="middle" class="klein">{k}</text>
      <text x={(bx as number) + 95} y={(by as number) + 48} text-anchor="middle" font-weight="650" style="font-size:15px"><title>{t}</title>{kurz(t as string)}</text></g>
  {/each}
  <!-- a: X → M -->
  <line x1="140" y1="220" x2="278" y2="94" stroke={farbe(e.a)} stroke-width="2.2" stroke-dasharray={linie(e.a)} marker-end="url(#md-pf{e.a.p < 0.05 ? 1 : 2})" />
  <text x="172" y="142" text-anchor="end" font-weight="650" style="font-size:16px">a = {zahl(e.a)}{stern(e.a.p)}</text>
  <!-- b: M → Y -->
  <line x1="402" y1="94" x2="540" y2="220" stroke={farbe(e.b)} stroke-width="2.2" stroke-dasharray={linie(e.b)} marker-end="url(#md-pf{e.b.p < 0.05 ? 1 : 2})" />
  <text x="508" y="142" text-anchor="start" font-weight="650" style="font-size:16px">b = {zahl(e.b)}{stern(e.b.p)}</text>
  <!-- c′: X → Y -->
  <line x1="212" y1="253" x2="466" y2="253" stroke={farbe(e.direkt)} stroke-width="2.2" stroke-dasharray={linie(e.direkt)} marker-end="url(#md-pf{e.direkt.p < 0.05 ? 1 : 2})" />
  <text x="340" y="244" text-anchor="middle" font-weight="650" style="font-size:16px">c′ = {zahl(e.direkt)}{stern(e.direkt.p)}</text>
  <text x="340" y="282" text-anchor="middle" class="klein">{Lx('gesamt', 'total')} c = {zahl(e.total)}{stern(e.total.p)}</text>
  <text x="340" y="320" text-anchor="middle" font-weight="600" style="font-size:14px">{Lx('Indirekter Effekt', 'Indirect effect')} ab = {zahlDe(e.ab, 2)}, {Lx('95 %-Bootstrap-KI', '95% bootstrap CI')} [{kiText}]</text>
  <text x="340" y="352" text-anchor="middle" class="klein" style="font-size:11px">{Lx('Zahlen: B. * p < ,05  ** p < ,01  *** p < ,001. Gestrichelt: nicht belegt.', 'Numbers: B. * p < .05  ** p < .01  *** p < .001. Dashed: no clear evidence.')}</text>
</svg>
<BildBeschreibung {...bt} />
