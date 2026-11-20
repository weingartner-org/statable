<script lang="ts">
  import Rechnet from './Rechnet.svelte';
  import { tick } from 'svelte';
  import { d, L } from '../lib/sitzung.svelte';
  import { linkFrage, linkAbbrechen, linkBestaetigen } from '../lib/linkoeffnen.svelte';
  import Icon from './Icon.svelte';
  import { dialogFokus } from './dialogFokus';

  /** „Projekt … öffnen?“ nach einem Link mit ?projekt= oder #oeffne=. Fokus zuerst auf „Abbrechen“ - der Link öffnet nie von selbst. */
  let dlg = $state<HTMLDialogElement>();
  const offen = $derived(linkFrage.phase !== 'aus');
  /** lo-t und lo-text gibt es nur in diesen zwei Phasen; sonst zeigte aria-labelledby ins Leere. */
  const mitText = $derived(linkFrage.phase === 'frage' || linkFrage.phase === 'fehler');
  $effect(() => { if (offen && dlg && !dlg.open) { dlg.showModal(); tick().then(() => document.getElementById('lo-nein')?.focus()); } else if (!offen && dlg?.open) dlg.close(); });

  async function ja() { if (await linkBestaetigen()) location.hash = 'daten'; }
  const fehlerText = $derived.by(() => {
    const h = linkFrage.host;
    switch (linkFrage.grund) {
      case 'fremd': return L(`Der Link zeigt auf einen anderen Server (${h}). Aus Sicherheitsgründen öffnet Statable nur Dateien von der eigenen Adresse.`, `The link points to another server (${h}). For security, Statable only opens files from its own address.`);
      case 'zugross': return L('Die Datei ist zu groß für einen Link.', 'The file is too large for a link.');
      case 'datei': return L('Die Datei ist kein Statable-Projekt oder beschädigt.', 'The file is not a Statable project or is damaged.');
      case 'neuer': return d('Das Projekt ist aus einer neueren Fassung von Statable. Lade die Seite neu und versuche es noch einmal.', 'Das Projekt ist aus einer neueren Fassung von Statable. Laden Sie die Seite neu und versuchen Sie es noch einmal.', 'The project is from a newer version of Statable. Reload the page and try again.');
      case 'ungueltig': return L('Die Adresse im Link ist ungültig.', 'The address in the link is not valid.');
      case 'oeffnen': return L('Das Projekt ließ sich nicht öffnen.', 'The project could not be opened.');
      default: return L(`Die Datei ließ sich nicht laden${h ? ` (${h})` : ''}.`, `The file could not be loaded${h ? ` (${h})` : ''}.`);
    }
  });
</script>

<dialog bind:this={dlg} use:dialogFokus aria-labelledby={mitText ? "lo-t" : undefined} aria-describedby={mitText ? "lo-text" : undefined} oncancel={(e) => { e.preventDefault(); linkAbbrechen(); }}>
  {#if linkFrage.phase === 'frage'}
    <div class="dialog-innen">
      <div class="dialog-kopf"><Icon n="info" k="hw" /><h2 id="lo-t">{L(`Projekt „${linkFrage.name}“ öffnen?`, `Open project "${linkFrage.name}"?`)}</h2></div>
      <p id="lo-text">{d(
        `Ein Link möchte ein Projekt von ${linkFrage.host} öffnen. Es wird als neues Projekt angelegt; deine bisherigen Projekte bleiben unverändert in der Liste. Die Daten bleiben in diesem Browser.`,
        `Ein Link möchte ein Projekt von ${linkFrage.host} öffnen. Es wird als neues Projekt angelegt; Ihre bisherigen Projekte bleiben unverändert in der Liste. Die Daten bleiben in diesem Browser.`,
        `A link wants to open a project from ${linkFrage.host}. It is created as a new project; your existing projects stay unchanged in the list. The data stays in this browser.`)}</p>
      <div class="knopfzeile">
        <button class="k haupt" type="button" disabled={linkFrage.laeuft} onclick={ja}>{#if linkFrage.laeuft}<Rechnet imKnopf text={L('Wird geöffnet …', 'Opening …')} />{:else}{L('Projekt öffnen', 'Open project')}{/if}</button>
        <button class="k leise" id="lo-nein" type="button" onclick={linkAbbrechen}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </div>
  {:else if linkFrage.phase === 'fehler'}
    <div class="dialog-innen">
      <div class="dialog-kopf"><Icon n="hinweis" k="hw" /><h2 id="lo-t">{L('Das Projekt wurde nicht geöffnet', 'The project was not opened')}</h2></div>
      <p id="lo-text">{fehlerText} {d('Lade die Datei stattdessen herunter und ziehe sie auf die Startseite von Statable.', 'Laden Sie die Datei stattdessen herunter und ziehen Sie sie auf die Startseite von Statable.', 'Download the file instead and drag it onto the Statable start page.')}</p>
      <div class="knopfzeile"><button class="k haupt" id="lo-nein" type="button" onclick={linkAbbrechen}>{L('Schließen', 'Close')}</button></div>
    </div>
  {/if}
</dialog>
