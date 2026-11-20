<script lang="ts">
  /** „Melden“: Fehler oder Wunsch an Statable (service@statable.eu), mit Bild vom Fenster (abwählbar). Senden geht über den Server von Statable, ohne Mailprogramm;
   *  ist er nicht erreichbar, bleibt der Weg über das Mailprogramm. Knopf im Kopf und Kürzel Alt + Umschalt + P. */
  import { s, L, d } from '../lib/sitzung.svelte';
  import Icon from './Icon.svelte';
  import { dialogFokus } from './dialogFokus';
  import { merkeAusloeser } from '../lib/fokus';
  import Rechnet from './Rechnet.svelte';
  import { nimmFensterAuf, technik, mailAdresse, bildKopieren, sendeMeldung, seiteKurz, MELDEN_ADRESSE, MELDEN_SERVER, type SendeErgebnis } from '../lib/melden';

  let dlg: HTMLDialogElement | undefined = $state();
  let art = $state<'fehler' | 'wunsch' | 'barriere'>('fehler'), text = $state(''), bild = $state<Blob | null>(null), bildUrl = $state(''), mitBild = $state(true), nimmtAuf = $state(false), gesendet = $state<null | { kopiert: boolean }>(null), antwort = $state(''), sendet = $state(false), danke = $state(false), problem = $state<'' | Exclude<SendeErgebnis, 'ok'>>(''), vorher: Element | null = null;

  /** Das Fenster wird aufgenommen, BEVOR sich etwas öffnet (sonst stünde der Dialog selbst im Bild). */
  export async function oeffne() {
    if (nimmtAuf || dlg?.open) return;
    vorher = document.activeElement;   // Auslöser jetzt festhalten: bis das Bild aufgenommen ist, kann der Fokus woanders liegen
    nimmtAuf = true;
    bild = await nimmFensterAuf();
    if (bildUrl) URL.revokeObjectURL(bildUrl);
    bildUrl = bild ? URL.createObjectURL(bild) : '';
    mitBild = !!bild; gesendet = null; danke = false; problem = ''; nimmtAuf = false;
    merkeAusloeser(vorher as HTMLElement | null);
    dlg?.showModal();
    (dlg?.querySelector('textarea') as HTMLTextAreaElement | null)?.focus();
  }
  function schliesse() { dlg?.close(); }
  function nachSchliessen() { if (bildUrl) { URL.revokeObjectURL(bildUrl); bildUrl = ''; } bild = null; text = ''; gesendet = null; danke = false; problem = ''; sendet = false; vorher = null; }
  /** Hauptweg: an den Server von Statable. */
  async function sende() {
    if (sendet || (!text.trim() && !(mitBild && bild))) return;
    if (!MELDEN_SERVER) { await sendeMail(); return; }
    sendet = true; problem = '';
    const r = await sendeMeldung({ art, text, technik: technik(s.einst.sprache), seite: seiteKurz(), antwort, bild: mitBild ? bild : null });
    sendet = false;
    if (r === 'ok') danke = true; else problem = r;
  }
  /** Rückweg: das Mailprogramm. */
  async function sendeMail() {
    const kopiert = mitBild && bild ? await bildKopieren(bild) : false;
    window.location.href = mailAdresse(art, text, technik(s.einst.sprache), mitBild && !!bild, s.einst.sprache === 'de');
    gesendet = { kopiert };
  }
  function speichern() { if (!bild) return; const a = document.createElement('a'); a.href = bildUrl; a.download = 'statable-fenster.png'; a.click(); }
  function taste(e: KeyboardEvent) {
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'KeyP' || (!e.code && (e.key === 'p' || e.key === 'P'))) { e.preventDefault(); e.stopPropagation(); void oeffne(); }
  }
</script>

<svelte:window onkeydowncapture={taste} />

