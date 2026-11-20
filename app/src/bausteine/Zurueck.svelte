<script lang="ts">
  import { s, L } from '../lib/sitzung.svelte';
  import { zurueck, letzteSeite } from '../lib/navi';
  import Icon from './Icon.svelte';
  /** Der Zurück-Knopf einer Unterseite: nennt sein echtes Ziel („Zurück zu den Daten“). Jede Seite hat höchstens einen Ausgang.
   *  Mit `ziel` ein fester Weg (Hash), sonst zur letzten Arbeitsseite. Mit `name` ein eigener Text für „… zu“. */
  let { ziel = '', name = '' }: { ziel?: string; name?: string } = $props();
  const ort = $derived((ziel || letzteSeite(!!s.projekt)).replace(/^#/, ''));
  /** Name des Ziels nach „Zurück zu“, aus dem Hash abgeleitet. */
  const text = $derived.by(() => {
    if (name) return name;
    const [a, b] = ort.split('/');
    switch (a) {
      case 'daten': return L('Zurück zu den Daten', 'Back to the data');
      case 'start': return L('Zurück zur Startseite', 'Back to the start page');
      case 'blatt': return b === 'neu' ? L('Zurück zur neuen Auswertung', 'Back to the new analysis') : L('Zurück zur Auswertung', 'Back to the analysis');
      case 'bericht': return L('Zurück zum Bericht', 'Back to the report');
      case 'befehle': return L('Zurück zu den Befehlen', 'Back to the commands');
      case 'protokoll': return L('Zurück zum Protokoll', 'Back to the log');
      case 'vorlage': return L('Zurück zur Vorlage', 'Back to the template');
      case 'spalten': return L('Zurück zu den Spalten', 'Back to the columns');
      case 'hilfe': return L('Zurück zur Hilfe', 'Back to help');
      case 'verstehen': return L('Zurück zur Übersicht', 'Back to the overview');
      case 'lernen': return b === 'pfad' ? L('Zurück zum Lernpfad', 'Back to the learning path') : b === 'thema' ? L('Zurück zum Thema', 'Back to the topic') : L('Zurück zu Lernen', 'Back to Learning');
      case 'einstellungen': return L('Zurück zu den Einstellungen', 'Back to settings');
      case 'interviews': return L('Zurück zu den Interviews', 'Back to the interviews');   // Erstnutzer-Probe A1: „Übersicht“ wurde nicht als Weg erkannt
      case 'kodieren': return L('Zurück zum Kodieren', 'Back to coding');
      default: return L('Zurück zur Übersicht', 'Back to the overview');
    }
  });
</script>
<button class="k zurueck" type="button" onclick={() => (ziel ? (location.hash = ziel) : zurueck(!!s.projekt))}><Icon n="links" />{text}</button>
