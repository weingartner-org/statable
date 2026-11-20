<script lang="ts">
  /**
   * Transkripte (Paket 4C-1): einlesen (Dateien wählen oder hineinziehen, Text einfügen), Sprecher zuordnen, Liste der Transkripte
   * mit Öffnen, Umbenennen, Entfernen. Das Lesen und Zuordnen steckt in `lib/transkript-lesen.ts`, das Ablegen in `lib/interviews.svelte.ts`.
   * Ansagen nur über `sage()`; Dialoge mit `dialogFokus`; Text aus Dateien wird nur als Text angezeigt.
   * Das geöffnete Transkript zeigt `TranskriptAnsicht.svelte` (Paket 4C-2).
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { benenneTranskriptUm, entferneTranskript, iv, nimmTranskriptAuf, qualProjekt } from '../lib/interviews.svelte';
  import { programmName, transkriptZeile } from '../lib/interviews-qual';
  import { beispielDateien, beispielZuordnung, BEISPIEL_NAME } from '../lib/transkript-ansicht';
  import { leseTranskript, sha256Hex, transkriptDokument, vorschlagZuordnung, type SprecherZuordnung, type TranskriptRoh } from '../lib/transkript-lesen';
  import type { SprecherRolle } from '../lib/qualprojekt';
  import { formatZeit } from '../lib/zeitmarken';
  import Rechnet from './Rechnet.svelte';
  import TranskriptAnsicht from './TranskriptAnsicht.svelte';
  import Icon from './Icon.svelte';
  import { dialogFokus, fokusNachDialog, DIALOG_SPAET_MS } from './dialogFokus';

  const ENDUNGEN = ['txt', 'vtt', 'srt', 'html', 'htm', 'json', 'docx', 'rtf', 'cha', 'eaf'];
  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');

  const lade = new Laedt();
  let eingabe = $state<HTMLInputElement>();
  let ziehen = $state(false);
  let text = $state('');
  let fehler = $state('');
  /** Dateien, die noch auf die Zuordnung warten */
  let warte = $state<{ name: string; bytes: Uint8Array; eingefuegt: boolean }[]>([]);

  interface Offen {
    name: string; bytes: Uint8Array; eingefuegt: boolean;
    roh: TranskriptRoh; zu: SprecherZuordnung; anzeigeName: string; zusammenfassen: boolean;
    /** VTT/SRT ohne Sprecher: der Schalter „Untertitel zu Absätzen zusammenfassen“ ist sinnvoll */
    untertitel: boolean;
  }
  let dlg = $state<HTMLDialogElement>();
  let offen = $state<Offen | null>(null);
  let umDlg = $state<HTMLDialogElement>();
  let umId = $state<string | null>(null);
  let umName = $state('');

  const dokumente = $derived(qualProjekt()?.dokumente.filter(d => d.transkript) ?? []);
  const zeilen = $derived(dokumente.map(d => transkriptZeile(d, sprache())));
  const geoeffnet = $derived(iv.offen ? dokumente.find(d => d.id === iv.offen) : undefined);
  const grundname = (n: string): string => n.replace(/\.[^.]+$/, '');
  const anzahl = (roh: TranskriptRoh, k: string): number => roh.beitraege.filter(b => b.sprecher === k).length;

  /* ---------- Dateien annehmen */
  async function nimmDateien(dateien: File[]) {
    fehler = '';
    const gut: typeof warte = [], schlecht: string[] = [];
    for (const f of dateien) {
      const ende = f.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ENDUNGEN.includes(ende)) { schlecht.push(f.name); continue; }
      gut.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()), eingefuegt: false });
    }
    if (schlecht.length) {
      fehler = L(`Diese Dateien kann Statable nicht als Transkript lesen: ${schlecht.join(', ')}. Erlaubt sind txt, vtt, srt, html, htm, json, docx, cha (CHAT) und eaf (ELAN).`, `Statable cannot read these files as transcripts: ${schlecht.join(', ')}. Allowed are txt, vtt, srt, html, htm, json, docx, cha (CHAT) and eaf (ELAN).`);
      sage(fehler, 'dringend');
    }
    if (gut.length) { warte = [...warte, ...gut]; if (!offen) await naechste(); }
  }
  function abgelegt(e: DragEvent) { e.preventDefault(); ziehen = false; void nimmDateien([...(e.dataTransfer?.files ?? [])]); }
  function textEinlesen() {
    fehler = '';
    if (!text.trim()) { fehler = L('Bitte zuerst Text in das Feld einfügen.', 'Please paste some text into the field first.'); sage(fehler, 'dringend'); document.getElementById('iv-text')?.focus(); return; }
    const nr = dokumente.filter(d => d.name.startsWith(L('Eingefügter Text', 'Pasted text'))).length + 1;
    const name = L('Eingefügter Text', 'Pasted text') + (nr > 1 ? ` ${nr}` : '') + '.txt';
    warte = [...warte, { name, bytes: new TextEncoder().encode(text), eingefuegt: true }];
    text = '';
    if (!offen) void naechste();
  }

  /* ---------- Beispielinterview (erfunden) */
  async function beispielLaden() {
    fehler = '';
    await lade.mit(async () => {
      try {
        const sp = sprache(), d = beispielDateien(sp), basis = document.baseURI;
        const [v, a] = await Promise.all([fetch(new URL(d.vtt, basis)), fetch(new URL(d.audio, basis))]);
        if (!v.ok || !a.ok) throw new Error('nicht gefunden');
        const bytes = new Uint8Array(await v.arrayBuffer());
        const dn = d.vtt.split('/').pop()!;
        const roh = await leseTranskript(dn, bytes, { zusammenfassen: true });
        const erg = transkriptDokument(roh, beispielZuordnung(roh), BEISPIEL_NAME[sp], undefined, { name: dn, sha256: await sha256Hex(bytes) });
        nimmTranskriptAuf(erg, roh.quelle, dn);
        iv.aufnahmeWartet = new File([await a.blob()], d.audio.split('/').pop()!, { type: 'audio/mp4' });
        iv.offen = erg.dokument.id;
        await tick();
        /* Fokus auf die Zeile des neuen Transkripts in der Liste: von dort sind Öffnen und Feinstrukturanalyse mit 1-2 Tab erreichbar */
        const zeile = document.getElementById('iv-zeile-' + erg.dokument.id);
        (zeile ?? document.getElementById('iv-offen-t'))?.focus();
        sageSpaeter(L(`Beispielinterview „${BEISPIEL_NAME[sp]}“ geladen und geöffnet. Der Fokus steht auf seiner Zeile in der Liste. Die Aufnahme wird geladen.`, `Example interview "${BEISPIEL_NAME[sp]}" loaded and opened. Focus is on its row in the list. The recording is loading.`));
      } catch {
        fehler = L('Das Beispielinterview ließ sich nicht laden. Bitte prüfen Sie die Verbindung und versuchen Sie es noch einmal.', 'The example interview could not be loaded. Please check the connection and try again.');
        sage(fehler, 'dringend');
      }
    });
  }

  /* ---------- Zuordnung */
  async function lies(w: { name: string; bytes: Uint8Array; eingefuegt: boolean }, zusammenfassen: boolean): Promise<Offen | undefined> {
    return lade.mit(async () => {
      const roh = await leseTranskript(w.name, w.bytes, { zusammenfassen });
      const hatSprecher = roh.beitraege.some(b => b.sprecher !== undefined);
      return { ...w, roh, zu: vorschlagZuordnung(roh), anzeigeName: grundname(w.name), zusammenfassen, untertitel: (roh.quelle === 'vtt' || roh.quelle === 'srt') && !hatSprecher };
    });
  }
  async function naechste() {
    const w = warte[0];
    if (!w) return;
    warte = warte.slice(1);
    const o = await lies(w, true);
    if (!o) return;
    offen = o;
    await tick();
    dlg?.showModal();
    await tick();
    document.getElementById('iv-zu-t')?.focus();
  }
  async function neuLesen() {
    const o = offen;
    if (!o) return;
    const n = await lies(o, o.zusammenfassen);
    if (n) { n.anzeigeName = o.anzeigeName; offen = n; sage(Lp(n.roh.beitraege.length, '1 Beitrag gelesen.', `${n.roh.beitraege.length} Beiträge gelesen.`, '1 contribution read.', `${n.roh.beitraege.length} contributions read.`)); }
  }
  function schliesseZuordnung() { offen = null; dlg?.close(); }
  async function abbrechen() {
    const n = offen?.anzeigeName ?? '';
    schliesseZuordnung();
    sageSpaeter(L(`Einlesen von „${n}“ abgebrochen. Es wurde nichts geändert.`, `Reading "${n}" cancelled. Nothing was changed.`), 600);
    if (warte.length) { await tick(); await naechste(); }
  }
  async function uebernehmen() {
    const o = offen;
    if (!o) return;
    const name = o.anzeigeName.trim() || grundname(o.name);
    const datei = o.eingefuegt ? undefined : { name: o.name, sha256: await sha256Hex(o.bytes) };
    const erg = transkriptDokument(o.roh, o.zu, name, undefined, datei);
    nimmTranskriptAuf(erg, o.roh.quelle, o.name);
    const b = erg.dokument.transkript?.abschnitte.length ?? 0, p = erg.dokument.transkript?.sprecher.length ?? 0;
    schliesseZuordnung();
    sageSpaeter(L(`Transkript „${name}“ übernommen: ${b} Beiträge, ${p} Personen.`, `Transcript "${name}" added: ${b} contributions, ${p} people.`), 600);
    if (warte.length) { await tick(); await naechste(); }
    else { await tick(); fokusNachDialog('iv-trans-liste'); }
  }
  function setzeRolle(k: string, r: SprecherRolle) { const p = offen?.zu.personen.find(x => x.kennung === k); if (p) p.rolle = r; }

  /* ---------- Liste: Öffnen, Umbenennen, Entfernen */
  async function oeffne(id: string) {
    iv.offen = id;
    const d = dokumente.find(x => x.id === id);
    sage(L(`Transkript „${d?.name ?? ''}“ geöffnet.`, `Transcript "${d?.name ?? ''}" opened.`));
    await tick();
    document.getElementById('iv-offen-t')?.focus();
  }
  async function schliesseAnsicht() {
    iv.offen = null;
    sage(L('Transkript geschlossen.', 'Transcript closed.'));
    await tick();
    document.getElementById('iv-trans-liste')?.focus();
  }
  function frageUmbenennen(id: string) {
    umId = id; umName = dokumente.find(d => d.id === id)?.name ?? '';
    umDlg?.showModal();
  }
  function umbenennen() {
    const id = umId;
    if (!id) return;
    if (!umName.trim()) { sage(L('Bitte einen Namen eingeben.', 'Please enter a name.'), 'dringend'); document.getElementById('iv-um-name')?.focus(); return; }
    benenneTranskriptUm(id, umName);
    umDlg?.close(); umId = null;
    sageSpaeter(L(`Umbenannt in „${umName.trim()}“.`, `Renamed to "${umName.trim()}".`), 600);
  }
  function frageEntfernen(id: string, name: string) {
    iv.rueckfrage = {
      titel: L(`Transkript „${name}“ entfernen?`, `Remove transcript "${name}"?`),
      text: L('Der Text und die Zuordnung der Sprecher werden aus dem Projekt gelöscht. Die Datei, aus der Sie eingelesen haben, bleibt unberührt. Das lässt sich nicht rückgängig machen; Sie können das Transkript aber erneut einlesen.', 'The text and the speaker assignment are deleted from the project. The file you read from is not touched. This cannot be undone, but you can read the transcript in again.'),
      ja: L('Entfernen', 'Remove'),
      tun: () => { entferneTranskript(id); sageSpaeter(L(`Transkript „${name}“ entfernt.`, `Transcript "${name}" removed.`), 600); void tick().then(() => fokusNachDialog('iv-trans-t')); },
    };
  }
  const dauer = (ms?: number): string => (ms === undefined ? '-' : formatZeit(ms, 'hms'));
