<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /** Regelkarten für Zählwerte (p, np, c, u) unter „Wie verteilt sich etwas?“ (S-I). Die Werte stehen in der Reihenfolge der Zeilen. Rechnet im Browser (lib/zaehlkarten.ts). */
  import HilfeLink from './HilfeLink.svelte';
  import { kursSprung } from '../lib/kursziel';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  let { ziel = false }: { /** Von „Qualität und Prozess“ gewählt: klappt auf und springt hin */ ziel?: boolean } = $props();
  import { istFehlend } from '../lib/fehlend';
  import { komma } from '../lib/ergebnis';
  import { parseZahl } from '../lib/metaanalyse';
  import { zaehlkarte, type ZaehlArt } from '../lib/zaehlkarten';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { kleinste, groesste } from '../lib/menge';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';

  const kennung = $props.id();
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let art = $state<ZaehlArt>('p'), zSp = $state(''), gSp = $state(''), fest = $state('50');
  const spaltenWerte = (name: string) => { const i = s.spalten.findIndex(c => c.name === name), c = s.spalten[i]; return !c ? [] : s.zeilen.map(z => { const v = z[i]; return typeof v === 'number' && !istFehlend(c, v) ? v : null; }); };
  const daten = $derived.by(() => {
    if (!zSp) return null;
    const d = spaltenWerte(zSp), g = art === 'p' || art === 'u' ? (gSp ? spaltenWerte(gSp) : null) : null, c = parseZahl(fest);
    if ((art === 'p' || art === 'u') && !g) return null;
    if (art === 'np' && (c === null || !(c > 0))) return null;
    const dd: number[] = [], gg: number[] = [];
    d.forEach((v, i) => { if (v === null) return; const gv = art === 'np' ? c! : art === 'c' ? 1 : g![i]; if (gv === null || gv === undefined) return; dd.push(v); gg.push(gv); });
    return { d: dd, g: gg };
  });
  const res = $derived(daten ? zaehlkarte(art, daten.d, daten.g) : null);
  const r = $derived(res && !('fehler' in res) ? res : null);
  const name = $derived(zahlen.find(c => c.name === zSp)?.bezeichnung.trim() || zSp);
  const W = 560, H = 280, L0 = 64, R0 = 24, T0 = 20, U0 = 50;
  const dg = $derived.by(() => {
    if (!r) return null;
    const n = r.punkte.length, y0 = Math.min(kleinste([...r.punkte, ...r.lcl])), y1 = Math.max(groesste([...r.punkte, ...r.ucl]));
    const pad = (y1 - y0 || 1) * 0.08, Y = (v: number) => T0 + (H - T0 - U0) * (1 - (v - (y0 - pad)) / ((y1 - y0 || 1) + 2 * pad)), X = (i: number) => L0 + (W - L0 - R0) * (n === 1 ? 0.5 : i / (n - 1));
    const stufe = (w: number[]) => w.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    return { y0: y0 - pad, y1: y1 + pad, Y, X, linie: stufe(r.punkte), oben: stufe(r.ucl), unten: stufe(r.lcl) };
  });
  const marken: Record<ZaehlArt, () => string> = { p: () => L('Anteil fehlerhafter Stücke', 'Proportion of defective items'), np: () => L('Zahl fehlerhafter Stücke', 'Number of defective items'), c: () => L('Zahl der Fehler', 'Number of defects'), u: () => L('Fehler je Einheit', 'Defects per unit') };
  const bt = $derived(r ? bildtext('linie', {
    titel: `${name} - ${marken[art]()}`, xAchse: { name: L('Nummer der Stichprobe', 'Sample number') }, yAchse: { name: marken[art]() },
    x: r.punkte.map((_, i) => i + 1),
    reihen: [{ name: name, werte: r.punkte }, { name: L('Obere Grenze', 'Upper limit'), werte: r.ucl }, { name: L('Untere Grenze', 'Lower limit'), werte: r.lcl }],
    hilfslinien: [{ name: L('Mittellinie', 'Centre line'), y: r.mitte }]
  }) : null);
  const sig = (i: number) => !!r && (r.aus.includes(i) || r.serie.includes(i));
