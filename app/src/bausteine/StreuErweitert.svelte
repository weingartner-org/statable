<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import GruppenStreudiagramm from './GruppenStreudiagramm.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { gruppenSpalten, gruppenStreu, STREU_GRUPPEN_MAX } from '../lib/streugruppen';
  /**
   * Streudiagramm nach Gruppe, mit Gerade je Gruppe und auf Wunsch mit LOESS-Linie. Steht zugeklappt unter dem gewöhnlichen Streudiagramm
   * (Korrelation, Regression, Moderation, Datenansicht). Rechnet nur zum Ansehen: die Geraden sind die der kleinsten Quadrate je Gruppe, nicht das Modell der Auswertung.
   */
  let { x, y, name }: { x: string; y: string; name?: (n: string) => string } = $props();
  const kennung = $props.id();
  let auf = $state(false), g = $state(''), loessAn = $state(false), geraden = $state(true);
  const nm = (n: string) => (name ? name(n) : lesbar(s.spalten.find(c => c.name === n)));
  const sx = $derived(s.spalten.find(c => c.name === x)), sy = $derived(s.spalten.find(c => c.name === y));
  const kandidaten = $derived(auf ? gruppenSpalten(s.spalten, s.zeilen, [x, y]) : []);
  const gSp = $derived(kandidaten.find(c => c.name === g) ?? null);
  const daten = $derived(auf && sx && sy ? gruppenStreu(sx, sy, gSp, s.zeilen, s.spalten, loessAn) : null);
  const titel = $derived(`${nm(y)} ${L('und', 'and')} ${nm(x)} - ${gSp ? L('Streudiagramm nach Gruppe', 'Scatter plot by group') : L('Streudiagramm', 'Scatter plot')}`);
</script>
<details class="se" ontoggle={(ev) => (auf = (ev.currentTarget as HTMLDetailsElement).open)}>
  <summary>{L('Streudiagramm nach Gruppe und mit LOESS-Linie', 'Scatter plot by group and with a LOESS line')}</summary>
  {#if auf}
    <div class="se-innen">
      <p class="hilfe">{L(`Färbe die Punkte nach einer Gruppenspalte (zwei bis ${STREU_GRUPPEN_MAX} Gruppen): Jede Gruppe bekommt eine eigene Punktform und eine eigene Gerade. Laufen die Geraden verschieden, hängt der Zusammenhang von der Gruppe ab.`,
        `Colour the dots by a group column (two to ${STREU_GRUPPEN_MAX} groups): each group gets its own dot shape and its own line. If the lines run differently, the relationship depends on the group.`)}</p>
      <div class="se-wahl">
        <div class="eingabe"><label for="{kennung}-g">{L('Gruppe (Spalte)', 'Group (column)')}</label>
          <select id="{kennung}-g" bind:value={g}><option value="">{L('Keine', 'None')}</option>{#each kandidaten as c (c.name)}<option value={c.name}>{lesbar(c)}</option>{/each}</select></div>
        <label class="schalter" data-begriff="regressionsgerade"><input type="checkbox" bind:checked={geraden}>{L('Gerade je Gruppe (kleinste Quadrate)', 'Line per group (least squares)')}</label>
        <label class="schalter" data-begriff="loess"><input type="checkbox" bind:checked={loessAn}>{L('LOESS-Linie (lokale Regression, über alle Punkte)', 'LOESS line (local regression, across all points)')}</label>
      </div>
      {#if !kandidaten.length}<p class="hilfe">{L(`Keine Spalte mit zwei bis ${STREU_GRUPPEN_MAX} Gruppen gefunden; die LOESS-Linie geht trotzdem.`, `No column with two to ${STREU_GRUPPEN_MAX} groups found; the LOESS line still works.`)}</p>{/if}
      {#if loessAn}<p class="hilfe">{L('Die LOESS-Linie folgt den Punkten, ohne eine Form vorzugeben: Sie zeigt, ob der Zusammenhang geradlinig ist oder einen Bogen macht. Spannweite 0,75, Grad 2 (wie R). Sie ist zum Ansehen da, nicht zum Testen.', 'The LOESS line follows the dots without assuming a shape: it shows whether the relationship is straight or curved. Span 0.75, degree 2 (as in R). It is for looking, not for testing.')}</p>{/if}
      {#if daten && daten.punkte.length >= 3}
        <DiagrammExport {titel}><GruppenStreudiagramm d={daten} xText={nm(x)} yText={nm(y)} {geraden} loess={loessAn} /></DiagrammExport>
      {:else}<p class="hilfe" use:ergebnisAnsage>{L('Zu wenig Punkte mit allen Angaben.', 'Too few points with all values.')}</p>{/if}
    </div>
  {/if}
</details>

<style>
  .se { margin-top: var(--a4); }
  .se summary { cursor: pointer; font-weight: 600; min-height: 44px; padding-block: var(--a3); box-sizing: border-box; }
  .se summary:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; border-radius: 4px; }
  .se-innen { display: grid; gap: var(--a3); padding-top: var(--a2); }
  .se-wahl { display: flex; flex-wrap: wrap; gap: var(--a3) var(--a4); align-items: flex-end; }
  .se-wahl .eingabe { flex: 1 1 14rem; min-width: 0; }
  .se-wahl select { width: 100%; }
</style>
