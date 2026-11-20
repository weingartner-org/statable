<script lang="ts">
  import Rechnet from './Rechnet.svelte';
  import { onMount } from 'svelte';
  import { L, d } from '../lib/sitzung.svelte';
  import { ort } from '../i18n/profil';
  import { konto, starte, gleiche, anmelden, anmeldenMit, abmelden, entscheide, holeAusKonto, entferneAusKonto, kontoLoeschen } from '../lib/konto/konto.svelte';

  /** Einstellungen → Konto. Erscheint nur, wenn das Konto beim Bauen eingeschaltet wurde (siehe lib/konto/config.ts). */
  let email = $state(''), passwort = $state(''), loeschen = $state(false), abmeldenFrage = $state(false);
  onMount(() => { void starte(); });
  const zeit = (t: number) => new Date(t).toLocaleString(ort(), { dateStyle: 'short', timeStyle: 'short' });
  const stand = $derived(
    konto.status === 'gleicht' ? L('Wird abgeglichen …', 'Syncing …')
    : konto.status === 'offline' ? d('Kein Netz - du arbeitest weiter im Browser, der Abgleich holt das nach.', 'Kein Netz - Sie arbeiten weiter im Browser, der Abgleich holt das nach.', 'No connection - you keep working in the browser; syncing catches up later.')
    : konto.status === 'fehler' ? L('Der Abgleich ist fehlgeschlagen.', 'Syncing failed.')
    : konto.zuletzt ? L(`Zuletzt abgeglichen: ${zeit(konto.zuletzt)}`, `Last synced: ${zeit(konto.zuletzt)}`) : '');
</script>

