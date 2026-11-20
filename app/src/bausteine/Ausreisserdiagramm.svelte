<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import { achsenMarken, achsenBereich } from '../lib/diagrammdaten';
  import { planeBeschriftung, textBreite } from '../lib/beschriftung';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { zeitTeilstriche, type ZeitreiheE } from '../lib/zeitreiheblatt';
  import { auffaelligeWerte, type AusreisserE } from '../lib/ausreisserzeit';

  /**
   * Das Bild zu „Auffällige Werte suchen“ (Sollwerte scripts/ausreisser-zeitreihe-erwartet.R): die Werte als Linie, das Muster (Trend und Saison bzw. Modellwert) gestrichelt, die auffälligen Werte als große gefüllte Punkte mit dem Zeitpunkt daneben.
   * Die Punkte unterscheiden sich durch Größe und Füllung, nicht nur durch Farbe. Überdecken sich die Zeitpunkte, wird das Bild höher; hilft das nicht, stehen sie nicht im Bild (Regel lib/beschriftung.ts) und bleiben als Hinweis am Punkt und in der Tabelle.
   * Nichts wird aufgefüllt: Die Reihe hat hier keine Lücken (das Verfahren verlangt es).
   */
  let { e, x, wertText, zeitText = '', zeit, stellen }: { e: ZeitreiheE; x: AusreisserE; wertText: string; zeitText?: string; zeit: (platz: number) => string; stellen: number } = $props();
  const uid = $props.id();
  const W = 720, H0 = 380, L0 = 66, R = 24, T = 54, U0 = 64;
  const zeitTitel = $derived(zeitText || Lx('Zeit', 'Time'));
  const L = $derived(L0 + yZusatz(wertText, H0 - T - U0, 14, true));
  const XZ = $derived(xZusatz(zeitTitel, W - L - R, 14, true));
  const U = $derived(U0 + XZ);

  const a = $derived(x.antwort);
  const t0 = $derived(e.t[0] ?? 1), t1 = $derived(e.t[e.t.length - 1] ?? e.y.length);
  const alleY = $derived([...e.y.filter((v): v is number => v !== null), ...a.erwartet]);
  const bereich = $derived(achsenBereich(Math.min(...alleY), Math.max(...alleY), 5));
  const unten = $derived(bereich[0]), oben = $derived(bereich[1]);
  const ticksY = $derived(achsenMarken(unten, oben, 5));
  const ticksX = $derived(zeitTeilstriche({ erster: e.erster, raster: e.raster, t: e.t }, 8));
  const X = (t: number) => L + 8 + (W - L - R - 16) * (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0));
  const anteil = (v: number) => 1 - (v - unten) / (oben - unten || 1);
  const liste = $derived(auffaelligeWerte(a, e.y));
  /* Überdecken sich die Zeitpunkte, wird das ganze Bild höher (Johannes, 01.11.). */
  const plan = $derived(planeBeschriftung(
    liste.map(w => { const text = zeit(w.platz), xs = X(e.t[w.platz - 1] ?? w.platz), rechts = xs + 9 + textBreite(text) > W - R; return { x: rechts ? xs - 9 - textBreite(text) : xs + 9, yAnteil: anteil(w.wert), text }; }),
    { flaeche: H0 - T - U0 - XZ, oben: T, maxFaktor: 2 }));
  const H = $derived(T + (H0 - T - U0 - XZ) * plan.faktor + U);
  const Y = (v: number) => T + (H - T - U) * anteil(v);
  const pfad = (q: { t: number; v: number }[]) => q.map(z => `${X(z.t).toFixed(1)},${Y(z.v).toFixed(1)}`).join(' ');
  const werte = $derived(e.y.map((v, i) => ({ t: e.t[i]!, v: v! })));
  const muster = $derived(a.erwartet.map((v, i) => ({ t: e.t[i]!, v })));
  const punkte = $derived(e.y.length <= 150);
  const f = (v: number) => zahlDe(v, stellen);
  const beschreibung = $derived(liste.length === 0
    ? Lx(`Verlauf von ${wertText} mit dem Muster; kein Wert ist auffällig (Schwelle |z| > ${zahlDe(a.schwelle, Number.isInteger(a.schwelle) ? 0 : 1)}).`, `Course of ${wertText} with the pattern; no value is conspicuous (threshold |z| > ${zahlDe(a.schwelle, Number.isInteger(a.schwelle) ? 0 : 1)}).`)
    : Lx(`Verlauf von ${wertText} mit dem Muster und ${liste.length} auffälligen Werten, zuerst: ${liste.slice(0, 5).map(w => `${zeit(w.platz)} ${f(w.wert)}`).join(', ')}.`, `Course of ${wertText} with the pattern and ${liste.length} conspicuous values, first: ${liste.slice(0, 5).map(w => `${zeit(w.platz)} ${f(w.wert)}`).join(', ')}.`));
  const leg = $derived([
    { t: Lx('Werte', 'Values'), f: 'var(--dg-a)', s: '', punkt: false },
    { t: Lx('Muster', 'Pattern'), f: 'var(--dg-b)', s: '9 5', punkt: false },
    { t: Lx('Auffälliger Wert', 'Conspicuous value'), f: 'var(--dg-b)', s: '', punkt: true }
  ]);
  const bt = $derived.by(() => {
    const t = bildtext('linie', { titel: Lx('Zeitreihe mit auffälligen Werten', 'Time series with conspicuous values'), xAchse: { name: zeitTitel }, yAchse: { name: wertText }, x: e.y.map((_, i) => zeit(i + 1)),
      reihen: [{ name: Lx('Werte', 'Values'), werte: e.y }, { name: Lx('Muster', 'Pattern'), werte: a.erwartet }] });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  {#each leg as l, i}
    {@const x0 = L + (i === 0 ? 0 : leg.slice(0, i).reduce((s, q) => s + 56 + q.t.length * 6.4, 0))}
    {#if l.punkt}<circle cx={x0 + 14} cy="22" r="6.5" fill={l.f} stroke="var(--tinte)" stroke-width="1.6" />{:else}<line x1={x0} x2={x0 + 28} y1="22" y2="22" stroke={l.f} stroke-width="2.6" stroke-dasharray={l.s} />{/if}<text x={x0 + 34} y="26" style="font-size:12px">{l.t}</text>
  {/each}
  {#each ticksY as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each ticksX as k}<line x1={X(k.t)} x2={X(k.t)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(k.t)} y={H - U + 20} text-anchor="middle" class="klein">{k.label}</text>{/each}
  <polyline points={pfad(muster)} fill="none" stroke="var(--dg-b)" stroke-width="2.2" stroke-dasharray="9 5" stroke-linecap="round" />
  <polyline points={pfad(werte)} fill="none" stroke="var(--dg-a)" stroke-width="2" stroke-linecap="round" />
  {#if punkte}{#each werte as z}<circle cx={X(z.t)} cy={Y(z.v)} r="2.6" fill="var(--blatt)" stroke="var(--dg-a)" stroke-width="1.6" />{/each}{/if}
  {#each liste as w, i (w.platz)}
    {@const t = e.t[w.platz - 1] ?? w.platz}
    <circle cx={X(t)} cy={Y(w.wert)} r="6.5" fill="var(--dg-b)" stroke="var(--tinte)" stroke-width="1.8"><title>{zeit(w.platz)}: {f(w.wert)}, z = {zahlDe(w.z, 1)}</title></circle>
    {#if plan.zeigen[i]}<text x={X(t) + (X(t) + 9 + textBreite(zeit(w.platz)) > W - R ? -9 : 9)} y={Y(w.wert) + 4} text-anchor={X(t) + 9 + textBreite(zeit(w.platz)) > W - R ? 'end' : 'start'} class="klein" style="font-size:12px" fill="var(--tinte)">{zeit(w.platz)}</text>{/if}
  {/each}
  <XTitel x={(L + W - R) / 2} y={H - 22 - XZ + 0} breite={W - L - R} text={zeitTitel} px={14} fett />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={wertText} px={14} fett />
</svg>
<BildBeschreibung {...bt} />
