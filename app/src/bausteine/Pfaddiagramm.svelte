<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { kleinste, groesste } from '../lib/menge';
  import type { CfaErg } from '../lib/rverfahren.svelte';
  import { ohneNull as zahlDe } from '../lib/ergebnis';
  import { L as Lx, Lp } from '../lib/sitzung.svelte';
  import { faktorName } from '../lib/rsaetze';
  /** Pfaddiagramm der konfirmatorischen Faktorenanalyse: Faktoren als Kreise (links), Fragen als Kästen (rechts), standardisierte Ladungen an den Pfeilen,
   *  Faktorkorrelationen als Bögen ganz links. Durchgezogen: Ladung belegt (p < ,05); gestrichelt: nicht belegt. */
  let { c, name }: { c: CfaErg; name: (q: string) => string } = $props();
  const kurz = (t: string, n = 34) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  const ZH = 34, LUECKE = 22, R = 34, BX = 440, BW = 250, KX = 175;
  const stern = (p: number | null) => (p === null ? '' : p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '');
  /** Layout: Fragen untereinander, nach Faktor gruppiert (mit Lücke); Kreis in der Mitte seiner Gruppe. */
  const lay = $derived.by(() => {
    let y = 30; const g: { f: number; cy: number; boxen: { q: string; y: number; l: number; p: number | null }[] }[] = [];
    c.faktoren.forEach((_, f) => {
      const ls = c.ladungen.filter(l => l.faktor === f); if (!ls.length) return;
      const boxen = ls.map((l, i) => ({ q: l.frage, y: y + i * ZH, l: l.std, p: l.p }));
      g.push({ f, cy: y + ((ls.length - 1) * ZH) / 2 + 13, boxen });
      y += ls.length * ZH + LUECKE;
    });
    return { g, H: y - LUECKE + 24 };
  });
  const Wmax = 720;
  const links = $derived(Math.max(40, groesste(c.kor.map(k => 30 + 26 * Math.abs(k.a - k.b)))));
  const versatz = $derived(Math.max(0, Math.round(links * 0.75) - 70));
  const cy = (f: number) => lay.g.find(x => x.f === f)?.cy ?? 0;
  const beschreibung = $derived(
    Lp(c.faktoren.length, `Pfaddiagramm: ${c.faktoren.length} Faktor mit standardisierten Ladungen.`, `Pfaddiagramm: ${c.faktoren.length} Faktoren mit standardisierten Ladungen.`, `Path diagram: ${c.faktoren.length} factor with standardized loadings.`, `Path diagram: ${c.faktoren.length} factors with standardized loadings.`) +
    ` ${lay.g.map(x => `${faktorName(c, x.f)}: ${x.boxen.map(b => `${name(b.q)} ${zahlDe(b.l, 2)}`).join(', ')}`).join('. ')}.` +
    (c.kor.length ? ' ' + Lx(`Faktorkorrelationen: ${c.kor.map(k => Lx(`${faktorName(c, k.a)} und ${faktorName(c, k.b)} ${zahlDe(k.r, 2)}`, `${faktorName(c, k.a)} and ${faktorName(c, k.b)} ${zahlDe(k.r, 2)}`)).join(', ')}.`, `Factor correlations: ${c.kor.map(k => Lx(`${faktorName(c, k.a)} und ${faktorName(c, k.b)} ${zahlDe(k.r, 2)}`, `${faktorName(c, k.a)} and ${faktorName(c, k.b)} ${zahlDe(k.r, 2)}`)).join(', ')}.`) : ''));
  const bt = $derived(bildtext('pfad', {
    titel: Lx('Pfaddiagramm der konfirmatorischen Faktorenanalyse', 'Path diagram of the confirmatory factor analysis'),
    knoten: [...c.faktoren.map((_, f) => ({ id: `F${f}`, name: faktorName(c, f), latent: true })), ...c.ladungen.map(l => ({ id: l.frage, name: name(l.frage) }))],
    pfade: [...c.ladungen.map(l => ({ von: `F${l.faktor}`, nach: l.frage, wert: l.std, p: l.p })), ...c.kor.map(k => ({ von: `F${k.a}`, nach: `F${k.b}`, wert: k.r, p: k.p, korrelation: true }))]
  }));
</script>
<svg class="diagramm" viewBox="0 0 {Wmax + versatz} {lay.H + 24}" role="img" aria-label={bt.kurz} style="max-width:{Wmax + versatz}px;min-width:{Math.min(Wmax + versatz, 640)}px">
  <defs><marker id="pd-pf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--tinte-2)" /></marker></defs>
  <g transform="translate({versatz} 0)">
    {#each c.kor as k (k.a + '-' + k.b)}
      {@const y1 = cy(k.a)}
      {@const y2 = cy(k.b)}
      {@const bog = 30 + 26 * Math.abs(k.a - k.b)}
      {@const x0 = KX - R}
      <path d="M{x0} {y1} C{x0 - bog} {y1} {x0 - bog} {y2} {x0} {y2}" fill="none" stroke="var(--tinte-2)" stroke-width="1.6" stroke-dasharray={k.p !== null && k.p < 0.05 ? '' : '7 5'} marker-start="url(#pd-pf)" marker-end="url(#pd-pf)" />
      <text x={x0 - bog * 0.75 - 4} y={(y1 + y2) / 2 + 4} text-anchor="end" style="font-size:13px" font-weight="650"><tspan style="paint-order:stroke;stroke:var(--blatt, #fff);stroke-width:4px">r = {zahlDe(k.r, 2)}{stern(k.p)}</tspan></text>
    {/each}
    {#each lay.g as gr (gr.f)}
      {#each gr.boxen as b (b.q)}
        {@const yb = b.y + 13}
        <line x1={KX + R * 0.95} y1={gr.cy + (yb - gr.cy) * 0.12} x2={BX} y2={yb} stroke="var(--tinte-2)" stroke-width="1.6" stroke-dasharray={b.p !== null && b.p < 0.05 ? '' : '7 5'} marker-end="url(#pd-pf)" />
        <text x={KX + R * 0.95 + (BX - KX - R * 0.95) * 0.8} y={gr.cy + (yb - gr.cy) * 0.8 - 5} text-anchor="middle" style="font-size:12.5px" font-weight="650"><tspan style="paint-order:stroke;stroke:var(--blatt, #fff);stroke-width:4px">{zahlDe(b.l, 2)}{stern(b.p)}</tspan></text>
        <rect x={BX} y={b.y} width={BW} height="26" rx="6" fill="var(--flaeche, transparent)" stroke="var(--tinte)" stroke-width="1.4" />
        <text x={BX + 10} y={b.y + 18} style="font-size:13px"><title>{name(b.q)}</title>{kurz(name(b.q))}</text>
      {/each}
      <circle cx={KX} cy={gr.cy} r={R} fill="var(--akzent-hell, transparent)" stroke="var(--tinte)" stroke-width="1.8" />
      <text x={KX} y={gr.cy + 4} text-anchor="middle" font-weight="650" style="font-size:13px"><title>{faktorName(c, gr.f)}</title>{kurz(faktorName(c, gr.f), 10)}</text>
    {/each}
  </g>
  <text x={(Wmax + versatz) / 2} y={lay.H + 18} text-anchor="middle" class="klein" style="font-size:11px">{Lx('Zahlen: standardisierte Ladungen und Korrelationen. * p < ,05  ** p < ,01  *** p < ,001. Gestrichelt: nicht belegt.', 'Numbers: standardized loadings and correlations. * p < .05  ** p < .01  *** p < .001. Dashed: no clear evidence.')}</text>
</svg>
<BildBeschreibung {...bt} />
