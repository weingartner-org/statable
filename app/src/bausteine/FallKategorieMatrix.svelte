<script lang="ts">
  /**
   * Fall-Kategorie-Matrix (Stufe 6c, Fachblatt 3.3; Framework-Analyse): Zeilen sind Fälle, Spalten sind Codes, in der Zelle steht die eigene Zusammenfassung
   * und die Zahl der Belege. Ein Knopf je Zelle öffnet die Belege UNTER der Tabelle (nie in der Zelle) und das Feld „Zusammenfassung“.
   * Die Zusammenfassungen schreibt der Mensch selbst; Statable fasst nichts zusammen. Speichern über `aendere()` (Rückgängig). Word über `fallKategorieWord`.
   * Schmal (ENG): statt der Tabelle eine Liste je Fall. Ansagen nur über `sage()`.
   */
  import { tick } from 'svelte';
  import { L, Lp, d } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { herunterladen } from '../lib/export';
  import { Laedt } from '../lib/laedt.svelte';
  import { baumReihenfolge } from '../lib/kodieren';
  import { themenReihenfolge } from '../lib/themen';
  import { fallKategorieMatrix, setzeZusammenfassung, type FkBeleg } from '../lib/kodieren-ansichten';
  import { fallKategorieWord } from '../lib/kodieren-word';
  import { absatzNr, aendere, sprache } from '../lib/kodieren.svelte';
  import type { Personen } from '../lib/qualauswertung';
  import type { QualProjekt } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    q: QualProjekt;
    personen: Personen;
    /** Name der gewählten Person(en) für den Satz im Word */
    personName: string;
    zeige: (b: FkBeleg) => void;
  }
  let { q, personen, personName, zeige }: Props = $props();

  const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const lade = new Laedt();
  const baum = $derived(baumReihenfolge(q.codes));

  let mitUnter = $state(true);
  let mitBelegen = $state(false);
  let gewaehlt = $state<string[]>([]);
  let angefangen = $state(false);

  /* Voreinstellung: alle Codes der obersten Ebene, die Belege haben (einmal) */
  $effect(() => {
    if (angefangen || !q.codes.length) return;
    const mitB = new Set(baum.map(e => e.code.id));
    const alle = fallKategorieMatrix(q, { codes: baum.filter(e => e.ebene === 1).map(e => e.code.id), kodierende: 'alle', mitUntercodes: true });
    const ids = alle.spalten.map(s => s.code).filter((c, i) => mitB.has(c) && alle.zellen.some(z => z[i]!.belege.length > 0));
    gewaehlt = ids;
    angefangen = true;
  });

  /* Spalten: Codes oder Themen (Framework-Analyse). Themen nur, wenn es nicht verworfene gibt. */
  const themaIds = $derived(themenReihenfolge(q).filter(e => e.thema.stand !== 'verworfen').map(e => e.thema.id));
  let spaltenArt = $state<'codes' | 'themen'>('codes');
  const mitThemen = $derived(spaltenArt === 'themen' && themaIds.length > 0);
  const art = $derived<'code' | 'thema'>(mitThemen ? 'thema' : 'code');
  const spaltenCodes = $derived(baum.map(e => e.code.id).filter(id => gewaehlt.includes(id)));
  const m = $derived(fallKategorieMatrix(q, { codes: spaltenCodes, kodierende: personen, mitUntercodes: mitUnter, ...(mitThemen ? { themen: themaIds } : {}) }));
  const nSpalten = $derived(mitThemen ? themaIds.length : spaltenCodes.length);
  function waehleArt(a: 'codes' | 'themen') {
    if (a === spaltenArt) return;
    spaltenArt = a; wahl = null;
    sage(a === 'themen' ? L('Spalten sind jetzt Themen.', 'Columns are now themes.') : L('Spalten sind jetzt Codes.', 'Columns are now codes.'));
  }

  /* gewählte Zelle */
  let wahl = $state<{ zeile: string; code: string } | null>(null);
  let entwurf = $state('');
  const zi = $derived(wahl ? m.zeilen.findIndex(z => z.id === wahl!.zeile) : -1);
  const si = $derived(wahl ? m.spalten.findIndex(s => s.code === wahl!.code) : -1);
  const zelle = $derived(zi >= 0 && si >= 0 ? m.zellen[zi]![si]! : null);
  const zeileName = $derived(zi >= 0 ? m.zeilen[zi]!.name : '');
  const spalteName = $derived(si >= 0 ? m.spalten[si]!.name : '');

  const nBelege = (n: number): string => Lp(n, '1 Beleg', `${n} Belege`, '1 passage', `${n} passages`);
  const kurz = (t: string): string => (t.length > 120 ? t.slice(0, 120).trimEnd() + '…' : t);
  const docName = (id: string): string => q.dokumente.find(x => x.id === id)?.name ?? '';
  const absatzVon = (b: FkBeleg): number => absatzNr(q.dokumente.find(x => x.id === b.dokument)?.text ?? '', b.start);
  const istGewaehlt = (zeile: string, code: string): boolean => wahl?.zeile === zeile && wahl?.code === code;

  async function oeffne(zeile: string, code: string) {
    const z = m.zeilen.findIndex(x => x.id === zeile), s = m.spalten.findIndex(x => x.code === code);
    wahl = { zeile, code };
    entwurf = m.zellen[z]?.[s]?.zusammenfassung ?? '';
    await tick(); await tick();
    const h = document.getElementById('ko-fk-zelle-t');
    h?.scrollIntoView({ block: 'nearest' });
    h?.focus();
  }

  function speichern() {
    if (!wahl || !zelle) return;
    const { zeile, code } = wahl;
    const leer = entwurf.trim() === '';
    const name = L(`${zeileName}, ${spalteName}`, `${zeileName}, ${spalteName}`);
    aendere(L(`Zusammenfassung „${name}“ zurückgenommen`, `Summary "${name}" undone`), q0 => setzeZusammenfassung(q0, zeile, code, entwurf, q0.ich, art));
    sage(leer ? L('Zusammenfassung gelöscht.', 'Summary deleted.') : L('Zusammenfassung gespeichert.', 'Summary saved.'));
  }

  function alleCodes(an: boolean) { gewaehlt = an ? q.codes.map(c => c.id) : []; }

  async function alsWord() {
    await lade.mit(async () => {
      try {
        const bytes = await fallKategorieWord(m, { sprache: sprache(), personen: personName, mitUntercodes: mitUnter, mitBelegen, themen: mitThemen });
        const datei = sprache() === 'de' ? 'Fall-Kategorie-Matrix.docx' : 'Case-by-category-matrix.docx';
        herunterladen(bytes, datei, MIME_DOCX);
        sage(L(`${datei} wird heruntergeladen.`, `${datei} is being downloaded.`));
      } catch {
        sage(L('Die Word-Datei konnte nicht erstellt werden.', 'The Word file could not be created.'), 'dringend');
      }
    });
  }
