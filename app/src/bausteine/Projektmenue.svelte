<script lang="ts">
  import { rutsch } from '../lib/rutsch';
    import { s, d, L, istEn, melde, meldeFehler, projektSpeichern, meldeGespeichert, projektSchliessen, benenneUm, speicherVollText, projektSchuetzenswert, ladeListe, weiterarbeiten } from '../lib/sitzung.svelte';
  import { apiDa } from '../lib/dateiziel';
  import { standVon, standText } from '../lib/erinnerung';
  import Icon from './Icon.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';

  /** Das Projekt in der Kopfzeile: Name, als Datei speichern, schließen. Ruhig - ein Knopf, ein kleines Feld (wie Farbwahl). */
  let offen = $state(false);
  let ort = $state<HTMLElement>();
  let knopf = $state<HTMLButtonElement>();
  /** Die Uhr für „vor 2 Min.“: läuft nur, solange das Menü offen ist. */
  let jetzt = $state(Date.now());
  $effect(() => { if (!offen) return; jetzt = Date.now(); const u = setInterval(() => (jetzt = Date.now()), 20000); return () => clearInterval(u); });
  const stand = $derived(standVon({ ungesichert: s.ungesichert, ziel: s.ziel }));
  const standSatz = $derived(standText(stand, jetzt, istEn()));
  const direkt = apiDa();
  /** Punkt am Knopf: Änderungen, die in keiner Datei stehen - nur wo Speichern sich lohnt. */
  const offenePunkt = $derived(s.ungesichert && projektSchuetzenswert());
  const mac = typeof navigator !== 'undefined' && /Mac|iP/.test(navigator.platform);

  function zu(fokus = true) { offen = false; if (fokus) knopf?.focus(); }
  $effect(() => {
    if (!offen) return;
    const draussen = (e: PointerEvent) => { if (!ort?.contains(e.target as Node)) zu(false); };
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); zu(); } };
    const wegFokus = (e: FocusEvent) => { if (e.relatedTarget && !ort?.contains(e.relatedTarget as Node)) zu(false); };
    const o = ort; if (!o) return;
    addEventListener('pointerdown', draussen); o.addEventListener('keydown', taste); o.addEventListener('focusout', wegFokus);
    o.querySelector<HTMLButtonElement>('.pm-feld button')?.focus();
    return () => { removeEventListener('pointerdown', draussen); o.removeEventListener('keydown', taste); o.removeEventListener('focusout', wegFokus); };
  });

  async function speichern(unter = false, mitPasswort = false) {
    zu();
    const name = await projektSpeichern(undefined, { unter, mitPasswort });
    if (name) meldeGespeichert(name);
  }
  /** Zurück zur Startseite; das Projekt bleibt im Browser und in der Liste. */
  async function schliessen() {
    zu(false);
    const name = s.projekt?.name;
    await projektSchliessen();
    melde(L(`„${name}“ ist geschlossen und bleibt in der Liste auf der Startseite.`, `"${name}" is closed and stays in the list on the start page.`));
    location.hash = 'start';
  }
  /** Zwischen Projekten wechseln, ohne über die Startseite zu gehen (Johannes 10.10.): die zuletzt bearbeiteten, höchstens fünf. */
  const andere = $derived(s.projekte.filter(p => p.id !== s.projekt?.id).slice(0, 5));
  let wechselt = $state<string | null>(null);
  $effect(() => { if (offen) void ladeListe(); });
  async function wechseln(id: string, neu: string) {
    if (wechselt) return;
    wechselt = id;
    try { await weiterarbeiten(id); zu(false); location.hash = 'daten'; melde(L(`„${neu}“ ist offen.`, `"${neu}" is open.`)); }
    catch { meldeFehler(L(`„${neu}“ ließ sich nicht öffnen.`, `"${neu}" could not be opened.`)); }
    finally { wechselt = null; }
  }
  let name = $state('');
  $effect(() => { if (offen) name = s.projekt?.name ?? ''; });
  async function umbenennen() {
    const neu = name.trim();
    if (!s.projekt || !neu || neu === s.projekt.name) { name = s.projekt?.name ?? ''; return; }
    await benenneUm(s.projekt.id, neu);
  }
</script>