</script>

<div class="trans" role="group" aria-label={L('Transkripte einlesen', 'Read in transcripts')}>
  <p class="hilfe">{L('Statable schreibt Aufnahmen nicht selbst ab. Dafür gibt es kostenlose Programme, die auf Ihrem Gerät laufen, zum Beispiel aTrain und noScribe. Lesen Sie deren Ergebnis hier ein (txt, vtt, srt, html, json, Word, cha oder eaf).', 'Statable does not transcribe recordings itself. There are free programs that run on your device for that, for example aTrain and noScribe. Read their result in here (txt, vtt, srt, html, json, Word, cha or eaf).')}</p>

  <div class="ablage" class:ziehen role="group" aria-label={L('Transkript-Dateien hierher ziehen oder wählen', 'Drag transcript files here or choose them')}
    ondragover={(e) => { e.preventDefault(); ziehen = true; }} ondragleave={() => (ziehen = false)} ondrop={abgelegt}>
    <p class="hilfe">{L('Dateien hierher ziehen oder mit dem Knopf wählen.', 'Drag files here or choose them with the button.')}</p>
    <div class="knopfzeile">
      <button class="k haupt" id="iv-einlesen" type="button" onclick={() => eingabe?.click()}><Icon n="plus" />{L('Transkript einlesen', 'Read in a transcript')}</button>
    </div>
    <input bind:this={eingabe} type="file" hidden multiple accept=".txt,.vtt,.srt,.html,.htm,.json,.docx,.rtf,.cha,.eaf" tabindex="-1" aria-hidden="true" onchange={(e) => { void nimmDateien([...(e.currentTarget.files ?? [])]); e.currentTarget.value = ''; }}>
  </div>

  <div class="knopfzeile"><button class="k" id="iv-beispiel" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void beispielLaden(); }}>{L('Beispielinterview laden (erfunden)', 'Load example interview (invented)')}</button></div>
  <p class="hilfe">{L('Erfundenes Beispiel für die Übung. Personen und Aussagen sind ausgedacht.', 'Invented example for practice. People and statements are made up.')}</p>

  <div class="eingabe">
    <label for="iv-text">{L('Oder Text einfügen (zum Beispiel aus der Sprachmemos-App)', 'Or paste text (for example from a voice memo app)')}</label>
    <textarea id="iv-text" rows="5" spellcheck="false" bind:value={text}></textarea>
  </div>
  <div class="knopfzeile"><button class="k" type="button" onclick={textEinlesen}>{L('Text einlesen', 'Read in text')}</button></div>

  {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Transkript wird gelesen …', 'Reading the transcript …')} /></p>{/if}
  {#if fehler}<p class="fehl" id="iv-fehler">{fehler}</p>{/if}

  <h3 id="iv-trans-liste" tabindex="-1">{L(`Eingelesene Transkripte (${zeilen.length})`, `Transcripts read in (${zeilen.length})`)}</h3>
  {#if !zeilen.length}
    <p class="hilfe">{L('Noch kein Transkript eingelesen.', 'No transcript read in yet.')}</p>
  {:else}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
    <div class="tabelle-rahmen" role="region" tabindex="0" aria-label={L('Eingelesene Transkripte, seitlich scrollbar', 'Transcripts read in, scrollable sideways')}>
      <table class="trans-tab">
        <caption class="nur-vorleser">{L('Eingelesene Transkripte', 'Transcripts read in')}</caption>
        <thead><tr>
          <th scope="col">{L('Name', 'Name')}</th><th scope="col">{L('Programm', 'Program')}</th><th scope="col">{L('Beiträge', 'Contributions')}</th>
          <th scope="col">{L('Personen', 'People')}</th><th scope="col">{L('Dauer', 'Duration')}</th><th scope="col">{L('Hinweise', 'Notes')}</th><th scope="col">{L('Aktionen', 'Actions')}</th>
        </tr></thead>
        <tbody>
          {#each zeilen as z (z.id)}
            <tr>
              <th scope="row" id="iv-zeile-{z.id}" tabindex="-1">{z.name}</th>
              <td>{programmName(z.programm)}</td>
              <td>{z.beitraege}</td>
              <td>{z.personen}</td>
              <td>{dauer(z.dauerMs)}</td>
              <td>{z.hinweise}</td>
              <td><div class="knopfzeile">
                <button class="k klein" type="button" aria-label="{L('Öffnen', 'Open')}: {z.name}" onclick={() => void oeffne(z.id)}>{L('Öffnen', 'Open')}</button>
                <button class="k klein" type="button" aria-label="{L('Kodieren', 'Code')}: {z.name}" onclick={() => { location.hash = 'kodieren/dokument/' + encodeURIComponent(z.id); }}>{L('Kodieren', 'Code')}</button>
                <button class="k klein" type="button" aria-label="{L('Feinstrukturanalyse beginnen', 'Start fine structure analysis')}: {z.name}" onclick={() => { iv.feinstruktur = 'neu:' + z.id; }}>{L('Feinstrukturanalyse beginnen', 'Start fine structure analysis')}</button>
                <button class="k klein" type="button" aria-label="{L('Umbenennen', 'Rename')}: {z.name}" onclick={() => frageUmbenennen(z.id)}>{L('Umbenennen', 'Rename')}</button>
                <button class="k klein leise" type="button" aria-label="{L('Entfernen', 'Remove')}: {z.name}" onclick={() => frageEntfernen(z.id, z.name)}>{L('Entfernen', 'Remove')}</button>
              </div></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="hilfe">{L('Hinweise sind Vorschläge zum Transkript, keine Fehler. Sie entscheiden, was Sie ändern.', 'Notes are suggestions about the transcript, not errors. You decide what to change.')}</p>
  {/if}

  {#if geoeffnet?.transkript}
    {#key geoeffnet.id}
      <TranskriptAnsicht dok={geoeffnet} alle={dokumente} schliessen={schliesseAnsicht} />
    {/key}
  {/if}
</div>

<dialog bind:this={dlg} use:dialogFokus={{ spaet: DIALOG_SPAET_MS }} aria-labelledby="iv-zu-t" oncancel={(e) => { e.preventDefault(); void abbrechen(); }}>
  {#if offen}
    <div class="dialog-innen zu">
      <h2 id="iv-zu-t" tabindex="-1">{L(`Sprecher zuordnen: ${offen.name}`, `Assign speakers: ${offen.name}`)}</h2>
      <p>{L(`Erkannt als ${programmName(offen.roh.quelle)}, ${offen.roh.beitraege.length} Beiträge.`, `Recognised as ${programmName(offen.roh.quelle)}, ${offen.roh.beitraege.length} contributions.`)}</p>
      {#if offen.roh.meldungen.length}
        <div class="meld"><h3>{L('Beim Lesen aufgefallen', 'Noticed while reading')}</h3>
          <ul>{#each offen.roh.meldungen as m, i (i)}<li>{m.satz}</li>{/each}</ul></div>
      {/if}

      {#if offen.roh.beitraege.length === 0}
        <p>{L('Aus dieser Datei konnten keine Beiträge gelesen werden.', 'No contributions could be read from this file.')}</p>
        <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => void abbrechen()}>{L('Schließen', 'Close')}</button></div>
      {:else}
        <div class="eingabe"><label for="iv-zu-name">{L('Name des Transkripts', 'Name of the transcript')}</label>
          <input id="iv-zu-name" type="text" bind:value={offen.anzeigeName} maxlength="120" autocomplete="off"></div>

        {#if offen.untertitel}
          <label class="schalter"><input type="checkbox" bind:checked={offen.zusammenfassen} onchange={() => void neuLesen()}>{L('Untertitel zu Absätzen zusammenfassen', 'Merge subtitles into paragraphs')}</label>
        {/if}

        {#if offen.zu.personen.length}
          <fieldset>
            <legend>{L('Was ist ein Fall?', 'What is a case?')}</legend>
            <label class="schalter"><input type="radio" name="iv-zu-faelle" value="dokument" bind:group={offen.zu.faelle}>{L('Ein Dokument ist ein Fall (Einzelinterview)', 'One document is one case (single interview)')}</label>
            <label class="schalter"><input type="radio" name="iv-zu-faelle" value="personen" bind:group={offen.zu.faelle}>{L('Jede befragte Person ist ein Fall (Gruppendiskussion)', 'Each respondent is a case (group discussion)')}</label>
          </fieldset>

          {#each offen.zu.personen as p, i (p.kennung)}
            <fieldset class="person">
              <legend>{Lp(anzahl(offen.roh, p.kennung), `Kennung ${p.kennung} (1 Beitrag)`, `Kennung ${p.kennung} (${anzahl(offen.roh, p.kennung)} Beiträge)`, `Identifier ${p.kennung} (1 contribution)`, `Identifier ${p.kennung} (${anzahl(offen.roh, p.kennung)} contributions)`)}</legend>
              <div class="eingabe"><label for="iv-zu-n-{i}">{L('Name', 'Name')}</label>
                <input id="iv-zu-n-{i}" type="text" bind:value={p.name} maxlength="80" autocomplete="off"></div>
              <fieldset class="rolle">
                <legend>{L('Rolle', 'Role')}</legend>
                <label class="schalter"><input type="radio" name="iv-zu-r-{i}" checked={p.rolle === 'interview'} onchange={() => setzeRolle(p.kennung, 'interview')}>{L('führt das Interview', 'conducts the interview')}</label>
                <label class="schalter"><input type="radio" name="iv-zu-r-{i}" checked={p.rolle === 'befragt'} onchange={() => setzeRolle(p.kennung, 'befragt')}>{L('wird befragt', 'is interviewed')}</label>
                <label class="schalter"><input type="radio" name="iv-zu-r-{i}" checked={p.rolle === 'andere'} onchange={() => setzeRolle(p.kennung, 'andere')}>{L('andere', 'other')}</label>
              </fieldset>
              {#if offen.zu.personen.length > 1}
                <div class="eingabe"><label for="iv-zu-g-{i}">{L('Ist dieselbe Person wie …', 'Is the same person as …')}</label>
                  <select id="iv-zu-g-{i}" value={p.gleichWie ?? ''} onchange={(e) => { p.gleichWie = e.currentTarget.value || undefined; }}>
                    <option value="">{L('(keine andere Kennung)', '(no other identifier)')}</option>
                    {#each offen.zu.personen.filter(q => q.kennung !== p.kennung && q.gleichWie !== p.kennung) as q (q.kennung)}<option value={q.kennung}>{q.kennung}</option>{/each}
                  </select></div>
              {/if}
            </fieldset>
          {/each}
        {:else}
          <p class="hilfe">{L('In dieser Datei sind keine Sprecher erkannt worden. Das Transkript wird als ein Dokument übernommen.', 'No speakers were recognised in this file. The transcript is added as one document.')}</p>
        {/if}

        <div class="knopfzeile">
          <button class="k haupt" type="button" onclick={() => void uebernehmen()}>{L('Übernehmen', 'Add')}</button>
          <button class="k leise" type="button" onclick={() => void abbrechen()}>{L('Abbrechen', 'Cancel')}</button>
        </div>
      {/if}
    </div>
  {/if}
</dialog>

<dialog bind:this={umDlg} use:dialogFokus={{ spaet: DIALOG_SPAET_MS }} aria-labelledby="iv-um-t" oncancel={() => { umId = null; }} onclose={() => { umId = null; }}>
  <div class="dialog-innen">
    <h2 id="iv-um-t">{L('Transkript umbenennen', 'Rename transcript')}</h2>
    <div class="eingabe"><label for="iv-um-name">{L('Neuer Name', 'New name')}</label>
      <input id="iv-um-name" type="text" bind:value={umName} maxlength="120" autocomplete="off" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); umbenennen(); } }}></div>
    <div class="knopfzeile">
      <button class="k haupt" type="button" onclick={umbenennen}>{L('Übernehmen', 'Apply')}</button>
      <button class="k leise" type="button" onclick={() => umDlg?.close()}>{L('Abbrechen', 'Cancel')}</button>
    </div>
  </div>
</dialog>

<style>
  .trans { display: flex; flex-direction: column; gap: var(--a3); }
  /* U1: auf sehr breiten Schirmen nicht 2.000 px breit (Zeilen bleiben lesbar) */
  #iv-text { max-inline-size: 60rem; }
  .trans h3 { margin: var(--a3) 0 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .ablage { display: flex; flex-direction: column; gap: var(--a2); border: 2px dashed var(--linie-stark); border-radius: var(--r); padding: var(--a3) var(--a4); }
  .ablage.ziehen { border-color: var(--akzent); background: var(--akzent-hell); }
  .tabelle-rahmen { overflow-x: auto; }
  .tabelle-rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .trans-tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .trans-tab th, .trans-tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: middle; }
  .trans-tab thead th { font-weight: 650; }
  .trans-tab td:last-child { min-width: 8rem; }   /* Knöpfe brechen in der Zelle um, statt halb aus dem Scrollkasten zu ragen */
  .trans-tab tbody th { font-weight: 600; }
  .zu { max-width: 40rem; }
  .zu h3 { margin: 0 0 var(--a1); font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .meld { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); font-size: var(--gr-klein); }
  .meld ul { margin: 0; padding-inline-start: var(--a4); }
  .zu fieldset { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .zu fieldset.rolle { border: 0; padding: 0; }
  .zu legend { font-weight: 600; padding: 0 var(--a1); }
  .zu fieldset.rolle legend { padding: 0; }
</style>
