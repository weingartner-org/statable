<script lang="ts">
  /**
   * Fälle und Fallvariablen (Stufe 6b2, Fachblatt 3.7): Tabelle mit Kopfzeile (Fall | Dokumente | eine Spalte je Variable), Eingabefelder mit Namen „‹Variable› für ‹Fall›«,
   * Prüfung über `liesWert` beim Verlassen des Feldes, Fehler am Feld. „Neuer Fall“ und „Neue Variable“ ohne Dialog. Änderungen über `aendere()`; Ansagen nur über `sage()`.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { benenneFallUm, benenneVariableUm, entferneFall, entferneVariable, fallNameFrei, legeFallAn, legeVariableAn, liesWert, setzeWert, variableNameFrei } from '../lib/kodieren';
  import { aendere, sprache } from '../lib/kodieren.svelte';
  import type { Fall, QualProjekt, Variable } from '../lib/qualprojekt';

  interface Props {
    q: QualProjekt;
    /** nach dem Anlegen eines Falls (die Seite ordnet ihn auf Wunsch dem offenen Dokument zu) */
    neuerFall: (id: string) => void;
  }
  let { q, neuerFall }: Props = $props();

  const typen: { wert: Variable['typ']; de: string; en: string }[] = [
    { wert: 'text', de: 'Text', en: 'Text' },
    { wert: 'ja/nein', de: 'Ja/Nein', en: 'Yes/No' },
    { wert: 'ganzzahl', de: 'Ganze Zahl', en: 'Whole number' },
    { wert: 'zahl', de: 'Zahl', en: 'Number' },
    { wert: 'datum', de: 'Datum', en: 'Date' },
  ];

  export function fokussiereFallName() { document.getElementById('ko-fall-name')?.focus(); }

  const formatiere = (w: string | number | boolean | null | undefined, typ: Variable['typ']): string => {
    if (w === null || w === undefined) return '';
    if (typeof w === 'boolean') return w ? L('ja', 'yes') : L('nein', 'no');
    if (typeof w === 'number') return typ === 'zahl' && sprache() === 'de' ? String(w).replace('.', ',') : String(w);
    return String(w);
  };

  /* Eingaben, die (noch) nicht gültig sind, bleiben stehen */
  let eingabe = $state<Record<string, string>>({});
  let fehlerJe = $state<Record<string, string>>({});
  const schluessel = (f: string, v: string): string => `${f}|${v}`;

  function pruefe(f: Fall, v: Variable, roh: string) {
    const k = schluessel(f.id, v.id);
    const r = liesWert(roh, v.typ, sprache());
    const name = L(`${v.name} für ${f.name}`, `${v.name} for ${f.name}`);
    if (!r.ok) {
      eingabe = { ...eingabe, [k]: roh };
      fehlerJe = { ...fehlerJe, [k]: r.grund };
      sage(`${name}: ${r.grund}`, 'dringend');
      return;
    }
    const e = { ...eingabe }; delete e[k]; eingabe = e;
    const fe = { ...fehlerJe }; delete fe[k]; fehlerJe = fe;
    if ((f.werte[v.id] ?? null) === r.wert) return;
    aendere(L(`Wert „${name}“ zurückgesetzt`, `Value "${name}" reset`), q0 => setzeWert(q0, f.id, v.id, r.wert));
    sage(r.wert === null ? L(`${name}: Wert gelöscht.`, `${name}: value cleared.`) : L(`${name}: gespeichert.`, `${name}: saved.`));
  }

  /* ---- Neuer Fall ---- */
  let fallName = $state('');
  let fallFehler = $state('');
  async function neuerFallAnlegen() {
    const n = fallName.trim();
    if (!n) { fallFehler = L('Bitte einen Namen für den Fall eingeben.', 'Please enter a name for the case.'); sage(fallFehler, 'dringend'); document.getElementById('ko-fall-name')?.focus(); return; }
    if (q.faelle.some(f => f.name.trim().toLowerCase() === n.toLowerCase())) { fallFehler = L('Einen Fall mit diesem Namen gibt es schon.', 'A case with this name exists already.'); sage(fallFehler, 'dringend'); document.getElementById('ko-fall-name')?.focus(); return; }
    fallFehler = '';
    let id = '';
    aendere(L(`Neuer Fall „${n}“ wieder entfernt`, `New case "${n}" removed again`), q0 => { const r = legeFallAn(q0, n); id = r.id; return r.q; });
    fallName = '';
    neuerFall(id);
    sage(L(`Fall „${n}“ angelegt.`, `Case "${n}" created.`));
    await tick();
  }

  /* ---- Neue Variable ---- */
  let varName = $state('');
  let varTyp = $state<Variable['typ']>('text');
  let varFehler = $state('');
  function neueVariableAnlegen() {
    const n = varName.trim();
    if (!n) { varFehler = L('Bitte einen Namen für die Variable eingeben.', 'Please enter a name for the variable.'); sage(varFehler, 'dringend'); document.getElementById('ko-var-name')?.focus(); return; }
    if (q.variablen.some(v => v.name.trim().toLowerCase() === n.toLowerCase())) { varFehler = L('Eine Variable mit diesem Namen gibt es schon.', 'A variable with this name exists already.'); sage(varFehler, 'dringend'); document.getElementById('ko-var-name')?.focus(); return; }
    varFehler = '';
    const typ = varTyp;
    aendere(L(`Neue Variable „${n}“ wieder entfernt`, `New variable "${n}" removed again`), q0 => legeVariableAn(q0, n, typ).q);
    varName = '';
    sage(L(`Variable „${n}“ angelegt. In der Tabelle gibt es eine neue Spalte.`, `Variable "${n}" created. The table has a new column.`));
  }

  /* ---- Umbenennen (Feld an derselben Stelle, kein Dialog) ---- */
  type Ziel = { art: 'fall' | 'var'; id: string };
  let umZiel = $state<Ziel | null>(null);
  let umName = $state('');
  let umFehler = $state('');
  const gleich = (a: Ziel | null, art: Ziel['art'], id: string): boolean => a?.art === art && a.id === id;
  async function frageUmbenennen(art: Ziel['art'], id: string) {
    loeschZiel = null;
    umZiel = { art, id };
    umName = art === 'fall' ? q.faelle.find(f => f.id === id)?.name ?? '' : q.variablen.find(v => v.id === id)?.name ?? '';
    umFehler = '';
    await tick(); await tick();
    const e = document.getElementById('ko-um-feld') as HTMLInputElement | null;
    e?.focus(); e?.select();
  }
  async function umbenennenZurueck(art: Ziel['art'], id: string) {
    umZiel = null; umFehler = '';
    await tick();
    document.getElementById(`ko-um-btn-${art}-${id}`)?.focus();
  }
  async function uebernimmUmbenennen() {
    const z = umZiel; if (!z) return;
    const n = umName.trim();
    const alt = z.art === 'fall' ? q.faelle.find(f => f.id === z.id)?.name ?? '' : q.variablen.find(v => v.id === z.id)?.name ?? '';
    if (n === alt) { await umbenennenZurueck(z.art, z.id); return; }
    const frei = z.art === 'fall' ? fallNameFrei(q, n, z.id) : variableNameFrei(q, n, z.id);
    if (!frei) {
      umFehler = n === '' ? L('Bitte einen Namen eingeben.', 'Please enter a name.')
        : z.art === 'fall' ? L('Einen Fall mit diesem Namen gibt es schon.', 'A case with this name exists already.') : L('Eine Variable mit diesem Namen gibt es schon.', 'A variable with this name exists already.');
      sage(umFehler, 'dringend');
      document.getElementById('ko-um-feld')?.focus();
      return;
    }
    if (z.art === 'fall') aendere(L(`Umbenennen von „${alt}“ zurückgenommen`, `Renaming of "${alt}" undone`), q0 => benenneFallUm(q0, z.id, n));
    else aendere(L(`Umbenennen von „${alt}“ zurückgenommen`, `Renaming of "${alt}" undone`), q0 => benenneVariableUm(q0, z.id, n));
    await umbenennenZurueck(z.art, z.id);
    sage(L(`Umbenannt: „${alt}“ heißt jetzt „${n}“.`, `Renamed: "${alt}" is now called "${n}".`));
  }
  const umTaste = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); void uebernimmUmbenennen(); }
    else if (e.key === 'Escape' && umZiel) { e.preventDefault(); void umbenennenZurueck(umZiel.art, umZiel.id); }
  };

  /* ---- Löschen mit Rückfragezeile ---- */
  let loeschZiel = $state<Ziel | null>(null);
  const loeschName = $derived(loeschZiel ? (loeschZiel.art === 'fall' ? q.faelle.find(f => f.id === loeschZiel!.id)?.name : q.variablen.find(v => v.id === loeschZiel!.id)?.name) ?? '' : '');
  const loeschFrage = $derived.by(() => {
    const z = loeschZiel; if (!z) return '';
    if (z.art === 'fall') {
      const nd = q.dokumente.filter(x => x.fall === z.id).length;
      const nz = (q.zusammenfassungen ?? []).filter(x => x.zeile === z.id).length;
      const a = nd > 0 ? L(`${Lp(nd, '1 Dokument verliert', `${nd} Dokumente verlieren`, '', '')} die Zuordnung.`, `${Lp(nd, '', '', '1 document loses', `${nd} documents lose`)} the assignment.`) : L('Kein Dokument gehört zu diesem Fall.', 'No document belongs to this case.');
      const b = nz > 0 ? L(` ${Lp(nz, '1 Zusammenfassung fällt', `${nz} Zusammenfassungen fallen`, '', '')} weg.`, ` ${Lp(nz, '', '', '1 summary is', `${nz} summaries are`)} removed.`) : '';
      return L(`Fall „${loeschName}“ löschen? ${a}${b} Die Werte des Falls fallen weg, Memos bleiben erhalten.`, `Delete case "${loeschName}"? ${a}${b} The values of the case are removed, memos are kept.`);
    }
    const nw = q.faelle.filter(f => f.werte[z.id] !== undefined && f.werte[z.id] !== null).length;
    return L(`Variable „${loeschName}“ löschen? ${Lp(nw, 'Der Wert von 1 Fall fällt', `Die Werte von ${nw} Fällen fallen`, '', '')} weg.`, `Delete variable "${loeschName}"? ${Lp(nw, '', '', 'The value of 1 case is removed.', `The values of ${nw} cases are removed.`)}`);
  });
  async function frageLoeschen(art: Ziel['art'], id: string) {
    umZiel = null; umFehler = '';
    loeschZiel = { art, id };
    await tick(); await tick();
    document.getElementById('ko-fv-behalten')?.focus();
  }
  async function loeschenJetzt() {
    const z = loeschZiel; if (!z) return;
    const n = loeschName;
    if (z.art === 'fall') aendere(L(`Löschen von Fall „${n}“ zurückgenommen`, `Deleting case "${n}" undone`), q0 => entferneFall(q0, z.id));
    else aendere(L(`Löschen von Variable „${n}“ zurückgenommen`, `Deleting variable "${n}" undone`), q0 => entferneVariable(q0, z.id));
    loeschZiel = null;
    await tick();
    document.getElementById(z.art === 'fall' ? 'ko-fall-name' : 'ko-var-name')?.focus();
    sage(z.art === 'fall' ? L(`Fall „${n}“ gelöscht.`, `Case "${n}" deleted.`) : L(`Variable „${n}“ gelöscht.`, `Variable "${n}" deleted.`));
  }
  async function behalten() {
    const z = loeschZiel; loeschZiel = null;
    await tick();
    if (z) { document.getElementById(`ko-um-btn-${z.art}-${z.id}`)?.focus(); sage(z.art === 'fall' ? L('Fall behalten.', 'Case kept.') : L('Variable behalten.', 'Variable kept.')); }
  }
  const loeschTaste = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); void behalten(); } };

  const dokumenteVon = (f: Fall): string => q.dokumente.filter(d => d.fall === f.id).map(d => d.name).join(', ');
