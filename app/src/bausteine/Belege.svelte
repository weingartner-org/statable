<script lang="ts">
  /**
   * Belege je Code (Stufe 6b2, Fachblatt 3.5): Untercodes einschließen, Filter je Fallvariable, „nur meine“ (kommt von der Seite), Sprung in den Text,
   * Code entfernen (nur eigene), Memo zum Beleg und „Belege als Word“. Das Entfernen läuft über `aendere()` (Rückgängig). Ansagen nur über `sage()`.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { herunterladen } from '../lib/export';
  import { codePfad, belegeGefiltert, entferneKodierung, type BelegMitCode } from '../lib/kodieren';
  import { aendere, kuerzen, sprache } from '../lib/kodieren.svelte';
  import { belegeWord } from '../lib/kodieren-word';
  import type { QualProjekt } from '../lib/qualprojekt';

  interface Props {
    q: QualProjekt;
    belCode: string;
    /** nur Kodierungen dieser Person (`undefined` = alle) */
    nurWer: string | undefined;
    zeige: (b: BelegMitCode, nr: number) => void;
    memo: (b: BelegMitCode, nr: number) => void;
  }
  let { q, belCode = $bindable(), nurWer, zeige, memo }: Props = $props();

  const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const nStellen = (n: number): string => Lp(n, '1 Stelle', `${n} Stellen`, '1 passage', `${n} passages`);

  let unter = $state(false);
  /** je Variable (id) der gewählte Wert als Schlüssel (JSON); leer = alle */
  let filt = $state<Record<string, string>>({});

  const wertAnzeige = (w: string | number | boolean | null): string => (typeof w === 'boolean' ? (w ? L('ja', 'yes') : L('nein', 'no')) : typeof w === 'number' ? (sprache() === 'de' ? String(w).replace('.', ',') : String(w)) : String(w ?? ''));

  /** Variablen mit mindestens einem Wert, mit den vorkommenden Werten */
  const filterVars = $derived(q.variablen.map(v => {
    const m = new Map<string, string | number | boolean>();
    for (const f of q.faelle) { const w = f.werte[v.id]; if (w !== undefined && w !== null) m.set(JSON.stringify(w), w); }
    const opt = [...m.entries()].sort((a, b) => (typeof a[1] === 'number' && typeof b[1] === 'number' ? a[1] - b[1] : String(a[1]).localeCompare(String(b[1]), sprache())));
    return { v, opt };
  }).filter(x => x.opt.length));

  const werte = $derived(filterVars.flatMap(({ v }) => {
    const k = filt[v.id];
    return k ? [{ variable: v.id, wert: JSON.parse(k) as string | number | boolean }] : [];
  }));
  const filterText = $derived(werte.map(w => `${q.variablen.find(v => v.id === w.variable)?.name ?? ''} = ${wertAnzeige(w.wert)}`).join(', '));

  const liste = $derived(q && belCode ? belegeGefiltert(q, belCode, { untercodes: unter, ...(nurWer !== undefined ? { nurKodierende: nurWer } : {}), ...(werte.length ? { werte } : {}) }) : []);
  const codeName = $derived(belCode ? codePfad(q.codes, belCode) : '');
  const zaehle = (id: string): number => belegeGefiltert(q, id, nurWer !== undefined ? { nurKodierende: nurWer } : {}).length;
  const docName = (id: string): string => q.dokumente.find(d => d.id === id)?.name ?? '';
  const fallName = (dokId: string): string => { const f = q.dokumente.find(d => d.id === dokId)?.fall; return f ? q.faelle.find(x => x.id === f)?.name ?? '' : ''; };

  /** Eigene Kodierung hinter einem Beleg (fremde lassen sich hier nicht entfernen) */
  function eigene(kodId: string): string | undefined {
    const k0 = q.kodierungen.find(k => k.id === kodId);
    if (!k0 || !q.ich) return undefined;
    return q.kodierungen.find(k => k.segment === k0.segment && k.code === k0.code && k.kodierende === q.ich)?.id;
  }
  const hatFremde = $derived(liste.some(b => !eigene(b.kodierung)));

  async function entferne(i: number) {
    const b = liste[i];
    const kid = b ? eigene(b.kodierung) : undefined;
    if (!b || !kid) return;
    const name = codePfad(q.codes, b.code);
    aendere(L(`Code „${name}“ bei Absatz ${b.absatz} wieder gegeben`, `Code "${name}" at paragraph ${b.absatz} assigned again`), q0 => entferneKodierung(q0, kid));
    sage(L(`Code „${name}“ entfernt. Noch ${nStellen(liste.length)}.`, `Code "${name}" removed. ${nStellen(liste.length)} left.`));
    await tick();
    const knoepfe = document.querySelectorAll<HTMLElement>('#ko-bel-liste .ko-bel-zeigen');
    (knoepfe[Math.min(i, knoepfe.length - 1)] ?? document.getElementById('ko-bel-code'))?.focus();
  }

  async function alsWord() {
    try {
      const sp = sprache();
      const zeilen = liste.map(b => ({
        dokument: docName(b.dokument), fall: fallName(b.dokument),
        stelle: sp === 'de' ? `Absatz ${b.absatz}` : `Paragraph ${b.absatz}`, text: b.text,
        ...(unter ? { code: codePfad(q.codes, b.code) } : {}),
      }));
      const bytes = await belegeWord(zeilen, { code: codeName, ...(filterText ? { filter: filterText } : {}), sprache: sp });
      const datei = `Belege-${codeName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'Code'}.docx`;
      herunterladen(bytes, datei, MIME_DOCX);
      sage(L(`${datei} wird heruntergeladen.`, `${datei} is being downloaded.`));
    } catch {
      sage(L('Die Word-Datei konnte nicht erstellt werden.', 'The Word file could not be created.'), 'dringend');
    }
  }
