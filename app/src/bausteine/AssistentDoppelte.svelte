<script lang="ts">
  import { untrack, tick, onDestroy } from 'svelte';
  import { s, L, Lp } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName } from '../lib/skalabau';
  import { doppelteFaelle, doppeltBefehl } from '../lib/datenassistent';
  import { anzeigeWert, doppeltSatz, fehlerSatz } from '../lib/datenassistentsaetze';
  import { wendeAn } from '../lib/datenassistentlauf';
  import { Vorschau } from '../lib/assistentvorschau.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const namen = $derived(s.spalten.map(x => x.name));
  let alle = $state(true);
  let gewaehlt = $state<string[]>([]);
  let genau = $state(false);
  let fehlendGleich = $state(true);
  let zielEigen = $state<string | null>(null);
  const zielVorschlag = $derived(freierName(L('doppelt', 'duplicate'), namen));
  const ziel = $derived(zielEigen ?? zielVorschlag);
  const spaltenWahl = $derived(alle ? [] : namen.filter(n => gewaehlt.includes(n)));
  const opt = $derived({ spalten: spaltenWahl, genau, fehlendGleich });

  const vs = new Vorschau<ReturnType<typeof doppelteFaelle>>();
  onDestroy(() => vs.verwerfe());
  const gross = $derived(s.zeilen.length > 150_000);
  const ergebnis = $derived.by((): { syntax: string; loesch: string } | { problem: string } => {
    if (!alle && !gewaehlt.length) return { problem: L('Mindestens eine Spalte wählen, nach der verglichen wird.', 'Choose at least one column to compare by.') };
    // Große Tabelle: der Befehl entsteht erst aus der gerechneten Vorschau (sonst rechnete jede Eingabe die ganze Tabelle)
    if (gross && (!vs.wert || vs.veraltet)) return { problem: L('Bei dieser großen Tabelle zuerst die Vorschau berechnen.', 'For this large table, calculate the preview first.') };
    try {
      const o = { ...opt, ziel, vorab: gross ? vs.wert! : undefined };
      return { syntax: doppeltBefehl(daten, o).syntax, loesch: doppeltBefehl(daten, { ...o, loeschen: true }).syntax };
    } catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const syntax = $derived('syntax' in ergebnis ? ergebnis.syntax : '');
  const loeschSyntax = $derived('loesch' in ergebnis ? ergebnis.loesch : '');

  /* ---------- Vorschau: gerechnet in Statable, nicht in PSPP (PSPP vergleicht byte- und bitgenau) ---------- */
  $effect(() => { const o = opt; if (!alle && !o.spalten.length) { vs.verwerfe(); vs.wert = null; return; } untrack(() => vs.plane(() => doppelteFaelle(daten, o), !gross)); });
  const rechneVorschau = () => { if (alle || opt.spalten.length) void vs.jetzt(() => doppelteFaelle(daten, opt)); };
  const sprache = $derived(genau
    ? L('Als gleich gelten Fälle, die in den gewählten Spalten übereinstimmen. Text muss Zeichen für Zeichen gleich sein, auch in Groß- und Kleinschreibung und in Leerzeichen am Rand.', 'Cases count as equal if they match in the chosen columns. Text must match character for character, including upper/lower case and spaces at the edge.')
    : L('Als gleich gelten Fälle, die in den gewählten Spalten übereinstimmen. Groß- und Kleinschreibung und Leerzeichen am Rand zählen nicht; Zahlen werden auf 15 Stellen genau verglichen.', 'Cases count as equal if they match in the chosen columns. Upper/lower case and spaces at the edge do not count; numbers are compared to 15 digits.'));
  const fehlendSatz = $derived(fehlendGleich
    ? L('Ein fehlender Wert gilt als gleich einem fehlenden Wert.', 'A missing value counts as equal to a missing value.')
    : L('Fälle, bei denen in den gewählten Spalten ein Wert fehlt, werden nicht geprüft und nie als doppelt markiert.', 'Cases with a missing value in the chosen columns are not checked and never marked as duplicates.'));
  const wert = (z: number, c: string) => { const i = s.spalten.findIndex(x => x.name === c); return anzeigeWert(s.spalten[i], s.zeilen[z - 1]?.[i] ?? null); };
  const zeigeSpalten = $derived((alle ? namen : spaltenWahl).slice(0, 4));
  const gruppenMax = 10;

  /* ---------- Anwenden ---------- */
  const lad = new Laedt();
  async function anwenden() { if (syntax) await lad.mit(() => wendeAn(L(`Doppelte Fälle in ${ziel} markiert`, `Duplicate cases marked in ${ziel}`), syntax)); }
  let frage = $state(false);
  async function frageLoeschen() { frage = true; await tick(); document.getElementById('dp-nein')?.focus(); }
  async function loeschen() {
    if (!loeschSyntax || !vs.wert) return;
    const n = vs.wert.wiederholungen;
    frage = false;
    await lad.mit(() => wendeAn(Lp(n, `${n} wiederholter Fall gelöscht`, `${n} wiederholte Fälle gelöscht`, `${n} repeated case deleted`, `${n} repeated cases deleted`), loeschSyntax));
  }
</script>

<AssistentRahmen id="doppelte" titel={L('Doppelte Fälle', 'Duplicate cases')} befehlName={L('Doppelte Fälle', 'Duplicate cases')}
  einleitung={L('Fälle finden, die mehrfach vorkommen, zum Beispiel dieselbe Person zweimal. Statable markiert sie in einer neuen Spalte (0 = erster Fall, 1 = Wiederholung); gelöscht wird nichts, solange nicht ausdrücklich gewählt.', 'Find cases that occur more than once, for example the same person twice. Statable marks them in a new column (0 = first case, 1 = repeat); nothing is deleted unless explicitly chosen.')}
  {syntax} problem={'problem' in ergebnis ? ergebnis.problem : ''}
  hinweise={[sprache, fehlendSatz, ...(vs.wert ? doppeltSatz({ wiederholungen: vs.wert.wiederholungen, gruppen: vs.wert.gruppen.length, nichtPruefbar: vs.wert.nichtPruefbar }) : [])]}
  anwendenText={L('Doppelte markieren', 'Mark duplicates')} anwenden={anwenden} kannAnwenden={!!syntax} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-feld"><span class="lbl" id="dp-wahl">{L('Wonach wird verglichen?', 'What is compared?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="dp-wahl">
        <label><input type="radio" name="dp-wahl" value={true} bind:group={alle}>{L('Alle Spalten', 'All columns')}</label>
        <label><input type="radio" name="dp-wahl" value={false} bind:group={alle}>{L('Nur diese Spalten (zum Beispiel die Kennung)', 'Only these columns (for example the ID)')}</label></div></div>
    {#if !alle}
      <ul class="as-liste" aria-label={L('Spalten zum Vergleichen', 'Columns to compare')}>{#each s.spalten as c (c.name)}
        <li class:an={gewaehlt.includes(c.name)}><label><input type="checkbox" checked={gewaehlt.includes(c.name)} onchange={(e) => (gewaehlt = e.currentTarget.checked ? [...gewaehlt, c.name] : gewaehlt.filter(x => x !== c.name))}><span><b>{c.name}</b>{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}</span></label></li>
      {/each}</ul>
    {/if}
  {/snippet}

  {#snippet weitere()}
    <label class="as-eins"><input type="checkbox" bind:checked={genau}><span>{L('Genau gleich: Groß- und Kleinschreibung und Leerzeichen am Rand zählen', 'Exactly equal: upper/lower case and spaces at the edge count')}</span></label>
    <label class="as-eins"><input type="checkbox" bind:checked={fehlendGleich}><span>{L('Fehlend gilt als gleich', 'Missing counts as equal')}</span></label>
    <div class="as-feld"><label for="dp-name">{L('Name der Markierspalte', 'Name of the marker column')}</label><input id="dp-name" type="text" autocomplete="off" value={ziel} oninput={(e) => (zielEigen = e.currentTarget.value)}></div>
  {/snippet}

  {#snippet vorschau()}
    {#if vs.wert}
      {#if vs.wert.gruppen.length}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Gruppen gleicher Fälle', 'Groups of identical cases')}>
          <table class="as-tab"><thead><tr><th scope="col">{L('Zeilen', 'Rows')}</th>{#each zeigeSpalten as c}<th scope="col">{c}</th>{/each}</tr></thead>
            <tbody>{#each vs.wert.gruppen.slice(0, gruppenMax) as g}<tr><td>{g.zeilen.slice(0, 6).join(', ')}{g.zeilen.length > 6 ? ' …' : ''}</td>{#each zeigeSpalten as c}<td>{wert(g.zeilen[0]!, c)}</td>{/each}</tr>{/each}</tbody></table></div>
        {#if vs.wert.gruppen.length > gruppenMax}<p class="as-hilfe">{Lp(vs.wert.gruppen.length - gruppenMax, `Dazu kommt ${vs.wert.gruppen.length - gruppenMax} weitere Gruppe.`, `Dazu kommen ${vs.wert.gruppen.length - gruppenMax} weitere Gruppen.`, `${vs.wert.gruppen.length - gruppenMax} more group.`, `${vs.wert.gruppen.length - gruppenMax} more groups.`)}</p>{/if}
      {/if}
    {:else if vs.laeuft}<p><Rechnet text={L('Die doppelten Fälle werden gesucht …', 'Looking for duplicate cases …')} /></p>
    {:else if !alle && !gewaehlt.length}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald eine Spalte gewählt ist.', 'The preview appears as soon as a column is chosen.')}</p>
    {:else}<button class="k" type="button" onclick={rechneVorschau}>{L('Vorschau berechnen', 'Calculate preview')}</button>{/if}
  {/snippet}

  {#snippet zusatz()}
    <div class="as-endgueltig">
      <h3>{L('Wiederholungen löschen', 'Delete repeats')}</h3>
      <p class="as-hilfe">{L('Behält jeweils den ersten Fall und entfernt die Wiederholungen aus den Daten. „Rückgängig“ in der Kopfzeile bringt sie zurück. Auswertungen im Heft, die diese Daten brauchen, gelten danach als veraltet.', 'Keeps the first case of each group and removes the repeats from the data. "Undo" in the header brings them back. Analyses in the notebook that use these data are then marked as out of date.')}</p>
      {#if frage && vs.wert}
        <div class="as-frage" role="group" aria-labelledby="dp-fr-t">
          <h4 id="dp-fr-t"><Icon n="hinweis" k="hw" />{L('Wiederholungen löschen?', 'Delete the repeats?')}</h4>
          <p>{Lp(vs.wert.wiederholungen, `Dabei wird ${vs.wert.wiederholungen} Fall aus den Daten entfernt.`, `Dabei werden ${vs.wert.wiederholungen} Fälle aus den Daten entfernt.`, `This removes ${vs.wert.wiederholungen} case from the data.`, `This removes ${vs.wert.wiederholungen} cases from the data.`)} {Lp(vs.wert.wiederholungen === 0 ? 0 : vs.wert.gruppen.length, `Es bleibt der erste Fall von ${vs.wert.gruppen.length} Gruppe.`, `Es bleibt der erste Fall von ${vs.wert.gruppen.length} Gruppen.`, `The first case of ${vs.wert.gruppen.length} group remains.`, `The first case of ${vs.wert.gruppen.length} groups remains.`)}</p>
          <div class="knopfzeile"><button class="k haupt" type="button" disabled={lad.aktiv} onclick={loeschen}>{L('Wiederholungen löschen', 'Delete repeats')}</button><button class="k" id="dp-nein" type="button" onclick={() => (frage = false)}>{L('Abbrechen', 'Cancel')}</button></div>
        </div>
      {:else}
        <div class="knopfzeile"><button class="k" type="button" disabled={!vs.wert || !vs.wert.wiederholungen || lad.aktiv} aria-expanded="false" onclick={frageLoeschen}>{L('Wiederholungen löschen …', 'Delete repeats …')}</button></div>
      {/if}
    </div>
  {/snippet}
</AssistentRahmen>
