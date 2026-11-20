<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import { theilSen, type Einzelfall } from '../lib/einzelfall';
  import { zahlDe } from '../lib/format';
  import { L as Lx, Lp } from '../lib/sitzung.svelte';
  import { GRENZE, reiheHinweis } from '../lib/stichprobe';
  /** Das klassische Verlaufsdiagramm der Einzelfallforschung: Messzeitpunkte auf der x-Achse, Linie mit Punkten, gestrichelte Phasenlinie zwischen A und B.
   *  Optional ein Mittelwert oder ein Trend (Theil-Sen) je Phase. Mehrere Fälle stehen als kleine Diagramme untereinander (multiple baseline), jedes mit eigener Hochachse. */
  let { e, yText = '', zeitText = '' }: { e: Einzelfall; yText?: string; zeitText?: string } = $props();
  const g = $derived(e.faelle.length);
  const W = 680, L = 64, R = 24, PT = $derived(g === 1 ? 360 : g === 2 ? 212 : 168), KOPF = $derived(g === 1 ? 30 : 52), FUSS = 62;
  const zeitTitel = $derived(zeitText || Lx('Messzeitpunkt', 'Measurement occasion'));
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): das Diagramm wird entsprechend höher. */
  const XZ = $derived(xZusatz(zeitTitel, W - L - R, 14, true));
  const H0 = $derived(g * PT + FUSS + 8), H = $derived(H0 + XZ);
  const xmax = $derived(Math.max(groesste(e.faelle.map(f => f.y.length))));
  const x = (i: number) => L + 16 + (W - L - R - 32) * (xmax <= 1 ? 0.5 : i / (xmax - 1));
  /** Punkte nur bis zur Grenze: bei mehr Messungen jede k-te (die Linie und alle Kennwerte nehmen alle Messungen). */
  const takt = $derived(Math.max(1, Math.ceil(Math.max(groesste(e.faelle.map(f => f.y.length))) / GRENZE.streu)));
  const phA = Lx('A (Ausgangslage)', 'A (baseline)'), phB = Lx('B (Förderung)', 'B (intervention)');
  /** Ungefähre Breite einer Phasenüberschrift (13 px fett) */
  const breite = (t: string) => t.length * 7.6 + 4;
  /** Überschrift mittig über der Phase, aber nie über die y-Achse oder den rechten Rand hinaus; in schmaler Phase nur der Buchstabe. */
  const kopfA = $derived(e.faelle.map(f => { const von = L, bis = x(f.a.n - 0.5), t = bis - von >= breite(phA) + 8 ? phA : 'A'; return { t, x: Math.max((von + bis) / 2, von + 8 + breite(t) / 2) }; }));
  const kopfB = $derived(e.faelle.map(f => { const von = x(f.a.n - 0.5), bis = W - R, t = bis - von >= breite(phB) + 8 ? phB : 'B'; return { t, x: Math.min((von + bis) / 2, bis - breite(t) / 2) }; }));
  const kurz = (t: string, n = 22) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

  /** Linien je Fall und Phase vorrechnen */
  const felder = $derived(e.faelle.map((f, q) => {
    const nA = f.a.n, y0 = 8 + q * PT, oben = y0 + KOPF, unten = y0 + PT - (q === g - 1 ? 0 : 16) - 12;
    const teile = [{ von: 0, bis: nA - 1, istB: false }, { von: nA, bis: f.y.length - 1, istB: true }].filter(t => t.bis >= t.von);
    const linien = teile.map(t => {
      const ys = f.y.slice(t.von, t.bis + 1);
      const m = ys.reduce((a, b) => a + b, 0) / ys.length;
      const ts = ys.length >= 3 ? theilSen(ys.map((_, i) => i + 1), ys) : null;
      return { ...t, ys, m, trend: ts ? [ts.achse + ts.steigung, ts.achse + ts.steigung * ys.length] as [number, number] : null };
    });
    const alle = [...f.y, ...(e.linien === 'mittel' ? linien.map(l => l.m) : []), ...(e.linien === 'trend' ? linien.flatMap(l => l.trend ?? []) : [])];
    const lo = Math.min(kleinste(alle)), hi = Math.max(groesste(alle));
    const roh = (hi - lo || 1) / (g === 1 ? 5 : 3), mag = 10 ** Math.floor(Math.log10(roh));
    const schritt = [1, 2, 2.5, 5, 10].map(k => k * mag).find(k => k >= roh) ?? mag;
    const top = Math.ceil(hi / schritt - 1e-9) * schritt, bot = Math.floor(lo / schritt + 1e-9) * schritt;
    return { f, q, oben, unten, linien, top, bot, ticks: Array.from({ length: Math.round((top - bot) / schritt) + 1 }, (_, i) => bot + i * schritt) };
  }));
  const y = (fd: { oben: number; unten: number; top: number; bot: number }, v: number) => fd.oben + (fd.unten - fd.oben) * (1 - (v - fd.bot) / (fd.top - fd.bot || 1));
  const xTicks = $derived.by(() => { const st = xmax <= 12 ? 1 : xmax <= 30 ? 2 : xmax <= 60 ? 5 : (() => { const roh = xmax / 10, m = 10 ** Math.floor(Math.log10(roh)); return ([1, 2, 5, 10].map(f => f * m).find(f => f >= roh) ?? m); })(); return Array.from({ length: Math.floor((xmax - 1) / st) + 1 }, (_, i) => i * st); });
  const beschreibung = $derived(
    Lp(g, `Verlaufsdiagramm mit ${g} Fall.`, `Verlaufsdiagramm mit ${g} Fällen.`, `Time-series chart with ${g} case.`, `Time-series chart with ${g} cases.`) + ' ' +
    e.faelle.map(f => `${f.name ? f.name + ': ' : ''}${Lx(`Phase A ${f.a.n} Messungen, Mittelwert ${zahlDe(f.a.m, 1)}; Phase B ${f.b.n} Messungen, Mittelwert ${zahlDe(f.b.m, 1)}.`, `phase A ${f.a.n} measurements, mean ${zahlDe(f.a.m, 1)}; phase B ${f.b.n} measurements, mean ${zahlDe(f.b.m, 1)}.`)}`).join(' '));
  const bt = $derived.by(() => {
    const t = bildtext('linie', { titel: Lx('Verlauf in Phase A und B', 'Course in phase A and B'), xAchse: { name: zeitTitel }, yAchse: { name: yText || Lx('Wert', 'Value') }, x: Array.from({ length: xmax }, (_, i) => i + 1),
      reihen: e.faelle.map((f, q) => ({ name: f.name || (g > 1 ? Lx(`Fall ${q + 1}`, `Case ${q + 1}`) : ''), werte: [...f.y, ...Array<number | null>(xmax - f.y.length).fill(null)] })) });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each felder as fd (fd.q)}
    {@const f = fd.f}
    {#each fd.ticks as v}<line x1={L} x2={W - R} y1={y(fd, v)} y2={y(fd, v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(fd, v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
    <line x1={L} x2={L} y1={fd.oben} y2={fd.unten} stroke="var(--dg-achse)" />
    <line x1={L} x2={W - R} y1={fd.unten} y2={fd.unten} stroke="var(--dg-achse)" />
    {#if f.a.n && f.b.n}<line x1={x(f.a.n - 0.5)} x2={x(f.a.n - 0.5)} y1={fd.oben - 6} y2={fd.unten} stroke="var(--tinte-2)" stroke-width="1.5" stroke-dasharray="6 5" />{/if}
    <text x={kopfA[fd.q]!.x} y={fd.oben - 12} text-anchor="middle" font-weight="650" style="font-size:13px">{kopfA[fd.q]!.t}</text>
    {#if f.b.n}<text x={kopfB[fd.q]!.x} y={fd.oben - 12} text-anchor="middle" font-weight="650" style="font-size:13px">{kopfB[fd.q]!.t}</text>{/if}
    {#if g > 1}<text x={L} y={fd.oben - 36} font-weight="700" style="font-size:14px"><title>{f.name}</title>{kurz(f.name || Lx(`Fall ${fd.q + 1}`, `Case ${fd.q + 1}`), 30)}</text>{/if}
    {#each fd.linien as l}
      {#if e.linien === 'mittel'}<line x1={x(l.von) - 8} x2={x(l.bis) + 8} y1={y(fd, l.m)} y2={y(fd, l.m)} stroke="var(--tinte-2)" stroke-width="1.5" stroke-dasharray="5 4" opacity=".85" />{/if}
      {#if e.linien === 'trend' && l.trend}<line x1={x(l.von)} x2={x(l.bis)} y1={y(fd, l.trend[0])} y2={y(fd, l.trend[1])} stroke="var(--tinte-2)" stroke-width="1.5" stroke-dasharray="5 4" opacity=".85" />{/if}
      <polyline points={l.ys.map((v, i) => `${x(l.von + i)},${y(fd, v)}`).join(' ')} fill="none" stroke={l.istB ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
      {#each l.ys as v, i}
        {#if i % takt !== 0}{:else if l.istB}<circle cx={x(l.von + i)} cy={y(fd, v)} r={g === 1 ? 5.5 : 4.2} fill="var(--dg-a)" stroke="var(--tinte)" stroke-width="1.2" />
        {:else}<circle cx={x(l.von + i)} cy={y(fd, v)} r={g === 1 ? 5.5 : 4.2} fill="var(--blatt)" stroke="var(--dg-b)" stroke-width="2.2" />{/if}
      {/each}
    {/each}
  {/each}
  {#each xTicks as i}
    {@const yb = felder.at(-1)!.unten}
    <line x1={x(i)} x2={x(i)} y1={yb} y2={yb + 5} stroke="var(--dg-achse)" /><text x={x(i)} y={yb + 20} text-anchor="middle" class="klein">{i + 1}</text>
  {/each}
  <XTitel x={(L + W - R) / 2} y={H0 - 28} breite={W - L - R} text={zeitTitel} px={14} fett />
  {#if yText && g === 1}<YTitel x={16} y={(felder[0]!.oben + felder[0]!.unten) / 2} laenge={felder[0]!.unten - felder[0]!.oben} text={yText} px={14} fett />{/if}
  {#if takt > 1}<text x={W - R} y={H - 6} text-anchor="end" class="klein" style="font-size:11px">{reiheHinweis(takt)}</text>{/if}
  <text x={L} y={H - 6} class="klein" style="font-size:11px">{e.linien === 'mittel' ? Lx('Gestrichelt: Mittelwert je Phase', 'Dashed: mean per phase') : e.linien === 'trend' ? Lx('Gestrichelt: Trend je Phase (Theil-Sen)', 'Dashed: trend per phase (Theil-Sen)') : ''}</text>
</svg>
<BildBeschreibung {...bt} />
