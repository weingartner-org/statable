<script lang="ts">
  /**
   * Projekt aus MAXQDA, ATLAS.ti, NVivo oder QualCoder einlesen (REFI-QDA, .qdpx), Stufe 5, Paket 5E1.
   * Lesen und Zusammenführen steckt in `lib/qdpx.ts`, das Ablegen in `lib/interviews.svelte.ts`. Text aus der Datei wird nur als Text angezeigt.
   * Ansagen nur über `sage()`/`sageSpaeter()`; der Dialog nutzt `dialogFokus`; nach dem Einlesen liegt der Fokus auf der Überschrift der Meldungsliste.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { iv, qualProjekt, uebernimmQdpx, type QdpxAufnahme } from '../lib/interviews.svelte';
  import { leseQdpx, QdpxFehler, type QdpxErgebnis, fuehreZusammen } from '../lib/qdpx';
  import { schreibeQdpx } from '../lib/qdpx-schreiben';
  import { NICHT_IN_QDPX } from '../lib/qdpx-schreiben';
  import { herunterladen } from '../lib/export';
  import { cpLaenge } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';
  import { dialogFokus, fokusNachDialog, DIALOG_SPAET_MS } from './dialogFokus';

  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const lade = new Laedt();
  const TEXT_ANSICHT_MAX = 20000;
  let eingabe = $state<HTMLInputElement>();
  let ziehen = $state(false);
  let fehler = $state('');
  let dlg = $state<HTMLDialogElement>();

  /** Gelesene Datei, die auf die Wahl wartet */
  let offen = $state<{ name: string; erg: QdpxErgebnis; modus: 'hinzufuegen' | 'ersetzen'; gleich: Record<string, 'ja' | 'nein'> } | null>(null);
  /** Ergebnis des letzten Einlesens */
  let ergebnis = $state<{ name: string; aufnahme: QdpxAufnahme; erg: QdpxErgebnis } | null>(null);
  let textOffen = $state<string | null>(null);

  const q = $derived(qualProjekt());
  const hatInhalt = $derived(!!q && (q.dokumente.length > 0 || q.codes.length > 0 || q.segmente.length > 0));
  const dokumenteOhne = $derived(q?.dokumente.filter(d => !d.transkript) ?? []);
  const programm = (p?: string): string => (p ? p.replace(/^.*@/, '') : '');
  const nDok = (n: number): string => Lp(n, '1 Dokument', `${n} Dokumente`, '1 document', `${n} documents`);
  const nKod = (n: number): string => Lp(n, '1 Kodierung', `${n} Kodierungen`, '1 coding', `${n} codings`);
  const nMeld = (n: number): string => Lp(n, '1 Meldung', `${n} Meldungen`, '1 message', `${n} messages`);
  const zaehlSatz = (erg: QdpxErgebnis, meld: number): string => {
    const z = erg.zaehlung;
    return L(`Projekt eingelesen: ${nDok(z.dokumente)}, ${nKod(z.kodierungen)}, ${nMeld(meld)}.`, `Project read in: ${nDok(z.dokumente)}, ${nKod(z.kodierungen)}, ${nMeld(meld)}.`);
  };

  /** Fragen nach „dieselbe Person?“: nur beim Hinzufügen, nur wo die Zusammenführung Personen gleichen Namens gefunden hat. */
  const personenFragen = $derived.by(() => {
    if (!offen || offen.modus !== 'hinzufuegen' || !q) return [];
    const z = fuehreZusammen(q, offen.erg.projekt, sprache());
    return z.meldungen.filter(m => m.art === 'person-gleicher-name' && m.was).map(m => {
      const b = offen!.erg.projekt.kodierende.find(k => k.id === m.was);
      const a = b ? q.kodierende.find(k => k.name === b.name) : undefined;
      return b && a ? { bId: b.id, aId: a.id, name: b.name } : null;
    }).filter((x): x is { bId: string; aId: string; name: string } => x !== null);
  });

  /** Das Projekt als REFI-QDA-Datei speichern (Ausbau A1); Einwilligungen, Protokolle und Co. bleiben in der Projektdatei. */
  function alsQdpx() {
    if (!q || !hatInhalt) { sage(L('Das Projekt ist noch leer. Lesen Sie zuerst Dokumente ein oder legen Sie Codes an.', 'The project is still empty. First read in documents or create codes.')); return; }
    const name = (q.name || 'Statable').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Statable';
    herunterladen(schreibeQdpx(q, sprache()), name + '.qdpx', 'application/zip');
    const nd = q.dokumente.length, nc = q.codes.length;   // Prüfplan A-B1: Ansage mit Zahlen
    sage(L(`Datei „${name}.qdpx“ wird gespeichert: ${Lp(nd, '1 Dokument', `${nd} Dokumente`, '', '')}, ${Lp(nc, '1 Code', `${nc} Codes`, '', '')}.`, `File "${name}.qdpx" is being saved: ${Lp(nd, '', '', '1 document', `${nd} documents`)}, ${Lp(nc, '', '', '1 code', `${nc} codes`)}.`));
  }

  async function nimmDatei(dateien: File[]) {
    fehler = '';
    const f = dateien[0];
    if (!f) return;
    if (!/\.qdpx$/i.test(f.name)) {
      fehler = L(`„${f.name}“ ist keine .qdpx-Datei. Wählen Sie eine REFI-QDA-Projektdatei (Endung .qdpx).`, `"${f.name}" is not a .qdpx file. Choose a REFI-QDA project file (ending .qdpx).`);
      sage(fehler, 'dringend'); return;
    }
    if (dateien.length > 1) sage(L('Es wird nur die erste Datei gelesen.', 'Only the first file is read.'));
    await lade.mit(async () => { await liesBytes(f.name, async () => new Uint8Array(await f.arrayBuffer())); });
  }
  /** Beispielprojekt (erfunden) nach Oberflächensprache laden, wie das Beispielinterview; danach läuft es wie jede Datei. */
  async function beispielLaden() {
    fehler = '';
    await lade.mit(async () => {
      const dn = `beispiel-${sprache()}.qdpx`;
      await liesBytes(dn, async () => {
        const r = await fetch(new URL(`beispiel/qdpx/${dn}`, document.baseURI));
        if (!r.ok) throw new Error('nicht gefunden');
        return new Uint8Array(await r.arrayBuffer());
      });
    });
  }
  async function liesBytes(name: string, holen: () => Promise<Uint8Array>) {
    try {
      const erg = leseQdpx(await holen(), sprache());
      if (!hatInhalt) { anwenden({ name, erg, modus: 'ersetzen', gleich: {} }); return; }
      offen = { name, erg, modus: 'hinzufuegen', gleich: {} };
      await tick();
      dlg?.showModal();
    } catch (e) {
      fehler = e instanceof QdpxFehler ? e.message : L('Die Datei ließ sich nicht lesen. Bitte prüfen Sie die Verbindung und versuchen Sie es noch einmal.', 'The file could not be read. Please check the connection and try again.');
      sage(fehler, 'dringend');
    }
  }
  function abgelegt(e: DragEvent) { e.preventDefault(); ziehen = false; void nimmDatei([...(e.dataTransfer?.files ?? [])]); }

  function schliesseDialog() { dlg?.close(); offen = null; void tick().then(() => fokusNachDialog('iv-qdpx-einlesen')); }
  function weiter() {
    const o = offen;
    if (!o) return;
    if (o.modus === 'ersetzen') {
      dlg?.close();
      iv.rueckfrage = {
        titel: L('Das vorhandene qualitative Projekt ersetzen?', 'Replace the existing qualitative project?'),
        text: L('Transkripte, Codes und Kodierungen, die schon im Projekt liegen, werden durch den Inhalt der Datei ersetzt. Offene Entscheidungen beim Konsens fallen weg. Das lässt sich nicht rückgängig machen. Wenn Sie beides behalten wollen, wählen Sie „Zum vorhandenen Projekt hinzufügen“.', 'Transcripts, codes and codings already in the project are replaced by the content of the file. Open consensus decisions are dropped. This cannot be undone. If you want to keep both, choose "Add to the existing project".'),
        ja: L('Ersetzen', 'Replace'),
        tun: () => anwenden(o),
      };
      offen = null;
      return;
    }
    dlg?.close();
    anwenden(o);
  }
  function anwenden(o: NonNullable<typeof offen>) {
    const gleich: Record<string, string> = {};
    for (const f of personenFragen) if (o.gleich[f.bId] === 'ja') gleich[f.bId] = f.aId;
    const aufnahme = uebernimmQdpx(o.erg, o.modus, sprache(), gleich);
    ergebnis = { name: o.name, aufnahme, erg: o.erg };
    offen = null; textOffen = null;
    sageSpaeter(zaehlSatz(o.erg, aufnahme.meldungen.length), 600);
    void tick().then(() => { const h = document.getElementById('qx-erg-t'); h?.scrollIntoView({ block: 'start' }); h?.focus(); });
  }

  const unsicher = (name: string): boolean => !!ergebnis?.aufnahme.meldungen.some(m => m.art === 'positionen-unsicher' && m.dokument === name);
  const dokText = (id: string): string => q?.dokumente.find(d => d.id === id)?.text ?? '';
  const codeName = (id: string): string => q?.codes.find(c => c.id === id)?.name ?? id;
  const wieText = (w: 'guid' | 'pfad' | 'neu'): string => (w === 'guid' ? L('gleiche Kennung', 'same identifier') : w === 'pfad' ? L('gleicher Name im gleichen Pfad', 'same name on the same path') : L('neu angelegt', 'newly created'));