</script>

{#if q.codes.length}
  <div class="feld-zeile">
    <label for="ko-bel-code">{L('Belege zu Code', 'Passages for code')}</label>
    <select id="ko-bel-code" bind:value={belCode}>
      {#each q.codes as c (c.id)}<option value={c.id}>{codePfad(q.codes, c.id)} ({zaehle(c.id)})</option>{/each}
    </select>
  </div>
  <label class="radio"><input id="ko-bel-unter" type="checkbox" bind:checked={unter}>{L('Untercodes einschließen', 'Include subcodes')}</label>
  {#if filterVars.length}
    <fieldset id="ko-bel-filter" class="filter">
      <legend>{L('Filter nach Fallvariablen', 'Filter by case variables')}</legend>
      {#each filterVars as { v, opt } (v.id)}
        <div class="feld-zeile">
          <label for="ko-bel-f-{v.id}">{v.name}</label>
          <select id="ko-bel-f-{v.id}" value={filt[v.id] ?? ''} onchange={(e) => (filt = { ...filt, [v.id]: e.currentTarget.value })}>
            <option value="">{L('alle', 'all')}</option>
            {#each opt as [k, w] (k)}<option value={k}>{wertAnzeige(w)}</option>{/each}
          </select>
        </div>
      {/each}
    </fieldset>
  {/if}
  {#if liste.length}
    <ol id="ko-bel-liste" data-nolink class="belege" aria-label={filterText ? L(`Belege zu „${codeName}“, ${nStellen(liste.length)} (gefiltert: ${filterText})`, `Passages for "${codeName}", ${nStellen(liste.length)} (filtered: ${filterText})`) : L(`Belege zu „${codeName}“, ${nStellen(liste.length)}`, `Passages for "${codeName}", ${nStellen(liste.length)}`)}>
      {#each liste as b, i (b.kodierung)}
        {@const fall = fallName(b.dokument)}
        <li>
          <span>{L(`${docName(b.dokument)}${fall ? ` (Fall ${fall})` : ''}, Absatz ${b.absatz}: „${kuerzen(b.text, 200)}“${unter ? ` – Code: ${codePfad(q.codes, b.code)}` : ''}`, `${docName(b.dokument)}${fall ? ` (case ${fall})` : ''}, paragraph ${b.absatz}: "${kuerzen(b.text, 200)}"${unter ? ` - code: ${codePfad(q.codes, b.code)}` : ''}`)}</span>
          <span class="knopfzeile">
            <button class="k ko-bel-zeigen" type="button" aria-label={L(`Im Text zeigen: Beleg ${i + 1}`, `Show in text: passage ${i + 1}`)} onclick={() => zeige(b, i)}>{L('Im Text zeigen', 'Show in text')}</button>
            <button class="k leise" type="button" aria-label={L(`Memo: Beleg ${i + 1}`, `Memo: passage ${i + 1}`)} onclick={() => memo(b, i)}>{L('Memo', 'Memo')}</button>
            {#if eigene(b.kodierung)}<button class="k leise ko-bel-entfernen" type="button" aria-label={L(`Code entfernen: Beleg ${i + 1}`, `Remove code: passage ${i + 1}`)} onclick={() => void entferne(i)}>{L('Code entfernen', 'Remove code')}</button>{/if}
          </span>
        </li>
      {/each}
    </ol>
    <div class="knopfzeile"><button class="k" id="ko-bel-word" type="button" onclick={() => void alsWord()}>{L('Belege als Word', 'Passages as Word')}</button></div>
    {#if hatFremde}<p class="hilfe">{L('Kodierungen anderer Personen ändern Sie über den Konsens auf der Seite „Interviews“.', 'Coding by other people is changed via the consensus on the "Interviews" page.')}</p>{/if}
  {:else}<p class="hilfe">{L('Zu diesem Code gibt es noch keine Stellen (mit diesen Einstellungen).', 'There are no passages for this code with these settings.')}</p>{/if}
{:else}
  <p class="hilfe">{L('Es gibt noch keine Codes. Legen Sie in der Code-Leiste einen neuen an.', 'There are no codes yet. Create one in the code bar.')}</p>
{/if}

<style>
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .feld-zeile { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .radio { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .radio input[type="checkbox"], select { min-width: 24px; min-height: 24px; }
  .filter { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; }
  .belege { margin: 0; padding-inline-start: var(--a5); display: flex; flex-direction: column; gap: var(--a3); }
  .belege li { display: flex; flex-direction: column; gap: var(--a2); }
</style>