{#if s.projekt}
  <div class="pm" bind:this={ort}>
    <button class="k leise pm-knopf" type="button" bind:this={knopf} aria-expanded={offen} aria-controls="pm-feld"
      aria-label={L(`Projekt: ${s.projekt.name}. ${standSatz}`, `Project: ${s.projekt.name}. ${standSatz}`)} data-tipp={offen ? undefined : s.speicherStand === 'voll' ? speicherVollText() : `${L('Im Browser gespeichert.', 'Saved in this browser.')} ${standSatz}`}
      onclick={() => (offen = !offen)}><Icon n="ordner" /><span class="pm-name" aria-hidden="true">{s.projekt.name}</span><span class="pm-zeichen" aria-hidden="true">{#if s.speicherStand === 'voll'}<Icon n="hinweis" k="pm-voll" />{:else if s.speicherStand !== 'gespeichert'}<Icon n="uhr" k="pm-uhr" />{:else if offenePunkt}<span class="pm-punkt"></span>{:else}<Icon n="haken" k="pm-haken" />{/if}</span><Icon n="winkel" k="pm-winkel" /></button>
    {#if offen}
      <div class="pm-feld klappt" transition:rutsch id="pm-feld" role="group" aria-labelledby="pm-titel">
        <div class="pm-name-zeile"><label class="pm-titel" id="pm-titel" for="pm-name">{L('Name des Projekts', 'Project name')}</label><HilfeLink id="projektmenue" text={L('Hilfe zum Projekt', 'Help on the project')} /></div>
        <div class="eingabe pm-eingabe"><input id="pm-name" type="text" autocomplete="off" maxlength="120" bind:value={name} onchange={umbenennen}></div>
        <p class="pm-stand">{s.speicherStand === 'voll' ? speicherVollText() : standSatz}</p>
        {#if direkt}
          {#if s.ziel?.frage}
            <button class="k haupt" type="button" onclick={() => speichern()}><Icon n="download" /><span>{L(`Weiter in ${s.ziel.name} speichern`, `Keep saving in ${s.ziel.name}`)}</span></button>
            <p class="pm-hinweis">{d('Der Browser fragt einmal, ob Statable die Datei wieder ändern darf.', 'Der Browser fragt einmal, ob Statable die Datei wieder ändern darf.', 'The browser asks once whether Statable may change the file again.')}</p>
          {:else if s.ziel?.art === 'datei'}
            <button class="k leise" type="button" onclick={() => speichern()}><Icon n="download" /><span>{L(`In ${s.ziel.name} speichern`, `Save to ${s.ziel.name}`)}</span><kbd aria-hidden="true">{mac ? '⌘S' : L('Strg+S', 'Ctrl+S')}</kbd></button>
          {:else}
            <button class="k leise" type="button" onclick={() => speichern()}><Icon n="download" /><span>{L('In Datei speichern …', 'Save to file …')}</span><kbd aria-hidden="true">{mac ? '⌘S' : L('Strg+S', 'Ctrl+S')}</kbd></button>
          {/if}
          {#if s.ziel?.art === 'datei' || s.ziel?.frage}<button class="k leise" type="button" onclick={() => speichern(true)}><Icon n="ordner" /><span>{L('Speichern unter …', 'Save as …')}</span><kbd aria-hidden="true">{mac ? '⇧⌘S' : L('Strg+Umschalt+S', 'Ctrl+Shift+S')}</kbd></button>{/if}
        {:else}
          <button class="k leise" type="button" onclick={() => speichern()}><Icon n="download" /><span>{L('Als Datei herunterladen', 'Download as file')}</span><kbd aria-hidden="true">{mac ? '⌘S' : L('Strg+S', 'Ctrl+S')}</kbd></button>
          <p class="pm-hinweis">{d('Dieser Browser kann nicht in dieselbe Datei zurückspeichern: Jedes Speichern lädt eine neue Datei herunter. Chrome und Edge können das.', 'Dieser Browser kann nicht in dieselbe Datei zurückspeichern: Jedes Speichern lädt eine neue Datei herunter. Chrome und Edge können das.', 'This browser cannot write back to the same file: each save downloads a new file. Chrome and Edge can.')}</p>
        {/if}
        <button class="k leise" type="button" onclick={() => speichern(false, true)}><Icon n="schloss" /><span>{L('Mit Passwort speichern …', 'Save with a password …')}</span></button>
        <button class="k leise" type="button" onclick={schliessen}><Icon n="zu" /><span>{L('Projekt schließen', 'Close project')}</span><small aria-hidden="true">{L('bleibt in der Liste', 'stays in the list')}</small></button>
        {#if s.spalten.length}<a class="k leise" href="#vorlage" onclick={() => zu(false)}><Icon n="streifen" /><span>{L('Vorlage speichern oder anwenden …', 'Save or apply a template …')}</span></a>{/if}
        <div class="pm-wechsel" role="group" aria-labelledby="pm-w-t">
          <p class="pm-titel" id="pm-w-t">{L('Anderes Projekt öffnen', 'Open another project')}</p>
          {#each andere as p (p.id)}
            <button class="k leise" type="button" aria-disabled={wechselt ? 'true' : undefined} data-tipp={p.name} onclick={() => wechseln(p.id, p.name)}>{#if wechselt === p.id}<Rechnet />{:else}<Icon n="ordner" />{/if}<span class="pm-anders">{p.name}</span></button>
          {:else}
            <p class="pm-hinweis">{L('Noch kein anderes Projekt in diesem Browser.', 'No other project in this browser yet.')}</p>
          {/each}
          <a class="k leise" href="#start" onclick={() => zu(false)}><Icon n="plus" /><span>{L('Alle Projekte, neue Datei öffnen …', 'All projects, open a new file …')}</span></a>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .pm { position: relative; min-width: 0; }
  .pm-knopf { max-width: min(26ch, 100%); min-width: 0; }
  .pm-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pm-feld { position: absolute; inset-inline-start: 0; top: calc(100% + var(--a2)); z-index: 40; width: min(20rem, calc(100vw - 2 * var(--a4))); padding: var(--a2); background: var(--blatt-gehoben); color: var(--tinte); border: 1px solid var(--linie-stark); border-radius: var(--r); box-shadow: var(--schatten-heben); display: flex; flex-direction: column; gap: 2px; }
  .pm-titel { font: 650 var(--gr-klein)/1.3 var(--schrift-ui); padding: var(--a1) var(--a2) 0; overflow-wrap: anywhere; }
  .pm-stand { font-size: var(--gr-klein); color: var(--tinte-2); padding: 0 var(--a2) var(--a2); line-height: 1.4; }
  .pm-feld .k { justify-content: flex-start; width: 100%; }
  .pm-feld .k span { flex: 1; text-align: start; }
  .pm-name-zeile { display: flex; align-items: center; justify-content: space-between; padding: var(--a1) var(--a2) 0; }
  .pm-titel { padding: 0; }
  .pm-eingabe { margin: var(--a1) var(--a2) var(--a1); }
  .pm-hinweis { font-size: var(--gr-klein); color: var(--tinte-2); padding: 0 var(--a2) var(--a2); line-height: 1.4; }
  .pm-wechsel { display: flex; flex-direction: column; gap: 2px; border-top: 1px solid var(--linie); margin-top: var(--a1); padding-top: var(--a2); }
  .pm-wechsel .pm-titel { padding: 0 var(--a2) var(--a1); color: var(--tinte-2); }
  .pm-anders { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .pm-punkt { width: 8px; height: 8px; border-radius: 50%; background: var(--hinweis); flex: none; }
  small { color: var(--tinte-2); font-size: var(--gr-klein); }
  kbd { font: 500 var(--gr-klein)/1 var(--schrift-ui); color: var(--tinte-2); }
  /* Seit 10.10. steht das Projekt allein in der oberen Kopfzeile - wie der Titel eines Dokuments, mit dem Stand als kleinem Zeichen daneben
     (Haken = gespeichert, Punkt = Änderungen in keiner Datei, Uhr = speichert gerade). „Gespeichert“ als Wort steht nur noch im Tipp. */
  .pm-knopf { color: var(--tinte); gap: var(--a2); }
  .pm-zeichen { display: inline-flex; align-items: center; justify-content: center; width: 14px; }
  .pm-zeichen :global(.ico) { width: 14px; height: 14px; }
  .pm-zeichen :global(.pm-haken) { color: var(--akzent); stroke-width: 2.25; }
  .pm-zeichen :global(.pm-uhr) { color: var(--tinte-2); }
  .pm-zeichen :global(.pm-voll) { color: var(--hinweis); }
  .pm-knopf :global(.pm-winkel) { width: 14px; height: 14px; color: var(--tinte-2); margin-inline-start: -2px; }
  :global(:where(:root.eng-700)) .pm-name { display: none; }   /* gefühlte Breite (lib/groesse.svelte.ts) */
  /* Schmal: der Knopf steht links, das Feld nähme sonst den Rand mit - feste Lage über die volle Breite. */
  :global(:where(:root.eng-640)) .pm-feld { position: fixed; inset-inline-start: var(--a4); inset-inline-end: var(--a4); top: auto; width: auto; margin-top: var(--a2); }
  :global(:where(:root.eng-640)) kbd { display: none; }
</style>