</script>

<div class="fk" role="group" aria-label={L('Fall-Kategorie-Matrix', 'Case-by-category matrix')}>
  <h3 id="ko-fk-t">{L('Fall-Kategorie-Matrix', 'Case-by-category matrix')}</h3>
  {#if !q.codes.length}
    <p class="hilfe">{L('Es gibt noch keine Codes. Kodieren Sie zuerst Textstellen.', 'There are no codes yet. Code some passages first.')}</p>
  {:else}
    <p class="hilfe">{L('Jede Zeile ist ein Fall, jede Spalte ein Code. In jeder Zelle sehen Sie, was dieser Fall zu diesem Thema sagt: Sie öffnen die Belege und schreiben eine Zusammenfassung.', 'Each row is a case, each column a code. In each cell you see what this case says on this topic: you open the passages and write a summary.')}</p>
    <p class="hilfe">{d('Die Zusammenfassungen schreibst du selbst. Statable fasst nichts zusammen.', 'Die Zusammenfassungen schreiben Sie selbst. Statable fasst nichts zusammen.', 'You write the summaries yourself. Statable does not summarise anything.')}</p>

    <fieldset class="gruppe">
      <legend id="ko-fk-codes-leg">{mitThemen ? L(`Themen (${themaIds.length} Spalten)`, `Themes (${themaIds.length} columns)`) : L(`Codes (${spaltenCodes.length} von ${q.codes.length} gewählt)`, `Codes (${spaltenCodes.length} of ${q.codes.length} chosen)`)}</legend>
      {#if themaIds.length}
        <div role="radiogroup" aria-labelledby="ko-fk-art-leg" class="art">
          <span id="ko-fk-art-leg" class="art-t">{L('Spalten', 'Columns')}:</span>
          <label class="schalter"><input type="radio" name="ko-fk-art" value="codes" checked={spaltenArt === 'codes'} onchange={() => waehleArt('codes')}>{L('Codes', 'Codes')}</label>
          <label class="schalter"><input type="radio" name="ko-fk-art" value="themen" checked={spaltenArt === 'themen'} onchange={() => waehleArt('themen')}>{L('Themen (themes)', 'Themes')}</label>
        </div>
      {/if}
      {#if mitThemen}
        <p class="hilfe">{L('Die Spalten sind Ihre Themen (Kandidaten und aktive, ohne verworfene). Als Belege stehen zuerst die Stellen, die Sie gewählt haben, dann die Stellen mit Codes des Themas.', 'The columns are your themes (candidate and active, not discarded). Passages you chose come first, then passages coded with a code of the theme.')}</p>
      {:else}
        <div class="knopfzeile">
          <button class="k klein" type="button" onclick={() => alleCodes(true)}>{L('Alle Codes wählen', 'Choose all codes')}</button>
          <button class="k klein" type="button" onclick={() => alleCodes(false)}>{L('Keinen Code wählen', 'Choose no code')}</button>
        </div>
        {#each baum as e (e.code.id)}
          <label class="schalter" style="padding-inline-start: {(e.ebene - 1) * 1.25}rem"><input type="checkbox" value={e.code.id} bind:group={gewaehlt}><span data-nolink>{e.code.name}</span></label>
        {/each}
        <label class="schalter"><input id="ko-fk-unter" type="checkbox" bind:checked={mitUnter}>{L('Untercodes mitnehmen', 'Include subcodes')}</label>
      {/if}
    </fieldset>

    {#if !nSpalten}
      <p class="hilfe">{L('Wählen Sie mindestens einen Code.', 'Choose at least one code.')}</p>
    {:else if !m.zeilen.length}
      <p class="hilfe">{L('Es gibt noch keine Fälle und keine Dokumente.', 'There are no cases and no documents yet.')}</p>
    {:else}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="rahmen fk-tabelle" role="region" tabindex="0" aria-label={L('Fall-Kategorie-Matrix, seitlich scrollbar', 'Case-by-category matrix, scrollable sideways')}>
        <table class="tab">
          <caption class="nur-vorleser">{L(`Fall-Kategorie-Matrix: ${m.zeilen.length} Zeilen (Fälle), ${m.spalten.length} Spalten (${mitThemen ? 'Themen' : 'Codes'}). Jede Zelle hat einen Knopf mit der Zahl der Belege.`, `Case-by-category matrix: ${m.zeilen.length} rows (cases), ${m.spalten.length} columns (${mitThemen ? 'themes' : 'codes'}). Each cell has a button with the number of passages.`)}</caption>
          <thead><tr><th scope="col">{L('Fall', 'Case')}</th>{#each m.spalten as sp (sp.code)}<th scope="col" data-nolink>{sp.name}</th>{/each}</tr></thead>
          <tbody>
            {#each m.zeilen as z, i (z.id)}
              <tr>
                <th scope="row" data-nolink>{z.name}</th>
                {#each m.spalten as sp, j (sp.code)}
                  {@const c = m.zellen[i]![j]!}
                  <td>
                    <button class="k zelle" type="button" aria-current={istGewaehlt(z.id, sp.code) ? 'true' : undefined} onclick={() => void oeffne(z.id, sp.code)}>{nBelege(c.belege.length)}</button>
                    {#if c.zusammenfassung !== undefined}<p class="zus" data-nolink>{kurz(c.zusammenfassung)}</p>{/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- schmal: statt der Tabelle eine Liste je Fall -->
      <div class="fk-liste">
        {#each m.zeilen as z, i (z.id)}
          <h4 data-nolink>{z.name}</h4>
          <ul>
            {#each m.spalten as sp, j (sp.code)}
              {@const c = m.zellen[i]![j]!}
              <li>
                <span data-nolink>{sp.name}</span>:
                {#if c.zusammenfassung !== undefined}<span data-nolink>{kurz(c.zusammenfassung)}</span> {/if}
                <button class="k zelle" type="button" aria-current={istGewaehlt(z.id, sp.code) ? 'true' : undefined} onclick={() => void oeffne(z.id, sp.code)}>{nBelege(c.belege.length)}</button>
              </li>
            {/each}
          </ul>
        {/each}
      </div>

      {#if wahl && zelle}
        <section class="zelle-teil" aria-label={L('Belege und Zusammenfassung der Zelle', 'Passages and summary of the cell')}>
          <h4 id="ko-fk-zelle-t" tabindex="-1" data-nolink>{L(`${zeileName}, ${spalteName}`, `${zeileName}, ${spalteName}`)}</h4>
          {#if zelle.belege.length}
            <ul class="belege">
              {#each zelle.belege as b, i (b.segment)}
                <li>
                  <span class="klein" data-nolink>{L(`${docName(b.dokument)}, Absatz ${absatzVon(b)}`, `${docName(b.dokument)}, paragraph ${absatzVon(b)}`)}</span>
                  <q class="zitat" data-nolink>{b.text}</q>
                  <button class="k" type="button" onclick={() => zeige(b)}>{L(`Im Text zeigen (Beleg ${i + 1})`, `Show in the text (passage ${i + 1})`)}</button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="hilfe">{L('Zu dieser Zelle gibt es keine Belege.', 'There are no passages for this cell.')}</p>
          {/if}
          <div class="feld">
            <label for="ko-fk-zus">{L(`Zusammenfassung für ${zeileName}, ${spalteName}`, `Summary for ${zeileName}, ${spalteName}`)}</label>
            <textarea id="ko-fk-zus" rows="4" bind:value={entwurf}></textarea>
          </div>
          <div class="knopfzeile"><button class="k haupt" id="ko-fk-speichern" type="button" onclick={speichern}>{L('Speichern', 'Save')}</button></div>
        </section>
      {/if}

      <fieldset class="gruppe">
        <legend>{L('Matrix als Word', 'Matrix as Word')}</legend>
        <label class="schalter"><input id="ko-fk-belege-word" type="checkbox" bind:checked={mitBelegen} aria-describedby="ko-fk-zitat-h">{L('Belege mitnehmen', 'Include passages')}</label>
        <p class="hilfe" id="ko-fk-zitat-h">{mitBelegen ? L('Die Datei enthält wörtliche Zitate.', 'The file contains verbatim quotes.') : L('Ohne Belege enthält die Datei nur Ihre Zusammenfassungen.', 'Without passages the file only holds your summaries.')}</p>
        <div class="knopfzeile"><button class="k" id="ko-fk-word" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void alsWord(); }}>{#if lade.sichtbar}<Rechnet imKnopf />{:else}<Icon n="download" />{/if}{L('Matrix als Word', 'Matrix as Word')}</button></div>
        {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Datei wird erstellt …', 'Creating the file …')} /></p>{/if}
      </fieldset>
    {/if}
  {/if}
</div>

<style>
  .fk { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  h4 { margin: var(--a2) 0 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .gruppe { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .gruppe legend { font-weight: 600; padding: 0 var(--a1); }
  .schalter { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .schalter input[type="checkbox"] { min-width: 24px; min-height: 24px; }
  .art { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a3); align-items: center; }
  .art-t { font-weight: 600; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: top; min-width: 7rem; }
  .tab thead th { font-weight: 650; }
  .tab tbody th { font-weight: 600; }
  .zus { margin: var(--a1) 0 0; overflow-wrap: anywhere; }
  .zelle[aria-current="true"] { border-width: 2px; font-weight: 700; }
  .fk-liste { display: none; }
  .fk-liste ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--a2); }
  :global(:root.eng-600) .fk-tabelle { display: none; }
  :global(:root.eng-600) .fk-liste { display: block; }
  .zelle-teil { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); }
  .belege { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--a3); }
  .belege li { display: flex; flex-direction: column; gap: var(--a1); align-items: flex-start; }
  .zitat { white-space: pre-wrap; overflow-wrap: anywhere; }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  textarea { width: 100%; box-sizing: border-box; }
</style>
