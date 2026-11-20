<script lang="ts" module>
  let zaehler = 0;
</script>

<script lang="ts">
  /**
   * Reihenfolge der Gruppen festlegen (Spalten-Seite, bei „Gruppen mit Reihenfolge“): eine Liste zum Ordnen, per Ziehen
   * oder mit den Knöpfen „nach oben/unten“ (Tastatur, Fokus bleibt beim Eintrag). Oben steht der kleinste Wert (1).
   * „Übernehmen“ wandelt die Spalte in die Zahlen 1 … k mit den Gruppen als Namen um - eine Datenänderung mit Rückgängig (lib/reihenfolge.ts).
   */
  import { tick, untrack } from 'svelte';
  import { s, L, d, aendereDaten } from '../lib/sitzung.svelte';
  import type { Wert } from '../lib/eingabe';
  import { lesbar, type Spalte } from '../lib/verzeichnis';
  import { kategorien, schlageVor, ordneSpalte, type Kategorie } from '../lib/reihenfolge';
  import { ort, zitat } from '../i18n/profil';
  import Icon from './Icon.svelte';
  import { sage } from '../lib/ansage';

  let { sp, i }: { sp: Spalte; i: number } = $props();

  const kats = $derived(kategorien(sp, i, s.zeilen) ?? []);
  const istText = $derived(sp.art === 'text');
  const vorschlag = $derived(istText ? schlageVor(kats.map(k => k.text)) : null);
  const startListe = (): Kategorie[] => {
    if (sp.art !== 'text') return [...kats];
    const v = schlageVor(kats.map(k => k.text));
    return v ? v.reihenfolge.map(t => kats.find(k => k.text === t)!) : [...kats];
  };

  let liste = $state<Kategorie[]>([]);
  let offen = $state(untrack(() => sp.art === 'text'));
  let status = $state('');
  /** Meldung: sichtbar als Text und über die feste Ansage-Region (lib/ansage.ts) gesprochen. */
  const melde = (t: string) => { status = t; sage(t); };
  const hilfeId = `ro-hilfe-${++zaehler}`;
  let wurzel = $state<HTMLElement | null>(null);
  let zieht = $state<number | null>(null), ueber = $state<number | null>(null);
  // Neu aufbauen, wenn sich die Gruppen ändern (Daten bearbeitet, Rückgängig, andere Spalte) - nicht bei jeder Bewegung der Liste
  $effect(() => { void kats.map(k => k.schluessel + k.text).join('|'); liste = untrack(startListe); });

  const geaendert = $derived(istText || liste.some((k, j) => k.schluessel !== kats[j]?.schluessel));
  const zahl = (n: number) => n.toLocaleString(ort());

  function verschiebe(von: number, nach: number): boolean {
    if (nach < 0 || nach >= liste.length || von === nach) return false;
    const neu = [...liste]; const [k] = neu.splice(von, 1); neu.splice(nach, 0, k!);
    liste = neu;
    melde(L(`${k!.text} steht jetzt auf Platz ${nach + 1} von ${neu.length}.`, `${k!.text} is now in position ${nach + 1} of ${neu.length}.`));
    return true;
  }
  /** Knopf: verschieben und den Fokus beim Eintrag lassen (bei „ganz oben/unten“ springt er auf den anderen Knopf). */
  async function knopf(von: number, richtung: -1 | 1) {
    const nach = von + richtung;
    if (!verschiebe(von, nach)) return;
    await tick();
    const zeile = wurzel?.querySelectorAll('li')[nach];
    const rand = richtung < 0 ? nach === 0 : nach === liste.length - 1;
    (zeile?.querySelector<HTMLElement>(`button[data-r="${rand ? (richtung < 0 ? 'runter' : 'hoch') : (richtung < 0 ? 'hoch' : 'runter')}"]`))?.focus();
  }
  function taste(e: KeyboardEvent, j: number) {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault(); void knopf(j, e.key === 'ArrowUp' ? -1 : 1);
  }
  function ablegen(nach: number) {
    if (zieht !== null) verschiebe(zieht, nach);
    zieht = null; ueber = null;
  }

  async function uebernehmen() {
    if (!geaendert) { melde(L('Die Reihenfolge ist schon so gespeichert.', 'The order is already saved like this.')); return; }
    const g = ordneSpalte(sp, i, s.zeilen, liste);
    const spalten = $state.snapshot(s.spalten).map((x, j) => (j === i ? g.spalte : x));
    const zeilen = s.zeilen.map((z, r) => z.map((v, j) => (j === i ? g.werte[r]! : v))) as Wert[][];
    const ok = await aendereDaten(L(`Reihenfolge von „${lesbar(sp, true)}“ festgelegt`, `Order of "${lesbar(sp, true)}" set`), spalten, zeilen, false, { art: 'reihenfolge' });
    if (ok) {
      melde(L(`Gespeichert: ${liste.map((k, j) => `${j + 1} = ${k.text}`).join(', ')}.`, `Saved: ${liste.map((k, j) => `${j + 1} = ${k.text}`).join(', ')}.`));
      await tick(); wurzel?.querySelector<HTMLElement>('button[data-r="ok"]')?.focus();
    }
  }
</script>

