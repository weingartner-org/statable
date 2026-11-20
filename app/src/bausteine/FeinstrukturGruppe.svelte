<script lang="ts">
  /**
   * Feinstruktur F3c: Gruppenarbeit ohne Server (Fachblatt 8, Architekturblatt 2.5).
   * Weitergeben: Analyse als Datei ohne Dokument, Grenzen gesperrt, wahlweise mit Passwort (age, wie die Projektdatei).
   * Einlesen: Datei prüfen, bei Passwort ein Feld darunter (kein modales Fenster).
   * Zusammenführen: zwei Analysen desselben Ausschnitts mit gleichen Grenzen -> neue Analyse mit Herkunft; sonst Satz und beide Einteilungen.
   * Keine Übereinstimmungszahl, kein Vergleich, kein Vorschlag.
   */
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { dateiname } from '../lib/dateiname';
  import { aendereSpaltensaetze, eigeneSpaltensaetze, iv, legeSequenzanalyseAn, sequenzanalysen } from '../lib/interviews.svelte';
  import { pruefePasswort, PasswortFalsch, MIN_PASSWORT } from '../lib/projektpasswort';
  import {
    AUSTAUSCH_ENDUNG, AustauschFehler, austauschBytes, austauschFehlerSatz, austauschVerschluesselt, einteilung, entschluessele, leseAustauschMitSatz, nimmSpaltensatzAuf,
    vergleicheGrenzen, vergleichSatz, zusammenfuehren,
  } from '../lib/feinstruktur-gruppe';
  import type { Sequenzanalyse } from '../lib/qualprojekt';

  const sp = (): 'de' | 'en' => (L('de', 'en') === 'de' ? 'de' : 'en');
  const liste = $derived(sequenzanalysen());

  /* Weitergeben */
  let wgId = $state('');
  let wgGruppe = $state('');
  let wgMitPw = $state(false);
  let wgPw1 = $state('');
  let wgPw2 = $state('');
  async function weitergeben() {
    const sa = liste.find(x => x.id === wgId);
    if (!sa) { sage(L('Bitte zuerst eine Analyse wählen.', 'Please choose an analysis first.'), 'dringend'); document.getElementById('fe-wg-wahl')?.focus(); return; }
    if (wgMitPw) {
      const p = pruefePasswort(wgPw1, wgPw2);
      if (p !== 'ok') { sage(p === 'kurz' ? L(`Das Passwort braucht mindestens ${MIN_PASSWORT} Zeichen.`, `The password needs at least ${MIN_PASSWORT} characters.`) : L('Die beiden Passwörter sind verschieden.', 'The two passwords differ.'), 'dringend'); document.getElementById('fe-wg-pw1')?.focus(); return; }
    }
    const bytes = await austauschBytes($state.snapshot(sa) as Sequenzanalyse, Date.now(), { gruppe: wgGruppe, eigene: $state.snapshot(eigeneSpaltensaetze()), ...(wgMitPw ? { passwort: wgPw1 } : {}) });
    const { herunterladen } = await import('../lib/export');
    herunterladen(bytes, `${dateiname(sa.name)}${wgGruppe.trim() ? ` - ${dateiname(wgGruppe.trim())}` : ''}${AUSTAUSCH_ENDUNG}`, 'application/octet-stream');
    wgPw1 = ''; wgPw2 = '';
    sage(L('Datei zum Weitergeben gespeichert. Sie enthält den Ausschnitt und die Grenzen, aber nicht das Transkript. Die Grenzen sind darin gesperrt.', 'File for passing on saved. It contains the excerpt and the boundaries, but not the transcript. The boundaries are locked in it.'));
  }

  /* Einlesen */
  let einBytes = $state<Uint8Array | null>(null);
  let einName = $state('');
  let einPw = $state('');
  let einFehler = $state('');
  let dateiEl: HTMLInputElement | undefined = $state();
  function uebernehmen(bytes: Uint8Array) {
    const { analyse: sa, spaltensatz } = leseAustauschMitSatz(bytes, Date.now());
    // ein beigelegter eigener Spaltensatz (A4) kommt ins Projekt; vorhandene Spalten bleiben, fehlende kommen dazu
    if (spaltensatz) aendereSpaltensaetze(l => nimmSpaltensatzAuf(l, spaltensatz));
    legeSequenzanalyseAn(sa);
    einBytes = null; einPw = ''; einFehler = '';
    if (dateiEl) dateiEl.value = '';
    sage(L(`„${sa.name}“ eingelesen. Die Grenzen sind gesperrt.`, `“${sa.name}” read in. The boundaries are locked.`));
  }
  async function dateiGewaehlt(ev: Event & { currentTarget: HTMLInputElement }) {
    const f = ev.currentTarget.files?.[0]; if (!f) return;
    einFehler = ''; einName = f.name;
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (austauschVerschluesselt(bytes)) { einBytes = bytes; sage(L('Diese Datei ist mit Passwort geschützt. Geben Sie das Passwort unten ein.', 'This file is password protected. Enter the password below.')); queueMicrotask(() => document.getElementById('fe-ein-pw')?.focus()); return; }
    try { uebernehmen(bytes); } catch (e) { fehler(e); }
  }
  async function entschluesseln() {
    if (!einBytes) return;
    try { uebernehmen(await entschluessele(einBytes, einPw)); }
    catch (e) { if (e instanceof PasswortFalsch) { einFehler = L('Das Passwort stimmt nicht.', 'The password is wrong.'); sage(einFehler, 'dringend'); } else fehler(e); }
  }
  function fehler(e: unknown) {
    einFehler = e instanceof AustauschFehler ? austauschFehlerSatz(e, sp()) : L('Die Datei konnte nicht gelesen werden.', 'The file could not be read.');
    sage(einFehler, 'dringend');
  }

  /* Zusammenführen */
  let zA = $state('');
  let zB = $state('');
  let zAbweichung = $state<{ satz: string; a: Sequenzanalyse; b: Sequenzanalyse } | null>(null);
  function zusammen() {
    const a = liste.find(x => x.id === zA), b = liste.find(x => x.id === zB);
    zAbweichung = null;
    if (!a || !b || a.id === b.id) { sage(L('Bitte zwei verschiedene Analysen wählen.', 'Please choose two different analyses.'), 'dringend'); return; }
    const v = vergleicheGrenzen(a, b);
    if (!v.gleich) { zAbweichung = { satz: vergleichSatz(v, a, b, sp())!, a, b }; sage(zAbweichung.satz, 'dringend'); return; }
    const neu = zusammenfuehren($state.snapshot(a) as Sequenzanalyse, $state.snapshot(b) as Sequenzanalyse, Date.now());
    legeSequenzanalyseAn(neu);
    sage(L(`Zusammengeführt als „${neu.name}“. Die beiden Analysen bleiben unverändert.`, `Merged as “${neu.name}”. The two analyses remain unchanged.`));
    iv.feinstruktur = neu.id;
  }
