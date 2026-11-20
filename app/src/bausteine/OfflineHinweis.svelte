<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { OFFLINE, offlineStandText } from '../lib/offline';
  import Icon from './Icon.svelte';
  /** Leiste oben, nur in der Offline-Fassung: Stand und Hinweis, dass sie nicht aktualisiert wird. Schließbar bis zum nächsten Start (nichts wird gemerkt). */
  let zu = $state(false);
</script>

{#if OFFLINE && !zu}
  <div class="kopf-leiste" role="region" aria-label={L('Offline-Fassung', 'Offline version')}>
    <div class="kopf-leiste-text">
      <p><strong>{L(`Offline-Fassung vom ${offlineStandText()}`, `Offline version from ${offlineStandText()}`)}</strong>
        {L('- für Prüfungen und Orte ohne Netz. Sie wird nicht aktualisiert. Auf Dauer bitte statable.eu verwenden: dort gibt es Verbesserungen und behobene Fehler.', '- for exams and places without internet. It is not updated. For regular use, please use statable.eu: it has improvements and bug fixes.')}</p>
      <p>{L('Projekte liegen nur im Browser dieses Rechners. Am Ende im Projektmenü „In Datei speichern …“ wählen (in Firefox und Safari heißt der Eintrag „Als Datei herunterladen“).', 'Projects are stored only in the browser of this computer. At the end, choose "Save to file …" in the project menu (in Firefox and Safari the entry is called "Download as file").')}</p>
    </div>
    <div class="kopf-leiste-knoepfe">
      <button class="k nur-symbol" type="button" aria-label={L('Hinweis schließen', 'Dismiss')} onclick={() => (zu = true)}><Icon n="x" /></button>
    </div>
  </div>
{/if}