{#if kats.length >= 2}
<details class="auf gruppen-namen reihenfolge" bind:open={offen} bind:this={wurzel}>
  <summary><span class="nur-vorleser">{sp.name}: </span>{L('Reihenfolge festlegen', 'Set the order')} ({istText ? L('noch alphabetisch', 'still alphabetical') : liste.map(k => k.text).slice(0, 3).join(' < ') + (liste.length > 3 ? ' …' : '')})</summary>
  <p class="hilfe" id={hilfeId}>{vorschlag
    ? (vorschlag.skala ? d(`Vorschlag von Statable (bekannte Skala ${zitat(vorschlag.skala)}). Prüfe die Reihenfolge.`, `Vorschlag von Statable (bekannte Skala ${zitat(vorschlag.skala)}). Prüfen Sie die Reihenfolge.`, `Suggestion from Statable (known scale ${zitat(vorschlag.skala)}). Check the order.`) : d('Vorschlag von Statable (Zahlen am Anfang). Prüfe die Reihenfolge.', 'Vorschlag von Statable (Zahlen am Anfang). Prüfen Sie die Reihenfolge.', 'Suggestion from Statable (numbers at the start). Check the order.'))
    : istText ? d('Ordne die Gruppen: oben der kleinste Wert, unten der größte. Statable erkennt hier keine Reihenfolge von selbst.', 'Ordnen Sie die Gruppen: oben der kleinste Wert, unten der größte. Statable erkennt hier keine Reihenfolge von selbst.', 'Order the groups: the smallest value at the top, the largest at the bottom. Statable cannot tell an order here by itself.')
    : d('Ordne die Gruppen: oben der kleinste Wert, unten der größte.', 'Ordnen Sie die Gruppen: oben der kleinste Wert, unten der größte.', 'Order the groups: the smallest value at the top, the largest at the bottom.')}
    {L('Ziehen oder die Knöpfe nutzen (mit der Tastatur auch Alt + Pfeil).', 'Drag, or use the buttons (with the keyboard also Alt + arrow).')}</p>
  <ol class="ro-liste" aria-describedby={hilfeId} aria-label="{sp.name}: {L('Gruppen von klein nach groß', 'groups from small to large')}">
    {#each liste as k, j (k.schluessel)}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li class:zieht={zieht === j} class:ueber={ueber === j && zieht !== j} draggable="true"
        ondragstart={(e) => { zieht = j; e.dataTransfer?.setData('text/plain', k.text); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }}
        ondragover={(e) => { if (zieht === null) return; e.preventDefault(); ueber = j; }}
        ondrop={(e) => { e.preventDefault(); ablegen(j); }}
        ondragend={() => { zieht = null; ueber = null; }}
        onkeydown={(e) => taste(e, j)}>
        <span class="ro-nr" aria-hidden="true">{j + 1}</span>
        <span class="ro-text"><span class="ro-griff" aria-hidden="true">⠿</span>{k.text}<small>{k.anzahl > 0 ? ` · ${zahl(k.anzahl)}×` : ''}</small></span>
        <button class="k klein" type="button" data-r="hoch" disabled={j === 0} aria-label="{k.text}: {L('nach oben', 'move up')}" onclick={() => knopf(j, -1)}><Icon n="hoch" /></button>
        <button class="k klein" type="button" data-r="runter" disabled={j === liste.length - 1} aria-label="{k.text}: {L('nach unten', 'move down')}" onclick={() => knopf(j, 1)}><Icon n="runter" /></button>
      </li>
    {/each}
  </ol>
  <div class="knopfzeile"><button class="k haupt" type="button" data-r="ok" onclick={uebernehmen}><span class="nur-vorleser">{sp.name}: </span>{L('Reihenfolge übernehmen', 'Apply order')}</button></div>
  <p class="hilfe">{istText
    ? L(`Die Spalte wird zu den Zahlen 1 bis ${liste.length}, die Gruppen bleiben als Namen erhalten. Das lässt sich mit „Rückgängig“ zurücknehmen.`, `The column becomes the numbers 1 to ${liste.length}; the groups stay as names. You can take this back with "Undo".`)
    : L('Die Zahlen werden neu vergeben, die Namen wandern mit. Das lässt sich mit „Rückgängig“ zurücknehmen.', 'The numbers are reassigned and the names go with them. You can take this back with "Undo".')}</p>
  {#if status}<p class="hilfe ro-status">{status}</p>{/if}
</details>
{/if}

<style>
  .ro-liste { list-style: none; margin: var(--a2) 0; padding: 0; display: flex; flex-direction: column; gap: var(--a1); max-width: 34rem; }
  .ro-liste li { display: grid; grid-template-columns: 2em minmax(0, 1fr) auto auto; gap: var(--a2); align-items: center; padding: var(--a1) var(--a2); border: 1px solid var(--linie); border-radius: var(--r-klein); background: var(--blatt); cursor: grab; }
  .ro-liste li.zieht { opacity: .45; }
  .ro-liste li.ueber { border-color: var(--akzent); box-shadow: 0 -2px 0 var(--akzent); }
  .ro-nr { font: 650 var(--gr-klein) var(--schrift-ui); color: var(--tinte-2); text-align: right; font-variant-numeric: tabular-nums; }
  .ro-text { min-width: 0; overflow-wrap: anywhere; }
  .ro-text small { color: var(--tinte-2); }
  .ro-griff { color: var(--tinte-2); margin-inline-end: var(--a2); }
  .ro-liste :global(.ico) { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .ro-status { color: var(--tinte); }
  .reihenfolge .knopfzeile { margin-top: var(--a2); }
</style>
