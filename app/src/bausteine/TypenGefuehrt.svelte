<script lang="ts">
  /**
   * Geführte typenbildende Inhaltsanalyse (Stufe A1, nach Kuckartz und Rädiker): drei Schritte. Statable bildet keine Typen, schlägt keine vor und clustert nicht.
   * Es zeigt den Merkmalsraum (welche Kombinationen kommen vor, welche Fälle), die Person entscheidet, benennt und ordnet zu. Ein Fall liegt in höchstens einem Typ.
   * Speichern über `aendere()` (Rückgängig). Ansagen nur über `sage()`, kein modales Fenster, Löschen mit Bestätigung im Text.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { herunterladen } from '../lib/export';
  import { Laedt } from '../lib/laedt.svelte';
  import { ganzZahl } from '../i18n/profil';
  import { baumReihenfolge } from '../lib/kodieren';
  import { aendere, sprache } from '../lib/kodieren.svelte';
  import { MERKMALE_MAX, aendereTyp, entferneTyp, evaluativeKategorien, faelleOhneTyp, legeTypAn, merkmalsraum, ordneFaelleZu, typVonFall, typenWord } from '../lib/inhaltsanalyse-gefuehrt';
  import type { QualProjekt } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  interface Props { q: QualProjekt }
  let { q }: Props = $props();

  const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const lade = new Laedt();

  const baum = $derived(baumReihenfolge(q.codes));
  const kategorien = $derived(new Set(evaluativeKategorien(q).map(k => k.id)));
  let gewaehlt = $state<string[]>([]);
  const merkmale = $derived(gewaehlt.filter(id => q.codes.some(c => c.id === id) || q.variablen.some(v => v.id === id)));
  let zuViele = $state(false);
  const raum = $derived(merkmalsraum(q, merkmale, sprache()));
  const typen = $derived(q.typen ?? []);
  const ohne = $derived(faelleOhneTyp(q));
  const merkmalName = (id: string): string => q.codes.find(c => c.id === id)?.name ?? q.variablen.find(v => v.id === id)?.name ?? '';

  let neuName = $state('');
  let neuBesch = $state('');
  let neuFehler = $state('');
  let entwurf = $state<Record<string, { name: string; besch: string }>>({});
  let fehlerJe = $state<Record<string, string>>({});
  let loeschen = $state<string | null>(null);

  function waehle(id: string, an: boolean, el: HTMLInputElement) {
    if (an && merkmale.length >= MERKMALE_MAX) {
      el.checked = false; zuViele = true;
      sage(L(`Höchstens ${MERKMALE_MAX} Merkmale. Nehmen Sie zuerst eines heraus.`, `At most ${MERKMALE_MAX} attributes. Remove one first.`), 'dringend');
      return;
    }
    zuViele = false;
    gewaehlt = an ? [...gewaehlt.filter(x => x !== id), id] : gewaehlt.filter(x => x !== id);
    sage(an ? L(`Merkmal „${merkmalName(id)}“ gewählt. ${gewaehlt.length} von ${MERKMALE_MAX}.`, `Attribute "${merkmalName(id)}" chosen. ${gewaehlt.length} of ${MERKMALE_MAX}.`) : L(`Merkmal „${merkmalName(id)}“ herausgenommen.`, `Attribute "${merkmalName(id)}" removed.`));
  }

  const fehlerText = (k: string): string =>
    k === 'name-leer' ? L('Bitte einen Namen für den Typ eingeben.', 'Please enter a name for the type.')
      : k === 'name-vergeben' ? L('Diesen Typ-Namen gibt es schon. Jeder Typ braucht einen eigenen Namen.', 'This type name exists already. Each type needs its own name.')
        : L('Das hat nicht geklappt.', 'That did not work.');

  async function anlegen() {
    neuFehler = '';
    try {
      const name = neuName.trim();
      let id = '';
      aendere(L(`Typ „${name}“ wieder entfernt`, `Type "${name}" removed again`), q0 => { const r = legeTypAn(q0, neuName, merkmale, neuBesch); id = r.id; return r.q; });
      neuName = ''; neuBesch = '';
      sage(L(`Typ „${name}“ angelegt. Ordnen Sie ihm unten Fälle zu.`, `Type "${name}" created. Assign cases to it below.`));
      await tick(); await tick();
      document.getElementById(`ko-ty-typ-${id}`)?.focus();
    } catch (e) {
      neuFehler = fehlerText(e instanceof Error ? e.message : '');
      sage(neuFehler, 'dringend');
      document.getElementById('ko-ty-neu-name')?.focus();
    }
  }

  function speichern(id: string, alt: string) {
    const e = entwurf[id];
    if (!e) return;
    try {
      aendere(L(`Änderung am Typ „${alt}“ zurückgenommen`, `Change to type "${alt}" undone`), q0 => aendereTyp(q0, id, { name: e.name, beschreibung: e.besch }));
      fehlerJe[id] = '';
      delete entwurf[id];
      sage(L(`Typ „${e.name.trim()}“ gespeichert.`, `Type "${e.name.trim()}" saved.`));
    } catch (x) {
      fehlerJe[id] = fehlerText(x instanceof Error ? x.message : '');
      sage(fehlerJe[id]!, 'dringend');
      document.getElementById(`ko-ty-name-${id}`)?.focus();
    }
  }

  async function frageLoeschen(id: string) {
    loeschen = id;
    sage(L('Wirklich löschen? Die Fälle bleiben erhalten, sie sind dann ohne Typ.', 'Really delete? The cases are kept, they are then without a type.'));
    await tick();
    document.getElementById(`ko-ty-ja-${id}`)?.focus();
  }

  async function loesche(id: string, name: string) {
    aendere(L(`Typ „${name}“ wieder angelegt`, `Type "${name}" restored`), q0 => entferneTyp(q0, id));
    loeschen = null;
    sage(L(`Typ „${name}“ gelöscht.`, `Type "${name}" deleted.`));
    await tick();
    document.getElementById('ko-ty-s3-t')?.focus();
  }

  function zuordnen(typId: string, typName: string, fallId: string, an: boolean) {
    const fall = q.faelle.find(f => f.id === fallId)?.name ?? '';
    let umgezogen: { vonTyp: string }[] = [];
    aendere(an ? L(`Fall „${fall}“ nicht mehr im Typ „${typName}“`, `Case "${fall}" no longer in type "${typName}"`) : L(`Fall „${fall}“ wieder im Typ „${typName}“`, `Case "${fall}" back in type "${typName}"`), q0 => { const r = ordneFaelleZu(q0, typId, [fallId], an); umgezogen = r.umgezogen; return r.q; });
    sage(!an ? L(`Fall „${fall}“ aus dem Typ „${typName}“ genommen.`, `Case "${fall}" taken out of type "${typName}".`)
      : umgezogen.length ? L(`Fall „${fall}“ aus dem Typ „${umgezogen[0]!.vonTyp}“ in den Typ „${typName}“ verschoben.`, `Case "${fall}" moved from type "${umgezogen[0]!.vonTyp}" to type "${typName}".`)
        : L(`Fall „${fall}“ dem Typ „${typName}“ zugeordnet.`, `Case "${fall}" assigned to type "${typName}".`));
  }

  async function alsWord() {
    await lade.mit(async () => {
      try {
        const bytes = await typenWord(q, sprache());
        const datei = sprache() === 'de' ? 'Typen-von-Faellen.docx' : 'Types-of-cases.docx';
        herunterladen(bytes, datei, MIME_DOCX);
        sage(L(`${datei} wird heruntergeladen.`, `${datei} is being downloaded.`));
      } catch {
        sage(L('Die Word-Datei konnte nicht erstellt werden.', 'The Word file could not be created.'), 'dringend');
      }
    });
  }

  const nFaelle = (n: number): string => Lp(n, '1 Fall', `${ganzZahl(n)} Fälle`, '1 case', `${ganzZahl(n)} cases`);
</script>

<div class="ty" role="group" aria-label={L('Typenbildende Inhaltsanalyse', 'Type-building content analysis')}>
  <h3 id="ko-ty-t">{L('Welche Typen von Fällen gibt es? (typenbildende Inhaltsanalyse)', 'What types of cases are there? (type-building content analysis)')}</h3>
  <p class="hilfe">{L('Sie wählen Merkmale, sehen, welche Kombinationen vorkommen, und entscheiden selbst, welche Fälle zusammengehören.', 'You choose attributes, see which combinations occur, and decide yourself which cases belong together.')}</p>

  <ol class="schritte">
    <li>
      <h3 id="ko-ty-s1-t" tabindex="-1">{L('Schritt 1: Nach welchen Merkmalen gruppieren Sie? (Merkmalsraum)', 'Step 1: By which attributes do you group? (attribute space)')}</h3>
      {#if !q.codes.length && !q.variablen.length}
        <p class="hilfe">{L('Es gibt noch keine Codes und keine Fallvariablen. Kodieren Sie Textstellen oder legen Sie Fallvariablen an.', 'There are no codes and no case variables yet. Code passages or create case variables.')}</p>
      {:else}
        <p class="hilfe" id="ko-ty-m-h">{L(`Wählen Sie ein bis ${MERKMALE_MAX} Merkmale (${merkmale.length} gewählt). Bei einem Code zählt, ob der Fall eine Textstelle dazu hat; bei einer Kategorie mit Ausprägungen zählt die Ausprägung des Falls; bei einer Variable ihr Wert.`, `Choose one to ${MERKMALE_MAX} attributes (${merkmale.length} chosen). For a code it counts whether the case has a passage for it; for a category with ratings the rating of the case counts; for a variable its value.`)}</p>
        {#if zuViele}<p class="fehl">{L(`Es sind höchstens ${MERKMALE_MAX} Merkmale möglich. Nehmen Sie zuerst eines heraus.`, `At most ${MERKMALE_MAX} attributes are possible. Remove one first.`)}</p>{/if}
        <fieldset class="gruppe">
          <legend id="ko-ty-codes-leg">{L('Codes', 'Codes')}</legend>
          {#each baum as e (e.code.id)}
            <label class="schalter" style="padding-inline-start: {(e.ebene - 1) * 1.25}rem"><input type="checkbox" checked={gewaehlt.includes(e.code.id)} aria-describedby="ko-ty-m-h" onchange={ev => waehle(e.code.id, ev.currentTarget.checked, ev.currentTarget)}><span data-nolink>{e.code.name}{kategorien.has(e.code.id) ? L(' (Kategorie mit Ausprägungen)', ' (category with ratings)') : ''}</span></label>
          {/each}
        </fieldset>
        {#if q.variablen.length}
          <fieldset class="gruppe">
            <legend>{L('Fallvariablen', 'Case variables')}</legend>
            {#each q.variablen as v (v.id)}
              <label class="schalter"><input type="checkbox" checked={gewaehlt.includes(v.id)} aria-describedby="ko-ty-m-h" onchange={ev => waehle(v.id, ev.currentTarget.checked, ev.currentTarget)}><span data-nolink>{v.name}</span></label>
            {/each}
          </fieldset>
        {/if}
      {/if}
    </li>

    <li>
      <h3 id="ko-ty-s2-t" tabindex="-1">{L('Schritt 2: Welche Fälle haben welche Merkmale?', 'Step 2: Which cases have which attributes?')}</h3>
      <p class="hilfe">{L('Statable bildet keine Typen. Sie entscheiden, welche Fälle zusammengehören, und geben dem Typ einen Namen.', 'Statable does not form types. You decide which cases belong together and give the type a name.')}</p>
      {#if !raum.zeilen.length}
        <p class="hilfe">{!merkmale.length ? L('Wählen Sie in Schritt 1 mindestens ein Merkmal.', 'Choose at least one attribute in step 1.') : L('Es gibt noch keine Fälle.', 'There are no cases yet.')}</p>
      {:else}
        <div class="rahmen" role="region" tabindex="0" aria-label={L('Merkmalsraum, seitlich scrollbar', 'Attribute space, scrollable sideways')}>
          <table class="tab">
            <caption class="nur-vorleser">{L(`Merkmalsraum: ${raum.zeilen.length} Kombinationen aus ${raum.merkmale.length} Merkmalen. Je Kombination die Zahl und die Namen der Fälle.`, `Attribute space: ${raum.zeilen.length} combinations of ${raum.merkmale.length} attributes. For each combination the number and the names of the cases.`)}</caption>
            <thead>
              <tr>
                {#each raum.merkmale as m (m.id)}<th scope="col" data-nolink>{m.name}</th>{/each}
                <th scope="col">{L('Zahl der Fälle', 'Number of cases')}</th><th scope="col">{L('Fälle', 'Cases')}</th>
              </tr>
            </thead>
            <tbody>
              {#each raum.zeilen as z, i (i)}
                <tr>
                  {#each z.werte as w, j (j)}{#if j === 0}<th scope="row" data-nolink>{w}</th>{:else}<td data-nolink>{w}</td>{/if}{/each}
                  <td>{ganzZahl(z.anzahl)}</td><td data-nolink>{z.faelle.map(f => f.name).join(', ')}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </li>

    <li>
      <h3 id="ko-ty-s3-t" tabindex="-1">{L('Schritt 3: Typen bilden und benennen (Typenbildung)', 'Step 3: Form and name types (type building)')}</h3>
      <fieldset class="gruppe">
        <legend>{L('Neuen Typ anlegen', 'Create a new type')}</legend>
        <div class="feld">
          <label for="ko-ty-neu-name">{L('Name des Typs', 'Name of the type')}</label>
          <input id="ko-ty-neu-name" type="text" bind:value={neuName} aria-describedby={neuFehler ? 'ko-ty-neu-fehler' : undefined} aria-invalid={neuFehler ? 'true' : undefined}>
        </div>
        <div class="feld">
          <label for="ko-ty-neu-besch">{L('Beschreibung (freiwillig)', 'Description (optional)')}</label>
          <textarea id="ko-ty-neu-besch" rows="3" bind:value={neuBesch}></textarea>
        </div>
        {#if neuFehler}<p class="fehl" id="ko-ty-neu-fehler">{neuFehler}</p>{/if}
        <p class="hilfe">{merkmale.length ? L(`Der Typ merkt sich die gewählten Merkmale: ${merkmale.map(merkmalName).join(', ')}.`, `The type remembers the chosen attributes: ${merkmale.map(merkmalName).join(', ')}.`) : L('Der Typ merkt sich keine Merkmale, weil in Schritt 1 keine gewählt sind.', 'The type remembers no attributes because none are chosen in step 1.')}</p>
        <div class="knopfzeile"><button class="k" id="ko-ty-neu-btn" type="button" onclick={() => void anlegen()}>{L('Typ anlegen', 'Create type')}</button></div>
      </fieldset>

      {#if !typen.length}
        <p class="hilfe">{L('Es gibt noch keinen Typ.', 'There is no type yet.')}</p>
      {/if}
      {#each typen as t (t.id)}
        {@const e = entwurf[t.id]}
        <section class="typ" aria-labelledby="ko-ty-typ-{t.id}">
          <h4 id="ko-ty-typ-{t.id}" tabindex="-1" data-nolink>{t.name} ({nFaelle(t.faelle.length)})</h4>
          {#if t.merkmale.length}<p class="klein" data-nolink>{L('Merkmale', 'Attributes')}: {t.merkmale.map(merkmalName).join(', ')}</p>{/if}
          <div class="feld">
            <label for="ko-ty-name-{t.id}">{L('Name', 'Name')}</label>
            <input id="ko-ty-name-{t.id}" type="text" value={e?.name ?? t.name} oninput={ev => (entwurf[t.id] = { name: ev.currentTarget.value, besch: e?.besch ?? t.beschreibung ?? '' })} aria-describedby={fehlerJe[t.id] ? `ko-ty-f-${t.id}` : undefined} aria-invalid={fehlerJe[t.id] ? 'true' : undefined}>
          </div>
          <div class="feld">
            <label for="ko-ty-besch-{t.id}">{L('Beschreibung', 'Description')}</label>
            <textarea id="ko-ty-besch-{t.id}" rows="3" value={e?.besch ?? t.beschreibung ?? ''} oninput={ev => (entwurf[t.id] = { name: e?.name ?? t.name, besch: ev.currentTarget.value })}></textarea>
          </div>
          {#if fehlerJe[t.id]}<p class="fehl" id="ko-ty-f-{t.id}">{fehlerJe[t.id]}</p>{/if}
          <div class="knopfzeile">
            <button class="k" type="button" aria-disabled={e ? undefined : 'true'} onclick={() => { if (e) speichern(t.id, t.name); else sage(L('Es gibt keine Änderung zu speichern.', 'There is no change to save.')); }}>{L(`Typ „${t.name}“ speichern`, `Save type "${t.name}"`)}</button>
            <button class="k" type="button" onclick={() => void frageLoeschen(t.id)}>{L(`Typ „${t.name}“ löschen`, `Delete type "${t.name}"`)}</button>
          </div>
          {#if loeschen === t.id}
            <div class="bestaetigung" role="group" aria-label={L('Löschen bestätigen', 'Confirm deleting')}>
              <p>{L(`Typ „${t.name}“ wirklich löschen? Die ${nFaelle(t.faelle.length)} bleiben erhalten und sind dann ohne Typ.`, `Really delete type "${t.name}"? The ${nFaelle(t.faelle.length)} are kept and then have no type.`)}</p>
              <div class="knopfzeile">
                <button class="k haupt" id="ko-ty-ja-{t.id}" type="button" onclick={() => void loesche(t.id, t.name)}>{L('Ja, Typ löschen', 'Yes, delete type')}</button>
                <button class="k" type="button" onclick={() => { loeschen = null; sage(L('Nicht gelöscht.', 'Not deleted.')); document.getElementById(`ko-ty-typ-${t.id}`)?.focus(); }}>{L('Abbrechen', 'Cancel')}</button>
              </div>
            </div>
          {/if}
          {#if q.faelle.length}
            <fieldset class="gruppe">
              <legend>{L(`Fälle im Typ „${t.name}“`, `Cases in type "${t.name}"`)}</legend>
              {#each q.faelle as f (f.id)}
                {@const anderer = typVonFall(q, f.id)}
                <label class="schalter"><input type="checkbox" checked={t.faelle.includes(f.id)} aria-describedby={anderer && anderer.id !== t.id ? `ko-ty-in-${t.id}-${f.id}` : undefined} onchange={ev => zuordnen(t.id, t.name, f.id, ev.currentTarget.checked)}><span data-nolink>{f.name}</span></label>
                {#if anderer && anderer.id !== t.id}<span class="klein hinweis" id="ko-ty-in-{t.id}-{f.id}" data-nolink>{L(`jetzt in Typ ${anderer.name}`, `now in type ${anderer.name}`)}</span>{/if}
              {/each}
            </fieldset>
          {/if}
        </section>
      {/each}

      <h4 id="ko-ty-ohne-t">{L('Fälle ohne Typ', 'Cases without a type')}</h4>
      {#if !q.faelle.length}
        <p class="hilfe">{L('Es gibt noch keine Fälle.', 'There are no cases yet.')}</p>
      {:else if !ohne.length}
        <p class="hilfe">{L('Alle Fälle haben einen Typ.', 'All cases have a type.')}</p>
      {:else}
        <ul class="liste" aria-labelledby="ko-ty-ohne-t">{#each ohne as f (f.id)}<li data-nolink>{f.name}</li>{/each}</ul>
      {/if}

      <p class="hilfe">{L('Die Word-Datei enthält Typen, Beschreibungen, Fälle und Merkmalswerte, keine Zitate.', 'The Word file holds types, descriptions, cases and attribute values, no quotes.')}</p>
      <div class="knopfzeile"><button class="k" id="ko-ty-word" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void alsWord(); }}>{#if lade.sichtbar}<Rechnet imKnopf />{:else}<Icon n="download" />{/if}{L('Typen als Word', 'Types as Word')}</button></div>
      {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Datei wird erstellt …', 'Creating the file …')} /></p>{/if}
    </li>
  </ol>
</div>

<style>
  .ty { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  h4 { margin: var(--a2) 0 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  .schritte { margin: 0; padding-inline-start: var(--a4, 1.5rem); display: flex; flex-direction: column; gap: var(--a4, 1.5rem); }
  .schritte > li { display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .hinweis { padding-inline-start: 1.75rem; }
  .fehl { margin: 0; font-weight: 600; }
  .gruppe { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .gruppe legend { font-weight: 600; padding: 0 var(--a1); }
  .schalter { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .schalter input[type="checkbox"] { min-width: 24px; min-height: 24px; }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  .feld input, textarea { width: 100%; box-sizing: border-box; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .typ { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); display: flex; flex-direction: column; gap: var(--a2); }
  .bestaetigung { border: 2px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a2) var(--a3); display: flex; flex-direction: column; gap: var(--a2); }
  .bestaetigung p { margin: 0; }
  .liste { margin: 0; padding-inline-start: var(--a4, 1.5rem); }
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: top; }
  .tab thead th { font-weight: 650; }
  .tab tbody th { font-weight: 600; }
</style>