<button class="k leise" type="button" id="melden" onclick={() => void oeffne()} aria-label={L('Melden', 'Report')} aria-keyshortcuts="Alt+Shift+P" data-tipp={L('Fehler oder Wunsch melden (Alt + Umschalt + P)', 'Report a problem or a wish (Alt + Shift + P)')} aria-busy={nimmtAuf}>
  {#if nimmtAuf}<Rechnet imKnopf text="" />{:else}<Icon n="info" />{/if}<span class="nur-breit" aria-hidden="true">{L('Melden', 'Report')}</span></button>

<dialog bind:this={dlg} use:dialogFokus={{ merken: false }} class="melden" aria-labelledby="me-t" onclose={nachSchliessen} oncancel={(e) => { e.preventDefault(); schliesse(); }} data-kein-bildschirmabzug>
  <form class="dialog-innen" onsubmit={(e) => { e.preventDefault(); void sende(); }}>
    <div class="dialog-kopf"><Icon n="info" /><h2 id="me-t">{L('Melden', 'Report')}</h2></div>
    {#if danke}
      <p class="heft-text" role="status">{L('Danke, die Meldung ist angekommen.', 'Thank you, the report has arrived.')}{antwort.trim() ? ' ' + L('Eine Antwort kommt, wenn es etwas zu antworten gibt.', 'A reply comes if there is something to reply.') : ''}</p>
      <div class="knopfzeile"><button class="k primaer" type="button" onclick={schliesse}>{L('Schließen', 'Close')}</button></div>
    {:else if !gesendet}
      <fieldset class="segment" style="margin:0 0 var(--a2)"><legend class="nur-vorleser">{L('Worum geht es?', 'What is it about?')}</legend>
        <label><input type="radio" name="me-art" value="fehler" bind:group={art} />{L('Etwas funktioniert nicht', 'Something does not work')}</label>
        <label><input type="radio" name="me-art" value="wunsch" bind:group={art} />{L('Ich habe einen Wunsch', 'I have a wish')}</label>
        <label><input type="radio" name="me-art" value="barriere" bind:group={art} />{L('Ich habe eine Barriere gefunden', 'I found an accessibility barrier')}</label>
      </fieldset>
      <div class="eingabe"><label for="me-text">{art === 'fehler' ? L('Was ist passiert? (Was wurde gemacht, was war erwartet?)', 'What happened? (What did you do, what did you expect?)') : art === 'barriere' ? L('Wo geht etwas nicht? (Seite, was wurde versucht, welches Hilfsmittel, zum Beispiel Screenreader oder nur Tastatur)', 'Where does something not work? (Page, what was tried, which assistive technology, for example screen reader or keyboard only)') : d('Was wünschst du dir?', 'Was wünschen Sie sich?', 'What would you like?')}</label>
        <textarea id="me-text" rows="5" bind:value={text} onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); void sende(); } }}></textarea></div>
      {#if bildUrl}
        <label class="schalter" style="margin-top:var(--a2)"><input type="checkbox" bind:checked={mitBild} />{L('Bild vom Fenster mitschicken', 'Include a picture of the window')}</label>
        {#if mitBild}<img class="melden-bild" src={bildUrl} alt={L('Vorschau: Bild des Fensters, das mitgeschickt wird', 'Preview: picture of the window that is sent along')} />
          <p class="heft-text" style="color:var(--tinte-2)">{d('Das Bild kann deine Daten zeigen. Wenn das nicht gewollt ist, das Häkchen entfernen.', 'Das Bild kann Ihre Daten zeigen. Wenn das nicht gewollt ist, das Häkchen entfernen.', 'The picture can show your data. If you do not want that, untick the box.')}</p>{/if}
      {:else}
        <p class="heft-text" style="color:var(--tinte-2)">{L('Vom Fenster ließ sich kein Bild aufnehmen; die Meldung geht ohne Bild.', 'No picture of the window could be taken; the report goes without a picture.')}</p>
      {/if}
      {#if MELDEN_SERVER}
      <div class="eingabe" style="margin-top:var(--a2)"><label for="me-antwort">{L('Antwortadresse (freiwillig, nur für eine Antwort)', 'Reply address (optional, only for a reply)')}</label>
        <input id="me-antwort" type="email" autocomplete="email" maxlength="200" bind:value={antwort} /></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Beim Senden gehen der Text, die technischen Angaben (Stand, Sprache, Seite, Fenstergröße, Browser), das Bild, wenn es mitgeschickt wird, und die Antwortadresse, wenn sie eingetragen ist, an den Server von Statable. Sie werden nur zur Bearbeitung der Meldung benutzt. Die Daten der Auswertung gehen nicht mit, außer sie sind im Bild zu sehen.', 'When sending, the text, the technical details (version, language, page, window size, browser), the picture if it is included, and the reply address if entered go to the Statable server. They are used only to handle the report. The data of the analysis do not go along unless they are visible in the picture.')}</p>
      {:else}
      <p class="heft-text" style="color:var(--tinte-2)">{d(`Statable hat keinen eigenen Server: „E-Mail vorbereiten“ öffnet dein Mailprogramm mit der Nachricht an ${MELDEN_ADRESSE}. Gesendet wird erst, wenn du dort auf „Senden“ klickst. Mitgeschickt werden nur Stand der App, Sprache, Seite, Fenstergröße und Browser, keine Daten.`, `Statable hat keinen eigenen Server: „E-Mail vorbereiten“ öffnet Ihr Mailprogramm mit der Nachricht an ${MELDEN_ADRESSE}. Gesendet wird erst, wenn Sie dort auf „Senden“ klicken. Mitgeschickt werden nur Stand der App, Sprache, Seite, Fenstergröße und Browser, keine Daten.`, `Statable has no server of its own: "Prepare e-mail" opens your mail program with the message to ${MELDEN_ADRESSE}. Nothing is sent until you click "Send" there. Only the version of the app, language, page, window size and browser go along, no data.`)}</p>
      {/if}
      {#if problem}<div class="banner" role="alert"><Icon n="hinweis" /><p>{problem === 'zu-viele' ? L('Es sind gerade viele Meldungen von diesem Gerät unterwegs. Bitte in ein paar Minuten noch einmal senden.', 'Many reports are on their way from this device. Please send again in a few minutes.') : problem === 'kein-server' ? L('Der Server von Statable ist gerade nicht erreichbar. Die Meldung lässt sich stattdessen über das Mailprogramm schicken.', 'The Statable server cannot be reached right now. The report can be sent through the mail program instead.') : L('Die Meldung konnte nicht gesendet werden. Sie lässt sich stattdessen über das Mailprogramm schicken.', 'The report could not be sent. It can be sent through the mail program instead.')}</p></div>{/if}
      <div class="knopfzeile"><button class="k primaer" type="submit" disabled={sendet || (!text.trim() && !(mitBild && bild))}>{#if sendet}<Rechnet imKnopf text={L('Wird gesendet …', 'Sending …')} />{:else}{MELDEN_SERVER ? L('Senden', 'Send') : L('E-Mail vorbereiten', 'Prepare e-mail')}{/if}</button>{#if problem && problem !== 'zu-viele'}<button class="k" type="button" onclick={() => void sendeMail()}>{L('E-Mail vorbereiten', 'Prepare e-mail')}</button>{/if}<button class="k leise" type="button" onclick={schliesse}>{L('Abbrechen', 'Cancel')}</button></div>
    {:else}
      <p class="heft-text" role="status">{d('Dein Mailprogramm sollte sich geöffnet haben.', 'Ihr Mailprogramm sollte sich geöffnet haben.', 'Your mail program should have opened.')}
        {#if mitBild && bild}{gesendet.kopiert ? ' ' + L('Das Bild liegt in der Zwischenablage: In der Nachricht mit Strg + V (Mac: Cmd + V) einfügen.', 'The picture is on the clipboard: paste it into the message with Ctrl + V (Mac: Cmd + V).') : ' ' + L('Das Bild ließ sich nicht in die Zwischenablage legen: bitte speichern und an die Nachricht anhängen.', 'The picture could not be put on the clipboard: please save it and attach it to the message.')}{/if}</p>
      <div class="knopfzeile">{#if mitBild && bild}<button class="k" type="button" onclick={speichern}>{L('Bild speichern', 'Save picture')}</button>{/if}<button class="k leise" type="button" onclick={schliesse}>{L('Schließen', 'Close')}</button></div>
    {/if}
  </form>
</dialog>

<style>
  dialog.melden { max-width: min(560px, calc(100vw - 2rem)); }
  .melden-bild { display: block; max-width: 100%; max-height: 150px; margin: var(--a2) 0; border: 1px solid var(--linie); border-radius: var(--r-mi, 6px); }
</style>
