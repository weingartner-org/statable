<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage, bereiteRegionenVor } from '../lib/ansage';
  import { plaene } from '../lib/fragebogen-editor.svelte';
  import { sperrFehler } from '../lib/fragebogenexport-menue';
  import { ERINNERN_ALLE, oeffneStation, type Station } from '../lib/station';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import { dialogFokus } from '../bausteine/dialogFokus';
  import { verschluesseleAntwort } from '../lib/antwortsatz';

  /**
   * Erhebungsstation (Stufe 3F): ein Gerät, viele Befragte nacheinander. Der Ablauf zum Ausfüllen kommt aus `ausfuellen/ablauf.ts` (derselbe wie in der Fragebogen-Datei).
   * Jede Antwort wird sofort verschlüsselt und nur verschlüsselt in der IndexedDB abgelegt (`lib/station.ts`). Während die Station läuft, liegt sie als Vollbild-Fenster
   * (`<dialog>` mit showModal) über der App: der Rest der App ist für Tastatur und Screenreader gesperrt, der Fokus bleibt im Fenster.
   * Unten steht eine schmale Leiste für die Betreuung (Zähler, Sicherungsdatei, Beenden). Einen PIN-Schutz gibt es nicht.
   */
  const KEY = /^age1[a-z0-9]{20,}$/;
  const kandidaten = $derived(plaene().filter(p => KEY.test(p.empfaenger?.schluessel ?? '')));
  let wahlId = $state('');
  const plan = $derived<FragebogenPlan | null>(kandidaten.find(p => p.id === wahlId) ?? kandidaten[0] ?? null);
  const sprachenName = (p: FragebogenPlan) => p.titel[p.sprachen[0] ?? 'de'] || p.id;
  const planFehler = $derived(plan ? sperrFehler(plan) : []);
  const sicher = typeof window !== 'undefined' && window.isSecureContext && !!globalThis.crypto?.subtle;

  let laeuft = $state(false);       // Station läuft
  let startet = $state(false);      // Ladeanimation beim Start
  let anzahl = $state(0);           // noch nicht gesichert
  let abgelegtSeitStart = $state(0);
  let erinnerung = $state('');      // Text der Erinnerung in der Leiste
  let meldungLeiste = $state('');
  /** Hängt die zwei Regionen von `sage()` in das offene Stations-Fenster (`ziel`) bzw. zurück in den body (`null`). Keine eigene Live-Region (Ansage-Wächter). */
  function regionenIns(ziel: HTMLElement | null | undefined) {
    const r = bereiteRegionenVor(document);
    for (const e of [r.hoeflich, r.dringend]) (ziel ?? document.body).appendChild(e);
  }   // Rückmeldung in der Leiste (gespeichert, Fehler)
  let sichertGerade = $state(false);
  let station: Station | null = null;
  let ausfuell: { ende(): void } | null = null;
  let wurzel = $state<HTMLElement>();
  let vollDlg = $state<HTMLDialogElement>();
  let endeDlg = $state<HTMLDialogElement>();
  let h1: HTMLElement | undefined = $state();

  const zahlText = (n: number) => (n === 1 ? L('1 Antwort', '1 answer') : L(`${n} Antworten`, `${n} answers`));
  async function aktualisiere() { if (station) anzahl = await station.ungesichert(); }

  async function starten() {
    if (!plan || startet) return;
    if (planFehler.length) { sage(L('Die Station lässt sich nicht starten: Der Plan hat Fehler. Siehe Liste.', 'The station cannot start: the plan has errors. See the list.')); return; }
    startet = true;
    try {
      station = await oeffneStation(plan.id);
      const [{ starteAusfuellen, istPlan }, { planFuerAusfuellen }] = await Promise.all([import('../ausfuellen/ablauf'), import('../lib/fragebogendatei')]);
      const roh = planFuerAusfuellen(plan);
      if (!istPlan(roh)) throw new Error('Plan');
      laeuft = true; abgelegtSeitStart = 0; erinnerung = ''; meldungLeiste = '';
      await aktualisiere();
      await tick();
      vollDlg?.showModal();
      regionenIns(vollDlg);   // die zentralen Ansage-Regionen liegen sonst außerhalb des modalen Fensters und wären für Screenreader gesperrt
      try { await document.documentElement.requestFullscreen?.(); } catch { /* ohne Vollbild geht es auch */ }
      const st = station;
      ausfuell = starteAusfuellen(wurzel!, roh, {
        verschluessele: verschluesseleAntwort,
        eigenesDokument: false,
        station: {
          ablegen: (armor, id) => st.ablegen(armor, id),
          beiAbgelegt: () => {
            abgelegtSeitStart++;
            void aktualisiere().then(() => {
              if (anzahl > 0 && anzahl % ERINNERN_ALLE === 0) {
                erinnerung = L(`Erinnerung für die Betreuung: ${zahlText(anzahl)} noch nicht gesichert. Bitte die Sicherungsdatei speichern.`, `Reminder for the person in charge: ${zahlText(anzahl)} not yet backed up. Please save the backup file.`);
                // Erst nach dem „Danke“ der Befragten (Fokusansage) und eigenständig als Hinweis an die Betreuung.
                const text = erinnerung;
                setTimeout(() => { if (laeuft) sage(text); }, 2500);
              }
            });
          },
        },
      });
      // Fokus auf die Überschrift des Fragebogens (Seitentitel)
      const kopf = wurzel?.querySelector<HTMLElement>('h1');
      kopf?.setAttribute('tabindex', '-1'); kopf?.focus();
      sage(L('Erhebungsstation gestartet. Die erste Person kann beginnen.', 'Survey station started. The first person can begin.'));
    } catch {
      laeuft = false;
      if (vollDlg?.open) vollDlg.close();
      regionenIns(null);
      sage(L('Die Station ließ sich nicht starten.', 'The station could not be started.'));
    } finally { startet = false; }
  }

  async function sichern(): Promise<boolean> {
    if (!station || sichertGerade) return false;
    sichertGerade = true;
    try {
      const s = await station.sicherungsText();
      if (!s.ids.length) { meldungLeiste = L('Es gibt nichts zu sichern: Alle Antworten sind schon gesichert.', 'Nothing to back up: all answers are already backed up.'); sage(meldungLeiste); return true; }
      const { herunterladen } = await import('../lib/export');
      herunterladen(new TextEncoder().encode(s.text), s.name, 'text/plain;charset=utf-8');
      await station.alsGesichertMarkieren(s.ids);   // erst nach dem Speichern
      await aktualisiere();
      erinnerung = '';
      meldungLeiste = L(`Sicherungsdatei „${s.name}“ gespeichert (${zahlText(s.ids.length)}). Bitte an einem sicheren Ort aufbewahren.`, `Backup file "${s.name}" saved (${zahlText(s.ids.length)}). Please keep it in a safe place.`);
      sage(meldungLeiste);
      return true;
    } catch {
      meldungLeiste = L('Die Sicherungsdatei ließ sich nicht speichern. Die Antworten bleiben verschlüsselt auf dem Gerät.', 'The backup file could not be saved. The answers stay encrypted on the device.');
      sage(meldungLeiste);
      return false;
    } finally { sichertGerade = false; }
  }

  let wirdBeendet = false;
  let beendenKnopf: HTMLButtonElement | undefined = $state();
  /** Nach „Zurück zur Station“ (oder Esc) steht der Fokus wieder auf „Station beenden“, nicht auf der Überschrift des Fragebogens. */
  function rueckfrageZu() {
    if (wirdBeendet || !laeuft) return;
    requestAnimationFrame(() => beendenKnopf?.focus());
  }
  async function beendeAbfrage() {
    wirdBeendet = false;
    await aktualisiere();
    if (endeDlg && !endeDlg.open) endeDlg.showModal();
  }
  async function beenden(leeren: boolean) {
    if (leeren && station) { try { await station.leeren(); } catch { meldungLeiste = L('Leeren nicht möglich.', 'Cannot clear.'); return; } }
    wirdBeendet = true;
    endeDlg?.close();
    ausfuell?.ende(); ausfuell = null;
    vollDlg?.close();
    regionenIns(null);
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* egal */ }
    laeuft = false; station = null; wurzel?.replaceChildren();
    await tick();
    setTimeout(() => h1?.focus(), 120);   // nach dem Fokus-Rückgabewert des Dialogs
    sage(leeren ? L('Station beendet. Die Antworten wurden vom Gerät gelöscht.', 'Station ended. The answers were deleted from the device.') : L('Station beendet.', 'Station ended.'));
  }

  const beiVerlassen = (e: BeforeUnloadEvent) => { if (laeuft && anzahl > 0) { e.preventDefault(); e.returnValue = ''; } };
  onMount(() => { window.addEventListener('beforeunload', beiVerlassen); });
  onDestroy(() => {
    regionenIns(null);
    if (typeof window !== 'undefined') window.removeEventListener('beforeunload', beiVerlassen);
    ausfuell?.ende();
    try { if (document.fullscreenElement) void document.exitFullscreen(); } catch { /* egal */ }
  });
