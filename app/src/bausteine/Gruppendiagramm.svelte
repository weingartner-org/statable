<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz, yMarkenZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import type { ZweiGruppen, Gruppe } from '../lib/ergebnis';
  import type { DgOptionen } from '../lib/diagramm';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { GRENZE, zieheStichprobe, punkteHinweis, aeusserste, ausreisserHinweis } from '../lib/stichprobe';
  let { e, werte, o, xText = '' }: { e: ZweiGruppen; werte: Record<string, number[]>; o: DgOptionen; xText?: string } = $props();
  const W = $derived(o.breite === 'seite' ? 760 : 560), H0 = 380, L0 = 64, R = 24, U0 = 64;
  /** Einzelpunkte nur bis zur Grenze (lib/stichprobe.ts); Mittel, KI und Kasten rechnen mit allen Werten. */
  const punkteJe = $derived(Object.fromEntries(Object.entries(werte).map(([n, w]) => [n, zieheStichprobe(w, GRENZE.gruppe)])));
  const gekuerzt = $derived(o.einzel && o.art !== 'box' && Object.values(punkteJe).some(p => p.gekuerzt));
  const hinweis = $derived(gekuerzt ? punkteHinweis(Object.values(punkteJe).reduce((a, p) => a + p.auswahl.length, 0), Object.values(punkteJe).reduce((a, p) => a + p.gesamt, 0)) : '');
  /** Kasten: zu viele Ausreißer (bei sehr vielen Werten) - nur die äußersten Ringe. */
  const ringe = $derived(o.art !== 'box' ? {} : Object.fromEntries(Object.entries(werte).map(([n, w]) => { const q = quartile([...w].sort((a, b) => a - b)); return [n, aeusserste(q.raus, q.md, GRENZE.ausreisser)]; })));
  const ringHinweis = $derived(o.art === 'box' && Object.values(ringe).some(r => r.gekuerzt) ? ausreisserHinweis(Object.values(ringe).reduce((a, r) => a + r.auswahl.length, 0), Object.values(ringe).reduce((a, r) => a + r.gesamt, 0)) : '');
  const T = $derived(o.titel ? 68 : (hinweis || ringHinweis) ? 40 : 24);
  /** Linker Rand wächst mit, wenn der senkrechte Titel umbricht oder die Achsenzahlen lang sind (Regel lib/ytitel.ts). */
  const L = $derived.by(() => L0 + yZusatz(o.y, H0 - T - U0, 13, false) + yMarkenZusatz(ticks.map(v => zahlDe(v))));
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): Höhe und unterer Rand wachsen mit, die Zeichenfläche bleibt. */
  const XZ = $derived(xZusatz(xText, W - L - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);

  const sortiert = (g: Gruppe) => [...(werte[g.name] ?? [])].sort((a, b) => a - b);
  const quartile = (s: number[]) => {
    const q = (p: number) => { const i = (s.length - 1) * p, u = Math.floor(i); return s[u]! + (s[Math.ceil(i)]! - s[u]!) * (i - u); };
    const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
    const wlo = s.find(v => v >= q1 - 1.5 * iqr) ?? s[0]!, whi = [...s].reverse().find(v => v <= q3 + 1.5 * iqr) ?? s.at(-1)!;
    return { q1, md: q(0.5), q3, wlo, whi, raus: s.filter(v => v < wlo || v > whi) };
  };
  const strich = (g: Gruppe): [number, number] | null => (o.fehler === 'ki' ? [g.kiLo, g.kiHi] : o.fehler === 'se' ? [g.m - g.sd / Math.sqrt(g.n), g.m + g.sd / Math.sqrt(g.n)] : o.fehler === 'sd' ? [g.m - g.sd, g.m + g.sd] : null);

  const alle = $derived(Object.values(werte).flat());
  const lo = $derived(Math.min(0, kleinste(alle))), hi = $derived(Math.max(groesste(alle), e.a.kiHi, e.b.kiHi, e.a.m + e.a.sd, e.b.m + e.b.sd));
  /** Runde Schritte 1-2-5 × 10^k, etwa fünf Marken - auch bei Einkommen bis 17 000 (Prüfung A3: vorher Schritt höchstens 25, also Hunderte Marken). */
  const schritt = $derived.by(() => { const roh = (hi - lo) / 5 || 1, m = 10 ** Math.floor(Math.log10(roh)), n = roh / m; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * m; });
  const oben = $derived(Math.ceil(hi / schritt) * schritt), unten = $derived(Math.floor(lo / schritt) * schritt);
  const y = (v: number) => T + (H - T - U) * (1 - (v - unten) / (oben - unten || 1));
  const ticks = $derived(Array.from({ length: Math.round((oben - unten) / schritt) + 1 }, (_, i) => unten + i * schritt));
  const tinte = 'var(--tinte)', grau = 'color-mix(in srgb,var(--tinte) 35%,transparent)';
  const gruppen = $derived([
    { g: e.a, x: L + (W - L - R) * 0.3, f: o.sw ? tinte : 'var(--dg-a)', p: o.sw ? grau : 'var(--dg-punkt-a)' },
    { g: e.b, x: L + (W - L - R) * 0.72, f: o.sw ? tinte : 'var(--dg-b)', p: o.sw ? grau : 'var(--dg-punkt-b)' }]);
  /** Kurz, damit es in eine Zeile passt; die lange Fassung steht in der Beschreibung für Vorleser. */
  const unterzeile = $derived(o.art === 'box' ? (ringHinweis ? Lx('Kasten: mittlere Hälfte. Strich: Median.', 'Box: middle half. Line: median.') + ' ' + ringHinweis + '.' : Lx('Kasten: mittlere Hälfte. Strich: Median. Ringe: weit außen.', 'Box: middle half. Line: median. Circles: far out.'))
    : [o.art === 'balken' ? Lx('Säule: Mittelwert', 'Bar: mean') : Lx('Dicker Strich: Mittelwert', 'Thick line: mean'), o.fehler === 'ki' ? Lx('Striche: 95 %-KI', 'Whiskers: 95% CI') : o.fehler === 'se' ? Lx('Striche: ± 1 SE', 'Whiskers: ± 1 SE') : o.fehler === 'sd' ? Lx('Striche: ± 1 SD', 'Whiskers: ± 1 SD') : '', o.einzel ? (hinweis || Lx('Punkte: Personen', 'Dots: people')) : ''].filter(Boolean).join('. ') + '.');
  const lang = $derived(o.art === 'box' ? (ringHinweis ? Lx('Kasten: mittlere Hälfte der Werte. Strich im Kasten: Median.', 'Box: middle half of the values. Line in the box: median.') + ' ' + ringHinweis + '.' : Lx('Kasten: mittlere Hälfte der Werte. Strich im Kasten: Median. Ringe: weit außen liegende Werte.', 'Box: middle half of the values. Line in the box: median. Circles: values far outside.'))
    : [o.art === 'balken' ? Lx('Säule: Mittelwert.', 'Bar: mean.') : Lx('Dicker Strich: Mittelwert.', 'Thick line: mean.'), o.fehler === 'ki' ? Lx('Striche: 95 %-Konfidenzintervall.', 'Whiskers: 95% confidence interval.') : o.fehler === 'se' ? Lx('Striche: ± 1 Standardfehler.', 'Whiskers: ± 1 standard error.') : o.fehler === 'sd' ? Lx('Striche: ± 1 Standardabweichung.', 'Whiskers: ± 1 standard deviation.') : '', o.einzel ? (hinweis ? hinweis + '.' : Lx('Punkte: einzelne Personen.', 'Dots: individual people.')) : ''].filter(Boolean).join(' '));
  const beschreibung = $derived(Lx(`Mittelwert ${e.a.name} ${zahlDe(e.a.m, 1)} (95 %-KI ${zahlDe(e.a.kiLo, 1)} bis ${zahlDe(e.a.kiHi, 1)}), ${e.b.name} ${zahlDe(e.b.m, 1)} (${zahlDe(e.b.kiLo, 1)} bis ${zahlDe(e.b.kiHi, 1)}). ${lang}`, `Mean for ${e.a.name}: ${zahlDe(e.a.m, 1)} (95% CI ${zahlDe(e.a.kiLo, 1)} to ${zahlDe(e.a.kiHi, 1)}); for ${e.b.name}: ${zahlDe(e.b.m, 1)} (95% CI ${zahlDe(e.b.kiLo, 1)} to ${zahlDe(e.b.kiHi, 1)}). ${lang}`));
  const bt = $derived.by(() => {
    const gr = [e.a, e.b], basis = { ...(o.titel ? { titel: o.titel } : {}), name: o.y || Lx('Wert', 'Value'), ...(xText ? { gruppenName: xText } : {}) };
    const t = o.art === 'box'
      ? bildtext('boxplot', { ...basis, gruppen: gr.map(g => { const q = quartile(sortiert(g)); return { name: g.name, n: g.n, unten: q.wlo, q1: q.q1, median: q.md, q3: q.q3, oben: q.whi, ausreisser: q.raus }; }) })
      : bildtext('mittelwerte', { ...basis, fehler: o.fehler === 'ki' ? 'ki95' as const : o.fehler === 'se' ? 'se' as const : o.fehler === 'sd' ? 'sd' as const : 'keine' as const, gruppen: gr.map(g => { const st = strich(g); return { name: g.name, n: g.n, mittel: g.m, unten: st?.[0] ?? null, oben: st?.[1] ?? null }; }) });
    return { ...t, beschreibung: [...t.beschreibung, lang] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#if o.titel}<text x="24" y="26" style="font-size:17px" font-weight="650">{o.titel}</text>
    <text x="24" y="46" class="klein">{unterzeile}</text>
  {:else if hinweis || ringHinweis}<text x="24" y="20" class="klein">{hinweis || ringHinweis}</text>{/if}
  {#each ticks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={o.y} px={13} klasse="klein" />
  {#each gruppen as { g, x, f, p }}
    {#if o.art === 'balken'}<rect x={x - 50} y={y(g.m)} width="100" height={Math.max(0, y(Math.max(0, unten)) - y(g.m))} fill={p} stroke={f} stroke-width="1.5" rx="2" />{/if}
    {#if o.art === 'box'}
      {@const q = quartile(sortiert(g))}
      {@const rg = ringe[g.name]?.auswahl ?? q.raus}
      <line x1={x} x2={x} y1={y(q.whi)} y2={y(q.q3)} stroke={f} stroke-width="1.5" /><line x1={x} x2={x} y1={y(q.q1)} y2={y(q.wlo)} stroke={f} stroke-width="1.5" />
      <line x1={x - 16} x2={x + 16} y1={y(q.whi)} y2={y(q.whi)} stroke={f} stroke-width="1.5" /><line x1={x - 16} x2={x + 16} y1={y(q.wlo)} y2={y(q.wlo)} stroke={f} stroke-width="1.5" />
      <rect x={x - 44} y={y(q.q3)} width="88" height={y(q.q1) - y(q.q3)} fill={p} stroke={f} stroke-width="1.5" rx="3" />
      <line x1={x - 44} x2={x + 44} y1={y(q.md)} y2={y(q.md)} stroke={f} stroke-width="3" />
      {#each rg as v}<circle cx={x} cy={y(v)} r="4" fill="none" stroke={f} stroke-width="1.5" />{/each}
      <text x={x + 54} y={y(q.md) + 5} font-weight="650" style="font-size:15px">{zahlDe(q.md, 1)}</text>
    {:else}
      {#if o.einzel}{#each punkteJe[g.name]?.auswahl ?? [] as v, i}<circle cx={x + (((i * 37) % 23) - 11) * 3.2} cy={y(v)} r="4" fill={p} />{/each}{/if}
      {@const st = strich(g)}
      {#if st}<line x1={x} x2={x} y1={y(st[1])} y2={y(st[0])} stroke={f} stroke-width="2.5" />
        <line x1={x - 10} x2={x + 10} y1={y(st[1])} y2={y(st[1])} stroke={f} stroke-width="2.5" /><line x1={x - 10} x2={x + 10} y1={y(st[0])} y2={y(st[0])} stroke={f} stroke-width="2.5" />{/if}
      <line x1={x - 34} x2={x + 34} y1={y(g.m)} y2={y(g.m)} stroke={f} stroke-width="4" stroke-linecap="round" />
      <text x={x + (o.art === 'balken' ? 58 : 44)} y={y(g.m) + 5} font-weight="650" style="font-size:15px">{zahlDe(g.m, 1)}</text>
    {/if}
    <text x={x} y={H - U + 26} text-anchor="middle" font-weight="600" style="font-size:15px">{g.name}</text>
    <text x={x} y={H - U + 46} text-anchor="middle" class="klein">n = {g.n}</text>
  {/each}
  {#if xText}<XTitel x={(L + W - R) / 2} y={H0 - 4} breite={W - L - R} text={xText} klasse="klein" />{/if}
</svg>
<BildBeschreibung {...bt} />