</script>

<div class="gr">
  <h3>{L('Gruppenarbeit', 'Group work')}</h3>
  <p class="hilfe">{L('Eine Person legt Ausschnitt und Sinneinheiten fest und gibt die Analyse als Datei weiter. Die Gruppen deuten getrennt. Danach führt Statable beide zusammen: Je Sinneinheit und Spalte stehen die Einträge beider Gruppen untereinander, mit Gruppennamen. Gleiche Einträge legen Sie von Hand zusammen. Statable rechnet keine Übereinstimmung aus.', 'One person sets the excerpt and units and passes the analysis on as a file. The groups interpret separately. Statable then merges both: for each unit and column, the entries of both groups appear one below the other, with group names. You combine identical entries by hand. Statable calculates no agreement.')}</p>

  {#if liste.length}
    <h4>{L('Weitergeben', 'Pass on')}</h4>
    <div class="feld">
      <label for="fe-wg-wahl">{L('Analyse', 'Analysis')}</label>
      <select id="fe-wg-wahl" bind:value={wgId}>
        <option value="">{L('Bitte wählen', 'Please choose')}</option>
        {#each liste as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
      </select>
      <label for="fe-wg-gruppe">{L('Name der Gruppe, die die Datei bekommt (freiwillig)', 'Name of the group receiving the file (optional)')}</label>
      <input type="text" id="fe-wg-gruppe" bind:value={wgGruppe} />
      <label class="haken"><input type="checkbox" bind:checked={wgMitPw} /> {L('Mit Passwort schützen', 'Protect with password')}</label>
      {#if !wgMitPw}<p class="hilfe">{L('Ohne Passwort kann jede Person, die die Datei bekommt, den Ausschnitt und die Deutungen lesen.', 'Without a password, anyone who gets the file can read the excerpt and the interpretations.')}</p>{/if}
      {#if wgMitPw}
        <label for="fe-wg-pw1">{L(`Passwort (mindestens ${MIN_PASSWORT} Zeichen)`, `Password (at least ${MIN_PASSWORT} characters)`)}</label>
        <input type="password" id="fe-wg-pw1" autocomplete="new-password" bind:value={wgPw1} />
        <label for="fe-wg-pw2">{L('Passwort wiederholen', 'Repeat password')}</label>
        <input type="password" id="fe-wg-pw2" autocomplete="new-password" bind:value={wgPw2} />
        <p class="hilfe">{L('Sagen Sie das Passwort der Gruppe auf einem anderen Weg, nicht in derselben Nachricht. Statable speichert es nicht.', 'Tell the group the password another way, not in the same message. Statable does not store it.')}</p>
      {/if}
      <button type="button" class="k" onclick={() => void weitergeben()}>{L('Datei zum Weitergeben speichern', 'Save file for passing on')}</button>
    </div>
  {/if}

  <h4>{L('Weitergegebene Analyse einlesen', 'Read in an analysis passed on')}</h4>
  <div class="feld">
    <label for="fe-ein-datei">{L(`Datei (${AUSTAUSCH_ENDUNG})`, `File (${AUSTAUSCH_ENDUNG})`)}</label>
    <input type="file" id="fe-ein-datei" accept="{AUSTAUSCH_ENDUNG},.json" bind:this={dateiEl} onchange={(ev) => void dateiGewaehlt(ev)} />
    {#if einBytes}
      <label for="fe-ein-pw">{L(`Passwort für „${einName}“`, `Password for “${einName}”`)}</label>
      <input type="password" id="fe-ein-pw" autocomplete="off" bind:value={einPw} onkeydown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); void entschluesseln(); } }} />
      <button type="button" class="k" onclick={() => void entschluesseln()}>{L('Entschlüsseln und einlesen', 'Decrypt and read in')}</button>
    {/if}
    {#if einFehler}<p class="warn">{einFehler}</p>{/if}
  </div>

  {#if liste.length >= 2}
    <h4>{L('Zusammenführen', 'Merge')}</h4>
    <div class="feld">
      <label for="fe-z-a">{L('Erste Analyse', 'First analysis')}</label>
      <select id="fe-z-a" bind:value={zA}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each liste as a (a.id)}<option value={a.id}>{a.name}</option>{/each}</select>
      <label for="fe-z-b">{L('Zweite Analyse', 'Second analysis')}</label>
      <select id="fe-z-b" bind:value={zB}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each liste as a (a.id)}<option value={a.id}>{a.name}</option>{/each}</select>
      <button type="button" class="k" onclick={zusammen}>{L('Zusammenführen', 'Merge')}</button>
    </div>
    {#if zAbweichung}
      <div class="abw">
        <p class="warn">{zAbweichung.satz}</p>
        <div class="zwei" data-nolink>
          {#each [zAbweichung.a, zAbweichung.b] as x (x.id)}
            <div>
              <h5>{x.name}</h5>
              <ol>{#each einteilung(x) as t, k (k)}<li>{t || L('(noch verdeckt)', '(still hidden)')}</li>{/each}</ol>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .gr { display: flex; flex-direction: column; gap: .4rem; border-top: 1px solid var(--linie-stark); padding-top: .5rem; margin-top: .5rem; }
  h3, h4, h5 { margin: .5rem 0 0; }
  .hilfe { color: var(--tinte-2); margin: 0; }
  .feld { display: grid; gap: .35rem; justify-items: start; }
  .feld label { font-weight: 600; }
  .feld .haken { font-weight: normal; display: flex; gap: .4rem; align-items: baseline; }
  .feld input[type='text'], .feld input[type='password'], .feld select { box-sizing: border-box; max-width: 100%; font: inherit; padding: .35rem .5rem; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  .feld input[type='file'] { max-width: 100%; }
  .warn { background: var(--blatt-2); padding: .5rem; border-radius: var(--r-klein); margin: 0; }
  .zwei { display: flex; flex-wrap: wrap; gap: 1rem; }
  .zwei > div { flex: 1 1 14rem; min-width: 0; }
</style>
