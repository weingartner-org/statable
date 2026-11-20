<script lang="ts">
  /**
   * Passwort-Dialoge (Stufe 5, Paket 5E2, Fachblatt 5C): „Mit Passwort verschlüsseln?“, Passwort setzen (zweimal), Passwort beim Öffnen.
   * Zustand und Versprechen liegen in `lib/projektpasswort-ui.svelte.ts`. Das Passwort wird nie gespeichert oder protokolliert.
   * Ansagen nur über `sage()`; Fehler stehen am Feld (`aria-describedby`) und werden angesagt; der Fokus bleibt im Feld.
   */
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { pwUi } from '../lib/projektpasswort-ui.svelte';
  import { MIN_PASSWORT, pruefePasswort } from '../lib/projektpasswort';
  import Rechnet from './Rechnet.svelte';
  import { dialogFokus, DIALOG_SPAET_MS } from './dialogFokus';

  let dlg = $state<HTMLDialogElement>();
  const x = $derived(pwUi.dlg);
  let p1 = $state(''), p2 = $state('');
  let fehl = $state<'' | 'kurz' | 'verschieden' | 'falsch' | 'kaputt'>('');
  let rechnet = $state(false);

  $effect(() => {
    if (x && dlg && !dlg.open) { p1 = ''; p2 = ''; fehl = ''; rechnet = false; dlg.showModal(); }
  });

  const fehlerText = $derived(
    fehl === 'kurz' ? L(`Das Passwort ist zu kurz (mindestens ${MIN_PASSWORT} Zeichen).`, `The password is too short (at least ${MIN_PASSWORT} characters).`)
    : fehl === 'verschieden' ? L('Die Passwörter sind verschieden.', 'The passwords do not match.')
    : fehl === 'falsch' ? L('Das Passwort passt nicht.', 'The password does not match.')
    : fehl === 'kaputt' ? L('Die Datei lässt sich nicht entschlüsseln. Sie ist vielleicht beschädigt.', 'The file cannot be decrypted. It may be damaged.')
    : '');

  function zu() { const d = x; dlg?.close(); pwUi.dlg = null; return d; }
  function waehle(a: 'passwort' | 'ohne' | null) { const d = zu(); if (d?.art === 'frage') d.fertig(a); }
  function abbrechen() {
    const d = zu();
    if (!d) return;
    if (d.art === 'frage' || d.art === 'setzen') d.fertig(null);
    else if (d.art === 'oeffnen') d.fertig(false);
    else d.fertig();
  }
  async function fehler(f: typeof fehl, feldId: string) {
    fehl = f;
    sage(fehlerText, 'dringend');
    await tick();
    const el = document.getElementById(feldId) as HTMLInputElement | null;
    el?.focus(); el?.select();
  }
  async function setzen() {
    const r = pruefePasswort(p1, p2);
    if (r === 'kurz') return void (await fehler('kurz', 'pw-1'));
    if (r === 'verschieden') return void (await fehler('verschieden', 'pw-2'));
    const d = zu();
    if (d?.art === 'setzen') d.fertig(p1);
  }
  async function oeffnen() {
    const d = x;
    if (d?.art !== 'oeffnen' || rechnet) return;
    if (!p1) return void (await fehler('falsch', 'pw-o'));
    rechnet = true; fehl = '';
    await tick();
    await new Promise(r => setTimeout(r, 50));   // erst die Lade-Animation zeichnen lassen, dann rechnen
    let ok = false, kaputt = false;
    try { ok = await d.versuch(p1); } catch { kaputt = true; }
    rechnet = false;
    if (ok) { zu(); d.fertig(true); return; }
    await fehler(kaputt ? 'kaputt' : 'falsch', 'pw-o');
  }
</script>

