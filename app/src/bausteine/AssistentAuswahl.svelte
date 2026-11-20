<script lang="ts">
  import { untrack, tick, onDestroy } from 'svelte';
  import { s, L, Lp } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName } from '../lib/skalabau';
  import { auswahlBefehl, bedingung, zaehleAuswahl } from '../lib/datenassistent';
  import { anzeigeWert, auswahlSatz, behaltenFrage, fehlerSatz } from '../lib/datenassistentsaetze';
  import { probelauf, wendeAn } from '../lib/datenassistentlauf';
  import { AUTO_ZELLEN, Vorschau } from '../lib/assistentvorschau.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import BedingungsFeld, { bedingungsTeile, neueBedingung, type BedingungsZeile } from './BedingungsFeld.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const namen = $derived(s.spalten.map(x => x.name));
  let bedZeilen = $state<BedingungsZeile[]>([untrack(() => neueBedingung(s.spalten[0]?.name))]);
  let verknuepfung = $state<'AND' | 'OR'>('AND');
  let zielEigen = $state<string | null>(null);
  let zielArt = $state<'neu' | 'vorhanden'>('neu');
  let vorhandenWahl = $state('');
  let bezeichnungEigen = $state<string | null>(null);
  const zielVorschlag = $derived(freierName(L('auswahl', 'selection'), namen));
  const ziel = $derived(zielArt === 'vorhanden' ? vorhandenWahl : (zielEigen ?? zielVorschlag));

  /** Die Bedingung als PSPP-Ausdruck - Textspalten abgesichert, damit leere Zellen „nicht prüfbar“ bleiben. */
  const bed = $derived(bedingungsTeile(bedZeilen, daten.spalten));
  const ausdruck = $derived('teile' in bed ? bedingung(bed.teile, verknuepfung, daten) : '');
  const bezeichnung = $derived(bezeichnungEigen ?? L(`Auswahl: ${'teile' in bed ? bedingung(bed.teile, verknuepfung) : ''}`, `Selection: ${'teile' in bed ? bedingung(bed.teile, verknuepfung) : ''}`));
  const ergebnis = $derived.by((): { syntax: string } | { problem: string } => {
    if ('problem' in bed) return bed;
    if (zielArt === 'vorhanden' && !vorhandenWahl) return { problem: L('Welche Spalte überschrieben werden soll, ist noch nicht gewählt.', 'The column to overwrite has not been chosen yet.') };
    try { return { syntax: auswahlBefehl(daten, { ziel, bedingung: ausdruck, bezeichnung, ueberschreiben: zielArt === 'vorhanden' }).syntax }; }
    catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const syntax = $derived('syntax' in ergebnis ? ergebnis.syntax : '');
  const behaltenSyntax = $derived(ausdruck ? `SELECT IF (${ausdruck}).\nEXECUTE.` : '');

  /* ---------- Vorschau: Zahlen und die ersten Fälle (Probelauf, die Zahlen kennt nur PSPP) ---------- */
  interface Probe { zahlen: ReturnType<typeof zaehleAuswahl>; spalten: Spalte[]; zeilen: Wert[][]; fehler: string[] }
  const vs = new Vorschau<Probe>();
  onDestroy(() => vs.verwerfe());
  const gross = $derived(s.zeilen.length * s.spalten.length > AUTO_ZELLEN);
  /** Probe mit eigenem Hilfsnamen: die Zahlen gibt es auch, wenn der gewünschte Name der Spalte noch nicht stimmt. */
  async function probe(aus: string, benutzte: string[]): Promise<Probe> {
    const hilfe = freierName('zz_auswahl', namen);
    const r = await probelauf(auswahlBefehl(daten, { ziel: hilfe, bedingung: aus }).syntax);
    if (!r.daten) return { zahlen: { erfuellt: 0, nicht: 0, leer: 0, entfernt: 0 }, spalten: [], zeilen: [], fehler: r.fehler };
    const d = r.daten, w = d.spalten.find(c => c.name === hilfe)!;
    const spalten = [d.spalten[0]!, ...benutzte.map(n => d.spalten.find(c => c.name === n)!).filter(c => c && c !== d.spalten[0]), w];
    const idx = spalten.map(c => d.spalten.indexOf(c));
    return { zahlen: zaehleAuswahl(d, hilfe), spalten, zeilen: d.zeilen.slice(0, 8).map(z => idx.map(i => z[i] ?? null)), fehler: [] };
  }
  const benutzte = $derived('teile' in bed ? [...new Set(bed.teile.map(t => t.spalte))] : []);
  $effect(() => { const a = ausdruck, b = benutzte; if (!a) return; untrack(() => vs.plane(() => probe(a, b), !gross)); });
  const rechneVorschau = () => { if (ausdruck) void vs.jetzt(() => probe(ausdruck, benutzte)); };
  const textSpalte = $derived(benutzte.some(n => daten.spalten.find(c => c.name === n)?.art === 'text'));

  /* ---------- Anwenden ---------- */
  const lad = new Laedt();
  async function anwenden() { if (syntax) await lad.mit(() => wendeAn(L(`Auswahlspalte ${ziel} angelegt`, `Selection column ${ziel} added`), syntax)); }
  let frage = $state(false);
  async function frageBehalten() { frage = true; await tick(); document.getElementById('au-nein')?.focus(); }
  async function behalten() {
    if (!behaltenSyntax || !vs.wert) return;
    const entfernt = vs.wert.zahlen.entfernt;
    frage = false;
    await lad.mit(() => wendeAn(Lp(entfernt, `Nur die ausgewählten Fälle behalten (${entfernt} Fall entfernt)`, `Nur die ausgewählten Fälle behalten (${entfernt} Fälle entfernt)`, `Kept only the selected cases (${entfernt} case removed)`, `Kept only the selected cases (${entfernt} cases removed)`), behaltenSyntax));
  }
  const zeilenMax = 8;
</script>

<AssistentRahmen id="auswahl" titel={L('Fälle auswählen', 'Select cases')} befehlName={L('Fälle auswählen', 'Select cases')}
  einleitung={L('Eine Bedingung wählen, zum Beispiel „Alter mindestens 18“. Statable legt eine Auswahlspalte an (1 = erfüllt, 0 = nicht erfüllt, leer = nicht prüfbar) - die lässt sich als Gruppe oder Bedingung nutzen. Löschen muss man ausdrücklich.', 'Choose a condition, for example "age at least 18". Statable adds a selection column (1 = met, 0 = not met, blank = cannot be checked) that can be used as a group or condition. Deleting must be requested explicitly.')}
  {syntax} problem={'problem' in ergebnis ? ergebnis.problem : ''}
  hinweise={vs.wert?.fehler.length ? [L(`PSPP meldet: ${vs.wert.fehler[0]}`, `PSPP reports: ${vs.wert.fehler[0]}`)] : []}
  anwendenText={L('Auswahlspalte anlegen', 'Add selection column')} anwenden={anwenden} kannAnwenden={!!syntax} laeuft={lad.sichtbar} ueberschreibt={zielArt === 'vorhanden' ? vorhandenWahl : ''}>
  {#snippet haupt()}
    <BedingungsFeld bind:zeilen={bedZeilen} bind:verknuepfung spalten={daten.spalten} id="au" mindestens={1} />
    <p class="as-hilfe">{L('Fehlt bei einer Person ein Wert, den die Bedingung braucht, ist die Auswahl dort leer („nicht prüfbar“) - sie wird weder als erfüllt noch als nicht erfüllt gezählt.', 'If a value the condition needs is missing for a person, the selection is blank there ("cannot be checked") - it counts neither as met nor as not met.')}</p>
    {#if textSpalte}<p class="as-hilfe">{L('Bei Text-Spalten sichert Statable den Vergleich gegen leere Zellen ab (PSPP würde sonst „ungleich“ auch auf leere Zellen anwenden). Das sieht im Befehl etwas umständlich aus.', 'For text columns Statable guards the comparison against blank cells (PSPP would otherwise also apply "not equal" to blank cells). This looks a little cumbersome in the command.')}</p>{/if}
  {/snippet}

  {#snippet weitere()}
    <div class="as-feld"><span class="lbl" id="au-ziel">{L('Wohin kommt die Auswahl?', 'Where does the selection go?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="au-ziel">
        <label><input type="radio" name="au-ziel" value="neu" bind:group={zielArt}>{L('In eine neue Spalte', 'Into a new column')}</label>
        <label><input type="radio" name="au-ziel" value="vorhanden" bind:group={zielArt}>{L('Eine vorhandene Spalte überschreiben', 'Overwrite an existing column')}</label></div></div>
    {#if zielArt === 'neu'}
      <div class="as-feld"><label for="au-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="au-name" type="text" autocomplete="off" value={ziel} oninput={(e) => (zielEigen = e.currentTarget.value)}></div>
    {:else}
      <div class="as-feld"><label for="au-vorh">{L('Welche Spalte?', 'Which column?')}</label>
        <select id="au-vorh" bind:value={vorhandenWahl}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten as c}<option value={c.name}>{c.name}</option>{/each}</select></div>
      {#if vorhandenWahl}<p class="as-warn">{L(`Die Spalte „${vorhandenWahl}“ wird mit der Auswahl überschrieben. „Rückgängig“ in der Kopfzeile stellt sie wieder her.`, `The column "${vorhandenWahl}" is overwritten with the selection. "Undo" in the header restores it.`)}</p>{/if}
    {/if}
    <div class="as-feld"><label for="au-bez">{L('Bezeichnung der Spalte', 'Label of the column')}</label><input id="au-bez" type="text" autocomplete="off" value={bezeichnung} oninput={(e) => (bezeichnungEigen = e.currentTarget.value)}></div>
  {/snippet}

  {#snippet vorschau()}
    {#if !ausdruck}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald die Bedingung vollständig ist.', 'The preview appears as soon as the condition is complete.')}</p>
    {:else if vs.wert && !vs.wert.fehler.length}
      <p class="as-satz">{auswahlSatz(vs.wert.zahlen)}</p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau, die ersten Fälle', 'Preview, the first cases')}>
        <table class="as-tab"><thead><tr>{#each vs.wert.spalten as c}<th scope="col" class:zahl={c.art === 'zahl'}>{c.name}</th>{/each}</tr></thead>
          <tbody>{#each vs.wert.zeilen.slice(0, zeilenMax) as z}<tr>{#each vs.wert.spalten as c, i}<td class:zahl={typeof z[i] === 'number'}>{anzeigeWert(c, z[i] ?? null)}</td>{/each}</tr>{/each}</tbody></table></div>
    {:else if vs.laeuft}<p><Rechnet text={L('Die Vorschau wird gerechnet …', 'The preview is being calculated …')} /></p>
    {:else if vs.wert?.fehler.length}<p class="as-hilfe">{L('Mit dieser Bedingung kommt keine Vorschau zustande.', 'No preview can be made with this condition.')}</p>
    {:else}<button class="k" type="button" onclick={rechneVorschau}>{L('Vorschau berechnen', 'Calculate preview')}</button>{/if}
  {/snippet}

  {#snippet zusatz()}
    <div class="as-endgueltig">
      <h3>{L('Fälle endgültig entfernen', 'Remove cases for good')}</h3>
      <p class="as-hilfe">{L('Behält nur die Fälle, bei denen die Bedingung erfüllt ist. Alle anderen werden aus den Daten entfernt, auch die, bei denen die Bedingung nicht prüfbar ist. „Rückgängig“ in der Kopfzeile bringt sie zurück. Auswertungen im Heft, die diese Daten brauchen, gelten danach als veraltet.', 'Keeps only the cases for which the condition is met. All others are removed from the data, including those where the condition cannot be checked. "Undo" in the header brings them back. Analyses in the notebook that use these data are then marked as out of date.')}</p>
      {#if frage && vs.wert}
        <div class="as-frage" role="group" aria-labelledby="au-fr-t">
          <h4 id="au-fr-t"><Icon n="hinweis" k="hw" />{L('Nur diese Fälle behalten?', 'Keep only these cases?')}</h4>
          <p>{behaltenFrage({ entfernt: vs.wert.zahlen.entfernt, leer: vs.wert.zahlen.leer })} {L(`Es bleiben ${vs.wert.zahlen.erfuellt} Fälle.`, `${vs.wert.zahlen.erfuellt} cases remain.`)}</p>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
          <pre tabindex="0" aria-label={L('PSPP-Befehl', 'PSPP command')}>{behaltenSyntax}</pre>
          <div class="knopfzeile"><button class="k haupt" type="button" disabled={lad.aktiv} onclick={behalten}>{L('Fälle entfernen', 'Remove cases')}</button><button class="k" id="au-nein" type="button" onclick={() => (frage = false)}>{L('Abbrechen', 'Cancel')}</button></div>
        </div>
      {:else}
        <div class="knopfzeile"><button class="k" type="button" disabled={!vs.wert || !!vs.wert.fehler.length || lad.aktiv} aria-expanded="false" onclick={frageBehalten}>{L('Nur diese Fälle behalten …', 'Keep only these cases …')}</button></div>
      {/if}
    </div>
  {/snippet}
</AssistentRahmen>
