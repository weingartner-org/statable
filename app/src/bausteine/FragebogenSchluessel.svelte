<script lang="ts">
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { tue } from '../lib/fragebogen-editor.svelte';
  import { KryptoFehler, empfaengerAusIdentitaet, leseSchluesselDatei, neuesSchluesselpaar, schluesselDatei } from '../lib/schluessel';
  import { schluesselGeladen, schluesselMerken, schluesselSitzung, schluesselVergessen } from '../lib/schluessel-sitzung.svelte';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * „Antworten verschlüsseln (Schlüssel)“ (Erheben, Stufe 3A). Neues Schlüsselpaar: Name, Passwort zweimal, Schlüsseldatei speichern (Download), Haken „gesichert“,
   * erst dann kommt der öffentliche Schlüssel in den Plan. Vorhandenen Schlüssel verwenden: Datei plus Passwort öffnen, nur der öffentliche Schlüssel kommt in den Plan.
   * Der private Schlüssel bleibt im Arbeitsspeicher dieser Sitzung (`schluesselSitzung`) und taucht nirgends in Text, Projekt oder Browserspeicher auf.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  type Modus = '' | 'neu' | 'vorhanden';
  let modus = $state<Modus>('');
  let name = $state(''), pw1 = $state(''), pw2 = $state(''), oeffnenPw = $state('');
  let datei = $state<File | null>(null);
  let rechnet = $state('');
  let fehler = $state<{ feld: string; text: string } | null>(null);
  /** Schritt 2 beim Anlegen: Datei ist erzeugt und gespeichert, jetzt der Haken. */
  let angelegt = $state<{ bytes: Uint8Array; dateiname: string; empfaenger: string; name: string } | null>(null);
  let gesichert = $state(false);
  let kopiert = $state(false);

  const schluessel = $derived(plan.empfaenger?.schluessel ?? '');
  const warnung = L('Ohne diese Datei und das Passwort kann niemand die Antworten öffnen, auch Statable nicht. Bewahren Sie zwei Kopien an verschiedenen Orten auf.', 'Without this file and the password nobody can open the answers, not even Statable. Keep two copies in different places.');
  const pause = () => new Promise<void>(r => setTimeout(r, 40));
  const dateiname = (n: string) => `${n.trim().replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'schluessel'}.statable-schluessel`;

  function zeigeFehler(feld: string, text: string) {
    fehler = { feld, text };
    sage(text, 'dringend');
    void tick().then(() => document.getElementById(feld)?.focus());
  }
  const fehlerFuer = (feld: string) => (fehler?.feld === feld ? fehler.text : '');
  function waehle(m: Modus) {
    modus = modus === m ? '' : m; fehler = null; angelegt = null; gesichert = false; pw1 = pw2 = oeffnenPw = ''; datei = null;
    sage(modus === 'neu' ? L('Neues Schlüsselpaar anlegen: Formular geöffnet.', 'Create a new key pair: form opened.') : modus === 'vorhanden' ? L('Vorhandenen Schlüssel verwenden: Formular geöffnet.', 'Use an existing key: form opened.') : L('Formular geschlossen.', 'Form closed.'));
  }

  async function anlegen() {
    fehler = null;
    if (!name.trim()) return zeigeFehler('fb-schl-name', L('Bitte einen Namen eingeben, zum Beispiel „Umfrage Seminar“.', 'Please enter a name, for example "Seminar survey".'));
    if (pw1.length < 8) return zeigeFehler('fb-schl-pw1', L('Das Passwort ist zu kurz: Es braucht mindestens 8 Zeichen.', 'The password is too short: it needs at least 8 characters.'));
    if (pw1 !== pw2) return zeigeFehler('fb-schl-pw2', L('Die beiden Passwörter sind nicht gleich. Bitte das zweite Feld noch einmal ausfüllen.', 'The two passwords are not the same. Please fill in the second field again.'));
    rechnet = L('Schlüssel wird erzeugt und gesichert …', 'Creating and protecting the key …');
    sage(rechnet);
    await pause();
    try {
      const paar = await neuesSchluesselpaar();
      const bytes = await schluesselDatei(paar.identitaet, name.trim(), pw1);
      schluesselMerken(paar.identitaet, paar.empfaenger, name.trim());
      angelegt = { bytes, dateiname: dateiname(name), empfaenger: paar.empfaenger, name: name.trim() };
      pw1 = pw2 = '';
      await speichereDatei();
      await tick();
      document.getElementById('fb-schl-gesichert')?.focus();
    } catch {
      zeigeFehler('fb-schl-name', L('Das Schlüsselpaar ließ sich nicht erzeugen. Bitte noch einmal versuchen.', 'The key pair could not be created. Please try again.'));
    } finally { rechnet = ''; }
  }
  async function speichereDatei() {
    if (!angelegt) return;
    const { herunterladen } = await import('../lib/export');
    herunterladen(angelegt.bytes, angelegt.dateiname, 'application/octet-stream');
    // Erst nach dem Fokuswechsel auf den Haken ansagen (sonst geht die Meldung unter); dieselbe Aussage steht auch als Beschreibung am Haken.
    sageSpaeter(L(`Schlüsseldatei „${angelegt.dateiname}“ gespeichert (Download). Bitte sichern Sie sie jetzt an zwei Orten.`, `Key file "${angelegt.dateiname}" saved (download). Please back it up in two places now.`), 1500);
  }
  async function uebernehmen() {
    if (!angelegt) return;
    if (!gesichert) return zeigeFehler('fb-schl-gesichert', L('Bitte erst die Schlüsseldatei sichern und den Haken setzen.', 'Please back up the key file first and tick the box.'));
    const a = angelegt;
    angelegt = null; gesichert = false; modus = ''; name = '';
    tue(L('Öffentlicher Schlüssel steht im Fragebogen. Die Schlüsseldatei bleibt bei Ihnen.', 'Public key is now in the questionnaire. The key file stays with you.'), p => ({ ...p, empfaenger: { schluessel: a.empfaenger, name: a.name } }));
    await tick();
    document.getElementById('fb-schl-pub')?.focus();
  }

  async function oeffnen() {
    fehler = null;
    if (!datei) return zeigeFehler('fb-schl-datei', L('Bitte die Schlüsseldatei (.statable-schluessel) wählen.', 'Please choose the key file (.statable-schluessel).'));
    if (!oeffnenPw) return zeigeFehler('fb-schl-pw', L('Bitte das Passwort der Schlüsseldatei eingeben.', 'Please enter the password of the key file.'));
    if (datei.size > 100_000) return zeigeFehler('fb-schl-datei', L('Das ist keine Schlüsseldatei von Statable (zu groß).', 'This is not a Statable key file (too large).'));
    rechnet = L('Schlüssel wird geöffnet …', 'Opening the key …');
    sage(rechnet);
    await pause();
    try {
      const r = await leseSchluesselDatei(new Uint8Array(await datei.arrayBuffer()), oeffnenPw);
      const empfaenger = await empfaengerAusIdentitaet(r.identitaet);
      schluesselMerken(r.identitaet, empfaenger, r.name);
      oeffnenPw = ''; datei = null; modus = '';
      tue(L('Schlüssel geöffnet. Der öffentliche Schlüssel steht im Fragebogen; der private bleibt nur in dieser Sitzung.', 'Key opened. The public key is now in the questionnaire; the private one only stays in this session.'), p => ({ ...p, empfaenger: { schluessel: empfaenger, name: r.name } }));
      await tick();
      document.getElementById('fb-schl-pub')?.focus();
    } catch (e) {
      const c = e instanceof KryptoFehler ? e.code : '';
      if (c === 'falsches-passwort') zeigeFehler('fb-schl-pw', L('Das Passwort passt nicht zu dieser Schlüsseldatei.', 'The password does not match this key file.'));
      else zeigeFehler('fb-schl-datei', L('Diese Datei ist keine gültige Schlüsseldatei von Statable oder sie ist beschädigt.', 'This file is not a valid Statable key file or it is damaged.'));
    } finally { rechnet = ''; }
  }

  async function kopieren() {
    try { await navigator.clipboard.writeText(schluessel); kopiert = true; sage(L('Öffentlicher Schlüssel kopiert.', 'Public key copied.')); setTimeout(() => (kopiert = false), 2500); }
    catch { (document.getElementById('fb-schl-pub') as HTMLInputElement | null)?.select(); sage(L('Kopieren war nicht möglich. Der Schlüssel ist markiert: mit Strg+C kopieren.', 'Copying was not possible. The key is selected: copy it with Ctrl+C.'), 'dringend'); }
  }
  function entfernen() {
    tue(L('Schlüssel aus dem Fragebogen entfernt.', 'Key removed from the questionnaire.'), p => { const { empfaenger: _weg, ...rest } = p; void _weg; return rest as FragebogenPlan; });
    if (schluesselSitzung.empfaenger === schluessel) schluesselVergessen();
  }