</script>

<div class="qx" role="group" aria-label={L('REFI-QDA-Projekt einlesen', 'Read in a REFI-QDA project')}>
  <p class="hilfe">{L('REFI-QDA ist ein Austauschformat. Programme füllen es verschieden. Statable sagt Ihnen, was es nicht übernehmen konnte.', 'REFI-QDA is an exchange format. Programs fill it differently. Statable tells you what it could not take over.')}</p>
  <p class="hilfe">{L('Statable liest Dokumente, Codes, Kodierungen (Textstellen mit Code), Notizen, Fälle und Kodierende. Die Datei bleibt auf Ihrem Gerät.', 'Statable reads documents, codes, codings (passages with a code), notes, cases and coders. The file stays on your device.')}</p>

  <div class="ablage" class:ziehen role="group" aria-label={L('.qdpx-Datei hierher ziehen oder wählen', 'Drag a .qdpx file here or choose it')}
    ondragover={(e) => { e.preventDefault(); ziehen = true; }} ondragleave={() => (ziehen = false)} ondrop={abgelegt}>
    <p class="hilfe">{L('Datei hierher ziehen oder mit dem Knopf wählen.', 'Drag the file here or choose it with the button.')}</p>
    <div class="knopfzeile">
      <button class="k haupt" id="iv-qdpx-einlesen" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) eingabe?.click(); }}><Icon n="plus" />{L('.qdpx einlesen', 'Read in .qdpx')}</button>
    </div>
    <input bind:this={eingabe} type="file" hidden accept=".qdpx" tabindex="-1" aria-hidden="true" onchange={(e) => { void nimmDatei([...(e.currentTarget.files ?? [])]); e.currentTarget.value = ''; }}>
  </div>
  <div class="knopfzeile"><button class="k" id="iv-qdpx-beispiel" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void beispielLaden(); }}>{L('Beispielprojekt mit zwei Kodierenden laden (erfunden)', 'Load example project with two coders (invented)')}</button></div>
  <p class="hilfe">{L('Erfundenes Beispiel für die Übung: drei Interviews, drei Fälle, zwei Kodierende. Personen und Aussagen sind ausgedacht.', 'Invented example for practice: three interviews, three cases, two coders. People and statements are made up.')}</p>
  <div class="knopfzeile"><button class="k" id="iv-qdpx-speichern" type="button" aria-disabled={hatInhalt ? undefined : 'true'} onclick={alsQdpx}>{L('Als REFI-QDA-Projekt speichern (.qdpx)', 'Save as REFI-QDA project (.qdpx)')}</button></div>
  <div id="iv-qdpx-speichern-hilfe" class="hilfe">
    <p>{L('Diese Teile bleiben nur in der Projektdatei:', 'These parts stay only in the project file:')}</p>
    <ul>{#each NICHT_IN_QDPX[sprache() === 'de' ? 'de' : 'en'] as t (t)}<li>{t}</li>{/each}</ul>
    <p>{L('Ausprägungen als Untercodes gehen mit.', 'Levels as subcodes are included.')}</p>
  </div>
  {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Projekt wird gelesen …', 'Reading the project …')} /></p>{/if}
  {#if fehler}<p class="fehl" id="iv-qdpx-fehler">{fehler}</p>{/if}

  {#if ergebnis}
    {@const meld = ergebnis.aufnahme.meldungen}
    <h3 id="qx-erg-t" tabindex="-1">{L(`Ergebnis des Einlesens: ${ergebnis.name}`, `Result of reading in: ${ergebnis.name}`)}</h3>
    <p>{zaehlSatz(ergebnis.erg, meld.length)}{#if programm(ergebnis.erg.programm)} {L(`Die Datei kommt aus: ${programm(ergebnis.erg.programm)}.`, `The file comes from: ${programm(ergebnis.erg.programm)}.`)}{/if}
      {ergebnis.aufnahme.modus === 'hinzufuegen' ? L('Der Inhalt wurde zum vorhandenen Projekt hinzugefügt.', 'The content was added to the existing project.') : L('Der Inhalt ist jetzt das qualitative Projekt.', 'The content is now the qualitative project.')}</p>
    {#if meld.length === 0}
      <p>{L('Keine Meldungen. Alles in der Datei wurde übernommen.', 'No messages. Everything in the file was taken over.')}</p>
    {:else}
      <ul class="meldungen" aria-label={L('Meldungen zum Einlesen', 'Messages about reading in')}>
        {#each meld as m, i (i)}<li>{m.satz}</li>{/each}
      </ul>
    {/if}

    {#if ergebnis.aufnahme.zuordnung.length}
      <details class="zuordnung">
        <summary>{L(`Zuordnung der Codes ansehen (${ergebnis.aufnahme.zuordnung.length})`, `View the assignment of codes (${ergebnis.aufnahme.zuordnung.length})`)}</summary>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="tabelle-rahmen" role="region" tabindex="0" aria-label={L('Zuordnung der Codes, seitlich scrollbar', 'Assignment of codes, scrollable sideways')}>
          <table class="tab">
            <caption class="nur-vorleser">{L('Zuordnung der Codes aus der Datei zu den Codes im Projekt', 'Assignment of the codes in the file to the codes in the project')}</caption>
            <thead><tr><th scope="col">{L('Code in der Datei', 'Code in the file')}</th><th scope="col">{L('Code im Projekt', 'Code in the project')}</th><th scope="col">{L('Zuordnung', 'Assignment')}</th></tr></thead>
            <tbody>
              {#each ergebnis.aufnahme.zuordnung as z (z.von)}
                <tr><th scope="row">{ergebnis.erg.projekt.codes.find(c => c.id === z.von)?.name ?? z.von}</th><td>{codeName(z.zu)}</td><td>{wieText(z.wie)}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
    {/if}
  {/if}

  <h3 id="qx-dok-t" tabindex="-1">{L(`Dokumente ohne Transkript (${dokumenteOhne.length})`, `Documents without a transcript (${dokumenteOhne.length})`)}</h3>
  {#if !dokumenteOhne.length}
    <p class="hilfe">{L('Noch keine. Dokumente aus einer .qdpx-Datei stehen hier; Transkripte mit Sprechern stehen oben in der Liste der Transkripte.', 'None yet. Documents from a .qdpx file are listed here; transcripts with speakers are in the list of transcripts above.')}</p>
  {:else}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
    <div class="tabelle-rahmen" role="region" tabindex="0" aria-label={L('Dokumente ohne Transkript, seitlich scrollbar', 'Documents without a transcript, scrollable sideways')}>
      <table class="tab">
        <caption class="nur-vorleser">{L('Dokumente ohne Transkript', 'Documents without a transcript')}</caption>
        <thead><tr><th scope="col">{L('Name', 'Name')}</th><th scope="col">{L('Fall', 'Case')}</th><th scope="col">{L('Textstellen', 'Passages')}</th><th scope="col">{L('Zeichen', 'Characters')}</th><th scope="col">{L('Hinweis', 'Note')}</th><th scope="col">{L('Aktion', 'Action')}</th></tr></thead>
        <tbody>
          {#each dokumenteOhne as d (d.id)}
            <tr>
              <th scope="row">{d.name}</th>
              <td>{q?.faelle.find(f => f.id === d.fall)?.name ?? '-'}</td>
              <td>{q?.segmente.filter(s => s.dokument === d.id).length ?? 0}</td>
              <td>{cpLaenge(d.text)}</td>
              <td>{#if unsicher(d.name)}{L('Positionen unsicher: Die Textstellen sitzen vielleicht verschoben. Prüfen Sie einige Stellen.', 'Positions uncertain: the passages may be shifted. Check a few of them.')}{:else}-{/if}</td>
              <td><button class="k klein" type="button" aria-expanded={textOffen === d.id} aria-controls="qx-text" aria-label="{textOffen === d.id ? L('Text verbergen', 'Hide text') : L('Text ansehen', 'View text')}: {d.name}" onclick={() => { textOffen = textOffen === d.id ? null : d.id; }}>{textOffen === d.id ? L('Text verbergen', 'Hide text') : L('Text ansehen', 'View text')}</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="hilfe">{L('Der Text ist nur zum Lesen. Er lässt sich nicht ändern, weil Textstellen mit Codes daran hängen.', 'The text is read-only. It cannot be changed, because passages with codes are attached to it.')}</p>
    <div id="qx-text">
      {#if textOffen}
        {@const t = dokText(textOffen)}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="textkasten" role="region" tabindex="0" aria-label={L(`Text von „${dokumenteOhne.find(d => d.id === textOffen)?.name ?? ''}“`, `Text of "${dokumenteOhne.find(d => d.id === textOffen)?.name ?? ''}"`)}>
          <pre>{t.length > TEXT_ANSICHT_MAX ? t.slice(0, TEXT_ANSICHT_MAX) : t}</pre>
        </div>
        {#if t.length > TEXT_ANSICHT_MAX}<p class="hilfe">{L(`Gezeigt werden die ersten ${TEXT_ANSICHT_MAX} Zeichen.`, `The first ${TEXT_ANSICHT_MAX} characters are shown.`)}</p>{/if}
      {/if}
    </div>
  {/if}
</div>

<dialog bind:this={dlg} use:dialogFokus={{ spaet: DIALOG_SPAET_MS }} aria-labelledby="qx-dlg-t" oncancel={(e) => { e.preventDefault(); schliesseDialog(); }}>
  {#if offen}
    <div class="dialog-innen zu">
      <h2 id="qx-dlg-t" tabindex="-1">{L(`Projekt einlesen: ${offen.name}`, `Read in project: ${offen.name}`)}</h2>
      <p>{L(`Die Datei enthält ${nDok(offen.erg.zaehlung.dokumente)} und ${nKod(offen.erg.zaehlung.kodierungen)}. In Ihrem Projekt liegt schon ein qualitatives Projekt.`, `The file contains ${nDok(offen.erg.zaehlung.dokumente)} and ${nKod(offen.erg.zaehlung.kodierungen)}. Your project already contains a qualitative project.`)}</p>
      <fieldset>
        <legend>{L('Was soll mit dem vorhandenen Projekt geschehen?', 'What should happen to the existing project?')}</legend>
        <label class="schalter"><input type="radio" name="qx-modus" value="hinzufuegen" bind:group={offen.modus}>{L('Zum vorhandenen Projekt hinzufügen (Kodierungen zusammenführen)', 'Add to the existing project (merge codings)')}</label>
        <label class="schalter"><input type="radio" name="qx-modus" value="ersetzen" bind:group={offen.modus}>{L('Das vorhandene Projekt ersetzen', 'Replace the existing project')}</label>
      </fieldset>
      {#if offen.modus === 'hinzufuegen'}
        <p class="hilfe">{L('Gleicher Text heißt dasselbe Dokument. Jede Person behält ihre eigenen Textstellen, damit Sie die Kodierungen vergleichen können.', 'The same text means the same document. Each person keeps their own passages, so you can compare the codings.')}</p>
        {#each personenFragen as f (f.bId)}
          <fieldset class="person">
            <legend>{L(`Ist „${f.name}“ in beiden Dateien dieselbe Person?`, `Is "${f.name}" the same person in both files?`)}</legend>
            <label class="schalter"><input type="radio" name="qx-gl-{f.bId}" value="nein" checked={(offen.gleich[f.bId] ?? 'nein') === 'nein'} onchange={() => { if (offen) offen.gleich[f.bId] = 'nein'; }}>{L('Nein, zwei verschiedene Personen (getrennt halten)', 'No, two different people (keep apart)')}</label>
            <label class="schalter"><input type="radio" name="qx-gl-{f.bId}" value="ja" checked={offen.gleich[f.bId] === 'ja'} onchange={() => { if (offen) offen.gleich[f.bId] = 'ja'; }}>{L('Ja, dieselbe Person (zusammenführen)', 'Yes, the same person (merge)')}</label>
          </fieldset>
        {/each}
      {/if}
      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={weiter}>{offen.modus === 'ersetzen' ? L('Weiter zum Ersetzen', 'Continue to replace') : L('Hinzufügen', 'Add')}</button>
        <button class="k leise" type="button" onclick={schliesseDialog}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </div>
  {/if}
</dialog>

<style>
  .qx { display: flex; flex-direction: column; gap: var(--a3); }
  .qx h3 { margin: var(--a3) 0 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .ablage { display: flex; flex-direction: column; gap: var(--a2); border: 2px dashed var(--linie-stark); border-radius: var(--r); padding: var(--a3) var(--a4); }
  .ablage.ziehen { border-color: var(--akzent); background: var(--akzent-hell); }
  .meldungen { margin: 0; padding-inline-start: var(--a4); font-size: var(--gr-klein); }
  .tabelle-rahmen { overflow-x: auto; }
  .tabelle-rahmen:focus-visible, .textkasten:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: middle; }
  .tab thead th { font-weight: 650; }
  .tab tbody th { font-weight: 600; }
  .textkasten { max-height: 24rem; overflow: auto; border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); }
  .textkasten pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; font-size: var(--gr-klein); }
  .zuordnung summary { cursor: pointer; min-height: 24px; }
  .zu { max-width: 40rem; }
  .zu fieldset { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .zu legend { font-weight: 600; padding: 0 var(--a1); }
</style>
