<script lang="ts">
  /**
   * Geführte evaluative Inhaltsanalyse (Stufe A1, nach Kuckartz und Rädiker): drei Schritte. Eine evaluative Kategorie ist ein Code mit Untercodes als Ausprägungen.
   * Der Mensch stuft jede Textstelle selbst ein; Statable schlägt nichts vor, es ordnet nur an und zählt. Speichern über `aendere()` (Rückgängig).
   * Texte aus den Dokumenten stehen nur hier in der Ansicht, nie in der Word-Datei. Ansagen nur über `sage()`, kein modales Fenster.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { herunterladen } from '../lib/export';
  import { Laedt } from '../lib/laedt.svelte';
  import { ganzZahl } from '../i18n/profil';
  import { aendere, sicherIch, sprache } from '../lib/kodieren.svelte';
  import { ergebnisTabelle, ergebnisText, evaluativWord, evaluativeKategorien, fallUebersicht, legeEvaluativeKategorieAn, stufeEin, type StellenEintrag } from '../lib/inhaltsanalyse-gefuehrt';
  import type { QualProjekt } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  interface Props { q: QualProjekt; zeige: (dokument: string, start: number, ende: number) => void }
  let { q, zeige }: Props = $props();

  const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const lade = new Laedt();
  const ERSTE = 10;

  const kategorien = $derived(evaluativeKategorien(q));
  let katId = $state('');
  const kat = $derived(kategorien.find(k => k.id === katId) ?? null);
  $effect(() => { if (katId && !kategorien.some(k => k.id === katId)) katId = ''; });

  let neuName = $state('');
  let neuAusp = $state('');
  let neuFehler = $state('');
  let anzahlFaelle = $state(ERSTE);
  let variableId = $state('');

  const zeilen = $derived(kat ? fallUebersicht(q, kat.id, q.ich) : []);
  const sichtbar = $derived(zeilen.slice(0, anzahlFaelle));
  const tabelle = $derived(kat ? ergebnisTabelle(q, kat.id, variableId || undefined, sprache()) : null);
  const fallName = (z: { fallId: string | null; name: string }): string => (z.fallId === null ? L('Dokumente ohne Fall', 'Documents without a case') : z.name);
  const docName = (id: string): string => q.dokumente.find(d => d.id === id)?.name ?? '';
  const kurz = (t: string): string => { const x = t.replace(/\s+/g, ' ').trim(); return x.length > 300 ? x.slice(0, 300).trimEnd() + ' …' : x; };
  const nStellen = (n: number): string => Lp(n, '1 Textstelle', `${ganzZahl(n)} Textstellen`, '1 passage', `${ganzZahl(n)} passages`);
  const ergText = (e: Parameters<typeof ergebnisText>[2]): string => (kat ? ergebnisText(q, kat.id, e, sprache()) : '');
  const auspName = (id: string): string => kat?.auspraegungen.find(a => a.id === id)?.name ?? '';

  /** Wert der Auswahl einer Stelle: die eigene Ausprägung ('' = nicht eingestuft); andere Personen stufen für sich ein */
  const wertVon = (s: StellenEintrag): string => { const m = s.meine ?? s.auspraegungen; return m.length === 1 ? m[0]! : ''; };
  const personName = (id: string): string => q.kodierende.find(k => k.id === id)?.name ?? '-';
  const andereText = (s: StellenEintrag): string => (s.andere ?? []).map(x => `${auspName(x.auspraegung)} (${personName(x.kodierende)})`).join(', ');

  async function neuAnlegen() {
    neuFehler = '';
    try {
      const name = neuName.trim();
      let r: ReturnType<typeof legeEvaluativeKategorieAn> | undefined;
      aendere(L(`Kategorie „${name}“ wieder entfernt`, `Category "${name}" removed again`), q0 => { r = legeEvaluativeKategorieAn(q0, neuName, neuAusp.split('\n')); return r.q; });
      if (!r) return;
      katId = r.id; neuName = ''; neuAusp = ''; anzahlFaelle = ERSTE;
      sage(L(`Kategorie „${name}“ mit ${r.auspraegungen.length} Ausprägungen angelegt. Weiter mit Schritt 2.`, `Category "${name}" created with ${r.auspraegungen.length} ratings. Continue with step 2.`));
      await tick(); await tick();
      document.getElementById('ko-ev-s2-t')?.focus();
    } catch (e) {
      const k = e instanceof Error ? e.message : '';
      neuFehler = k === 'name-leer' ? L('Bitte einen Namen für die Kategorie eingeben.', 'Please enter a name for the category.')
        : k === 'name-vergeben' ? L('Diesen Namen gibt es schon als Code. Wählen Sie die Kategorie oben aus der Liste, oder nehmen Sie einen anderen Namen.', 'This name exists already as a code. Choose the category from the list above, or use another name.')
        : k === 'auspraegung-fehlt' ? L('Bitte mindestens eine Ausprägung eingeben, eine je Zeile.', 'Please enter at least one rating, one per line.')
        : k === 'auspraegung-doppelt' ? L('Zwei Ausprägungen heißen gleich. Jede Ausprägung braucht einen eigenen Namen.', 'Two ratings have the same name. Each rating needs its own name.')
        : L('Die Kategorie konnte nicht angelegt werden.', 'The category could not be created.');
      sage(neuFehler, 'dringend');
      document.getElementById('ko-ev-neu-name')?.focus();
    }
  }

  function setzeStufe(s: StellenEintrag, fall: string, wert: string) {
    if (!kat) return;
    const ziel = wert === '' ? null : wert;
    const kid = kat.id;
    aendere(L(`Ausprägung bei „${fall}“ zurückgenommen`, `Rating at "${fall}" undone`), q0 => { const m = sicherIch(q0); return stufeEin(m, s.segment, kid, ziel, m.ich!); });
    sage(ziel === null ? L('Ausprägung entfernt. Die Textstelle ist nicht eingestuft.', 'Rating removed. The passage is not rated.') : L(`Ausprägung „${auspName(ziel)}“ gesetzt.`, `Rating "${auspName(ziel)}" set.`));
  }

  async function weitere() {
    const alt = anzahlFaelle;
    anzahlFaelle = Math.min(zeilen.length, alt + ERSTE);
    sage(L(`${anzahlFaelle - alt} weitere Fälle gezeigt.`, `${anzahlFaelle - alt} more cases shown.`));
    await tick();
    document.getElementById(`ko-ev-fall-${alt}`)?.focus();
  }

  async function alsWord() {
    if (!kat) return;
    await lade.mit(async () => {
      try {
        const bytes = await evaluativWord(q, kat.id, sprache());
        const datei = sprache() === 'de' ? 'Fall-Uebersicht-evaluativ.docx' : 'Case-overview-evaluative.docx';
        herunterladen(bytes, datei, MIME_DOCX);
        sage(L(`${datei} wird heruntergeladen.`, `${datei} is being downloaded.`));
      } catch {
        sage(L('Die Word-Datei konnte nicht erstellt werden.', 'The Word file could not be created.'), 'dringend');
      }
    });
  }
