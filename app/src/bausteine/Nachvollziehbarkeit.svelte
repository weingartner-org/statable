<script lang="ts">
  /**
   * Nachvollziehbarkeit (Ausbau A1): Änderungsprotokoll des Codebuchs als Tabelle mit Filtern, Angabe zur KI-Nutzung, Methodenanhang als Word.
   * Rechnet in `lib/nachvollziehbarkeit.ts`. Die KI-Angabe schreibt nur die Person; Statable füllt sie nie selbst aus. Nie Text aus Dokumenten.
   */
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { aendereOhneStapel, sprache } from '../lib/kodieren.svelte';
  import { herunterladen } from '../lib/export';
  import { artText, artenIn, codesImProtokoll, methodenanhangWord, protokollWord, protokollZeilen } from '../lib/nachvollziehbarkeit';
  import { KI_ZWECKE, type KiNutzung, type KiZweck, type QualProjekt } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    q: QualProjekt;
    /** das ganze Projekt für den Methodenanhang (im Einzelfall-Modus zeigt `q` nur den aktuellen Fall; das Word betrifft alle Fälle und geht nicht ins DOM) */
    ganz?: QualProjekt;
  }
  let { q, ganz }: Props = $props();

  const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const SCHRITT = 50;
  const wordProtokoll = new Laedt(), wordAnhang = new Laedt();

  let art = $state('');
  let code = $state('');
  let zeigeN = $state(SCHRITT);

  const alle = $derived(protokollZeilen(q, sprache()));
  const zeilen = $derived(protokollZeilen(q, sprache(), { art, code }));
  const sichtbar = $derived(zeilen.slice(0, zeigeN));
  const arten = $derived(artenIn(q));
  const codes = $derived(codesImProtokoll(q, sprache()));
  /** Zähler nach dem Filtern über `sage` (die Seite hat keine eigenen Live-Regionen, Abnahme Opus 13.11.) */
  function filterGeaendert() { zeigeN = SCHRITT; setTimeout(() => sage(zaehler), 0); }
  const zaehler = $derived(L(`${zeilen.length} von ${alle.length} Einträgen`, `${zeilen.length} of ${alle.length} entries`));

  const dateiname = (teil: string): string => {
    const n = (q.name || 'Statable').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Statable';
    return `${n} - ${teil}.docx`;
  };

  async function protokollSpeichern() {
    await wordProtokoll.mit(async () => {
      const name = dateiname(L('Änderungsprotokoll', 'Change log'));
      herunterladen(await protokollWord(q, sprache(), { art, code }), name, WORD);
      sage(L(`${name} wird heruntergeladen.`, `${name} is being downloaded.`));
    });
  }
  async function anhangSpeichern() {
    await wordAnhang.mit(async () => {
      const name = dateiname(L('Methodenanhang', 'Methods appendix'));
      herunterladen(await methodenanhangWord(ganz ?? q, sprache()), name, WORD);
      sage(L(`${name} wird heruntergeladen.`, `${name} is being downloaded.`));
    });
  }

  /* ---- KI-Nutzung: fehlt = noch nicht angegeben (nie dasselbe wie „nicht genutzt“) ---- */
  type KiWahl = 'offen' | 'nein' | 'ja';
  const kiWahl = $derived<KiWahl>(!q.kiNutzung ? 'offen' : q.kiNutzung.genutzt ? 'ja' : 'nein');
  const ZWECK_TEXT: Record<KiZweck, { de: string; en: string }> = {
    transkription: { de: 'Transkription', en: 'Transcription' },
    uebersetzung: { de: 'Übersetzung', en: 'Translation' },
    anderes: { de: 'Anderes', en: 'Other' },
  };

  function setzeKi(f: (alt: KiNutzung | undefined) => KiNutzung | undefined) {
    aendereOhneStapel(p => {
      const neu = f(p.kiNutzung);
      const r = { ...p };
      if (neu) r.kiNutzung = { ...neu, geaendert: Date.now(), ...(p.ich ? { kodierende: p.ich } : {}) };
      else delete r.kiNutzung;
      return r;
    });
  }
  function waehleKi(w: KiWahl) {
    if (w === kiWahl) return;
    if (w === 'offen') setzeKi(() => undefined);
    else if (w === 'nein') setzeKi(() => ({ genutzt: false, zwecke: [], geaendert: 0 }));
    else setzeKi(alt => ({ genutzt: true, zwecke: alt?.zwecke ?? [], ...(alt?.text ? { text: alt.text } : {}), geaendert: 0 }));
    sage(w === 'offen' ? L('KI-Angabe entfernt: noch nicht angegeben.', 'AI statement removed: not yet stated.') : w === 'nein' ? L('Gespeichert: keine KI genutzt.', 'Saved: no AI used.') : L('Gespeichert: KI genutzt. Bitte Zwecke und Werkzeug beschreiben.', 'Saved: AI used. Please describe the purposes and the tool.'));
  }
  function schalteZweck(z: KiZweck, an: boolean) {
    setzeKi(alt => {
      const zw = (alt?.zwecke ?? []).filter(x => x !== z);
      return { genutzt: true, zwecke: an ? KI_ZWECKE.filter(x => x === z || zw.includes(x)) : zw, ...(alt?.text ? { text: alt.text } : {}), geaendert: 0 };
    });
  }
  function setzeKiText(t: string) {
    setzeKi(alt => {
      const r: KiNutzung = { genutzt: true, zwecke: alt?.zwecke ?? [], geaendert: 0 };
      if (t.trim()) r.text = t;
      return r;
    });
  }
