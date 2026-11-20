<script lang="ts">
  /** Kleines Vorschaufenster für die Tabellen-Ansicht in den Einstellungen (Johannes 09.10.): dieselben Töne wie in den Ergebnistabellen. */
  import { tonCss, tonFett, type Ansicht, type Ton } from '../lib/tabellenfarben';
  import { L } from '../lib/sitzung.svelte';
  let { ansicht }: { ansicht: Ansicht } = $props();
  const ZEILEN = $derived([[L('sehr selten', 'very rarely'), 1, 8], [L('manchmal', 'sometimes'), 6, 31], [L('oft', 'often'), 9, 47]] as [string, number, number][]);
  const ton = (gruppe: number, gesamtZeile: boolean, gesamtSpalte: boolean, kopf = false): Ton => ({ ansicht, gruppe, n: ZEILEN.length, gesamtZeile, gesamtSpalte, kopf });
  const stil = (t: Ton) => { const b = tonCss(t); return `${b ? `background:${b};` : ''}${tonFett(t) ? 'font-weight:700;' : ''}`; };
  const summe = (k: 1 | 2) => ZEILEN.reduce((n, z) => n + z[k], 0);
</script>

<figure class="tab-vorschau" aria-hidden="true">
  <table role="presentation">
    <thead><tr><th scope="col"></th><th scope="col">{L('männlich', 'male')}</th><th scope="col">{L('weiblich', 'female')}</th><th scope="col" style={stil(ton(0, false, true, true))}>{L('Gesamt', 'Total')}</th></tr></thead>
    <tbody>
      {#each ZEILEN as [name, m, w], g}
        <tr><th scope="row" style={stil(ton(g, false, false))}>{name}</th><td style={stil(ton(g, false, false))}>{m}</td><td style={stil(ton(g, false, false))}>{w}</td><td style={stil(ton(g, false, true))}>{m + w}</td></tr>
      {/each}
      <tr class="summe"><th scope="row" style={stil(ton(0, true, false))}>{L('Gesamt', 'Total')}</th><td style={stil(ton(0, true, false))}>{summe(1)}</td><td style={stil(ton(0, true, false))}>{summe(2)}</td><td style={stil(ton(0, true, true))}>{summe(1) + summe(2)}</td></tr>
    </tbody>
  </table>
</figure>

<style>
  .tab-vorschau { margin: 0; padding: var(--a3); border: 1px solid var(--linie); border-radius: var(--r); background: var(--blatt); width: max-content; max-width: 100%; overflow-x: auto; }
  table { border-collapse: collapse; font: 400 var(--gr-klein)/1.3 var(--schrift-heft); font-variant-numeric: tabular-nums; }
  thead th { font-weight: 400; border-bottom: 1.5px solid var(--tinte); text-align: right; }
  tbody tr:last-child > * { border-bottom: 1.5px solid var(--tinte); }
  thead { border-top: 1.5px solid var(--tinte); }
  th, td { padding: 3px 10px; white-space: nowrap; transition: background-color var(--dauer-wechsel) var(--kurve), font-weight var(--dauer-wechsel); }
  tbody th { text-align: start; font-weight: 400; }
  td { text-align: right; }
</style>