<dialog bind:this={dlg} use:dialogFokus={{ spaet: DIALOG_SPAET_MS }} aria-labelledby="pw-t" oncancel={(e) => { e.preventDefault(); if (!rechnet) abbrechen(); }}>
  {#if x?.art === 'frage'}
    <div class="dialog-innen pw">
      <h2 id="pw-t" tabindex="-1">{L('Mit Passwort verschlüsseln?', 'Encrypt with a password?')}</h2>
      <p>{L('Diese Projektdatei enthält Interview-Texte oder Zitate. Das sind persönliche Daten. Mit Passwort verschlüsseln?', 'This project file contains interview texts or quotes. These are personal data. Encrypt with a password?')}</p>
      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={() => waehle('passwort')}>{L('Mit Passwort speichern', 'Save with a password')}</button>
        <button class="k" type="button" onclick={() => waehle('ohne')}>{L('Ohne Passwort speichern', 'Save without a password')}</button>
        <button class="k leise" type="button" onclick={abbrechen}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </div>
  {:else if x?.art === 'setzen'}
    <form class="dialog-innen pw" onsubmit={(e) => { e.preventDefault(); void setzen(); }}>
      <h2 id="pw-t" tabindex="-1">{L('Passwort für die Projektdatei (Verschlüsselung)', 'Password for the project file (encryption)')}</h2>
      <p id="pw-warn">{L('Ohne Passwort kann niemand die Datei öffnen, auch Statable nicht. Schreiben Sie es an einen sicheren Ort.', 'Without the password nobody can open the file, not even Statable. Write it down in a safe place.')}</p>
      <div class="eingabe"><label for="pw-1">{L(`Passwort (mindestens ${MIN_PASSWORT} Zeichen)`, `Password (at least ${MIN_PASSWORT} characters)`)}</label>
        <input id="pw-1" type="password" autocomplete="new-password" bind:value={p1} aria-invalid={fehl === 'kurz' ? 'true' : undefined} aria-describedby={fehl === 'kurz' ? 'pw-fehl pw-warn' : 'pw-warn'}></div>
      <div class="eingabe"><label for="pw-2">{L('Passwort noch einmal', 'Repeat the password')}</label>
        <input id="pw-2" type="password" autocomplete="new-password" bind:value={p2} aria-invalid={fehl === 'verschieden' ? 'true' : undefined} aria-describedby={fehl === 'verschieden' ? 'pw-fehl' : undefined}></div>
      {#if fehl === 'kurz' || fehl === 'verschieden'}<p class="pw-fehl" id="pw-fehl">{fehlerText}</p>{/if}
      <div class="knopfzeile">
        <button class="k haupt" type="submit">{L('Mit Passwort speichern', 'Save with a password')}</button>
        <button class="k leise" type="button" onclick={abbrechen}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </form>
  {:else if x?.art === 'oeffnen'}
    <form class="dialog-innen pw" onsubmit={(e) => { e.preventDefault(); void oeffnen(); }}>
      <h2 id="pw-t" tabindex="-1">{L(`Passwort für „${x.name}“`, `Password for "${x.name}"`)}</h2>
      <div class="eingabe"><label for="pw-o">{L('Passwort', 'Password')}</label>
        <input id="pw-o" type="password" autocomplete="current-password" bind:value={p1} aria-invalid={fehl ? 'true' : undefined} aria-describedby={fehl ? 'pw-fehl' : undefined}></div>
      {#if fehl}<p class="pw-fehl" id="pw-fehl">{fehlerText}</p>{/if}
      {#if rechnet}<p class="pw-hilfe"><Rechnet text={L('Die Datei wird entschlüsselt …', 'Decrypting the file …')} /></p>{/if}
      <div class="knopfzeile">
        <button class="k haupt" type="submit" aria-disabled={rechnet ? 'true' : undefined}>{L('Öffnen', 'Open')}</button>
        <button class="k leise" type="button" aria-disabled={rechnet ? 'true' : undefined} onclick={() => { if (!rechnet) abbrechen(); }}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </form>
  {:else if x?.art === 'schluessel'}
    <div class="dialog-innen pw">
      <h2 id="pw-t" tabindex="-1">{L(`„${x.name}“ lässt sich nicht mit Passwort öffnen`, `"${x.name}" cannot be opened with a password`)}</h2>
      <p>{L('Diese Datei ist mit einem Schlüssel verschlüsselt, nicht mit einem Passwort. Öffnen Sie sie über „Antworten einlesen“.', 'This file is encrypted with a key, not with a password. Open it with "Read in responses".')}</p>
      <div class="knopfzeile"><button class="k haupt" type="button" onclick={abbrechen}>{L('Schließen', 'Close')}</button></div>
    </div>
  {/if}
</dialog>

{#if pwUi.arbeitet}
  <div class="pw-arbeit"><Rechnet text={L('Die Datei wird verschlüsselt …', 'Encrypting the file …')} /></div>
{/if}

<style>
  .pw { max-width: 32rem; }
  .pw h2 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .pw p { margin: 0; }
  .pw input { min-height: var(--ziel, 2.75rem); box-sizing: border-box; }
  .pw-fehl { color: var(--fehler-text, var(--tinte)); font-weight: 600; }
  .pw-hilfe { font-size: var(--gr-klein); color: var(--tinte-2); }
  .pw-arbeit { position: fixed; left: 50%; bottom: var(--a5); transform: translateX(-50%); z-index: 90; background: var(--blatt-gehoben); color: var(--tinte); border: 1px solid var(--linie-stark); border-radius: var(--r); padding: var(--a3) var(--a4); box-shadow: var(--schatten-heben); }
</style>
