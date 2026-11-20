<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import VorlageBereich from '../bausteine/VorlageBereich.svelte';
  import { herkunftSeite } from '../lib/navi';
  /** Vorlage speichern oder anwenden - erreichbar über das Projektmenü (Stufe 7). Der Ausgang: dahin, woher man kam. */
  const fertig = () => { location.hash = herkunftSeite('vorlage'); };
</script>

<div class="tisch ohne-rand"><section class="blatt rund" aria-labelledby="vl-t">
  <SeitenKopf titelId="vl-t" titel={L('Vorlage', 'Template')} hilfe={{ id: 'vorlage-protokoll', text: L('Hilfe zur Vorlage', 'Help on templates') }}>
    {#snippet aktionen()}<button class="k" type="button" onclick={fertig}>{L('Fertig', 'Done')}</button>{/snippet}
  </SeitenKopf>
  <VorlageBereich />
</section></div>