</script>

<div class="nv">
  <section class="teil" aria-labelledby="nv-prot-t">
    <h3 id="nv-prot-t" data-nolink>{L('Wer hat wann was am Codebuch geändert? (Änderungsprotokoll, Audit Trail)', 'Who changed what in the codebook, and when? (Change log, audit trail)')}</h3>
    {#if !alle.length}
      <p class="hilfe">{L('Es gibt noch keine Einträge. Sobald Sie Codes anlegen oder ändern, schreibt Statable hier mit.', 'There are no entries yet. As soon as you create or change codes, Statable records it here.')}</p>
    {:else}
      <div class="filter">
        <div class="feld-zeile">
          <label for="nv-art">{L('Art der Änderung', 'Type of change')}</label>
          <select id="nv-art" bind:value={art} onchange={filterGeaendert}>
            <option value="">{L('Alle', 'All')}</option>
            {#each arten as a (a)}<option value={a}>{artText(a, sprache())}</option>{/each}
          </select>
        </div>
        <div class="feld-zeile">
          <label for="nv-code">Code</label>
          <select id="nv-code" bind:value={code} onchange={filterGeaendert}>
            <option value="">{L('Alle', 'All')}</option>
            {#each codes as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
          </select>
        </div>
      </div>
      <p id="nv-zaehler" class="hilfe">{zaehler}</p>
      {#if !zeilen.length}
        <p class="hilfe">{L('Kein Eintrag passt zu diesen Filtern.', 'No entry matches these filters.')}</p>
      {:else}
        <div class="tabelle-rahmen" role="region" tabindex="0" aria-label={L('Änderungsprotokoll', 'Change log')}>
          <table class="tab">
            <caption data-nolink>{L('Änderungen am Codebuch, neueste zuerst', 'Changes to the codebook, newest first')}</caption>
            <thead>
              <tr>
                <th scope="col">{L('Zeit', 'Time')}</th>
                <th scope="col">{L('Person', 'Person')}</th>
                <th scope="col">{L('Art', 'Type')}</th>
                <th scope="col">Code</th>
                <th scope="col">{L('Vorher', 'Before')}</th>
                <th scope="col">{L('Nachher', 'After')}</th>
              </tr>
            </thead>
            <tbody>
              {#each sichtbar as z, i (z.zeit + z.art + z.code + i)}
                <tr>
                  <td>{z.zeitText}</td><td>{z.person}</td><td>{z.artText}</td><td>{z.codeName}</td><td>{z.vorher}</td><td>{z.nachher}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if zeilen.length > zeigeN}
          <div class="knopfzeile"><button class="k" id="nv-mehr" type="button" onclick={() => { zeigeN += SCHRITT; sage(L(`${Math.min(zeigeN, zeilen.length)} Einträge werden gezeigt.`, `${Math.min(zeigeN, zeilen.length)} entries are shown.`)); }}>{L('Weitere 50 zeigen', 'Show 50 more')}</button></div>
        {/if}
      {/if}
      <div class="knopfzeile">
        <button class="k" id="nv-prot-word" type="button" aria-disabled={wordProtokoll.aktiv ? 'true' : undefined} onclick={() => { if (!wordProtokoll.aktiv) void protokollSpeichern(); }}><Icon n="download" />{L('Als Word speichern', 'Save as Word')}</button>
      </div>
      {#if wordProtokoll.sichtbar}<p class="hilfe"><Rechnet text={L('Word-Datei wird erzeugt …', 'Creating the Word file …')} /></p>{/if}
    {/if}
  </section>

  <div class="teil">
    <h3 id="nv-ki-t" tabindex="-1" data-nolink>{L('Haben Sie KI genutzt? (KI-Nutzung offenlegen)', 'Did you use AI? (Disclosing AI use)')}</h3>
    <p class="hilfe">{L('Diese Angabe machen nur Sie. Statable füllt sie nie selbst aus. Sie steht im Methodenanhang.', 'Only you make this statement. Statable never fills it in itself. It appears in the methods appendix.')}</p>
    <fieldset class="auswahl">
      <legend>{L('KI-Nutzung', 'Use of AI')}</legend>
      <label class="radio"><input type="radio" name="nv-ki" value="offen" checked={kiWahl === 'offen'} onchange={() => waehleKi('offen')}>{L('Noch nicht angegeben', 'Not yet stated')}</label>
      <label class="radio"><input type="radio" name="nv-ki" value="nein" checked={kiWahl === 'nein'} onchange={() => waehleKi('nein')}>{L('Nein, keine KI genutzt', 'No, no AI used')}</label>
      <label class="radio"><input type="radio" name="nv-ki" value="ja" checked={kiWahl === 'ja'} onchange={() => waehleKi('ja')}>{L('Ja', 'Yes')}</label>
    </fieldset>
    {#if kiWahl === 'ja'}
      <fieldset class="auswahl">
        <legend>{L('Wofür wurde KI genutzt?', 'What was AI used for?')}</legend>
        {#each KI_ZWECKE as z (z)}
          <label class="radio"><input type="checkbox" checked={q.kiNutzung?.zwecke.includes(z) ?? false} onchange={(e) => schalteZweck(z, e.currentTarget.checked)}>{L(ZWECK_TEXT[z].de, ZWECK_TEXT[z].en)}</label>
        {/each}
      </fieldset>
      <div class="feld">
        <label for="nv-ki-text">{L('Wofür und mit welchem Werkzeug? Dieser Text steht wörtlich im Methodenanhang.', 'What for, and with which tool? This text appears word for word in the methods appendix.')}</label>
        <textarea id="nv-ki-text" rows="4" value={q.kiNutzung?.text ?? ''} oninput={(e) => setzeKiText(e.currentTarget.value)}></textarea>
      </div>
    {/if}
  </div>

  <section class="teil" aria-labelledby="nv-anh-t">
    <h3 id="nv-anh-t" data-nolink>{L('Methodenanhang (Word)', 'Methods appendix (Word)')}</h3>
    <p class="hilfe">{L('Der Anhang enthält: Kodierende, Codebaum, gekürztes Änderungsprotokoll, Hinweis zur Übereinstimmung, Ihre KI-Angabe, was nicht in der REFI-QDA-Datei steht, Einwilligung (nur ja oder nein je Fall), Protokolle (nur Art und Zahl), Feinstrukturanalysen und Typen. Nie Text aus Ihren Dokumenten.', 'The appendix contains: coders, code tree, shortened change log, a note on agreement, your AI statement, what is not in the REFI-QDA file, consent (only yes or no per case), protocols (only type and number), fine structure analyses and types. Never text from your documents.')}</p>
    <div class="knopfzeile">
      <button class="k haupt" id="nv-anh-word" type="button" aria-disabled={wordAnhang.aktiv ? 'true' : undefined} onclick={() => { if (!wordAnhang.aktiv) void anhangSpeichern(); }}><Icon n="download" />{L('Methodenanhang als Word speichern', 'Save methods appendix as Word')}</button>
    </div>
    {#if wordAnhang.sichtbar}<p class="hilfe"><Rechnet text={L('Methodenanhang wird erzeugt …', 'Creating the methods appendix …')} /></p>{/if}
  </section>
</div>

<style>
  .nv { display: flex; flex-direction: column; gap: var(--a4); min-width: 0; }
  .teil { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .filter { display: flex; flex-wrap: wrap; gap: var(--a3); }
  .feld-zeile { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2); }
  .feld { display: flex; flex-direction: column; gap: var(--a2); }
  .feld textarea { width: 100%; box-sizing: border-box; font: inherit; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .auswahl { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .auswahl legend { padding: 0; margin-bottom: var(--a2); font-weight: 600; }
  .radio { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .radio input[type="checkbox"], .radio input[type="radio"], select { min-width: 24px; min-height: 24px; }
  .tabelle-rahmen { overflow-x: auto; }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab caption { text-align: start; font-weight: 600; padding-bottom: var(--a2); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: top; overflow-wrap: anywhere; }
</style>
