<script lang="ts">
  /**
   * Einmaliger Hinweis für „Ich kenne mich aus“ (Usability Stufe 3): Strg+K sucht und startet alles. Kleine Meldung unten, nimmt keinen Fokus,
   * ist mit Tab erreichbar und sagt sich einmal an. „Verstanden“ (oder ein Klick auf das Kürzel, das die Palette öffnet) merkt sich, dass sie gesehen wurde.
   * Erscheint, sobald „Ich kenne mich aus“ gilt und Daten offen sind, nicht während des Rundgangs; danach nie wieder (`einst.strgKGesehen`).
   */
  import { s, L, einstSpeichern } from '../lib/sitzung.svelte';
  import { kuerzelText } from '../lib/kuerzel';
  import { oeffnePalette } from '../lib/palette.svelte';
  import { rundgangSichtbar } from '../lib/rundgang';
  import { sage } from '../lib/ansage';

  const da = $derived(s.einst.profi && !s.einst.strgKGesehen && !!s.projekt && !s.rundgangOffen && !rundgangSichtbar(s.einst, s.rundgangOffen));
  const kz = $derived(kuerzelText('palette'));
  function gesehen() { s.einst.strgKGesehen = true; einstSpeichern(); }
  $effect(() => { if (da) sage(`${L('Tipp: Alles suchen und ausführen mit', 'Tip: search and run anything with')} ${kz}`); });
</script>

{#if da}
  <div class="toast" style="flex-wrap:wrap" role="group" aria-label={L('Tipp', 'Tip')}>
    <span><button class="k leise" type="button" data-tipp={L('Öffnet die Befehlspalette', 'Opens the command palette')} onclick={() => { gesehen(); oeffnePalette(); }}><kbd>{kz}</kbd></button> {L('Alles suchen und ausführen: Auswertungen, Seiten, Einstellungen und Hilfe.', 'Search and run anything: analyses, pages, settings and help.')}</span>
    <button class="k" type="button" onclick={gesehen}>{L('Verstanden', 'Got it')}</button>
  </div>
{/if}
