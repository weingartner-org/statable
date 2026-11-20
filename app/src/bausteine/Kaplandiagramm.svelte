<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import { beiZeit, type Gruppe, type Kaplan } from '../lib/ueberleben';
  import { zahlDe } from '../lib/format';
  import { zeitText } from '../lib/ueberlebensaetze';
  import { L as Lx } from '../lib/sitzung.svelte';
  /** Kaplan-Meier-Diagramm: Stufenkurve je Gruppe, Zensierungen als kleine senkrechte Striche, optional das 95-%-Band, darunter die Tabelle „Anzahl unter Risiko“
   *  an den Marken der Zeitachse (wie in Veröffentlichungen üblich). Ab 5 Gruppen unterscheiden gestrichelte Linien zusätzlich zur Farbe. */
  let { e, zeitName = '', band = e.band }: { e: Kaplan; zeitName?: string; band?: boolean } = $props();
  const mitG = $derived(e.gruppen.length >= 2);
  const reihen = $derived<Gruppe[]>(mitG ? e.gruppen : [e.gesamt]);
  const FARBEN = ['var(--dg-a)', 'var(--dg-b)', 'var(--tinte)', 'var(--tinte-2)'];
  const farbe = (i: number) => FARBEN[i % 4]!;
  const strich = (i: number) => (i >= 4 ? '7 4' : undefined);
  const W = 720, R = 28, PT = 330;
  /** Risikotabelle: Platz links nach dem längsten Gruppennamen (höchstens 28 Zeichen), sonst wurden alle auf 6 Zeichen gekürzt (Prüfung B4). */
  const NAME_MAX = $derived(Math.min(28, Math.max(6, groesste(e.gruppen.map(g => g.name.length)))));
  const L = $derived(mitG ? Math.max(124, Math.round(40 + NAME_MAX * 6.4)) : 64);
  const KOPF = $derived(mitG ? 18 + (Math.floor((reihen.length - 1) / 2) + 1) * 18 : 12);
  const ende = $derived(e.ticks[e.ticks.length - 1]!);
  const x = (t: number) => L + (W - L - R) * (t / (ende || 1));
  const y0 = $derived(KOPF), y1 = $derived(KOPF + PT);
  const y = (v: number) => y0 + PT * (1 - v);
  const kurz = (t: string, n = 20) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  /** Kürzen mit Auslassung in der Mitte: „Standardtherapie (Cisplatin)“ und „Standardtherapie plus Prüfsubstanz“ bleiben unterscheidbar. */
  const mitte = (t: string, n: number) => (t.length > n ? t.slice(0, Math.ceil((n - 1) / 2)) + '…' + t.slice(t.length - Math.floor((n - 1) / 2)) : t);
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1];

  /** Stufenlinie über alle Ereigniszeiten bis zum letzten Beobachtungszeitpunkt der Gruppe. */
  function stufen(g: Gruppe, feld: 's' | 'lo' | 'hi' = 's'): string {
    // Stufen, die in dieselbe Bildspalte fallen, werden zu einer (Abschlusstest A3): bei 100.000 Personen wären es sonst 100.000 Teilstücke für 700 Bildpunkte.
    let d = `M${x(0)},${y(1)}`, spalte = NaN, yy = 0;
    for (const p of g.punkte) {
      if (!(p.ereignisse > 0 && Number.isFinite(p[feld]))) continue;
      const px = Math.round(x(p.t) * 2) / 2;
      if (px !== spalte && !Number.isNaN(spalte)) d += `H${spalte}V${yy}`;
      spalte = px; yy = y(p[feld]);
    }
    if (!Number.isNaN(spalte)) d += `H${spalte}V${yy}`;
    return d + `H${x(g.maxZeit)}`;
  }
  /** Band zwischen unterer und oberer Grenze (nur, solange beide bekannt sind; fällt die Kurve auf 0, endet es dort). */
  function bandPfad(g: Gruppe): string {
    const alle = g.punkte.filter(p => p.ereignisse > 0), ev = alle.filter(p => Number.isFinite(p.lo) && Number.isFinite(p.hi));
    if (!ev.length) return '';
    const danach = alle[ev.length], bis = danach ? danach.t : g.maxZeit;
    let d = `M${x(0)},${y(1)}`;
    for (const p of ev) d += `H${x(p.t)}V${y(p.hi)}`;
    d += `H${x(bis)}V${y(ev[ev.length - 1]!.lo)}`;
    for (let k = ev.length - 1; k >= 0; k--) d += `H${x(ev[k]!.t)}V${y(k > 0 ? ev[k - 1]!.lo : 1)}`;
    return d + `H${x(0)}Z`;
  }
  /** Zensierungs-Striche: je halber Bildpunkt höchstens einer - mehr sieht man nicht, und ein Knoten je Person ließ den Bericht stehen (Abschlusstest A3). */
  const zensuren = (g: Gruppe) => { const da = new Set<number>(); return g.punkte.filter(p => { if (!(p.zensiert > 0)) return false; const k = Math.round(x(p.t) * 2); if (da.has(k)) return false; da.add(k); return true; }).map(p => ({ t: p.t, s: p.s })); };
  const risiko = $derived(reihen.map(g => e.ticks.map(t => beiZeit(g, t).nRisiko)));
  const zeitTitel = $derived(zeitName || Lx('Zeit', 'Time'));
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): die Risiko-Tabelle rückt nach unten. */
  const XZ = $derived(xZusatz(zeitTitel, W - L - R, 14, true));
  const yR = $derived(y1 + 82 + XZ);                     // erste Zeile der Risiko-Tabelle
  const H = $derived(yR + reihen.length * 26 + 18);
  const logrankP = (p: number) => (p < 0.001 ? Lx('kleiner 0,001', '< .001') : Lx(`= ${zahlDe(p, 3)}`, `= ${zahlDe(p, 3).replace(/^0\./, '.')}`));
  const beschreibung = $derived(
    (mitG ? Lx(`Kaplan-Meier-Kurve mit ${reihen.length} Gruppen`, `Kaplan-Meier curve with ${reihen.length} groups`) : Lx('Kaplan-Meier-Kurve', 'Kaplan-Meier curve')) + '. ' +
    reihen.map(g => { const med = Number.isFinite(g.median.wert) ? zeitText(g.median.wert) : Lx('nicht erreicht', 'not reached'); return `${g.name ? g.name + ': ' : ''}${Lx(`${g.n} Personen, ${g.ereignisse} Ereignisse, ${g.zensiert} zensiert, Median ${med}.`, `${g.n} people, ${g.ereignisse} events, ${g.zensiert} censored, median ${med}.`)}`; }).join(' ') +
    (e.logrank ? ' ' + Lx(`Log-Rank-Test: Chi-Quadrat ${zahlDe(e.logrank.chi2, 2)}, p ${logrankP(e.logrank.p)}.`, `Log-rank test: χ² = ${zahlDe(e.logrank.chi2, 2)}, p ${logrankP(e.logrank.p)}.`) : ''));
  /** Legende: Namen nebeneinander, in Zeilen zu je drei */
  const legende = $derived(reihen.map((g, i) => ({ g, i, spalte: i % 2, zeile: Math.floor(i / 2) })));
  const bt = $derived(bildtext('kaplan', { zeitName: zeitTitel, ereignisName: e.ereignis || Lx('Ereignis', 'Event'), tMax: ende,
    kurven: reihen.map(g => ({ ...(mitG ? { name: g.name } : {}), n: g.n, ereignisse: g.ereignisse, zensiert: g.zensiert, median: Number.isFinite(g.median.wert) ? g.median.wert : null,
      punkte: [{ t: 0, s: 1 }, ...g.punkte.filter(p => p.ereignisse > 0).map(p => ({ t: p.t, s: p.s }))] })),
    logrank: e.logrank ? { chi2: e.logrank.chi2, df: e.logrank.df, p: e.logrank.p } : null, zeiten: e.ticks }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  {#if mitG}
    {#each legende as l (l.i)}
      <g transform="translate({L + l.spalte * ((W - L - R) / 2)} {12 + l.zeile * 18})">
        <line x1="0" x2="26" y1="0" y2="0" stroke={farbe(l.i)} stroke-width="2.6" stroke-dasharray={strich(l.i)} /><text x="32" y="4" style="font-size:12px"><title>{l.g.name}</title>{mitte(l.g.name, 40)}</text>
      </g>
    {/each}
  {/if}
  {#each yTicks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(v) + 4} text-anchor="end" class="klein">{zahlDe(v, 1)}</text>{/each}
  <line x1={L} x2={L} y1={y0} y2={y1} stroke="var(--dg-achse)" />
  <line x1={L} x2={W - R} y1={y1} y2={y1} stroke="var(--dg-achse)" />
  {#each e.ticks as t}<line x1={x(t)} x2={x(t)} y1={y1} y2={y1 + 5} stroke="var(--dg-achse)" /><text x={x(t)} y={y1 + 20} text-anchor="middle" class="klein">{zeitText(t)}</text>{/each}
  <line x1={L} x2={W - R} y1={y(0.5)} y2={y(0.5)} stroke="var(--tinte-2)" stroke-dasharray="2 4" opacity=".7" />
  {#if band}{#each reihen as g, i (i)}{#if bandPfad(g)}<path d={bandPfad(g)} fill={farbe(i)} opacity=".16" stroke="none" />{/if}{/each}{/if}
  {#each reihen as g, i (i)}
    <path d={stufen(g)} fill="none" stroke={farbe(i)} stroke-width="2.4" stroke-dasharray={strich(i)} stroke-linecap="round" />
    {#each zensuren(g) as c}<path d="M{x(c.t)},{y(c.s) - 5}V{y(c.s) + 5}" stroke={farbe(i)} stroke-width="1.6" />{/each}
  {/each}
  <XTitel x={(L + W - R) / 2} y={y1 + 40} breite={W - L - R} text={zeitTitel} px={14} fett />
  <YTitel x={16} y={(y0 + y1) / 2} laenge={y1 - y0} text={Lx('Anteil ohne Ereignis', 'Proportion without event')} px={14} fett />
  <text x={L} y={yR - 8} font-weight="650" style="font-size:12px">{Lx('Anzahl unter Risiko', 'Number at risk')}</text>
  {#each reihen as g, i (i)}
    {#if mitG}<line x1="6" x2="20" y1={yR + i * 26 + 10} y2={yR + i * 26 + 10} stroke={farbe(i)} stroke-width="2.4" stroke-dasharray={strich(i)} /><text x="26" y={yR + i * 26 + 14} style="font-size:11px"><title>{g.name}</title>{mitte(g.name, NAME_MAX)}</text>{/if}
    {#each e.ticks as t, k}<text x={x(t)} y={yR + i * 26 + 14} text-anchor="middle" style="font-size:12px">{risiko[i]![k]}</text>{/each}
  {/each}
  <text x={L} y={H - 4} class="klein" style="font-size:11px">{Lx('Senkrechte Striche: zensierte Personen', 'Vertical ticks: censored people')}{band ? Lx(' · Band: 95 %-Intervall', ' · band: 95% interval') : ''}</text>
</svg>
<BildBeschreibung {...bt} />