</script>

<div class="ev" role="group" aria-label={L('Evaluative Inhaltsanalyse', 'Evaluative content analysis')}>
  <h3 id="ko-ev-t">{L('Wie stark zeigt sich etwas je Fall? (evaluative Inhaltsanalyse)', 'How strongly does something show in each case? (evaluative content analysis)')}</h3>
  <p class="hilfe">{L('Sie legen eine Kategorie mit Ausprägungen fest (zum Beispiel Belastung: hoch, mittel, niedrig) und stufen dann jede Textstelle selbst ein. Statable schlägt nichts vor, es ordnet nur an und zählt.', 'You define a category with ratings (for example strain: high, medium, low) and then rate each passage yourself. Statable suggests nothing, it only arranges and counts.')}</p>

  <ol class="schritte">
    <li>
      <h3 id="ko-ev-s1-t" tabindex="-1">{L('Schritt 1: Welche Kategorie stufen Sie ein? (evaluative Kategorie)', 'Step 1: Which category do you rate? (evaluative category)')}</h3>
      {#if kategorien.length}
        <div class="feld">
          <label for="ko-ev-kat">{L('Vorhandene Kategorie', 'Existing category')}</label>
          <select id="ko-ev-kat" value={katId} onchange={e => { katId = e.currentTarget.value; anzahlFaelle = ERSTE; variableId = ''; if (katId) sage(L(`Kategorie „${kat?.name ?? ''}“ gewählt. Weiter mit Schritt 2.`, `Category "${kat?.name ?? ''}" chosen. Continue with step 2.`)); }}>
            <option value="">{L('– bitte wählen –', '– please choose –')}</option>
            {#each kategorien as k (k.id)}<option value={k.id}>{k.pfad} ({k.auspraegungen.map(a => a.name).join(', ')})</option>{/each}
          </select>
        </div>
      {:else}
        <p class="hilfe">{L('Es gibt noch keine Kategorie mit Ausprägungen. Legen Sie unten eine an.', 'There is no category with ratings yet. Create one below.')}</p>
      {/if}
      <fieldset class="gruppe">
        <legend>{L('Neue Kategorie anlegen', 'Create a new category')}</legend>
        <div class="feld">
          <label for="ko-ev-neu-name">{L('Name der Kategorie', 'Name of the category')}</label>
          <input id="ko-ev-neu-name" type="text" bind:value={neuName} aria-describedby={neuFehler ? 'ko-ev-fehler' : undefined} aria-invalid={neuFehler ? 'true' : undefined}>
        </div>
        <div class="feld">
          <label for="ko-ev-neu-ausp">{L('Ausprägungen, eine je Zeile', 'Ratings, one per line')}</label>
          <textarea id="ko-ev-neu-ausp" rows="4" bind:value={neuAusp} aria-describedby="ko-ev-neu-h"></textarea>
          <span class="hilfe" id="ko-ev-neu-h">{L('Zum Beispiel: hoch, mittel, niedrig (je eine Zeile).', 'For example: high, medium, low (one per line).')}</span>
        </div>
        {#if neuFehler}<p class="fehl" id="ko-ev-fehler">{neuFehler}</p>{/if}
        <div class="knopfzeile"><button class="k" id="ko-ev-neu-btn" type="button" onclick={() => void neuAnlegen()}>{L('Kategorie anlegen', 'Create category')}</button></div>
      </fieldset>
      <p class="hilfe">{L('Beschreiben Sie jede Ausprägung in der Definition des Untercodes im Codebaum (Kodierleitfaden): Woran erkennen Sie „hoch“?', 'Describe each rating in the definition of the subcode in the code tree (coding guide): how do you recognise "high"?')}</p>
    </li>

    <li>
      <h3 id="ko-ev-s2-t" tabindex="-1">{L('Schritt 2: Fall für Fall einstufen', 'Step 2: Rate case by case')}</h3>
      {#if !kat}
        <p class="hilfe">{L('Wählen oder legen Sie zuerst in Schritt 1 eine Kategorie an.', 'First choose or create a category in step 1.')}</p>
      {:else if !zeilen.some(z => z.stellen.length)}
        <p class="hilfe">{L(`Zur Kategorie „${kat.name}“ gibt es noch keine Textstellen. Kodieren Sie Textstellen mit dem Code „${kat.name}“ oder einer seiner Ausprägungen, dann erscheinen sie hier.`, `There are no passages for the category "${kat.name}" yet. Code passages with the code "${kat.name}" or one of its ratings, then they appear here.`)}</p>
      {:else}
        <p class="hilfe">{L('Wählen Sie bei jeder Textstelle die Ausprägung. „Nicht eingestuft“ lässt die Stelle in der Kategorie.', 'Choose the rating for each passage. "Not rated" keeps the passage in the category.')}</p>
        {#each sichtbar as z, i (z.fallId ?? 'ohne')}
          <section class="fall" aria-labelledby="ko-ev-fall-{i}">
            <h4 id="ko-ev-fall-{i}" tabindex="-1" data-nolink>{fallName(z)}</h4>
            <p class="klein">{L('Ergebnis für diesen Fall', 'Result for this case')}: <strong data-nolink>{ergText(z.ergebnis)}</strong> ({nStellen(z.stellen.length)})</p>
            {#if z.stellen.length}
              <ul class="stellen">
                {#each z.stellen as s, j (s.segment)}
                  <li>
                    <span class="klein" id="ko-ev-st-{i}-{j}" data-nolink>{docName(s.dokument)}</span>
                    <q class="zitat" id="ko-ev-zt-{i}-{j}" data-nolink>{kurz(s.text)}</q>
                    <div class="zeile">
                      <label for="ko-ev-sel-{i}-{j}">{L('Ausprägung', 'Rating')}</label>
                      <select id="ko-ev-sel-{i}-{j}" aria-describedby="ko-ev-zt-{i}-{j}" onchange={e => setzeStufe(s, fallName(z), e.currentTarget.value)}>
                        <option value="" selected={wertVon(s) === ''}>{L('– nicht eingestuft –', '– not rated –')}</option>
                        {#each kat.auspraegungen as a (a.id)}<option value={a.id} selected={wertVon(s) === a.id}>{a.name}</option>{/each}
                      </select>
                      <button class="k klein" type="button" onclick={() => zeige(s.dokument, s.start, s.ende)}>{L('Im Dokument zeigen', 'Show in the document')}</button>
                    </div>
                    {#if s.andere?.length}<p class="klein" data-nolink>{L('Andere Personen', 'Other people')}: {andereText(s)}</p>{/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="hilfe">{L('Keine Textstelle zu dieser Kategorie.', 'No passage for this category.')}</p>
            {/if}
          </section>
        {/each}
        {#if zeilen.length > anzahlFaelle}
          <div class="knopfzeile"><button class="k" type="button" onclick={() => void weitere()}>{L(`Weitere Fälle zeigen (${zeilen.length - anzahlFaelle} übrig)`, `Show more cases (${zeilen.length - anzahlFaelle} left)`)}</button></div>
        {/if}
      {/if}
    </li>

    <li>
      <h3 id="ko-ev-s3-t" tabindex="-1">{L('Schritt 3: Ergebnis (Fall-Übersicht)', 'Step 3: Result (case overview)')}</h3>
      {#if !kat}
        <p class="hilfe">{L('Das Ergebnis erscheint, sobald Sie eine Kategorie gewählt haben.', 'The result appears once you have chosen a category.')}</p>
      {:else}
        <div class="rahmen" role="region" tabindex="0" aria-label={L('Fall-Übersicht, seitlich scrollbar', 'Case overview, scrollable sideways')}>
          <table class="tab">
            <caption class="nur-vorleser">{L(`Fall-Übersicht zur Kategorie ${kat.name}: ${zeilen.length} Zeilen. Je Fall das Ergebnis und die Zahl der Textstellen.`, `Case overview for the category ${kat.name}: ${zeilen.length} rows. For each case the result and the number of passages.`)}</caption>
            <thead><tr><th scope="col">{L('Fall', 'Case')}</th><th scope="col">{L('Ergebnis', 'Result')}</th><th scope="col">{L('Textstellen', 'Passages')}</th></tr></thead>
            <tbody>
              {#each zeilen as z (z.fallId ?? 'ohne')}
                <tr><th scope="row" data-nolink>{fallName(z)}</th><td data-nolink>{ergText(z.ergebnis)}</td><td>{ganzZahl(z.stellen.length)}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>

        <h4>{L('Wie oft kommt welches Ergebnis vor?', 'How often does each result occur?')}</h4>
        {#if q.variablen.length}
          <div class="feld">
            <label for="ko-ev-var">{L('Kreuzen mit einer Fallvariable (freiwillig)', 'Cross with a case variable (optional)')}</label>
            <select id="ko-ev-var" bind:value={variableId}>
              <option value="">{L('– keine –', '– none –')}</option>
              {#each q.variablen as v (v.id)}<option value={v.id}>{v.name}</option>{/each}
            </select>
          </div>
        {/if}
        {#if tabelle}
          <div class="rahmen" role="region" tabindex="0" aria-label={L('Häufigkeit der Ergebnisse, seitlich scrollbar', 'Frequency of the results, scrollable sideways')}>
            <table class="tab">
              <caption class="nur-vorleser">{L(`Häufigkeit der Ergebnisse zur Kategorie ${kat.name}, ${tabelle.gesamt} Fälle. „Dokumente ohne Fall“ zählen nicht mit.`, `Frequency of the results for the category ${kat.name}, ${tabelle.gesamt} cases. "Documents without a case" are not counted.`)}</caption>
              <thead>
                <tr>
                  <th scope="col">{L('Ergebnis', 'Result')}</th>
                  <th scope="col">{L('Zahl der Fälle', 'Number of cases')}</th>
                  {#each tabelle.spalten ?? [] as c (c.schluessel)}<th scope="col" data-nolink>{variableId ? `${q.variablen.find(v => v.id === variableId)?.name ?? ''}: ${c.name}` : c.name}</th>{/each}
                </tr>
              </thead>
              <tbody>
                {#each tabelle.zeilen as z (`${z.art}-${z.auspraegung ?? ''}`)}
                  <tr>
                    <th scope="row" data-nolink>{ergText(z)}</th><td>{ganzZahl(z.anzahl)}</td>
                    {#each z.nachWert ?? [] as n, ci (ci)}<td>{ganzZahl(n)}</td>{/each}
                  </tr>
                {/each}
                <tr>
                  <th scope="row">{L('Alle Fälle', 'All cases')}</th><td>{ganzZahl(tabelle.gesamt)}</td>
                  {#each tabelle.nachWertGesamt ?? [] as n, ci (ci)}<td>{ganzZahl(n)}</td>{/each}
                </tr>
              </tbody>
            </table>
          </div>
        {/if}
        <p class="hilfe">{L('Die Word-Datei enthält nur Fälle, Ausprägungen und Zahlen, keine Zitate.', 'The Word file only holds cases, ratings and numbers, no quotes.')}</p>
        <div class="knopfzeile"><button class="k" id="ko-ev-word" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void alsWord(); }}>{#if lade.sichtbar}<Rechnet imKnopf />{:else}<Icon n="download" />{/if}{L('Fall-Übersicht als Word', 'Case overview as Word')}</button></div>
        {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Datei wird erstellt …', 'Creating the file …')} /></p>{/if}
      {/if}
    </li>
  </ol>
</div>

<style>
  .ev { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  h4 { margin: var(--a2) 0 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  .schritte { margin: 0; padding-inline-start: var(--a4, 1.5rem); display: flex; flex-direction: column; gap: var(--a4, 1.5rem); }
  .schritte > li { display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; font-weight: 600; }
  .gruppe { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .gruppe legend { font-weight: 600; padding: 0 var(--a1); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  .feld input, .feld select, textarea { width: 100%; box-sizing: border-box; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .fall { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); display: flex; flex-direction: column; gap: var(--a2); }
  .stellen { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--a3); }
  .stellen li { display: flex; flex-direction: column; gap: var(--a1); }
  .zitat { white-space: pre-wrap; overflow-wrap: anywhere; }
  .zeile { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2); }
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: top; }
  .tab thead th { font-weight: 650; }
  .tab tbody th { font-weight: 600; }
</style>
