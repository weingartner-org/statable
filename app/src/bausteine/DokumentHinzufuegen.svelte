<script lang="ts">
  /**
   * Dokument hinzufügen (Paket 6b3, Fachblatt 3.8): Datei wählen (.txt, .docx, .pdf) oder Text einfügen. Das Lesen steckt in `lib/dokument-lesen.ts`.
   * Das fertige Dokument geht an `oncomplete`; ablegen muss der Aufrufer. Hinweise stehen als normaler Text unter dem Feld (keine Live-Region),
   * Ansagen nur über `sage()`. Text aus Dateien wird nur als Text angezeigt.
   */
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { dokumentAusText, leseDokument } from '../lib/dokument-lesen';
  import type { Dokument } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';

  let { oncomplete }: { oncomplete: (dok: Dokument) => void } = $props();

  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const lade = new Laedt();
  let eingabe = $state<HTMLInputElement>();
  let name = $state('');
  let text = $state('');
  let dateiFehler = $state('');
  let textFehler = $state('');
  let hinweise = $state<string[]>([]);

  const grundname = (n: string): string => n.replace(/\.[^.]+$/, '');

  async function nimmDatei(f: File | undefined) {
    dateiFehler = ''; hinweise = [];
    if (!f) return;
    await lade.mit(async () => {
      try {
        const roh = await leseDokument(f.name, new Uint8Array(await f.arrayBuffer()));
        const dok = dokumentAusText(grundname(f.name), roh.text, roh.art, roh.sprache ?? sprache());
        hinweise = roh.hinweise;
        oncomplete(dok);
        sage(L(`Dokument „${dok.name}“ hinzugefügt.`, `Document "${dok.name}" added.`));
      } catch (e) {
        dateiFehler = e instanceof Error ? e.message : L('Die Datei konnte nicht gelesen werden.', 'The file could not be read.');
        sage(dateiFehler, 'dringend');
        eingabe?.focus();
      }
    });
  }

  function uebernehmen() {
    textFehler = '';
    if (!text.trim()) {
      textFehler = L('Bitte zuerst Text in das Feld einfügen.', 'Please paste some text into the field first.');
      sage(textFehler, 'dringend');
      document.getElementById('dh-text')?.focus();
      return;
    }
    const n = name.trim() || L('Eingefügter Text', 'Pasted text');
    const dok = dokumentAusText(n, text, 'text', sprache());
    oncomplete(dok);
    name = ''; text = '';
    sage(L(`Dokument „${dok.name}“ hinzugefügt.`, `Document "${dok.name}" added.`));
  }
</script>

<div class="dh" role="group" aria-labelledby="dh-titel">
  <h3 id="dh-titel">{L('Dokument hinzufügen', 'Add a document')}</h3>

  <div class="eingabe">
    <label for="dh-datei">{L('Datei wählen (txt, docx oder pdf)', 'Choose a file (txt, docx or pdf)')}</label>
    <input bind:this={eingabe} id="dh-datei" type="file" accept=".txt,.docx,.pdf" aria-describedby="dh-datei-hilfe{dateiFehler ? ' dh-datei-fehler' : ''}" aria-invalid={dateiFehler ? 'true' : undefined}
      onchange={(e) => { const f = e.currentTarget.files?.[0]; void nimmDatei(f); e.currentTarget.value = ''; }}>
    <p class="hilfe" id="dh-datei-hilfe">{L('Der Text wird einmal eingelesen und danach nicht mehr verändert. Gescannte PDFs ohne Textebene kann Statable nicht lesen.', 'The text is read once and not changed afterwards. Statable cannot read scanned PDFs without a text layer.')}</p>
    {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Datei wird gelesen …', 'Reading the file …')} /></p>{/if}
    {#if dateiFehler}<p class="fehl" id="dh-datei-fehler">{dateiFehler}</p>{/if}
    {#if hinweise.length}
      <ul class="hilfe" id="dh-hinweise">{#each hinweise as h}<li>{h}</li>{/each}</ul>
    {/if}
  </div>

  <div class="eingabe">
    <label for="dh-name">{L('Name des Dokuments (bei eingefügtem Text)', 'Name of the document (for pasted text)')}</label>
    <input id="dh-name" type="text" maxlength="120" autocomplete="off" bind:value={name}>
  </div>
  <div class="eingabe">
    <label for="dh-text">{L('Oder Text einfügen', 'Or paste text')}</label>
    <textarea id="dh-text" rows="6" spellcheck="false" bind:value={text} aria-invalid={textFehler ? 'true' : undefined} aria-describedby={textFehler ? 'dh-text-fehler' : undefined}></textarea>
    {#if textFehler}<p class="fehl" id="dh-text-fehler">{textFehler}</p>{/if}
  </div>
  <div class="knopfzeile"><button class="k" type="button" onclick={uebernehmen}>{L('Übernehmen', 'Add')}</button></div>

  <p class="hilfe">{L('Interviews mit Sprechern und Zeitmarken lesen Sie über die Seite', 'Interviews with speakers and time marks are read in on the page')} <a href="#interviews">{L('Interviews', 'Interviews')}</a>.</p>
</div>

<style>
  .dh { display: flex; flex-direction: column; gap: var(--a3); }
  .dh h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  ul.hilfe { padding-inline-start: var(--a4); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
</style>
