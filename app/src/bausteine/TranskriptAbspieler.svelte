<script lang="ts">
  /**
   * Abspieler für die Aufnahme zu einem Transkript (Paket 4C-2). Die Aufnahme bleibt im Browser (Objekt-URL), nichts wird hochgeladen.
   * Eigene Knöpfe statt der Steuerung des Browsers; das Bild/Ton-Element selbst hat keine Steuerung und ist für Screenreader versteckt.
   * Ansagen nur über `sage()`, entprellt (höchstens eine je 700 ms); beim Abspielen wird nichts angesagt.
   * Die Tasten F4/F8/F9 sitzen in `TranskriptAnsicht.svelte` und rufen die ausgeführten Funktionen dieses Bausteins.
   */
  import { onDestroy } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { dez } from '../i18n/profil';
  import { sprechZeit } from '../lib/zeitmarken';
  import {
    GedrosselteAnsage, TEMPOS, anzeigeZeit, mediumSatz, positionsText, pruefeSprung, ruecksprungSekunden, sprungFehlerSatz, springe, startNachAnhalten, tempoSchritt, vergleicheMedium, type MediumAngabe,
  } from '../lib/transkript-ansicht';
  import Rechnet from './Rechnet.svelte';

  type Medium = { datei: string; typ: string; groesse: number; sha256: string };
  let { medium, beiMedium, spielt = $bindable(false), posMs = $bindable(0) }: { medium?: Medium; beiMedium: (m: Medium) => void; spielt?: boolean; posMs?: number } = $props();

  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const SCHLUESSEL = 'statable-aufnahme-ruecksprung';
  const lesen = (): number => { try { return ruecksprungSekunden(localStorage.getItem(SCHLUESSEL)); } catch { return 2; } };
  /** Über diese Größe wird keine Prüfsumme gebildet (der Browser müsste die ganze Datei in den Speicher laden). */
  const HASH_GRENZE = 1024 * 1024 * 1024;

  const lade = new Laedt();
  let el = $state<HTMLVideoElement>();
  let datei = $state<HTMLInputElement>();
  let url = $state('');
  let istVideo = $state(false);
  let dauerMs = $state(NaN);
  let tempo = $state(1);
  let ruecksprung = $state(lesen());
  let fehler = $state('');
  let satz = $state('');
  let zeitText = $state('');
  let zeitFehler = $state('');
  let amAnhalten = false;   // nach Anhalten startet „Abspielen“ früher; nach einem Sprung nicht
  const drossel = new GedrosselteAnsage(t => { sage(t); }, 700);
  const sagLeise = (t: string) => drossel.sag(t);

  /** Gibt es eine Aufnahme, die sich abspielen lässt? Ohne sie bleiben die Tasten frei. */
  export function bereit(): boolean { return !!url && !fehler && !!el; }
  export function laeuft(): boolean { return spielt; }
  /** Aktuelle Stelle in Millisekunden (für die Zeitmarke). */
  export function zeit(): number { return el ? Math.round(el.currentTime * 1000) : 0; }

  function setzePos(ms: number) {
    if (!el) return;
    el.currentTime = ms / 1000;
    posMs = ms;
  }
  export function umschalten() {
    if (!el || !bereit()) return;
    if (spielt) {
      el.pause();
      amAnhalten = true;
      sagLeise(L(`Angehalten bei ${sprechZeit(zeit(), 'de')}`, `Paused at ${sprechZeit(zeit(), 'en')}`));
    } else {
      if (amAnhalten) setzePos(startNachAnhalten(zeit(), ruecksprung));
      amAnhalten = false;
      void el.play().catch(() => meldeFehler());
    }
  }
  export function zurueck() { sprung(-5); }
  export function vor() { sprung(5); }
  function sprung(delta: number) {
    if (!el || !bereit()) return;
    const neu = springe(zeit(), delta, dauerMs);
    setzePos(neu);
    amAnhalten = false;
    sagLeise(sprechZeit(neu, sprache()));
  }
  function setzeTempo(t: number, ansagen = true) {
    tempo = t;
    if (el) el.playbackRate = t;
    if (ansagen) sagLeise(L(`Tempo ${dez(String(t))}`, `Speed ${t}`));
  }
  export function langsamer() { setzeTempo(tempoSchritt(tempo, -1)); }
  export function schneller() { setzeTempo(tempoSchritt(tempo, 1)); }
  /** „Ab hier abspielen“: springt auf die Zeit (minus Rücksprung) und spielt. */
  export function abspielenAb(ms: number) {
    if (!el || !bereit()) return;
    setzePos(startNachAnhalten(ms, ruecksprung));
    amAnhalten = false;
    void el.play().catch(() => meldeFehler());
  }

  function meldeFehler() {
    fehler = L('Dieses Format kann der Browser nicht abspielen. Bitte als MP3 oder M4A speichern.', 'The browser cannot play this format. Please save it as MP3 or M4A.');
    spielt = false;
    sage(fehler, 'dringend');
  }

  function gibFrei() { if (url) { URL.revokeObjectURL(url); url = ''; } }
  onDestroy(() => { drossel.abbrechen(); el?.pause(); gibFrei(); });

  async function pruefsumme(f: File): Promise<string> {
    if (f.size > HASH_GRENZE) return 'ausgelassen';
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', await f.arrayBuffer()));
    return Array.from(h, b => b.toString(16).padStart(2, '0')).join('');
  }
  /** Lädt eine Aufnahme wie „Aufnahme wählen“ (auch für das Beispielinterview). */
  export async function ladeDatei(f: File | undefined) { await waehle(f); }
  async function waehle(f: File | undefined) {
    if (!f) return;
    el?.pause();
    spielt = false; fehler = ''; satz = ''; posMs = 0; dauerMs = NaN; amAnhalten = false;
    gibFrei();
    istVideo = f.type.startsWith('video/');
    url = URL.createObjectURL(f);
    const sha = await lade.mit(() => pruefsumme(f));
    if (sha === undefined) return;
    const angabe: MediumAngabe = { groesse: f.size, sha256: sha };
    const v = vergleicheMedium(medium, angabe);
    satz = mediumSatz(v, sprache());
    if (v === 'neu') beiMedium({ datei: f.name, typ: f.type || 'application/octet-stream', groesse: f.size, sha256: sha });
    sageSpaeter(satz + ' ' + L('Die Steuerung folgt unten.', 'The controls follow below.'), 2600);   // nach der Ansage des Beispiel-Ladens und dem Fokuswechsel
  }

  function springeZuZeit(e: Event) {
    e.preventDefault();
    if (!bereit()) return;
    const r = pruefeSprung(zeitText, dauerMs);
    if ('fehler' in r) {
      zeitFehler = sprungFehlerSatz(r.fehler, dauerMs, sprache());
      sage(zeitFehler, 'dringend');
      document.getElementById('iv-ab-zeit')?.focus();
      return;
    }
    zeitFehler = '';
    setzePos(r.ms);
    amAnhalten = false;
    sage(sprechZeit(r.ms, sprache()));
  }

  const aufRuecksprung = (e: Event & { currentTarget: HTMLSelectElement }) => {
    ruecksprung = ruecksprungSekunden(e.currentTarget.value);
    try { localStorage.setItem(SCHLUESSEL, String(ruecksprung)); } catch { /* ohne Speicher gilt der Wert für diese Sitzung */ }
  };
  const dauerSekunden = $derived(Number.isFinite(dauerMs) ? Math.max(1, Math.ceil(dauerMs / 1000)) : 1);
