<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import { metaTicks, rueck, massKurz, type Meta } from '../lib/metaanalyse';
  import { zahlDe } from '../lib/format';
  import { komma, ohneNull } from '../lib/ergebnis';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { iv, proz } from '../i18n/profil';
  /** Forest-Plot: je Studie ein Quadrat (Fläche nach Gewicht) mit 95-%-Intervall, darunter die Raute für den gepoolten Effekt (Spitzen = Intervallgrenzen)
   *  und das Prädiktionsintervall als dünne Linie. Die Achse zeigt die Anzeige-Skala (g, Verhältnis oder r), gezeichnet wird auf der Rechenskala. */
  let { e }: { e: Meta } = $props();
  /** Achsenmarke in der gewählten Zahlenschreibweise (Komma oder Punkt). */
  const tz = (t: string) => zahlDe(Number(t.replace('−', '-')), (t.split('.')[1] ?? '').length);
  const f = $derived(rueck(e));
  const zeig = (v: number) => (e.ein.art === 'r' ? ohneNull(f(v), 2) : komma(f(v), 2));
  /** Breite des Rahmens: Auf dem Handy (unter 520 px) wird die kompakte Form gezeichnet - ohne die Spalten „Effekt [KI]“ und „Gewicht“ (stehen in der Tabelle darunter), mit kürzeren Namen -,
   *  damit nichts abgeschnitten wird und die Schrift lesbar bleibt (Abnahme 3, M4). */
  let br = $state(0);
  const kompakt = $derived(br > 0 && br < 520);
  const W = $derived(kompakt ? 400 : 700), ZH = 24, T = 38, LINKS = $derived(kompakt ? 140 : 190), RECHTS = $derived(kompakt ? 14 : 200);
  const reihen = $derived(e.studien.map(st => ({ ...st, lo: st.yi - 1.96 * st.sei, hi: st.yi + 1.96 * st.sei })));
  const lo0 = $derived(Math.min(kleinste(reihen.map(r => r.lo)), e.lo, e.pLo)), hi0 = $derived(Math.max(groesste(reihen.map(r => r.hi)), e.hi, e.pHi));
  const rand = $derived((hi0 - lo0) * 0.04 || 0.1);
  const lo = $derived(lo0 - rand), hi = $derived(hi0 + rand);
  const ticks = $derived(metaTicks(lo, hi, e.ein));
  const x = (v: number) => LINKS + (W - LINKS - RECHTS) * ((v - lo) / (hi - lo || 1));
  const maxW = $derived(Math.max(groesste(reihen.map(r => r.gewicht))));
  const n = $derived(reihen.length);
  const yp = $derived(T + n * ZH + ZH / 2), yq = $derived(yp + ZH);
  const seite = $derived(e.ein.art === 'smd' ? Lx('höher in Gruppe 2 | höher in Gruppe 1', 'higher in group 2 | higher in group 1') : '');
  const yAchse = $derived(T + (n + 2) * ZH + 12);
  const mk = $derived(massKurz(e.ein, Lx));
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): die Seitenzeile und der untere Rand rücken mit. */
  const XZ = $derived(xZusatz(mk, W - LINKS - RECHTS, 13, true));
  const H = $derived(yAchse + (seite ? 70 : 52) + XZ);
  /** Name kürzen, das Jahr am Ende bleibt (Abnahme 3, M4): „Frimodt-Moller et al. 1973“ -> „Frimodt-Mol… 1973“; der volle Name steht im Tipp und in der Tabelle. */
  const kurz = (t: string, m = 26) => {
    if (t.length <= m) return t;
    const jahr = /\s(\d{4}[a-z]?)$/.exec(t);
    if (jahr) return t.slice(0, Math.max(3, m - jahr[0].length - 1)).trimEnd() + '… ' + jahr[1];
    return t.slice(0, m - 1) + '…';
  };
  const beschreibung = $derived(Lx(
    `Forest-Plot mit ${n} Studien. Gepoolter Effekt ${mk} = ${zeig(e.est)} mit 95-%-Intervall von ${zeig(e.lo)} bis ${zeig(e.hi)}; Prädiktionsintervall von ${zeig(e.pLo)} bis ${zeig(e.pHi)}. Die Einzelstudien reichen von ${zeig(Math.min(kleinste(reihen.map(r => r.yi))))} bis ${zeig(Math.max(groesste(reihen.map(r => r.yi))))}.`,
    `Forest plot of ${n} studies. Pooled effect ${mk} = ${zeig(e.est)} with 95% interval from ${zeig(e.lo)} to ${zeig(e.hi)}; prediction interval from ${zeig(e.pLo)} to ${zeig(e.pHi)}. The single studies range from ${zeig(Math.min(kleinste(reihen.map(r => r.yi))))} to ${zeig(Math.max(groesste(reihen.map(r => r.yi))))}.`));
  const bt = $derived(bildtext('forest', { mass: mk, nullwert: f(0),
    studien: reihen.map(r => ({ name: r.name, eff: f(r.yi), unten: f(r.lo), oben: f(r.hi), gewicht: r.gewicht })),
    gesamt: { eff: f(e.est), unten: f(e.lo), oben: f(e.hi) }, praed: { unten: f(e.pLo), oben: f(e.pHi) } }));