</script>

<div class="tisch ohne-rand"><section class="blatt rund" aria-label={L('Station vorbereiten', 'Prepare the station')}>
  <SeitenKopf titel={L('Erhebungsstation (ein Gerät für viele Befragte)', 'Survey station (one device for many respondents)')} titelId="st-t" fokussierbar bind:h1El={h1} zurueck />

  <p>{L('Ein Tablet oder Laptop, an dem viele Personen nacheinander denselben Fragebogen ausfüllen, zum Beispiel im Seminar oder am Infostand. Jede Antwort wird sofort verschlüsselt (Verschlüsselung) und nur verschlüsselt im Gerät abgelegt. Wer nach einer befragten Person kommt, sieht nichts von deren Antworten. Nach dem Absenden zeigt die Station wieder die Startseite des Fragebogens.', 'A tablet or laptop where many people fill in the same questionnaire one after another, for example in a class or at an information stand. Every answer is encrypted at once and is stored on the device only in encrypted form. Whoever comes after a respondent sees none of their answers. After submitting, the station shows the start page of the questionnaire again.')}</p>

  <h2 class="kl">{L('So funktioniert es', 'How it works')}</h2>
  <ul class="regeln">
    <li>{L('Nur die Person, die den Fragebogen erstellt hat, kann die Antworten öffnen: mit der Schlüsseldatei und dem Passwort.', 'Only the person who created the questionnaire can open the answers: with the key file and the password.')}</li>
    <li>{L(`Die Betreuung sieht am unteren Rand, wie viele Antworten noch nicht gesichert sind. Nach jeder ${ERINNERN_ALLE}. Antwort kommt eine Erinnerung.`, `The person in charge sees at the bottom how many answers are not yet backed up. After every ${ERINNERN_ALLE}th answer there is a reminder.`)}</li>
    <li>{L('„Sicherungsdatei speichern“ schreibt eine Datei mit allen noch nicht gesicherten Antworten (verschlüsselt). Sie lässt sich später in „Antworten einlesen“ öffnen.', '"Save backup file" writes one file with all answers not yet backed up (encrypted). You can open it later when reading in answers.')}</li>
    <li>{L('Beenden geht nur über den Knopf „Station beenden“ mit Rückfrage. Es gibt keinen PIN-Schutz: Wer am Gerät sitzt, kann die Station beenden.', 'The station ends only with the button "End station" and a confirmation. There is no PIN protection: whoever sits at the device can end the station.')}</li>
    <li><strong>{L('Safari und iPad:', 'Safari and iPad:')}</strong> {L('Der Browser kann gespeicherte Website-Daten löschen, wenn die Seite 7 Tage lang nicht benutzt wurde. Sichern Sie darum nach jeder Sitzung.', 'The browser may delete stored website data when the page has not been used for 7 days. Please back up after every session.')}</li>
  </ul>

  {#if !sicher}
    <p class="warn">{L('Diese Seite ist nicht sicher geöffnet (kein „https://“), darum kann sie hier keine Antworten verschlüsseln. Öffnen Sie Statable über https://statable.eu.', 'This page is not opened securely (no "https://"), so it cannot encrypt answers here. Open Statable via https://statable.eu.')}</p>
  {:else if !kandidaten.length}
    <p class="warn" data-testid="st-ohne-schluessel">{L('Gesperrt: Es gibt noch keinen Fragebogen mit Schlüssel für die Antworten. Legen Sie in „Fragebogen planen“ einen Fragebogen an und unter „Antworten verschlüsseln (Schlüssel)“ ein Schlüsselpaar.', 'Blocked: there is no questionnaire with a key for the answers yet. Create a questionnaire in "Plan a questionnaire" and a key pair under "Encrypt answers (key)".')} <a href="#fragebogen">{L('Zu „Fragebogen planen“', 'Go to "Plan a questionnaire"')}</a></p>
  {:else}
    <div class="wahl">
      {#if kandidaten.length > 1}
        <label for="st-plan">{L('Fragebogen für die Station', 'Questionnaire for the station')}</label>
        <select id="st-plan" value={plan?.id} onchange={(e) => (wahlId = e.currentTarget.value)}>{#each kandidaten as p (p.id)}<option value={p.id}>{sprachenName(p)}</option>{/each}</select>
      {:else if plan}
        <p>{L('Fragebogen für die Station:', 'Questionnaire for the station:')} <strong>{sprachenName(plan)}</strong></p>
      {/if}
      {#if planFehler.length}
        <div class="warn" data-testid="st-planfehler">
          <p>{L('Gesperrt: Der Plan hat noch Fehler.', 'Blocked: the plan still has errors.')}</p>
          <ul>{#each planFehler as f}<li>{f.text}</li>{/each}</ul>
        </div>
      {/if}
      <button class="k haupt" type="button" data-testid="st-start" aria-disabled={planFehler.length || startet ? 'true' : undefined} onclick={() => void starten()}>
        {#if startet}<Rechnet imKnopf text={L('Station wird vorbereitet …', 'Preparing the station …')} />{:else}{L('Station starten', 'Start station')}{/if}
      </button>
      <p class="hilfe">{L('Die Station füllt den ganzen Bildschirm (Vollbild), wenn der Browser es erlaubt. Ohne Vollbild geht es auch.', 'The station fills the whole screen (full screen) if the browser allows it. It also works without full screen.')}</p>
    </div>
  {/if}
</section></div>

<!-- Die laufende Station: Vollbild-Fenster über der App. Esc fragt nach dem Beenden, statt zu schließen. -->
<dialog bind:this={vollDlg} class="station" aria-label={plan ? L(`Erhebungsstation: ${sprachenName(plan)}`, `Survey station: ${sprachenName(plan)}`) : L('Erhebungsstation', 'Survey station')} oncancel={(e) => { e.preventDefault(); void beendeAbfrage(); }}>
  <div class="st-flaeche" bind:this={wurzel} data-testid="st-flaeche"></div>
  <div class="leiste" role="group" aria-label={L('Betreuung der Station', 'Station supervision')}>
    <p class="zaehler" data-testid="st-zaehler">{L('Noch nicht gesichert:', 'Not yet backed up:')} <strong>{zahlText(anzahl)}</strong></p>
    <div class="leiste-knoepfe">
      <button type="button" class="sk" data-testid="st-sichern" aria-disabled={sichertGerade ? 'true' : undefined} onclick={() => void sichern()}>{L('Sicherungsdatei speichern', 'Save backup file')}</button>
      <button type="button" class="sk" data-testid="st-beenden" bind:this={beendenKnopf} onclick={() => void beendeAbfrage()}>{L('Station beenden', 'End station')}</button>
    </div>
    <p class="leise" data-testid="st-leiste-status">{meldungLeiste}</p>
    {#if erinnerung}<p class="erinnerung" data-testid="st-erinnerung">{erinnerung}</p>{/if}
  </div>
</dialog>

<dialog bind:this={endeDlg} class="station-ende" onclose={rueckfrageZu} use:dialogFokus aria-labelledby="st-ende-t" aria-describedby="st-ende-text">
  <div class="ende-innen">
    <h2 id="st-ende-t">{L('Station beenden?', 'End the station?')}</h2>
    {#if anzahl > 0}
      <p id="st-ende-text" data-testid="st-ende-ungesichert">{L(`${zahlText(anzahl)} noch nicht gesichert. Sie liegen verschlüsselt auf diesem Gerät. Speichern Sie zuerst die Sicherungsdatei: Der Browser kann gespeicherte Daten löschen (Safari nach 7 Tagen ohne Nutzung).`, `${zahlText(anzahl)} not yet backed up. They are stored encrypted on this device. Save the backup file first: the browser may delete stored data (Safari after 7 days without use).`)}</p>
      <div class="ende-knoepfe">
        <button type="button" class="sk haupt" data-testid="st-ende-sichern" onclick={() => void sichern()}>{L('Sicherungsdatei speichern', 'Save backup file')}</button>
        <button type="button" class="sk" data-testid="st-ende-trotzdem" onclick={() => void beenden(false)}>{L('Trotzdem beenden', 'End anyway')}</button>
        <button type="button" class="sk" autofocus data-testid="st-ende-zurueck" onclick={() => endeDlg?.close()}>{L('Zurück zur Station', 'Back to the station')}</button>
      </div>
    {:else}
      <p id="st-ende-text">{L('Alle Antworten sind gesichert. Nach dem Beenden zeigt das Gerät keine Station mehr. Wenn die Sicherungsdateien an einem sicheren Ort liegen, können Sie die verschlüsselten Antworten auch vom Gerät löschen.', 'All answers are backed up. After ending, the device shows no station any more. If the backup files are in a safe place, you can also delete the encrypted answers from the device.')}</p>
      <div class="ende-knoepfe">
        <button type="button" class="sk haupt" data-testid="st-ende-ja" onclick={() => void beenden(false)}>{L('Station beenden', 'End station')}</button>
        <button type="button" class="sk" data-testid="st-ende-leeren" onclick={() => void beenden(true)}>{L('Beenden und Antworten vom Gerät löschen', 'End and delete the answers from the device')}</button>
        <button type="button" class="sk" autofocus data-testid="st-ende-zurueck" onclick={() => endeDlg?.close()}>{L('Zurück zur Station', 'Back to the station')}</button>
      </div>
    {/if}
  </div>
</dialog>

<style>
  .kl { font-size: var(--gr-gross, 1.15rem); margin: var(--a3) 0 var(--a1); }
  .regeln { margin: 0 0 var(--a3); padding-inline-start: 1.25rem; display: flex; flex-direction: column; gap: var(--a1); }
  .wahl { display: flex; flex-direction: column; gap: var(--a2); align-items: flex-start; min-width: 0; max-width: 100%; }
  .wahl select { max-width: 100%; min-height: var(--ziel); }
  .warn { border-inline-start: .375rem solid var(--akzent); padding: var(--a2) var(--a3); background: var(--blatt-2); margin: var(--a2) 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .k[aria-disabled='true'] { cursor: not-allowed; border-style: dashed; }

  /* Das Vollbild-Fenster ist bewusst hell und unabhängig vom App-Thema (wie die Ausfüllseite). */
  dialog.station { position: fixed; inset: 0; width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; margin: 0; padding: 0; border: 0; background: #fff; color: #1a1a1a; display: none; flex-direction: column; box-sizing: border-box; overflow: hidden; }
  dialog.station[open] { display: flex; }
  dialog.station::backdrop { background: #fff; }
  .st-flaeche { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 1rem; box-sizing: border-box; }
  .leiste { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: .5rem 1rem; padding: .5rem 1rem; border-top: 2px solid #595959; background: #f1f3f6; font-size: .9rem; box-sizing: border-box; max-width: 100%; }
  .leiste p { margin: 0; }
  .zaehler { flex: 1 1 12rem; }
  .leiste-knoepfe { display: flex; flex-wrap: wrap; gap: .5rem; }
  .leise { flex: 1 1 100%; color: #444; min-height: 0; }
  .leise:empty { display: none; }
  .erinnerung { flex: 1 1 100%; font-weight: 600; color: #7a3b00; }
  .sk { min-height: 44px; min-width: 44px; padding: .5rem 1rem; font: inherit; font-weight: 600; color: #1a1a1a; background: #fff; border: 1px solid #595959; border-radius: 6px; cursor: pointer; white-space: normal; overflow-wrap: anywhere; }
  .sk.haupt { color: #fff; background: #0a4fa8; border-color: #0a4fa8; }
  .sk:focus-visible { outline: 3px solid #0a4fa8; outline-offset: 2px; }
  .sk[aria-disabled='true'] { cursor: not-allowed; border-style: dashed; }
  dialog.station-ende { max-width: min(32rem, calc(100vw - 2rem)); background: #fff; color: #1a1a1a; border: 2px solid #595959; border-radius: 8px; padding: 0; box-sizing: border-box; }
  dialog.station-ende::backdrop { background: rgba(0, 0, 0, .55); }
  .ende-innen { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: .75rem; }
  .ende-innen h2 { margin: 0; font-size: 1.3rem; }
  .ende-innen p { margin: 0; }
  .ende-knoepfe { display: flex; flex-direction: column; gap: .5rem; align-items: stretch; }
</style>
