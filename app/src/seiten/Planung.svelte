<script lang="ts">
  import { L, s } from '../lib/sitzung.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import PlanungListe from '../bausteine/PlanungListe.svelte';

  /**
   * „Studie planen (Datenmanagementplan, Präregistrierung)“ - Stufe V2, Teil 2b. Eine Seite im Projekt, kein Eintrag im Kopf:
   * erreichbar über die Neue Studie („Danach planen“), die Seite „Fragebogen planen“ und Strg+K. Die Planung liegt im Projekt
   * (Autospeichern, Projektdatei Fassung 2); ohne Projekt gibt es nichts zu speichern, darum der Hinweis.
   */
</script>

<div class="tisch ohne-rand"><article class="blatt" aria-label={L('Planung', 'Planning')}>
  <SeitenKopf titel={L('Studie planen: Datenmanagementplan und Präregistrierung (data management plan, preregistration)', 'Plan a study: data management plan and preregistration')} titelId="pl-seite-t" fokussierbar zurueck />
  {#if s.projekt}
    <PlanungListe />
  {:else}
    <p class="hilfe">{L('Die Planung gehört zu einem Projekt. Legen Sie zuerst auf der Startseite eine neue Studie an oder öffnen Sie ein Projekt.', 'The planning belongs to a project. First create a new study on the start page or open a project.')} <a href="#start">{L('Zur Startseite', 'To the start page')}</a></p>
  {/if}
</article></div>