</script>

<details class="auf" style="margin-top:var(--a4)" open={ziel} use:kursSprung={ziel} data-kurs="zaehlkarte"><summary>{L('Regelkarte für Zählwerte (fehlerhafte Stücke, Fehler)', 'Control chart for counts (defective items, defects)')}</summary>
  <p class="heft-text">{L('Wenn nicht gemessen, sondern gezählt wird (wie viele Stücke einer Stichprobe fehlerhaft sind, wie viele Fehler gefunden wurden), zeigt die Regelkarte den Verlauf und die Grenzen, in denen die Zahlen bei einem stabilen Prozess liegen. Die Art der Zählung wählen:', 'When counting instead of measuring (how many items of a sample are defective, how many defects were found), the control chart shows the course and the limits within which the numbers lie in a stable process. Choose the kind of count:')}</p>
  <p class="hilfe"><HilfeLink id="regelkarten" text={L('Hilfe: Regelkarten', 'Help: control charts')} /></p>
  {#if zahlen.length < 1}<p class="heft-text" style="color:var(--tinte-2)">{L('Dafür braucht es eine Zahlenspalte mit den Zählungen.', 'This needs a number column with the counts.')}</p>
  {:else}
    <fieldset class="segment" style="margin:var(--a2) 0"><legend class="nur-vorleser">{L('Art der Zählung', 'Kind of count')}</legend>
      <label><input type="radio" name="zk-a-{kennung}" checked={art === 'p'} onchange={() => (art = 'p')} />{L('Anteil fehlerhafter Stücke (p)', 'proportion defective (p)')}</label>
      <label><input type="radio" name="zk-a-{kennung}" checked={art === 'np'} onchange={() => (art = 'np')} />{L('Zahl fehlerhafter Stücke, gleiche Stichprobe (np)', 'number defective, same sample size (np)')}</label>
      <label><input type="radio" name="zk-a-{kennung}" checked={art === 'c'} onchange={() => (art = 'c')} />{L('Zahl der Fehler, gleiche Menge (c)', 'number of defects, same area (c)')}</label>
      <label><input type="radio" name="zk-a-{kennung}" checked={art === 'u'} onchange={() => (art = 'u')} />{L('Fehler je Einheit, wechselnde Menge (u)', 'defects per unit, changing area (u)')}</label>
    </fieldset>
    <div style="display:flex;flex-wrap:wrap;gap:var(--a3);margin:var(--a2) 0">
      <div class="eingabe" style="max-width:300px"><label for="zk-z-{kennung}">{L('Spalte mit den Zählungen', 'Column with the counts')}</label><select id="zk-z-{kennung}" bind:value={zSp}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen as c (c.name)}<option value={c.name}>{c.bezeichnung.trim() || c.name}</option>{/each}</select></div>
      {#if art === 'p' || art === 'u'}<div class="eingabe" style="max-width:300px"><label for="zk-g-{kennung}">{art === 'p' ? L('Spalte mit der Stichprobengröße', 'Column with the sample size') : L('Spalte mit der Menge (Einheiten)', 'Column with the area (units)')}</label><select id="zk-g-{kennung}" bind:value={gSp}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen.filter(c => c.name !== zSp) as c (c.name)}<option value={c.name}>{c.bezeichnung.trim() || c.name}</option>{/each}</select></div>{/if}
      {#if art === 'np'}<div class="eingabe" style="max-width:200px"><label for="zk-f-{kennung}">{L('Stichprobengröße', 'Sample size')}</label><input id="zk-f-{kennung}" type="text" inputmode="numeric" bind:value={fest} autocomplete="off" /></div>{/if}
    </div>
    {#if res && 'fehler' in res}
      <p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{res.fehler === 'zu-wenig' ? L('Für die Regelkarte braucht es mindestens fünf Stichproben (besser 20 bis 25).', 'The control chart needs at least five samples (better 20 to 25).') : res.fehler === 'zaehlwerte' ? L('Zählungen müssen ganze Zahlen ab 0 sein.', 'Counts must be whole numbers from 0.') : res.fehler === 'groessen' ? L('Die Größen müssen größer als 0 sein.', 'The sizes must be greater than 0.') : res.fehler === 'mehr-als-groesse' ? L('Eine Stichprobe hat mehr fehlerhafte Stücke als Stücke.', 'A sample has more defective items than items.') : L('Es gibt keine Streuung: alle Zählungen sind 0 oder alle Stücke fehlerhaft.', 'There is no variation: all counts are 0 or all items are defective.')}</p>
    {:else if r && dg}
      <p class="heft-text" use:ergebnisAnsage>{L(`Mittellinie ${komma(r.mitte, 4)} (${r.n} Stichproben).`, `Centre line ${komma(r.mitte, 4)} (${r.n} samples).`)} {r.aus.length || r.serie.length ? L(`Signale: ${new Set([...r.aus, ...r.serie]).size} Punkte außerhalb der Grenzen oder in einer langen Folge auf einer Seite. Der Prozess ist nicht sicher stabil: Ursachen suchen.`, `Signals: ${new Set([...r.aus, ...r.serie]).size} points outside the limits or in a long run on one side. The process is not reliably stable: look for causes.`) : L('Kein Signal: Die Werte liegen innerhalb der Grenzen, ohne lange Folge auf einer Seite.', 'No signal: the values lie within the limits, with no long run on one side.')}</p>
      <DiagrammExport titel={`${name} - ${marken[art]()}`}>
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz} style="max-width:{W}px">
          {#each achsenMarken(dg.y0, dg.y1) as v}<text x={L0 - 10} y={dg.Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
          <line x1={L0} x2={W - R0} y1={dg.Y(r.mitte)} y2={dg.Y(r.mitte)} stroke="var(--dg-a)" stroke-width="1.5" />
          <path d={dg.oben} fill="none" stroke="var(--tinte-2, #666)" stroke-dasharray="6 5" /><path d={dg.unten} fill="none" stroke="var(--tinte-2, #666)" stroke-dasharray="6 5" />
          <path d={dg.linie} fill="none" stroke="var(--dg-a)" stroke-width="2" stroke-linejoin="round" />
          {#each r.punkte as v, i}<circle cx={dg.X(i)} cy={dg.Y(v)} r={sig(i) ? 5.5 : 3.5} fill={sig(i) ? 'var(--fehler, #b3261e)' : 'var(--dg-a)'}><title>{i + 1}: {zahlDe(v)}</title></circle>{/each}
          <XTitel x={(L0 + W - R0) / 2} y={H - 8} breite={W - L0 - R0} text={L('Nummer der Stichprobe', 'Sample number')} klasse="klein" />
          <YTitel x={18} y={(T0 + H - U0) / 2} laenge={H - T0 - U0} text={marken[art]()} px={13} klasse="klein" />
        </svg>
      </DiagrammExport>
      {#if bt}<BildBeschreibung {...bt} beschreibung={[L(`Regelkarte der Zählwerte von ${name}: Mittellinie ${komma(r.mitte, 4)}.`, `Control chart of the counts of ${name}: centre line ${komma(r.mitte, 4)}.`), ...bt.beschreibung]} />{/if}
      {#if r.erwartet < 5}<p class="heft-text" role="alert">{L('Die erwartete Zahl liegt unter 5: Die Grenzen sind dann nur grob, weil seltene Ereignisse nicht symmetrisch streuen.', 'The expected number is below 5: the limits are then only rough, because rare events do not scatter symmetrically.')}</p>{/if}
      <p class="heft-text" style="color:var(--tinte-2)">{L('Eine Regelkarte zeigt, ob der Prozess stabil ist, nicht, ob er gut ist. Die Grenzen setzen unabhängige Stichproben voraus.', 'A control chart shows whether the process is stable, not whether it is good. The limits assume independent samples.')}</p>
    {/if}
  {/if}
</details>