</script>

<section class="schl">
  <h2 id="fb-schl-t" tabindex="-1">{L('Antworten verschlüsseln (Schlüssel)', 'Encrypt answers (key)')}</h2>
  <p class="hilfe">{L('Befragte verschlüsseln ihre Antwort auf ihrem Gerät mit Ihrem öffentlichen Schlüssel. Nur Sie können sie mit Ihrer Schlüsseldatei und dem Passwort öffnen. Statable kann nichts lesen.', 'Respondents encrypt their answer on their own device with your public key. Only you can open it with your key file and the password. Statable cannot read anything.')}</p>

  {#if schluessel}
    <div class="eingabe">
      <label for="fb-schl-pub">{L('Öffentlicher Schlüssel', 'Public key')}{plan.empfaenger?.name ? ` (${plan.empfaenger.name})` : ''}</label>
      <input id="fb-schl-pub" class="pub" type="text" readonly spellcheck="false" autocomplete="off" value={schluessel} aria-describedby="fb-schl-pub-h">
      <p id="fb-schl-pub-h" class="hilfe">{L('Diesen Schlüssel dürfen alle sehen. Er steht in der Fragebogen-Datei und im Link.', 'Everyone may see this key. It is part of the questionnaire file and the link.')}</p>
    </div>
    <p class="hilfe" data-testid="fb-schl-status">{schluesselGeladen() && schluesselSitzung.empfaenger === schluessel
      ? L('Der private Schlüssel ist in dieser Sitzung geöffnet und bleibt nur im Arbeitsspeicher.', 'The private key is open in this session and stays in memory only.')
      : L('Der private Schlüssel ist in dieser Sitzung nicht geöffnet. Zum Lesen von Antworten öffnen Sie später Ihre Schlüsseldatei.', 'The private key is not open in this session. To read answers later, open your key file.')}</p>
    <div class="zeile">
      <button class="k" type="button" onclick={() => void kopieren()}><Icon n="kopieren" />{kopiert ? L('Kopiert', 'Copied') : L('Kopieren', 'Copy')}</button>
      <button class="k leise" type="button" onclick={entfernen}>{L('Schlüssel aus dem Fragebogen entfernen', 'Remove key from the questionnaire')}</button>
    </div>
  {:else}
    <p class="hilfe" data-testid="fb-schl-leer">{L('Noch kein Schlüssel. Für die Fragebogen-Datei und den Link brauchen Sie einen.', 'No key yet. You need one for the questionnaire file and the link.')}</p>
  {/if}

  <div class="zeile" role="group" aria-label={L('Schlüssel einrichten', 'Set up a key')}>
    <button class="k" type="button" aria-expanded={modus === 'neu'} aria-controls="fb-schl-neu" onclick={() => waehle('neu')}>{L('Neues Schlüsselpaar anlegen', 'Create a new key pair')}</button>
    <button class="k" type="button" aria-expanded={modus === 'vorhanden'} aria-controls="fb-schl-alt" onclick={() => waehle('vorhanden')}>{L('Vorhandenen Schlüssel verwenden', 'Use an existing key')}</button>
  </div>

  {#if modus === 'neu'}
    <form class="formular" id="fb-schl-neu" onsubmit={(e) => { e.preventDefault(); void (angelegt ? uebernehmen() : anlegen()); }} aria-label={L('Neues Schlüsselpaar anlegen', 'Create a new key pair')}>
      {#if !angelegt}
        <div class="banner" id="fb-schl-warn"><Icon n="hinweis" /><p>{warnung}</p></div>
        <div class="eingabe">
          <label for="fb-schl-name">{L('Name des Schlüssels', 'Name of the key')}</label>
          <input id="fb-schl-name" type="text" autocomplete="off" bind:value={name} aria-invalid={fehlerFuer('fb-schl-name') ? 'true' : undefined} aria-describedby={fehlerFuer('fb-schl-name') ? 'fb-schl-name-f' : undefined}>
          {#if fehlerFuer('fb-schl-name')}<p id="fb-schl-name-f" class="fehl">{fehlerFuer('fb-schl-name')}</p>{/if}
        </div>
        <div class="eingabe">
          <label for="fb-schl-pw1">{L('Passwort für die Schlüsseldatei', 'Password for the key file')}</label>
          <input id="fb-schl-pw1" type="password" autocomplete="new-password" bind:value={pw1} aria-invalid={fehlerFuer('fb-schl-pw1') ? 'true' : undefined} aria-describedby={fehlerFuer('fb-schl-pw1') ? 'fb-schl-pw1-h fb-schl-pw1-f' : 'fb-schl-pw1-h'}>
          <p id="fb-schl-pw1-h" class="hilfe">{L('Mindestens 8 Zeichen. Ein langer Satz ist besser als ein kurzes Wort. Statable kann das Passwort nicht zurücksetzen.', 'At least 8 characters. A long sentence is better than a short word. Statable cannot reset the password.')}</p>
          {#if fehlerFuer('fb-schl-pw1')}<p id="fb-schl-pw1-f" class="fehl">{fehlerFuer('fb-schl-pw1')}</p>{/if}
        </div>
        <div class="eingabe">
          <label for="fb-schl-pw2">{L('Passwort wiederholen', 'Repeat the password')}</label>
          <input id="fb-schl-pw2" type="password" autocomplete="new-password" bind:value={pw2} aria-invalid={fehlerFuer('fb-schl-pw2') ? 'true' : undefined} aria-describedby={fehlerFuer('fb-schl-pw2') ? 'fb-schl-pw2-f' : undefined}>
          {#if fehlerFuer('fb-schl-pw2')}<p id="fb-schl-pw2-f" class="fehl">{fehlerFuer('fb-schl-pw2')}</p>{/if}
        </div>
        <div class="zeile">
          <button class="k haupt" type="submit" aria-disabled={rechnet ? 'true' : undefined}>{L('Schlüsselpaar erzeugen und Datei speichern', 'Create key pair and save file')}</button>
          {#if rechnet}<Rechnet text={rechnet} />{/if}
        </div>
      {:else}
        <div class="banner" id="fb-schl-warn"><Icon n="hinweis" /><p>{warnung}</p></div>
        <p id="fb-schl-saved">{L(`Die Schlüsseldatei „${angelegt.dateiname}“ wurde gespeichert (im Download-Ordner).`, `The key file "${angelegt.dateiname}" was saved (in the downloads folder).`)}</p>
        <div class="zeile"><button class="k leise" type="button" onclick={() => void speichereDatei()}><Icon n="download" />{L('Schlüsseldatei noch einmal speichern', 'Save the key file again')}</button></div>
        <label class="schalter" for="fb-schl-gesichert"><input id="fb-schl-gesichert" type="checkbox" bind:checked={gesichert} aria-describedby="fb-schl-saved fb-schl-warn {fehlerFuer('fb-schl-gesichert') ? 'fb-schl-ges-f' : ''}" aria-invalid={fehlerFuer('fb-schl-gesichert') ? 'true' : undefined}>{L('Ich habe die Datei gesichert', 'I have backed up the file')}</label>
        {#if fehlerFuer('fb-schl-gesichert')}<p id="fb-schl-ges-f" class="fehl">{fehlerFuer('fb-schl-gesichert')}</p>{/if}
        <div class="zeile"><button class="k haupt" type="submit">{L('Öffentlichen Schlüssel in den Fragebogen übernehmen', 'Put the public key into the questionnaire')}</button></div>
      {/if}
    </form>
  {:else if modus === 'vorhanden'}
    <form class="formular" id="fb-schl-alt" onsubmit={(e) => { e.preventDefault(); void oeffnen(); }} aria-label={L('Vorhandenen Schlüssel verwenden', 'Use an existing key')}>
      <div class="eingabe">
        <label for="fb-schl-datei">{L('Schlüsseldatei (.statable-schluessel)', 'Key file (.statable-schluessel)')}</label>
        <input id="fb-schl-datei" type="file" accept=".statable-schluessel" onchange={(e) => { datei = e.currentTarget.files?.[0] ?? null; }} aria-invalid={fehlerFuer('fb-schl-datei') ? 'true' : undefined} aria-describedby={fehlerFuer('fb-schl-datei') ? 'fb-schl-datei-f' : undefined}>
        {#if fehlerFuer('fb-schl-datei')}<p id="fb-schl-datei-f" class="fehl">{fehlerFuer('fb-schl-datei')}</p>{/if}
      </div>
      <div class="eingabe">
        <label for="fb-schl-pw">{L('Passwort der Schlüsseldatei', 'Password of the key file')}</label>
        <input id="fb-schl-pw" type="password" autocomplete="current-password" bind:value={oeffnenPw} aria-invalid={fehlerFuer('fb-schl-pw') ? 'true' : undefined} aria-describedby={fehlerFuer('fb-schl-pw') ? 'fb-schl-pw-f' : undefined}>
        {#if fehlerFuer('fb-schl-pw')}<p id="fb-schl-pw-f" class="fehl">{fehlerFuer('fb-schl-pw')}</p>{/if}
      </div>
      <p class="hilfe">{L('Nur der öffentliche Schlüssel kommt in den Fragebogen. Der private bleibt in dieser Sitzung im Arbeitsspeicher und wird nirgends gespeichert.', 'Only the public key goes into the questionnaire. The private one stays in memory in this session and is not saved anywhere.')}</p>
      <div class="zeile">
        <button class="k haupt" type="submit" aria-disabled={rechnet ? 'true' : undefined}>{L('Schlüssel öffnen', 'Open key')}</button>
        {#if rechnet}<Rechnet text={rechnet} />{/if}
      </div>
    </form>
  {/if}
</section>

<style>
  .schl { display: flex; flex-direction: column; gap: var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3) var(--a4); }
  .schl h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .zeile { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; }
  .formular { display: flex; flex-direction: column; gap: var(--a3); max-width: 38rem; }
  .formular p { margin: 0; }
  .schalter { display: flex; gap: var(--a2); align-items: center; }
  .fehl { color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); margin: 0; }
  .fehl::before { content: '! '; }
  .pub { font-family: var(--schrift-mono, monospace); font-size: var(--gr-klein); }
  .schl input[type='password'], .schl input[type='text'] { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a2) var(--a3); width: 100%; }
  .schl input[aria-invalid='true'] { border-width: 2px; }
  .schl input:focus-visible { border-color: var(--fokus); }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .eingabe label { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
</style>
