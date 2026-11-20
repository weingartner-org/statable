<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import type { Moderation } from '../lib/moderation';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  /** Vorhergesagtes Y über X, eine Gerade je Stelle des Moderators (M − 1 SD, M, M + 1 SD bzw. beide Werte). Farbe, Strichart und Beschriftung unterscheiden sie. */
  let { e, xText, yText, wText }: { e: Moderation; xText: string; yText: string; wText: string } = $props();
  const W = 640, H0 = 400, L0 = 64, R = 100, T = 62, U0 = 62;
  /** Linker Rand wächst mit, wenn der senkrechte Titel umbricht (Regel lib/ytitel.ts). */
  const L = $derived(L0 + yZusatz(yText, H0 - T - U0, 14, true));
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): Höhe und unterer Rand wachsen mit, die Zeichenfläche bleibt. */
  const XZ = $derived(xZusatz(xText, W - L - R, 14, true));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const FARBEN = ['var(--dg-b)', 'var(--tinte)', 'var(--dg-a)'];
  const STRICH = ['2 5', '', '7 5'];
  const stellen = $derived(e.steigungen.map((st, i) => ({ st, i: e.zwei ? (i === 0 ? 0 : 2) : st.label === 'minus' ? 0 : st.label === 'mittel' ? 1 : 2 })));
  const vorhersage = (x: number, w: number) => e.konstante.b + e.bx.b * (x - e.mx) + e.bw.b * (w - e.mw) + e.bxw.b * (x - e.mx) * (w - e.mw);
  const linien = $derived(stellen.map(({ st, i }) => ({ st, i, p0: vorhersage(e.xMin, st.w), p1: vorhersage(e.xMax, st.w) })));
  const alle = $derived(linien.flatMap(l => [l.p0, l.p1]));
  const lo = $derived(Math.min(kleinste(alle))), hi = $derived(Math.max(groesste(alle)));
  const schritt = $derived.by(() => { const roh = (hi - lo || 1) / 5, m = 10 ** Math.floor(Math.log10(roh)); return [1, 2, 5, 10].map(f => f * m).find(f => f >= roh) ?? m; });
  const oben = $derived(Math.ceil(hi / schritt - 1e-9) * schritt), unten = $derived(Math.floor(lo / schritt + 1e-9) * schritt);
  const y = (v: number) => T + (H - T - U) * (1 - (v - unten) / (oben - unten || 1));
  const x = (v: number) => L + (W - L - R) * ((v - e.xMin) / (e.xMax - e.xMin || 1));
  const ticks = $derived(Array.from({ length: Math.round((oben - unten) / schritt) + 1 }, (_, i) => unten + i * schritt));
  const xs = $derived.by(() => { const roh = (e.xMax - e.xMin || 1) / 6, m = 10 ** Math.floor(Math.log10(roh)), st = [1, 2, 5, 10].map(f => f * m).find(f => f >= roh) ?? m; const a: number[] = []; for (let v = Math.ceil(e.xMin / st - 1e-9) * st; v <= e.xMax + 1e-9; v += st) a.push(v); return a; });
  const kurz = (t: string, n = 22) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  const bez = (st: typeof e.steigungen[number]) => (e.zwei ? `${wText} = ${zahlDe(st.w, 2)}` : st.label === 'minus' ? `M − 1 SD (${zahlDe(st.w, 2)})` : st.label === 'plus' ? `M + 1 SD (${zahlDe(st.w, 2)})` : `M (${zahlDe(st.w, 2)})`);
  const form = (q: number, cx: number, cy: number) => (q === 0 ? `M${cx} ${cy - 7}l7 12h-14z` : q === 1 ? '' : `M${cx - 5.5} ${cy - 5.5}h11v11h-11z`);
  const beschreibung = $derived(Lx(`Vorhergesagte Werte von ${yText} über ${xText} bei verschiedenen Werten von ${wText}. `, `Predicted values of ${yText} over ${xText} at different values of ${wText}. `) +
    e.steigungen.map(st => `${bez(st)}: ${Lx(`Steigung ${zahlDe(st.b, 2)}`, `slope ${zahlDe(st.b, 2)}`)}`).join('; ') + '.');
  const bt = $derived.by(() => {
    const t = bildtext('linie', { titel: Lx('Einfache Steigungen', 'Simple slopes'), xAchse: { name: xText }, yAchse: { name: yText }, x: [e.xMin, e.xMax], reihen: linien.map(l => ({ name: bez(l.st), werte: [l.p0, l.p1] })) });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each ticks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each xs as v}<line x1={x(v)} x2={x(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={x(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  <XTitel x={(L + W - R) / 2} y={H0 - 22} breite={W - L - R} text={xText} px={14} fett />
  <YTitel x={16} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={14} fett />
  {#each linien as l}
    <line x1={x(e.xMin)} y1={y(l.p0)} x2={x(e.xMax)} y2={y(l.p1)} stroke={FARBEN[l.i]} stroke-width="2.6" stroke-dasharray={STRICH[l.i]} stroke-linecap="round" />
    {#if l.i === 1}<circle cx={x(e.xMax)} cy={y(l.p1)} r="5" fill={FARBEN[1]} />{:else}<path d={form(l.i, x(e.xMax), y(l.p1))} fill={FARBEN[l.i]} stroke="var(--tinte)" stroke-width="1.2" />{/if}
    <text x={x(e.xMax) + 12} y={y(l.p1) + 5} style="font-size:13px"><title>{bez(l.st)}</title>b = {zahlDe(l.st.b, 2)}</text>
  {/each}
  <text x={L} y="16" font-weight="600" style="font-size:13px">{Lx('Moderator', 'Moderator')}: {kurz(wText, 56)}</text>
  {#each linien as l, q}
    {@const lx = L + q * Math.min(170, (W - L - 10) / linien.length)}
    <g><line x1={lx} x2={lx + 26} y1="38" y2="38" stroke={FARBEN[l.i]} stroke-width="2.6" stroke-dasharray={STRICH[l.i]} /><text x={lx + 32} y="43" style="font-size:13px">{bez(l.st)}</text></g>
  {/each}
  <text x={W - 8} y={H - 6} text-anchor="end" class="klein" style="font-size:11px">{Lx('Geraden über den beobachteten Bereich; b: Steigung', 'Lines over the observed range; b: slope')}</text>
</svg>
<BildBeschreibung {...bt} />
