<script lang="ts">
  import { tick } from 'svelte';
  import { s, L, melde, oeffneNeueDaten, setzeFragebogen, setzeFragebogenEingaben } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import type { Antwortsatz } from '../lib/antwortsatz';
  import { KryptoFehler, empfaengerAusIdentitaet, leseSchluesselDatei } from '../lib/schluessel';
  import { schluesselGeladen, schluesselMerken, schluesselSitzung } from '../lib/schluessel-sitzung.svelte';
  import { MAX_DATEI_BYTES, durchgangAusSaetzen, entschluesseleAlle, pruefeEingaenge, zerlegeEingaben, type Eingang, type EingangsZustand, type Pruefung } from '../lib/sammelimport';
  import { kategorisiere, rr1, rr2 } from '../lib/ruecklauf';
  import { KEINE_QUOTE_SATZ, SELBSTGEWAEHLT_SATZ, prozentText, quoteText, sammelProtokollText, zustandsWort } from '../lib/sammelimport-protokoll';
  import { datensatzTabelle } from '../lib/doppeleingabe-daten';
  import { anzeigeSprache } from '../lib/fragebogen-aktionen.svelte';
  import { bilder, entwurfInsProjekt } from '../lib/fragebogen-editor.svelte';
  import { eingabenInsProjekt, eingabenVon } from '../lib/eingabemaske.svelte';
  import { dateiname } from '../lib/dateiname';
  import { ganzZahl } from '../i18n/profil';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Antworten einlesen (Sammelimport, Rücklaufquote)“ (Erheben, Stufe 3E). Viele Antwortdateien, Ordner, Ziehen und Ablegen, eingefügter Text;
   * Schlüssel aus der Sitzung oder aus Schlüsseldatei + Passwort; Tabelle der Zustände; Rücklauf nach AAPOR; Datensatz; Protokoll als Text und Word.
   * Antworttexte werden nur als Svelte-Text gezeigt (nie als HTML) und gelangen nie in R- oder PSPP-Code.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  const BESTAETIGT = ['ohneCode', 'unbekannterCode', 'doppelterCode', 'andereRevision'];
  const MAX_ZEILEN = 500;

  let grenzeText = $state('80');
  let dateien = $state<File[]>([]);
  let ignoriert = $state(0);
  let text = $state('');
  let schluesselDateiWahl = $state<File | null>(null);
  let pw = $state('');
  let fehler = $state<{ feld: string; text: string } | null>(null);
  let arbeitet = $state('');
  let fortschrittText = $state('');
  let ziehen = $state(false);

  let eingaenge = $state<Eingang[]>([]);
  let pruefung = $state<Pruefung | null>(null);
  let benutzteGrenze = $state(0.8);
  let abgewaehlt = $state<Record<number, boolean>>({});
  let alleZeilen = $state(false);
  let fertigMeldung = $state('');

  const titel = $derived(plan.titel[anzeigeSprache(plan)] || plan.titel[plan.sprachen[0] ?? ''] || plan.id);
  const mitCodes = $derived((plan.codes?.length ?? 0) > 0);
  const hatSchluessel = $derived(schluesselGeladen());
  const passtSchluessel = $derived(!plan.empfaenger?.schluessel || !hatSchluessel || schluesselSitzung.empfaenger === plan.empfaenger.schluessel);
  // Warnung einmal dringend ansagen, wenn ein unpassender Schlüssel geladen wird (keine eigene Live-Region, Ansage-Wächter)
  $effect(() => { if (!passtSchluessel) sage(L('Achtung: Dieser Schlüssel gehört nicht zum öffentlichen Schlüssel im Fragebogen.', 'Warning: this key does not belong to the public key in the questionnaire.'), 'dringend'); });
  const gewaehlt = $derived.by<Antwortsatz[]>(() => {
    if (!pruefung) return [];
    const r: Antwortsatz[] = [];
    pruefung.zeilen.forEach((z, i) => { const sa = eingaenge[i]?.satz; if (z.uebernehmen && abgewaehlt[i] !== true && sa) r.push(sa); });
    return r;
  });
  const kat = $derived(pruefung ? kategorisiere(plan, gewaehlt, plan.codes, benutzteGrenze) : null);
  const sichtbar = $derived.by(() => {
    if (!pruefung) return [];
    const alle = pruefung.zeilen.map((z, i) => ({ z, i }));
    return alle.length > MAX_ZEILEN && !alleZeilen ? alle.filter(x => x.z.zustand !== 'uebernommen') : alle;
  });

  const pause = () => new Promise<void>(r => setTimeout(r, 40));
  function zeigeFehler(feld: string, t: string) {
    fehler = { feld, text: t };
    sage(t, 'dringend');
    void tick().then(() => document.getElementById(feld)?.focus());
  }
  const fehlerFuer = (feld: string) => (fehler?.feld === feld ? fehler.text : '');
  const beschreibt = (feld: string, hilfe?: string) => [hilfe, fehlerFuer(feld) ? `${feld}-f` : ''].filter(Boolean).join(' ') || undefined;

  function nimmDateien(liste: File[], ordner = false) {
    let neu = liste;
    if (ordner) { neu = liste.filter(f => /\.(age|txt|asc)$/i.test(f.name)); ignoriert += liste.length - neu.length; }
    dateien = [...dateien, ...neu];
    if (neu.length) sage(L(`${neu.length} Dateien hinzugefügt, zusammen ${dateien.length}.`, `${neu.length} files added, ${dateien.length} in total.`));
  }
  function leereAuswahl() { dateien = []; ignoriert = 0; sage(L('Dateiauswahl geleert.', 'File selection cleared.')); }
  function abgelegt(e: DragEvent) {
    e.preventDefault(); ziehen = false;
    const f = [...(e.dataTransfer?.files ?? [])];
    if (f.length) nimmDateien(f);
  }

  /** Meldungen für Vorleser höchstens alle 3 Sekunden, nie je Datei. */
  let letzteAnsage = 0;
  function fortschritt(fertig: number, gesamt: number) {
    fortschrittText = L(`${fertig} von ${gesamt} Antworten gelesen …`, `${fertig} of ${gesamt} answers read …`);
    const jetzt = Date.now();
    if (jetzt - letzteAnsage > 3000 && fertig < gesamt) { letzteAnsage = jetzt; sage(fortschrittText); }
  }

  async function einlesen() {
    fehler = null; fertigMeldung = '';
    const g = Number(grenzeText.replace(',', '.').trim());
    if (!Number.isFinite(g) || g < 1 || g > 100) return zeigeFehler('fb-sam-grenze', L('Bitte eine Zahl von 1 bis 100 eingeben, zum Beispiel 80.', 'Please enter a number from 1 to 100, for example 80.'));
    if (!dateien.length && !text.trim()) return zeigeFehler('fb-sam-datei', L('Bitte Antwortdateien wählen oder Text einfügen.', 'Please choose answer files or paste text.'));
    if (!hatSchluessel) {
      if (!schluesselDateiWahl) return zeigeFehler('fb-sam-schl', L('Bitte die Schlüsseldatei (.statable-schluessel) wählen.', 'Please choose the key file (.statable-schluessel).'));
      if (!pw) return zeigeFehler('fb-sam-pw', L('Bitte das Passwort der Schlüsseldatei eingeben.', 'Please enter the password of the key file.'));
      if (schluesselDateiWahl.size > 100_000) return zeigeFehler('fb-sam-schl', L('Das ist keine Schlüsseldatei von Statable (zu groß).', 'This is not a Statable key file (too large).'));
      arbeitet = L('Schlüssel wird geöffnet …', 'Opening the key …');
      sage(arbeitet);
      await pause();
      try {
        const r = await leseSchluesselDatei(new Uint8Array(await schluesselDateiWahl.arrayBuffer()), pw);
        schluesselMerken(r.identitaet, await empfaengerAusIdentitaet(r.identitaet), r.name);
        pw = ''; schluesselDateiWahl = null;
      } catch (e) {
        arbeitet = '';
        if (e instanceof KryptoFehler && e.code === 'falsches-passwort') return zeigeFehler('fb-sam-pw', L('Das Passwort passt nicht zu dieser Schlüsseldatei.', 'The password does not match this key file.'));
        return zeigeFehler('fb-sam-schl', L('Diese Datei ist keine gültige Schlüsseldatei von Statable oder sie ist beschädigt.', 'This file is not a valid Statable key file or it is damaged.'));
      }
    }
    benutzteGrenze = g / 100;
    arbeitet = L('Antworten werden gelesen …', 'Reading the answers …');
    fortschrittText = ''; letzteAnsage = Date.now();
    sage(L('Antworten werden gelesen. Das kann einen Moment dauern.', 'Reading the answers. This can take a moment.'));
    await pause();
    try {
      const gelesen: { name: string; bytes: Uint8Array }[] = [];
      const zuGross: Eingang[] = [];
      for (const f of dateien) {
        if (f.size > MAX_DATEI_BYTES) { zuGross.push({ quelle: f.name, fehler: 'zu-gross' }); continue; }
        gelesen.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
      }
      const stuecke = zerlegeEingaben(gelesen, text);
      const ergebnis = [...await entschluesseleAlle(stuecke, schluesselSitzung.identitaet, fortschritt), ...zuGross];
      eingaenge = ergebnis;
      abgewaehlt = {};
      alleZeilen = false;
      pruefung = pruefeEingaenge(plan, ergebnis, plan.codes);
      const n = pruefung.saetze.length;
      fertigMeldung = L(`${pruefung.zeilen.length} Eingänge gelesen, ${n} übernommen.`, `${pruefung.zeilen.length} items read, ${n} accepted.`);
      await tick();
      document.getElementById('fb-sam-ergebnis-t')?.focus();   // die Überschrift trägt die Zahl als Beschreibung (aria-describedby)
      sageSpaeter(fertigMeldung);
    } catch (e) {
      const c = e instanceof KryptoFehler ? e.code : '';
      zeigeFehler('fb-sam-datei', c === 'ungueltig' ? L('Der Schlüssel dieser Sitzung ist nicht gültig. Bitte öffnen Sie Ihre Schlüsseldatei noch einmal.', 'The key of this session is not valid. Please open your key file again.') : L('Das Einlesen ist fehlgeschlagen. Bitte noch einmal versuchen.', 'Reading failed. Please try again.'));
    } finally { arbeitet = ''; fortschrittText = ''; }
  }

  function haken(i: number, an: boolean) {
    abgewaehlt = { ...abgewaehlt, [i]: !an };
    sage(an ? L('Antwort wird übernommen.', 'Answer will be accepted.') : L('Antwort wird nicht übernommen.', 'Answer will not be accepted.'));
  }

  const protokoll = () => ({ plan, pruefung: pruefung!, kategorisierung: kat!, grenze: benutzteGrenze, datum: new Date().toISOString().slice(0, 10), uebernommen: gewaehlt.length });
  const zeilenFuerWord = () => pruefung!.zeilen.map((z, i) => ({ quelle: z.quelle, zustand: z.zustand, uebernehmen: z.uebernehmen && abgewaehlt[i] !== true }));

  async function protokollAlsText() {
    if (!pruefung || !kat) return;
    const { herunterladen } = await import('../lib/export');
    const name = `${dateiname(titel)} - ${L('Protokoll Sammelimport', 'Bulk import protocol')}.txt`;
    herunterladen(new TextEncoder().encode(sammelProtokollText(protokoll())), name, 'text/plain;charset=utf-8');
    sage(L(`Protokoll als Text „${name}“ gespeichert (Download).`, `Protocol saved as text "${name}" (download).`), 'dringend');
  }
  async function protokollAlsWord() {
    if (!pruefung || !kat) return;
    arbeitet = L('Word-Datei wird erstellt …', 'Creating the Word file …');
    try {
      const [{ sammelProtokollWord }, { herunterladen }] = await Promise.all([import('../lib/sammelimport-protokoll'), import('../lib/export')]);
      const name = `${dateiname(titel)} - ${L('Protokoll Sammelimport', 'Bulk import protocol')}.docx`;
      herunterladen(await sammelProtokollWord(protokoll(), zeilenFuerWord()), name, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      sage(L(`Protokoll als Word-Datei „${name}“ gespeichert (Download).`, `Protocol saved as Word file "${name}" (download).`), 'dringend');
    } catch { melde(L('Die Word-Datei ließ sich nicht erstellen.', 'The Word file could not be created.')); }
    finally { arbeitet = ''; }
  }

  /** Datensatz wie bei der Eingabemaske (2F): neue Daten, Plan und Eingaben bleiben im Projekt. */
  async function alsDatensatz() {
    if (!gewaehlt.length) { sage(L('Es gibt keine übernommenen Antworten.', 'There are no accepted answers.'), 'dringend'); return; }
    arbeitet = L('Datensatz wird erzeugt …', 'Creating the data set …');
    try {
      const hatteProjekt = !!s.projekt, planAlt = [...(s.projekt ? s.fragebogen : [plan])], bildAlt = bilder();
      const eingAlt = { ...(hatteProjekt ? s.fragebogenEingaben : { [plan.id]: eingabenVon(plan.id) }) };
      const t = datensatzTabelle(plan, durchgangAusSaetzen(gewaehlt), anzeigeSprache(plan));
      await oeffneNeueDaten(L(`Antworten: ${titel}`, `Answers: ${titel}`), L(`Sammelimport (${gewaehlt.length} Antworten)`, `Bulk import (${gewaehlt.length} answers)`), t.spalten, t.zeilen);
      if (hatteProjekt) { await setzeFragebogen(planAlt, bildAlt); await setzeFragebogenEingaben(eingAlt); }
      else { entwurfInsProjekt(); eingabenInsProjekt(); }
      melde(L(`Datensatz erzeugt: ${gewaehlt.length} Antworten.`, `Data set created: ${gewaehlt.length} answers.`));
      await tick();
      setTimeout(() => document.getElementById('fb-sam-t')?.focus(), 0);
    } catch (e) { melde(L(`Der Datensatz ließ sich nicht erzeugen: ${(e as Error).message}`, `The data set could not be created: ${(e as Error).message}`)); }
    finally { arbeitet = ''; }
  }
</script>

<section class="sam" aria-label={L('Sammelimport', 'Bulk import')}>
  <div class="kopf"><h2 id="fb-sam-t" tabindex="-1">{L('Antworten einlesen (Sammelimport, Rücklaufquote)', 'Read in answers (bulk import, response rate)')}</h2><HilfeLink id="fragebogen-planen" text={L('Hilfe zum Sammelimport', 'Help on the bulk import')} /></div>
  <p class="hilfe">{L('Hier öffnen Sie viele verschlüsselte Antworten auf einmal. Statable prüft jede Antwort (richtiger Fragebogen, doppelt eingelesen, Einmal-Code) und baut daraus den Datensatz. Ohne Schlüsseldatei und Passwort kann niemand die Antworten öffnen, auch Statable nicht. Ohne Server lässt sich doppeltes Ausfüllen nur erkennen, nicht verhindern.', 'Here you open many encrypted answers at once. Statable checks every answer (right questionnaire, read in twice, one-time code) and builds the data set from them. Without the key file and password nobody can open the answers, not even Statable. Without a server, filling in twice can only be detected, not prevented.')}</p>

  <form class="formular" onsubmit={(e) => { e.preventDefault(); if (!arbeitet) void einlesen(); }} aria-label={L('Antworten einlesen', 'Read in answers')}>
    <div class="eingabe">
      <label for="fb-sam-grenze">{L('Grenze für „vollständig“ (in Prozent der gezeigten Pflichtfragen)', 'Threshold for "complete" (percent of the required questions shown)')}</label>
      <input id="fb-sam-grenze" type="text" inputmode="decimal" autocomplete="off" bind:value={grenzeText} aria-invalid={fehlerFuer('fb-sam-grenze') ? 'true' : undefined} aria-describedby={beschreibt('fb-sam-grenze', 'fb-sam-grenze-h')}>
      <p id="fb-sam-grenze-h" class="hilfe">{L('Legen Sie die Grenze vor dem Einlesen fest. Wer mindestens so viel beantwortet hat, zählt als vollständig (I), wer weniger, aber etwas beantwortet hat, als teilweise (P). Die Grenze steht im Protokoll.', 'Set the threshold before reading in. Whoever answered at least this much counts as complete (I), whoever answered less but something counts as partial (P). The threshold goes into the protocol.')}</p>
      {#if fehlerFuer('fb-sam-grenze')}<p id="fb-sam-grenze-f" class="fehl">{fehlerFuer('fb-sam-grenze')}</p>{/if}
    </div>

    <fieldset class="eingabe feld">
      <legend>{L('Schlüssel', 'Key')}</legend>
      {#if hatSchluessel}
        <p data-testid="fb-sam-schl-status">{L('Der private Schlüssel ist in dieser Sitzung geöffnet.', 'The private key is open in this session.')}</p>
        {#if !passtSchluessel}<p class="fehl">{L('Achtung: Dieser Schlüssel gehört nicht zum öffentlichen Schlüssel im Fragebogen. Die Antworten lassen sich wohl nicht öffnen.', 'Warning: this key does not belong to the public key in the questionnaire. The answers probably cannot be opened.')}</p>{/if}
      {:else}
        <div class="eingabe">
          <label for="fb-sam-schl">{L('Schlüsseldatei (.statable-schluessel)', 'Key file (.statable-schluessel)')}</label>
          <input id="fb-sam-schl" type="file" accept=".statable-schluessel" onchange={(e) => { schluesselDateiWahl = e.currentTarget.files?.[0] ?? null; }} aria-invalid={fehlerFuer('fb-sam-schl') ? 'true' : undefined} aria-describedby={beschreibt('fb-sam-schl')}>
          {#if fehlerFuer('fb-sam-schl')}<p id="fb-sam-schl-f" class="fehl">{fehlerFuer('fb-sam-schl')}</p>{/if}
        </div>
        <div class="eingabe">
          <label for="fb-sam-pw">{L('Passwort der Schlüsseldatei', 'Password of the key file')}</label>
          <input id="fb-sam-pw" type="password" autocomplete="current-password" bind:value={pw} aria-invalid={fehlerFuer('fb-sam-pw') ? 'true' : undefined} aria-describedby={beschreibt('fb-sam-pw')}>
          {#if fehlerFuer('fb-sam-pw')}<p id="fb-sam-pw-f" class="fehl">{fehlerFuer('fb-sam-pw')}</p>{/if}
        </div>
        <p class="hilfe">{L('Das Öffnen der Schlüsseldatei dauert etwa eine Sekunde. Der private Schlüssel bleibt nur im Arbeitsspeicher dieser Sitzung.', 'Opening the key file takes about a second. The private key stays in memory in this session only.')}</p>
      {/if}
    </fieldset>

    <fieldset class="eingabe feld" class:ziehen>
      <legend>{L('Antworten', 'Answers')}</legend>
      <div class="ablage" role="group" aria-label={L('Antwortdateien hierher ziehen oder wählen', 'Drag answer files here or choose them')}
        ondragover={(e) => { e.preventDefault(); ziehen = true; }} ondragleave={() => (ziehen = false)} ondrop={abgelegt}>
        <p class="hilfe">{L('Dateien (.age oder Textdateien mit Antwort-Blöcken) hierher ziehen oder wählen.', 'Drag files (.age or text files with answer blocks) here or choose them.')}</p>
        <div class="eingabe">
          <label for="fb-sam-datei">{L('Antwortdateien wählen (mehrere möglich)', 'Choose answer files (several possible)')}</label>
          <input id="fb-sam-datei" type="file" multiple onchange={(e) => { nimmDateien([...(e.currentTarget.files ?? [])]); e.currentTarget.value = ''; }} aria-invalid={fehlerFuer('fb-sam-datei') ? 'true' : undefined} aria-describedby={beschreibt('fb-sam-datei')}>
        </div>
        <div class="eingabe">
          <label for="fb-sam-ordner">{L('Ganzen Ordner wählen (nur .age und .txt)', 'Choose a whole folder (.age and .txt only)')}</label>
          <input id="fb-sam-ordner" type="file" multiple webkitdirectory onchange={(e) => { nimmDateien([...(e.currentTarget.files ?? [])], true); e.currentTarget.value = ''; }}>
        </div>
      </div>
      <p id="fb-sam-stand" class="stand">{L(`${dateien.length} Dateien gewählt.`, `${dateien.length} files chosen.`)}{ignoriert ? ' ' + L(`${ignoriert} andere Dateien im Ordner wurden übergangen.`, `${ignoriert} other files in the folder were skipped.`) : ''}</p>
      {#if dateien.length}<button class="k leise" type="button" onclick={leereAuswahl}>{L('Dateiauswahl leeren', 'Clear file selection')}</button>{/if}
      <div class="eingabe">
        <label for="fb-sam-text">{L('Oder Text einfügen (ein oder mehrere Antwort-Blöcke)', 'Or paste text (one or more answer blocks)')}</label>
        <textarea id="fb-sam-text" rows="5" spellcheck="false" bind:value={text} aria-describedby={beschreibt('fb-sam-datei', 'fb-sam-text-h')}></textarea>
        <p id="fb-sam-text-h" class="hilfe">{L('Jeder Block beginnt mit „-----BEGIN AGE ENCRYPTED FILE-----“. Text außerhalb der Blöcke wird überlesen.', 'Every block starts with "-----BEGIN AGE ENCRYPTED FILE-----". Text outside the blocks is ignored.')}</p>
      </div>
      {#if fehlerFuer('fb-sam-datei')}<p id="fb-sam-datei-f" class="fehl">{fehlerFuer('fb-sam-datei')}</p>{/if}
    </fieldset>

    <div class="zeile">
      <button class="k haupt" type="submit" aria-disabled={arbeitet ? 'true' : undefined}>{L('Einlesen', 'Read in')}</button>
      {#if arbeitet}<Rechnet text={fortschrittText || arbeitet} />{/if}
    </div>
  </form>

  {#if pruefung && kat}
    <div class="ergebnis">
      <h3 id="fb-sam-ergebnis-t" tabindex="-1" aria-describedby="fb-sam-summe">{L('Ergebnis des Einlesens', 'Result of reading in')}</h3>
      <p id="fb-sam-summe" data-testid="fb-sam-summe">{L(`${pruefung.zeilen.length} Eingänge gelesen, ${gewaehlt.length} werden übernommen.`, `${pruefung.zeilen.length} items read, ${gewaehlt.length} will be accepted.`)}</p>
      <ul class="zahlen">
        {#each Object.entries(pruefung.zahlen).filter(([, n]) => n > 0) as [z, n] (z)}<li>{zustandsWort(z as EingangsZustand)}: <b>{ganzZahl(n)}</b></li>{/each}
      </ul>

      {#if sichtbar.length < pruefung.zeilen.length}
        <p class="hilfe">{L(`Die ${pruefung.zeilen.length - sichtbar.length} übernommenen Zeilen ohne Auffälligkeit sind ausgeblendet.`, `The ${pruefung.zeilen.length - sichtbar.length} accepted rows without anything unusual are hidden.`)} <button class="k leise" type="button" onclick={() => (alleZeilen = true)}>{L('Alle Zeilen zeigen', 'Show all rows')}</button></p>
      {/if}
      <div class="rolle" role="region" tabindex="0" aria-label={L('Tabelle der eingelesenen Antworten', 'Table of the answers read in')}>
        <table class="ct">
          <caption class="nur-vorleser">{L('Eingelesene Antworten mit Zustand und Haken „übernehmen“', 'Answers read in with state and the tick "accept"')}</caption>
          <thead><tr><th scope="col">{L('Quelle', 'Source')}</th><th scope="col">{L('Zustand', 'State')}</th><th scope="col">{L('Hinweis', 'Note')}</th><th scope="col">{L('Übernehmen', 'Accept')}</th></tr></thead>
          <tbody>
            {#each sichtbar as { z, i } (i)}
              <tr>
                <th scope="row" translate="no">{z.quelle}</th>
                <td>{zustandsWort(z.zustand)}</td>
                <td>{z.hinweis ?? ''}</td>
                <td>
                  {#if z.uebernehmen && BESTAETIGT.includes(z.zustand)}
                    <label class="schalter"><input type="checkbox" checked={abgewaehlt[i] !== true} onchange={(e) => haken(i, e.currentTarget.checked)}><span class="nur-vorleser">{L(`${z.quelle} übernehmen`, `Accept ${z.quelle}`)}</span><span aria-hidden="true">{L('übernehmen', 'accept')}</span></label>
                  {:else}
                    {z.uebernehmen ? L('ja', 'yes') : L('nein', 'no')}
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <h3 id="fb-sam-rl-t">{L('Rücklauf (Rücklaufquote nach AAPOR)', 'Response (response rate after AAPOR)')}</h3>
      {#if kat.keineQuote || !kat.zahlen}
        <p data-testid="fb-sam-rl-zahl">{L(`Zahl der eingegangenen Antworten: ${kat.anzahl}.`, `Number of answers received: ${kat.anzahl}.`)}</p>
        <p>{KEINE_QUOTE_SATZ()}</p>
        <p>{SELBSTGEWAEHLT_SATZ()}</p>
      {:else}
        <p>{L(`Ausgegebene Einmal-Codes: ${kat.zahlen.ausgegeben}. Grenze für „vollständig“: ${prozentText(benutzteGrenze)} (vorher festgelegt).`, `One-time codes issued: ${kat.zahlen.ausgegeben}. Threshold for "complete": ${prozentText(benutzteGrenze)} (set beforehand).`)}</p>
        <ul class="zahlen">
          <li>{L('Vollständig (I)', 'Complete (I)')}: <b data-testid="fb-sam-i">{kat.zahlen.vollstaendig}</b></li>
          <li>{L('Teilweise (P)', 'Partial (P)')}: <b data-testid="fb-sam-p">{kat.zahlen.teilweise}</b></li>
          <li>{L('Nicht zurückgekommen (NC)', 'Not returned (NC)')}: <b data-testid="fb-sam-nc">{kat.zahlen.nichtZurueck}</b></li>
        </ul>
        <p data-testid="fb-sam-rr1">RR1 = I / (I + P + NC) = {kat.zahlen.vollstaendig} / {kat.zahlen.ausgegeben} = <b>{quoteText(rr1(kat) ?? 0)}</b></p>
        <p data-testid="fb-sam-rr2">RR2 = (I + P) / (I + P + NC) = {kat.zahlen.vollstaendig + kat.zahlen.teilweise} / {kat.zahlen.ausgegeben} = <b>{quoteText(rr2(kat) ?? 0)}</b></p>
        <p class="hilfe">{L('Alle ausgegebenen Codes gelten als geeignet (nicht geschätzt). Formeln nach AAPOR Standard Definitions, 10. Ausgabe 2023, S. 85-88. Dieselbe Person mit mehreren Antworten zählt einmal.', 'All issued codes count as eligible (not estimated). Formulas after AAPOR Standard Definitions, 10th edition 2023, pp. 85-88. The same person with several answers counts once.')}</p>
      {/if}
      {#if !mitCodes && plan.codeVerlangt}<p class="hilfe">{L('Der Fragebogen verlangt Codes, aber die Liste ist leer. Erzeugen Sie Codes unter „Einmal-Codes“, wenn Sie eine Rücklaufquote brauchen.', 'The questionnaire requires codes, but the list is empty. Create codes under "One-time codes" if you need a response rate.')}</p>{/if}

      <div class="akt" role="group" aria-label={L('Weiter mit dem Ergebnis', 'Continue with the result')}>
        <button class="k haupt" type="button" aria-disabled={gewaehlt.length && !arbeitet ? undefined : 'true'} onclick={() => { if (!arbeitet) void alsDatensatz(); }}><Icon n="plus" />{L('Als Datensatz öffnen', 'Open as data set')}</button>
        <button class="k" type="button" onclick={() => void protokollAlsText()}><Icon n="download" />{L('Protokoll als Text', 'Protocol as text')}</button>
        <button class="k" type="button" onclick={() => void protokollAlsWord()} disabled={!!arbeitet}><Icon n="download" />{L('Protokoll als Word-Datei', 'Protocol as Word file')}</button>
      </div>
    </div>
  {/if}
</section>

<style>
  .sam { display: flex; flex-direction: column; gap: var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3) var(--a4); }
  .kopf { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: center; }
  .sam h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .sam h3 { font: 650 var(--gr-h3, 1.1rem)/1.25 var(--schrift-ui); margin: var(--a3) 0 0; }
  .sam h2:focus-visible, .sam h3:focus-visible { outline: 3px solid var(--fokus); outline-offset: 2px; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .formular { display: flex; flex-direction: column; gap: var(--a3); max-width: 44rem; }
  .formular p, .ergebnis p { margin: 0; }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .eingabe label { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .feld { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a3); min-width: 0; margin: 0; }
  .feld legend { font-size: var(--gr-klein); font-weight: 650; color: var(--tinte-2); padding: 0 var(--a1); }
  .feld.ziehen { border: 2px dashed var(--akzent); }
  .ablage { display: flex; flex-direction: column; gap: var(--a2); }
  .zeile, .akt { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; }
  .stand { font-weight: 600; }
  .fehl { color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .fehl::before { content: '! '; }
  .sam input[type='text'], .sam input[type='password'], .sam textarea { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a2) var(--a3); width: 100%; box-sizing: border-box; }
  .sam input[type='file'] { font: inherit; min-height: var(--ziel); max-width: 100%; }
  .sam input[aria-invalid='true'] { border-width: 2px; }
  .sam input:focus-visible, .sam textarea:focus-visible { border-color: var(--fokus); outline: 3px solid var(--fokus); outline-offset: 1px; }
  .ergebnis { display: flex; flex-direction: column; gap: var(--a2); }
  .zahlen { margin: 0; padding-inline-start: var(--a5); }
  .schalter { display: flex; gap: var(--a2); align-items: center; min-height: var(--ziel); }
  .schalter input { width: 1.4rem; height: 1.4rem; }
  .rolle { position: relative; overflow: auto; max-width: 100%; max-height: 28rem; width: 100%; }
  .rolle:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  table.ct { border-collapse: collapse; }
  table.ct th, table.ct td { padding: var(--a1) var(--a3); text-align: start; border-bottom: 1px solid var(--linie); vertical-align: top; }
  table.ct thead th { position: sticky; top: 0; background: var(--blatt); }
  :global(:where(:root.eng-600)) .akt { flex-direction: column; align-items: stretch; }
</style>