</script>
<div bind:clientWidth={br}>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px;min-width:{kompakt ? 0 : 600}px">
  <text x="8" y={T - 14} font-weight="600" style="font-size:12px">{Lx('Studie', 'Study')}</text>
  {#if !kompakt}
    <text x={W - RECHTS + 14} y={T - 14} font-weight="600" style="font-size:12px">{Lx('Effekt', 'Effect')} [{Lx('95 %-KI', '95% CI')}]</text>
    <text x={W - 8} y={T - 14} text-anchor="end" font-weight="600" style="font-size:12px">{Lx('Gewicht', 'Weight')}</text>
  {/if}
  <line x1={x(0)} x2={x(0)} y1={T - 6} y2={yAchse} stroke="var(--dg-achse)" stroke-dasharray="4 3" />
  {#each reihen as r, i (i)}
    {@const y = T + i * ZH + ZH / 2}
    {@const seit = 4 + 11 * Math.sqrt(r.gewicht / maxW)}
    <g><title>{r.name}: {zeig(r.yi)} {iv(zeig(r.lo), zeig(r.hi))}, {Lx('Gewicht', 'weight')} {proz(komma(r.gewicht, 1))}</title>
      <text x="8" y={y + 4} style="font-size:12px">{kurz(r.name, kompakt ? 18 : 26)}</text>
      <line x1={x(r.lo)} x2={x(r.hi)} y1={y} y2={y} stroke="var(--dg-achse)" stroke-width="1.5" />
      <rect x={x(r.yi) - seit / 2} y={y - seit / 2} width={seit} height={seit} fill="var(--dg-a)" />
      {#if !kompakt}<text x={W - RECHTS + 14} y={y + 4} style="font-size:12px">{zeig(r.yi)} {iv(zeig(r.lo), zeig(r.hi))}</text>
      <text x={W - 8} y={y + 4} text-anchor="end" style="font-size:12px">{proz(komma(r.gewicht, 1))}</text>{/if}</g>
  {/each}
  <line x1={LINKS - 6} x2={W - 8} y1={yp - ZH / 2 + 1} y2={yp - ZH / 2 + 1} stroke="var(--dg-gitter)" />
  <g><title>{Lx('Gepoolter Effekt', 'Pooled effect')}: {zeig(e.est)} {iv(zeig(e.lo), zeig(e.hi))}</title>
    <text x="8" y={yp + 4} font-weight="700" style="font-size:12px">{kompakt ? Lx('Gepoolt', 'Pooled') : Lx('Gepoolt (Random Effects)', 'Pooled (random effects)')}</text>
    <polygon points="{x(e.lo)},{yp} {x(e.est)},{yp - 8} {x(e.hi)},{yp} {x(e.est)},{yp + 8}" fill="var(--tinte)" stroke="var(--tinte)" />
    {#if !kompakt}<text x={W - RECHTS + 14} y={yp + 4} font-weight="700" style="font-size:12px">{zeig(e.est)} {iv(zeig(e.lo), zeig(e.hi))}</text>{/if}</g>
  <g><title>{Lx('Prädiktionsintervall', 'Prediction interval')}: {iv(zeig(e.pLo), zeig(e.pHi))}</title>
    <text x="8" y={yq + 4} style="font-size:12px">{kompakt ? Lx('Prädiktion', 'Prediction') : Lx('Prädiktionsintervall', 'Prediction interval')}</text>
    <line x1={x(e.pLo)} x2={x(e.pHi)} y1={yq} y2={yq} stroke="var(--tinte)" stroke-width="2" />
    <line x1={x(e.pLo)} x2={x(e.pLo)} y1={yq - 4} y2={yq + 4} stroke="var(--tinte)" stroke-width="2" /><line x1={x(e.pHi)} x2={x(e.pHi)} y1={yq - 4} y2={yq + 4} stroke="var(--tinte)" stroke-width="2" />
    {#if !kompakt}<text x={W - RECHTS + 14} y={yq + 4} style="font-size:12px">{iv(zeig(e.pLo), zeig(e.pHi))}</text>{/if}</g>
  <line x1={x(lo)} x2={x(hi)} y1={yAchse} y2={yAchse} stroke="var(--dg-achse)" />
  {#each ticks as t}<line x1={x(t.pos)} x2={x(t.pos)} y1={yAchse} y2={yAchse + 5} stroke="var(--dg-achse)" /><text x={x(t.pos)} y={yAchse + 19} text-anchor="middle" class="klein">{tz(t.text)}</text>{/each}
  <XTitel x={(x(lo) + x(hi)) / 2} y={yAchse + 40} breite={W - LINKS - RECHTS} text={mk} fett />
  {#if seite}<text x={(x(lo) + x(hi)) / 2} y={yAchse + 60 + XZ} text-anchor="middle" class="klein">{seite}</text>{/if}
</svg>
</div>
<BildBeschreibung {...bt} />