</script>

<p class="hilfe">{L('Fallvariablen sind Angaben zu einer Person oder einem Fall, zum Beispiel Alter oder Studienfach. Damit können Sie Belege filtern und später Zahlen und Texte verbinden.', 'Case variables are details about a person or a case, for example age or field of study. With them you can filter passages and later connect numbers and texts.')}</p>

{#if q.faelle.length}
  <div class="tabelle-rahmen">
    <table id="ko-faelle" class="tab">
      <caption class="nur-vorleser">{L('Fälle und ihre Fallvariablen', 'Cases and their case variables')}</caption>
      <thead>
        <tr>
          <th scope="col">{L('Fall', 'Case')}</th><th scope="col">{L('Dokumente', 'Documents')}</th>
          {#each q.variablen as v (v.id)}<th scope="col" data-nolink>{v.name}</th>{/each}
          <th scope="col">{L('Aktionen', 'Actions')}</th>
        </tr>
      </thead>
      <tbody>
        {#each q.faelle as f (f.id)}
          <tr>
            <th scope="row" data-nolink>{f.name}</th>
            <td data-nolink>{dokumenteVon(f) || '-'}</td>
            {#each q.variablen as v (v.id)}
              {@const k = schluessel(f.id, v.id)}
              <td>
                <input type="text" autocomplete="off" class="wert" aria-label={L(`${v.name} für ${f.name}`, `${v.name} for ${f.name}`)} value={eingabe[k] ?? formatiere(f.werte[v.id], v.typ)}
                  aria-invalid={fehlerJe[k] ? 'true' : undefined} aria-describedby={fehlerJe[k] ? `ko-fv-f-${k}` : undefined} onchange={(e) => pruefe(f, v, e.currentTarget.value)}>
                {#if fehlerJe[k]}<span class="fehl" id="ko-fv-f-{k}">{fehlerJe[k]}</span>{/if}
              </td>
            {/each}
            <td class="aktion">
              {#if gleich(umZiel, 'fall', f.id)}
                {@render umFeld(L(`Neuer Name für Fall ${f.name}`, `New name for case ${f.name}`))}
              {:else}
                <button class="k klein" id="ko-um-btn-fall-{f.id}" type="button" onclick={() => void frageUmbenennen('fall', f.id)}>{L(`Fall „${f.name}“ umbenennen`, `Rename case "${f.name}"`)}</button>
                <button class="k klein" type="button" onclick={() => void frageLoeschen('fall', f.id)}>{L(`Fall „${f.name}“ löschen`, `Delete case "${f.name}"`)}</button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p class="hilfe">{L('Es gibt noch keine Fälle. Ein Fall ist zum Beispiel eine befragte Person. Legen Sie unten den ersten an.', 'There are no cases yet. A case is for example an interviewed person. Create the first one below.')}</p>
{/if}

{#if q.variablen.length}
  <h3 id="ko-fv-var-t">{L('Variablen', 'Variables')}</h3>
  <ul class="varliste" aria-labelledby="ko-fv-var-t">
    {#each q.variablen as v (v.id)}
      <li>
        {#if gleich(umZiel, 'var', v.id)}
          {@render umFeld(L(`Neuer Name für Variable ${v.name}`, `New name for variable ${v.name}`))}
        {:else}
          <span data-nolink>{v.name}</span>
          <button class="k klein" id="ko-um-btn-var-{v.id}" type="button" onclick={() => void frageUmbenennen('var', v.id)}>{L(`Variable „${v.name}“ umbenennen`, `Rename variable "${v.name}"`)}</button>
          <button class="k klein" type="button" onclick={() => void frageLoeschen('var', v.id)}>{L(`Variable „${v.name}“ löschen`, `Delete variable "${v.name}"`)}</button>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

{#if loeschZiel}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Esc ist nur eine zusätzliche Abkürzung für „Abbrechen“) -->
  <div class="rueckfrage" role="group" aria-labelledby="ko-fv-loeschen-t" onkeydown={loeschTaste}>
    <p id="ko-fv-loeschen-t" data-nolink>{loeschFrage}</p>
    <div class="knopfzeile">
      <button class="k" type="button" onclick={() => void loeschenJetzt()}>{L('Ja, löschen', 'Yes, delete')}</button>
      <button class="k haupt" id="ko-fv-behalten" type="button" onclick={() => void behalten()}>{L('Abbrechen', 'Cancel')}</button>
    </div>
  </div>
{/if}

{#snippet umFeld(beschriftung: string)}
  <div class="umfeld">
    <label class="nur-vorleser" for="ko-um-feld">{beschriftung}</label>
    <input id="ko-um-feld" type="text" autocomplete="off" bind:value={umName} onkeydown={umTaste} aria-invalid={umFehler ? 'true' : undefined} aria-describedby={umFehler ? 'ko-um-fehler' : undefined}>
    {#if umFehler}<span class="fehl" id="ko-um-fehler">{umFehler}</span>{/if}
    <button class="k klein haupt" type="button" onclick={() => void uebernimmUmbenennen()}>{L('Übernehmen', 'Apply')}</button>
    <button class="k klein" type="button" onclick={() => { if (umZiel) void umbenennenZurueck(umZiel.art, umZiel.id); }}>{L('Abbrechen', 'Cancel')}</button>
  </div>
{/snippet}

<div class="neu">
  <div class="feld">
    <label for="ko-fall-name">{L('Name des neuen Falls', 'Name of the new case')}</label>
    <input id="ko-fall-name" type="text" autocomplete="off" bind:value={fallName} aria-invalid={fallFehler ? 'true' : undefined} aria-describedby={fallFehler ? 'ko-fall-fehler' : undefined}
      onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void neuerFallAnlegen(); } }}>
    {#if fallFehler}<p class="fehl" id="ko-fall-fehler">{fallFehler}</p>{/if}
  </div>
  <div class="knopfzeile"><button class="k" id="ko-fall-neu" type="button" onclick={() => void neuerFallAnlegen()}>{L('Neuer Fall', 'New case')}</button></div>
</div>

<div class="neu">
  <div class="feld">
    <label for="ko-var-name">{L('Name der neuen Variable', 'Name of the new variable')}</label>
    <input id="ko-var-name" type="text" autocomplete="off" bind:value={varName} aria-invalid={varFehler ? 'true' : undefined} aria-describedby={varFehler ? 'ko-var-fehler' : undefined}>
    {#if varFehler}<p class="fehl" id="ko-var-fehler">{varFehler}</p>{/if}
  </div>
  <div class="feld">
    <label for="ko-var-typ">{L('Art der Angabe', 'Kind of value')}</label>
    <select id="ko-var-typ" bind:value={varTyp}>{#each typen as t (t.wert)}<option value={t.wert}>{L(t.de, t.en)}</option>{/each}</select>
  </div>
  <div class="knopfzeile"><button class="k" id="ko-var-neu" type="button" onclick={neueVariableAnlegen}>{L('Neue Variable', 'New variable')}</button></div>
</div>

<style>
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; display: block; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .tabelle-rahmen { overflow-x: auto; }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: top; }
  .wert { width: 100%; min-width: 6rem; box-sizing: border-box; }
  .neu { display: flex; flex-direction: column; gap: var(--a2); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  select, input[type="checkbox"] { min-height: 24px; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .aktion { white-space: normal; }
  .aktion .k { margin-inline-end: var(--a2); margin-bottom: var(--a1); }
  .varliste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .varliste li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2); }
  .umfeld { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2); }
  .rueckfrage { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); }
  .rueckfrage p { margin: 0; }
</style>
