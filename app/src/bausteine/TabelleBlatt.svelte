<script lang="ts">
  import { s, L, sichern, melde, type Blatt } from '../lib/sitzung.svelte';
  import { berechnetVon, wahlVon } from '../lib/tabellenblatt';
  import { fehlendeSpalten } from '../lib/blattstand';
  import { zitat } from '../i18n/profil';
  import { schliessen } from '../lib/blattentfernen.svelte';
  import TabelleAnzeige from './TabelleAnzeige.svelte';
  import Icon from './Icon.svelte';

  /**
   * Das Blatt „Tabelle zusammenstellen“ im Heft. Es speichert nur die Wahl; die Tabelle rechnet sich aus den heutigen Daten (lib/tabellenblatt.ts) und ist darum nie veraltet.
   * Ändern der Wahl geschieht auf der Seite #tabelle/<Blatt>.
   */
  let { blatt }: { blatt: Blatt } = $props();
  const wahl = $derived(wahlVon(blatt));
  const r = $derived(berechnetVon(blatt));
  const fehlt = $derived(fehlendeSpalten(blatt, s));
</script>

<div class="tisch ohne-rand"><article class="blatt" aria-labelledby="tbl-t">
  <div class="blatt-kopf"><h1 id="tbl-t">{blatt.titel}</h1>
    <label class="schalter"><input type="checkbox" bind:checked={blatt.imBericht} onchange={() => { void sichern(); melde(blatt.imBericht ? L('Im Bericht.', 'In the report.') : L('Nicht mehr im Bericht. Das Blatt bleibt im Heft.', 'No longer in the report. The page stays in your notebook.')); }}>{L('Im Bericht', 'In report')}</label>
    <a class="k" href="#tabelle/{blatt.id}"><Icon n="stift" />{L('Tabelle ändern', 'Change the table')}</a>
    <button class="k leise" type="button" onclick={() => (schliessen.offen = { id: blatt.id, titel: blatt.titel })}><Icon n="zu" />{L('Blatt schließen', 'Close page')}</button></div>
  {#if fehlt.length}<p class="veraltet-hinweis" role="note"><b>{L(`Es fehlt: ${fehlt.map(zitat).join(', ')}. Die Tabelle lässt sich ändern oder das Blatt schließen.`, `Missing: ${fehlt.map(zitat).join(', ')}. You can change the table or close the page.`)}</b></p>{/if}
  <TabelleAnzeige {r} {wahl} />
</article></div>