</script>

<div class="abspieler" role="group" aria-label={L('Abspieler für die Aufnahme', 'Player for the recording')}>
  <p class="hilfe">{L('Die Aufnahme bleibt auf Ihrem Gerät. Sie wird nicht hochgeladen und nicht in der Projektdatei gespeichert.', 'The recording stays on your device. It is not uploaded and not saved in the project file.')}</p>
  {#if medium}<p class="hilfe">{L(`Zu diesem Transkript gehört die Aufnahme „${medium.datei}“.`, `This transcript belongs to the recording "${medium.datei}".`)}</p>{/if}

  <div class="knopfzeile">
    <button class="k" type="button" onclick={() => datei?.click()}>{L('Aufnahme wählen', 'Choose recording')}</button>
    <input bind:this={datei} type="file" hidden accept="audio/*,video/*,.mp3,.m4a,.wav,.ogg,.oga,.webm,.mp4,.aac" tabindex="-1" aria-hidden="true" onchange={(e) => { void waehle(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }}>
  </div>

  {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Aufnahme wird geprüft …', 'Checking the recording …')} /></p>{/if}
  {#if satz}<p class="hilfe" id="iv-ab-satz">{satz}</p>{/if}
  {#if fehler}<p class="fehl">{fehler}</p>{/if}

  {#if url}
    <!-- Bild und Ton: ohne eigene Steuerung; die Knöpfe unten sind die Steuerung -->
    <video bind:this={el} src={url} hidden={!istVideo} class="bild" preload="metadata" playsinline aria-hidden="true" tabindex="-1"
      onloadedmetadata={() => { if (el && Number.isFinite(el.duration)) dauerMs = Math.round(el.duration * 1000); el!.playbackRate = tempo; }}
      ontimeupdate={() => { if (el) posMs = Math.round(el.currentTime * 1000); }}
      onplay={() => (spielt = true)} onpause={() => (spielt = false)} onended={() => { spielt = false; amAnhalten = false; }}
      onerror={meldeFehler}></video>

    <div class="knopfzeile" role="group" aria-label={L('Steuerung', 'Controls')}>
      <button class="k haupt" type="button" aria-keyshortcuts="F4" disabled={!!fehler} onclick={umschalten}>{spielt ? L('Anhalten', 'Pause') : L('Abspielen', 'Play')}</button>
      <button class="k" type="button" aria-keyshortcuts="F8" disabled={!!fehler} onclick={zurueck}>{L('5 Sekunden zurück', '5 seconds back')}</button>
      <button class="k" type="button" aria-keyshortcuts="F9" disabled={!!fehler} onclick={vor}>{L('5 Sekunden vor', '5 seconds forward')}</button>
    </div>

    <p class="position" id="iv-ab-pos">{positionsText(posMs, Number.isFinite(dauerMs) ? dauerMs : 0, sprache())}</p>
    <div class="eingabe">
      <label for="iv-ab-regler">{L('Position in der Aufnahme', 'Position in the recording')}</label>
      <input id="iv-ab-regler" type="range" min="0" max={dauerSekunden} step="1" value={Math.min(dauerSekunden, Math.round(posMs / 1000))} disabled={!Number.isFinite(dauerMs) || !!fehler}
        aria-valuetext={positionsText(posMs, Number.isFinite(dauerMs) ? dauerMs : 0, sprache())}
        oninput={(e) => { setzePos(Number(e.currentTarget.value) * 1000); amAnhalten = false; }}
        onchange={(e) => sagLeise(sprechZeit(Number(e.currentTarget.value) * 1000, sprache()))}>
    </div>

    <form class="zeitform" onsubmit={springeZuZeit} aria-label={L('Zu Zeit springen', 'Jump to time')}>
      <div class="eingabe">
        <label for="iv-ab-zeit">{L('Zu Zeit springen (1:23 oder 00:01:23)', 'Jump to time (1:23 or 00:01:23)')}</label>
        <input id="iv-ab-zeit" type="text" inputmode="numeric" autocomplete="off" bind:value={zeitText} aria-invalid={zeitFehler ? 'true' : undefined} aria-describedby={zeitFehler ? 'iv-ab-zeit-f' : undefined}>
        {#if zeitFehler}<p id="iv-ab-zeit-f" class="fehl">{zeitFehler}</p>{/if}
      </div>
      <button class="k" type="submit" disabled={!!fehler}>{L('Springen', 'Jump')}</button>
    </form>

    <div class="optionen">
      <div class="eingabe">
        <label for="iv-ab-tempo">{L('Tempo', 'Speed')}</label>
        <select id="iv-ab-tempo" value={tempo} onchange={(e) => setzeTempo(Number(e.currentTarget.value))}>
          {#each TEMPOS as t (t)}<option value={t}>{dez(String(t))}</option>{/each}
        </select>
      </div>
      <div class="eingabe">
        <label for="iv-ab-rueck">{L('Beim Weiterspielen früher beginnen (Sekunden)', 'Start earlier on resuming (seconds)')}</label>
        <select id="iv-ab-rueck" value={ruecksprung} onchange={aufRuecksprung}>
          {#each [0, 1, 2, 3, 4, 5] as n (n)}<option value={n}>{n}</option>{/each}
        </select>
      </div>
    </div>
    <p class="hilfe">{L(`Gesamtdauer ${anzeigeZeit(Number.isFinite(dauerMs) ? dauerMs : 0)}. Tasten: F4 Abspielen und Anhalten, F8 und F9 springen 5 Sekunden, Umschalt+F8 und Umschalt+F9 ändern das Tempo, Umschalt+F4 setzt beim Bearbeiten die Zeitmarke.`, `Total length ${anzeigeZeit(Number.isFinite(dauerMs) ? dauerMs : 0)}. Keys: F4 play and pause, F8 and F9 jump 5 seconds, Shift+F8 and Shift+F9 change the speed, Shift+F4 sets the time mark while editing.`)}</p>
  {/if}
</div>

<style>
  .abspieler { display: flex; flex-direction: column; gap: var(--a3); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .fehl::before { content: '! '; }
  .position { margin: 0; font-weight: 650; }
  .bild { max-width: min(100%, 28rem); max-height: 16rem; border-radius: var(--r-klein); background: #000; }
  .zeitform { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: flex-end; }
  .optionen { display: flex; flex-wrap: wrap; gap: var(--a4); }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .eingabe label { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .abspieler input[type='text'], .abspieler select { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a1) var(--a3); box-sizing: border-box; }
  .abspieler input[type='range'] { width: 100%; min-height: var(--ziel); }
  @media (forced-colors: active) { .abspieler input[type='range'] { border: 1px solid ButtonText; border-radius: var(--r-klein); forced-color-adjust: auto; } .abspieler input[type='range']:disabled { border-color: GrayText; } }
  .abspieler input[aria-invalid='true'] { border-width: 2px; }
  .abspieler input:focus-visible, .abspieler select:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
</style>