<div class="einst-gruppe" id="konto">
  <h2>{L('Konto', 'Account')}</h2>
  {#if konto.phase === 'start' || konto.phase === 'aus'}
    <p role="status"><Rechnet text={L('Wird geprüft …', 'Checking …')} /></p>
  {:else if konto.phase === 'abgemeldet'}
    <p>{d('Mit einem Konto liegen deine Projekte zusätzlich auf dem Server der Uni und sind auf jedem Gerät da. Ohne Konto bleibt alles wie bisher im Browser.', 'Mit einem Konto liegen Ihre Projekte zusätzlich auf dem Server der Uni und sind auf jedem Gerät da. Ohne Konto bleibt alles wie bisher im Browser.', 'With an account your projects are also kept on the university server and are available on every device. Without one, everything stays in the browser as before.')}</p>
    <p>{d('Lege im Konto keine Daten von Personen mit Namen oder Kontaktdaten ab, solange die Datenschutzfragen deiner Studie nicht geklärt sind. Wer das System betreibt, kann technisch auf die gespeicherten Projekte zugreifen.', 'Legen Sie im Konto keine Daten von Personen mit Namen oder Kontaktdaten ab, solange die Datenschutzfragen Ihrer Studie nicht geklärt sind. Wer das System betreibt, kann technisch auf die gespeicherten Projekte zugreifen.', 'Do not keep data about named or identifiable people in the account until the data-protection questions of your study are settled. Whoever operates the system can technically access the stored projects.')}</p>
    {#if konto.serverFehler}<p>{L('Der Server ist gerade nicht erreichbar.', 'The server cannot be reached right now.')}</p>{/if}
    {#each konto.anbieter as a (a.name)}
      <p><button class="k" type="button" onclick={() => anmeldenMit(a.name)}>{L(`Anmelden mit ${a.anzeige}`, `Sign in with ${a.anzeige}`)}</button></p>
    {/each}
    {#if konto.passwort}
      <form onsubmit={(e) => { e.preventDefault(); void anmelden(email, passwort).then(ok => { if (ok) passwort = ''; }); }}>
        <p><label>{L('E-Mail', 'E-mail')} <input type="email" autocomplete="username" bind:value={email} required aria-required="true"></label></p>
        <p><label>{L('Passwort', 'Password')} <input type="password" autocomplete="current-password" bind:value={passwort} required aria-required="true"></label></p>
        <p><button class="k" type="submit">{L('Anmelden', 'Sign in')}</button></p>
      </form>
    {/if}
    {#if konto.meldung}<p role="alert">{konto.meldung}</p>{/if}
  {:else}
    <p>{L(`Angemeldet als ${konto.name}.`, `Signed in as ${konto.name}.`)} {stand}</p>
    <p>
      <button class="k" type="button" onclick={gleiche} disabled={konto.status === 'gleicht'}>{#if konto.status === 'gleicht'}<Rechnet imKnopf text={L('Wird abgeglichen …', 'Syncing …')} />{:else}{L('Jetzt abgleichen', 'Sync now')}{/if}</button>
      {#if !abmeldenFrage}<button class="k leise" type="button" onclick={() => (abmeldenFrage = true)}>{L('Abmelden', 'Sign out')}</button>{/if}
    </p>
    {#if abmeldenFrage}
      <div role="group" aria-label={L('Abmelden', 'Sign out')}>
        <p>{d('Arbeitest du an einem Rechner, den auch andere benutzen? Dann entferne deine Projekte von diesem Gerät. Sie bleiben im Konto und sind nach dem nächsten Anmelden wieder zu holen.', 'Arbeiten Sie an einem Rechner, den auch andere benutzen? Dann entfernen Sie Ihre Projekte von diesem Gerät. Sie bleiben im Konto und sind nach dem nächsten Anmelden wieder zu holen.', 'Are you working on a computer that others use too? Then remove your projects from this device. They stay in the account and can be fetched again after signing in.')}</p>
        <p>
          <button class="k" type="button" onclick={async () => { abmeldenFrage = false; await abmelden(true); }}>{L('Abmelden und Projekte von diesem Gerät löschen', 'Sign out and delete projects from this device')}</button>
          <button class="k leise" type="button" onclick={async () => { abmeldenFrage = false; await abmelden(false); }}>{L('Nur abmelden', 'Sign out only')}</button>
          <button class="k leise" type="button" onclick={() => (abmeldenFrage = false)}>{L('Abbrechen', 'Cancel')}</button>
        </p>
      </div>
    {/if}
    {#if konto.uebersprungen}<p>{d('Eine neuere Fassung des offenen Projekts liegt im Konto. Sie wird geholt, sobald du das Projekt schließt.', 'Eine neuere Fassung des offenen Projekts liegt im Konto. Sie wird geholt, sobald Sie das Projekt schließen.', 'A newer version of the open project is in the account. It is fetched once you close the project.')}</p>{/if}

    {#each konto.konflikte as k (k.cid)}
      <div class="konflikt" role="group" aria-label={L(`Konflikt: ${k.lokal.name}`, `Conflict: ${k.lokal.name}`)}>
        <p><strong>{L(`„${k.lokal.name}“ wurde hier und im Konto geändert.`, `"${k.lokal.name}" was changed here and in the account.`)}</strong>
          {L(`Hier zuletzt geändert: ${zeit(k.lokal.zeit)} (Uhr dieses Geräts) · Im Konto zuletzt gespeichert: ${zeit(k.fern.aktualisiert ?? k.fern.zeit)} (Zeit des Servers)`, `Last changed here: ${zeit(k.lokal.zeit)} (this device's clock) · Last saved in the account: ${zeit(k.fern.aktualisiert ?? k.fern.zeit)} (server time)`)}</p>
        <p>
          <button class="k" type="button" onclick={() => entscheide(k, 'lokal')}>{L('Diese Version behalten', 'Keep this version')}</button>
          <button class="k" type="button" onclick={() => entscheide(k, 'fern')}>{L('Version aus dem Konto holen', 'Take the account version')}</button>
          <button class="k leise" type="button" onclick={() => entscheide(k, 'beide')}>{L('Beide behalten', 'Keep both')}</button>
        </p>
      </div>
    {/each}

    {#if konto.nurFern.length}
      <h3>{L('Nur im Konto', 'Only in the account')}</h3>
      <ul>
        {#each konto.nurFern as e (e.cid)}
          <li>{e.name} ({zeit(e.aktualisiert ?? e.zeit)})
            <button class="k leise" type="button" onclick={() => holeAusKonto(e)}>{L('In den Browser holen', 'Download to browser')}</button>
            <button class="k leise" type="button" onclick={() => entferneAusKonto(e)}>{L('Aus dem Konto löschen', 'Delete from account')}</button></li>
        {/each}
      </ul>
    {/if}

    <h3>{L('Konto löschen', 'Delete account')}</h3>
    <p>{L('Löscht das Konto und alle Projekte im Konto vom Server. Die Projekte in diesem Browser bleiben.', 'Deletes the account and all projects in it from the server. The projects in this browser stay.')}</p>
    {#if !loeschen}
      <button class="k leise" type="button" onclick={() => (loeschen = true)}>{L('Konto löschen …', 'Delete account …')}</button>
    {:else}
      <button class="k" type="button" onclick={async () => { await kontoLoeschen(); loeschen = false; }}>{L('Ja, Konto und Daten im Konto löschen', 'Yes, delete the account and its data')}</button>
      <button class="k leise" type="button" onclick={() => (loeschen = false)}>{L('Abbrechen', 'Cancel')}</button>
    {/if}
  {/if}
</div>
