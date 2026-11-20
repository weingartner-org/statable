<script lang="ts">
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  import { zeitMarken } from '../lib/ueberleben';
  import { zeitText } from '../lib/ueberlebensaetze';
  import type { SterbetafelAnzeige, TafelErgebnis } from '../lib/sterbetafel';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /** Sterbetafel (Später S-F): `art` 'anteil' = kumulierter Anteil ohne Ereignis als Linienzug durch die Punkte am Intervallende (nicht als Treppe, so zeichnet SPSS),
   *  'hazard' = Ausfallrate je Intervall als Linienzug durch die Mitten. Je Gruppe eine Linie; ab 5 Gruppen unterscheiden gestrichelte Linien zusätzlich zur Farbe.
   *  Das offene letzte Intervall hat keine Breite: dort endet die Linie (keine Dichte, keine Ausfallrate). */
  let { e, art = 'anteil', zeitName = '' }: { e: SterbetafelAnzeige; art?: 'anteil' | 'hazard'; zeitName?: string } = $props();
  const mitG = $derived(e.gruppen.filter(g => g.tafel).length >= 2);
  const reihen = $derived<{ name: string; t: TafelErgebnis }[]>(mitG ? e.gruppen.filter(g => g.tafel).map(g => ({ name: g.name, t: g.tafel! })) : [{ name: '', t: e.gesamt }]);
  const FARBEN = ['var(--dg-a)', 'var(--dg-b)', 'var(--tinte)', 'var(--tinte-2)'];
  const farbe = (i: number) => FARBEN[i % 4]!;
  const strich = (i: number) => (i >= 4 ? '7 4' : undefined);
  const W = 720, R = 28, PT = 300;
  const L = 70;
  const KOPF = $derived(mitG ? 18 + (Math.floor((reihen.length - 1) / 2) + 1) * 18 : 12);
  const ende = $derived(e.ende > 0 ? e.ende : 1);
  const x = (t: number) => L + (W - L - R) * (t / ende);
  const y0 = $derived(KOPF), y1 = $derived(KOPF + PT);
  /** Punkte je Reihe: Anteil (0, 1) und alle Intervallenden; Ausfallrate die Mitten der geschlossenen Intervalle. */
  const punkte = (t: TafelErgebnis): [number, number][] => art === 'anteil'
    ? [[0, 1], ...t.zeilen.filter(z => z.breite !== null).map(z => [z.anfang + z.breite!, z.kum] as [number, number])]
    : t.zeilen.filter(z => z.breite !== null && z.hazard !== null).map(z => [z.anfang + z.breite! / 2, z.hazard!] as [number, number]);
  const alleY = $derived(art === 'anteil' ? [1] : reihen.flatMap(r => punkte(r.t).map(p => p[1])));
  const schritt = $derived.by(() => { if (art === 'anteil') return 0.2; const hi = Math.max(1e-9, ...alleY), roh = hi / 4, m = 10 ** Math.floor(Math.log10(roh)); return [1, 2, 2.5, 5, 10].map(f => f * m).find(f => f >= roh - 1e-12) ?? m; });
  const oben = $derived(art === 'anteil' ? 1 : Math.ceil(Math.max(1e-9, ...alleY) / schritt - 1e-9) * schritt);
  const yTicks = $derived(Array.from({ length: Math.round(oben / schritt) + 1 }, (_, i) => Math.round(i * schritt * 1e9) / 1e9));
  /** Eine Schreibweise für alle Marken der Hochachse: so viele Stellen, wie der Abstand der Marken braucht. */
  const yStellen = $derived.by(() => { for (let k = 0; k <= 8; k++) if (Math.abs(Math.round(schritt * 10 ** k) / 10 ** k - schritt) < 1e-9 * Math.max(1, schritt)) return k; return 8; });
  const y = (v: number) => y0 + PT * (1 - v / (oben || 1));
  const ticks = $derived(zeitMarken(e.ende));
  const pfad = (t: TafelErgebnis) => punkte(t).map(([a, b], k) => `${k ? 'L' : 'M'}${x(a)},${y(b)}`).join('');
  const mitte = (t: string, n: number) => (t.length > n ? t.slice(0, Math.ceil((n - 1) / 2)) + '…' + t.slice(t.length - Math.floor((n - 1) / 2)) : t);
  const zeitTitel = $derived(zeitName || Lx('Zeit', 'Time'));
  const XZ = $derived(xZusatz(zeitTitel, W - L - R, 14, true));
  const H = $derived(y1 + 60 + XZ + 22);
  const yTitel = $derived(art === 'anteil' ? Lx('Anteil ohne Ereignis (kumuliert)', 'Proportion without event (cumulative)') : Lx('Ausfallrate (Hazard)', 'Hazard rate'));
  const titel = $derived(art === 'anteil' ? Lx('Sterbetafel: kumulierter Anteil ohne Ereignis', 'Life table: cumulative proportion without event') : Lx('Sterbetafel: Ausfallrate (Hazard) je Intervall', 'Life table: hazard rate per interval'));
  const bt = $derived.by(() => {
    const xs = [...new Set(reihen.flatMap(r => punkte(r.t).map(p => p[0])))].sort((p, q) => p - q);
    return bildtext('linie', {
      titel, xAchse: { name: zeitTitel, von: 0, bis: ende }, yAchse: { name: yTitel, von: 0, bis: oben },
      x: xs, reihen: reihen.map(r => { const m = new Map(punkte(r.t)); return { name: r.name, werte: xs.map(t => m.get(t) ?? null) }; })
    });
  });
  const legende = $derived(reihen.map((g, i) => ({ g, i, spalte: i % 2, zeile: Math.floor(i / 2) })));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  {#if mitG}
    {#each legende as l (l.i)}
      <g transform="translate({L + l.spalte * ((W - L - R) / 2)} {12 + l.zeile * 18})">
        <line x1="0" x2="26" y1="0" y2="0" stroke={farbe(l.i)} stroke-width="2.6" stroke-dasharray={strich(l.i)} /><text x="32" y="4" style="font-size:12px"><title>{l.g.name}</title>{mitte(l.g.name, 40)}</text>
      </g>
    {/each}
  {/if}
  {#each yTicks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(v) + 4} text-anchor="end" class="klein">{art === 'anteil' ? zahlDe(v, 1) : zahlDe(v, yStellen)}</text>{/each}
  <line x1={L} x2={L} y1={y0} y2={y1} stroke="var(--dg-achse)" />
  <line x1={L} x2={W - R} y1={y1} y2={y1} stroke="var(--dg-achse)" />
  {#each ticks as t}<line x1={x(t)} x2={x(t)} y1={y1} y2={y1 + 5} stroke="var(--dg-achse)" /><text x={x(t)} y={y1 + 20} text-anchor="middle" class="klein">{zeitText(t)}</text>{/each}
  {#if art === 'anteil'}<line x1={L} x2={W - R} y1={y(0.5)} y2={y(0.5)} stroke="var(--tinte-2)" stroke-dasharray="2 4" opacity=".7" />{/if}
  {#each reihen as r, i (i)}
    <path d={pfad(r.t)} fill="none" stroke={farbe(i)} stroke-width="2.4" stroke-dasharray={strich(i)} stroke-linecap="round" />
    {#each punkte(r.t) as p}<circle cx={x(p[0])} cy={y(p[1])} r="3.2" fill={farbe(i)} />{/each}
  {/each}
  <XTitel x={(L + W - R) / 2} y={y1 + 40} breite={W - L - R} text={zeitTitel} px={14} fett />
  <YTitel x={16} y={(y0 + y1) / 2} laenge={y1 - y0} text={yTitel} px={14} fett />
  <text x={L} y={H - 6} class="klein" style="font-size:11px">{art === 'anteil' ? Lx('Punkte: Ende der Intervalle', 'Dots: end of the intervals') : Lx('Punkte: Mitte der Intervalle; das offene letzte Intervall hat keine Ausfallrate', 'Dots: middle of the intervals; the open last interval has no hazard rate')}</text>
</svg>
<BildBeschreibung {...bt} />
