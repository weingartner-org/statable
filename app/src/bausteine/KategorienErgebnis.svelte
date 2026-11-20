<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /**
   * Ergebnis von „Offene Antworten ordnen“ (Welle 4, G7): Zähler, Häufigkeiten mit beiden Prozentbasen, „In die Daten übernehmen“ (ein Rückgängig-Schritt),
   * Zweitkodierung und der Weg zur Karte „Stimmen Beurteilungen überein?“. Beschreibend: kein Test, keine Verallgemeinerung.
   */
  import { s, L, melde } from '../lib/sitzung.svelte';
  import { zitat, dp } from '../i18n/profil';
  import Ausgabe from './Ausgabe.svelte';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import { frageVorschlag } from '../lib/beispielvorschlag.svelte';
  import { basisSatz, fehlendSatz, haeufigkeitsTabelle, leitfadenTabelle, summeSatz } from '../lib/kategoriensaetze';
  import { ergebnisFuer, grundname, uebernahmeStand, uebernehmen, uebereinstimmungsSpalten, zweiteAnlegen, zweiteEntfernen, type KatAnzeige, type UebernahmeStand } from '../lib/kategorienblatt';
  import type { KatHaeufigkeit } from '../lib/kategorisieren';
  import type { Blatt } from '../lib/sitzung.svelte';

  let { blatt, anz, h, aktiv, setzeAktiv, tue, ansagen }: {
    blatt: Blatt; anz: KatAnzeige; h: KatHaeufigkeit; aktiv: 1 | 2; setzeAktiv: (nr: 1 | 2) => void;
    tue: (f: () => void) => void; ansagen: (text: string) => void;
  } = $props();
  const kb = $derived(blatt.kat!);

  let laeuft = $state(false), uebKategorie = $state('');
  const stand1 = $derived<UebernahmeStand>(uebernahmeStand(kb, 1));
  const stand2 = $derived<UebernahmeStand>(kb.zuordnung2 ? uebernahmeStand(kb, 2) : 'nicht');
  const stand = $derived(aktiv === 1 ? stand1 : stand2);
  const erg = $derived(ergebnisFuer(kb, aktiv));
  const bereit = $derived(kb.z.kategorien.length > 0);
  const eigenerName = (nr: 1 | 2) => kb.uebernommen[nr - 1];
  const tabellen = $derived([
    haeufigkeitsTabelle(h, aktiv === 2 ? L('Häufigkeiten (zweite Kodierung)', 'Frequencies (second coding)') : L('Häufigkeiten der Kategorien', 'Frequencies of the categories')),
    ...(leitfadenTabelle(anz) ? [leitfadenTabelle(anz)!] : [])
  ]);
  /** Wurde der Wunschname schon von einer fremden Spalte belegt? Dann heißt die neue Spalte anders (nie überschreiben). */
  const wunsch = $derived(`${grundname(kb, aktiv).slice(0, 52)}_kat${erg.modus === 'mehrfach' ? '1' : ''}`);
  const ausgewichen = $derived(!!erg.spalten[0] && erg.spalten[0].name.toLowerCase() !== wunsch.toLowerCase());
  const standText = (st: UebernahmeStand) => st === 'aktuell' ? L('Spalten sind aktuell', 'Columns are up to date') : st === 'geaendert' ? L('Die Zuordnung hat sich seit der Übernahme geändert - erneut übernehmen', 'The assignment has changed since it was written to the data - write it again') : L('Noch nicht in die Daten übernommen', 'Not written to the data yet');
  $effect(() => { if (!kb.z.kategorien.some(k => k.id === uebKategorie)) uebKategorie = kb.z.kategorien[0]?.id ?? ''; });

  async function uebernimm() {
    if (laeuft || s.arbeitet || !bereit) return;
    laeuft = true;
    try {
      const ok = await uebernehmen(blatt, aktiv);
      if (ok) { melde(L('In die Daten übernommen. „Rückgängig“ nimmt es mit einem Schritt zurück.', 'Written to the data. "Undo" takes it back in one step.'), true); ansagen(L('Die Spalten stehen jetzt in den Daten.', 'The columns are now in the data.')); }
      else melde(L('Das Übernehmen ging nicht. Es ist alles wie vorher.', "Writing to the data didn't work. Everything is as it was before."));
    } finally { laeuft = false; }
  }
  /** Weiter zur Auswertung der übernommenen Spalten: die Karte „Wie verteilt sich etwas?“, schon ausgefüllt. */
  function auswerten() {
    const u = eigenerName(aktiv); if (!u) return;
    frageVorschlag.v = { art: 'verteilung', w: { l1: [u.set ? '$' + u.set : u.namen[0]!], l2: [], l3: [], l4: [] } };
    location.hash = 'blatt/neu';
  }
  const uebSpalten = $derived(uebereinstimmungsSpalten(kb, uebKategorie));
  function pruefen() {
    const sp = uebereinstimmungsSpalten(kb, uebKategorie); if (!sp) return;
    frageVorschlag.v = { art: 'uebereinstimmung', w: { l1: [...sp], l2: [], l3: [], l4: [] } };
    location.hash = 'blatt/neu';
  }
  function zweite() { tue(() => zweiteAnlegen(kb)); setzeAktiv(2); ansagen(L('Zweite Kodierung angelegt. Zu sehen ist jetzt nur die Zuordnung der zweiten Kodierung.', 'Second coding created. Only the assignment of the second coding is shown now.')); }
</script>

<div class="ke">
  <p class="ke-zaehler" use:ergebnisAnsage><b>{fehlendSatz(h)}</b></p>
  <p class="heft-text">{h.nZugeordnet ? basisSatz(h) : L('Noch keine Antwort ist einer Kategorie zugeordnet.', 'No answer is assigned to a category yet.')}{#if summeSatz(h)} {summeSatz(h)}{/if}</p>
  <Ausgabe items={tabellen} nurTabellen />
  <p class="hilfe">{L('Die Tabelle beschreibt diese Antworten. Sie prüft nichts und lässt sich nicht auf andere Personen übertragen. Statable ordnet nichts selbst zu.', 'The table describes these answers. It tests nothing and cannot be generalized to other people. Statable does not assign anything itself.')} <HilfeLink id="frage-kategorien" text={L('Hilfe: Offene Antworten ordnen', 'Help: ordering open answers')} /></p>

  <section class="ke-box" aria-labelledby="ke-uebernahme-t">
    <h3 id="ke-uebernahme-t">{aktiv === 2 ? L('Zweite Kodierung in die Daten übernehmen', 'Write the second coding to the data') : L('In die Daten übernehmen', 'Write to the data')}</h3>
    <p class="hilfe">{#if erg.modus === 'eins'}{#if erg.labels.length === 0}{L(`Neue Spalte ${erg.spalten[0]?.name ?? ''}: eine Gruppenspalte. Sie bekommt ihre Codes und Wertebeschriftungen, sobald es Kategorien gibt.`, `New column ${erg.spalten[0]?.name ?? ''}: a group column. It gets its codes and value labels as soon as there are categories.`)}
      {:else if erg.labels.length === 1}{L(`Neue Spalte ${erg.spalten[0]?.name ?? ''}: eine Gruppenspalte mit dem Code 1 und der Kategorie als Wertebeschriftung. Antworten ohne Text und noch offene bleiben fehlend.`, `New column ${erg.spalten[0]?.name ?? ''}: a group column with the code 1 and the category as value label. Answers without text and open ones stay missing.`)}
      {:else}{L(`Neue Spalte ${erg.spalten[0]?.name ?? ''}: eine Gruppenspalte mit den Codes 1 bis ${erg.labels.length} und den Kategorien als Wertebeschriftung. Antworten ohne Text und noch offene bleiben fehlend.`, `New column ${erg.spalten[0]?.name ?? ''}: a group column with the codes 1 to ${erg.labels.length} and the categories as value labels. Answers without text and open ones stay missing.`)}{/if}
      {:else if erg.spalten.length}{L(`Neue Spalten ${erg.spalten[0]?.name ?? ''} bis ${erg.spalten.at(-1)?.name ?? ''}: je Kategorie eine 0/1-Spalte (1 = zugeordnet, 0 = beantwortet, aber nicht diese Kategorie, fehlend = ohne Text oder noch offen).`, `New columns ${erg.spalten[0]?.name ?? ''} to ${erg.spalten.at(-1)?.name ?? ''}: one 0/1 column per category (1 = assigned, 0 = answered but not this category, missing = no text or still open).`)}
        {#if erg.set}{L(`Dazu kommt das Mehrfachantworten-Set ${erg.set.name}.`, `The multiple response set ${erg.set.name} is added.`)}{/if}{/if}
      {L('Statable schreibt die Spalten nur auf Knopfdruck. Eigene Spalten aus einer früheren Übernahme werden überschrieben, fremde Spalten nie.', 'Statable only writes the columns when the button is pressed. Own columns from an earlier write are overwritten, other columns never.')}</p>
    {#if ausgewichen}<p class="hilfe" role="status">{L(`Eine Spalte ${zitat(wunsch)} gibt es schon und sie gehört nicht hierher; die neue Spalte heißt darum ${zitat(erg.spalten[0]!.name)}.`, `A column ${zitat(wunsch)} already exists and does not belong here; the new column is therefore called ${zitat(erg.spalten[0]!.name)}.`)}</p>{/if}
    <div class="knopfzeile">
      <button class="k haupt" type="button" onclick={uebernimm} aria-disabled={laeuft || s.arbeitet || !bereit ? 'true' : undefined}>{#if laeuft}<Rechnet imKnopf text={L('Statable schreibt …', 'Statable is writing …')} />{:else}<Icon n="tabelle" />{stand === 'nicht' ? L('In die Daten übernehmen', 'Write to the data') : L('Erneut übernehmen', 'Write again')}{/if}</button>
      <span class="ke-stand ke-{stand}" use:ergebnisAnsage>{#if stand === 'aktuell'}<Icon n="haken" />{/if}{bereit ? standText(stand) : L('Zuerst eine Kategorie anlegen.', 'First create a category.')}</span>
    </div>
    {#if stand === 'aktuell'}
      <p class="knopfzeile"><button class="k" type="button" onclick={auswerten}><Icon n="diagramm" />{L('Jetzt auswerten: Häufigkeiten', 'Evaluate now: frequencies')}</button> <a class="k leise" href="#daten"><Icon n="tabelle" />{L('Zu den Daten', 'To the data')}</a></p>
    {/if}
  </section>

  <section class="ke-box" aria-labelledby="ke-zweit-t">
    <h3 id="ke-zweit-t">{L('Zweite Kodierung und Übereinstimmung', 'Second coding and agreement')}</h3>
    <p class="hilfe">{L('Eine zweite Person ordnet dieselben Antworten mit denselben Kategorien zu, ohne die erste Zuordnung zu sehen. Die Übereinstimmung (Cohens Kappa, Krippendorffs Alpha) gibt dann an, wie stark die beiden Kodierungen übereinstimmen. Für eine wirklich unabhängige Kodierung arbeitet die zweite Person in einer eigenen Kopie der Projektdatei.', 'A second person assigns the same answers with the same categories without seeing the first assignment. Agreement (Cohen\'s kappa, Krippendorff\'s alpha) then states how closely the two codings agree. For a truly independent coding the second person works in an own copy of the project file.')}</p>
    {#if !kb.zuordnung2}
      <div class="knopfzeile"><button class="k" type="button" disabled={!bereit} onclick={zweite}><Icon n="plus" />{L('Zweite Kodierung anlegen', 'Create a second coding')}</button></div>
    {:else}
      <ul class="ke-liste">
        <li><b>{L('Erste Kodierung', 'First coding')}{dp()}</b> {standText(stand1)}{#if aktiv !== 1} <button class="k klein leise" type="button" onclick={() => setzeAktiv(1)}>{L('Zur ersten Kodierung', 'Go to the first coding')}</button>{/if}</li>
        <li><b>{L('Zweite Kodierung', 'Second coding')}{dp()}</b> {standText(stand2)}{#if aktiv !== 2} <button class="k klein leise" type="button" onclick={() => setzeAktiv(2)}>{L('Zur zweiten Kodierung', 'Go to the second coding')}</button>{/if}</li>
      </ul>
      {#if kb.z.mehrfach}
        <div class="eingabe" style="max-width:24rem"><label for="ke-ueb-kat">{L('Übereinstimmung für die Kategorie', 'Agreement for the category')}</label>
          <select id="ke-ueb-kat" bind:value={uebKategorie}>{#each kb.z.kategorien as k (k.id)}<option value={k.id}>{k.name}</option>{/each}</select></div>
        <p class="hilfe">{L('Bei mehreren Kategorien je Antwort wird je Kategorie geprüft (die 0/1-Spalten der beiden Kodierungen), nicht alle zusammen.', 'With several categories per answer agreement is checked per category (the 0/1 columns of the two codings), not for all together.')}</p>
      {/if}
      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={pruefen} aria-disabled={uebSpalten ? undefined : 'true'}><Icon n="gruppen" />{L('Übereinstimmung prüfen', 'Check agreement')}</button>
        <button class="k leise" type="button" onclick={() => { tue(() => zweiteEntfernen(kb)); setzeAktiv(1); ansagen(L('Zweite Kodierung entfernt. Die Spalten in den Daten bleiben, wie sie sind.', 'Second coding removed. The columns in the data stay as they are.')); }}>{L('Zweite Kodierung entfernen', 'Remove second coding')}</button>
      </div>
      {#if !uebSpalten}
        <p class="hilfe">{L('Beide Kodierungen müssen in die Daten übernommen und aktuell sein, bevor die Übereinstimmung geprüft werden kann. Zum Übernehmen zur jeweiligen Kodierung wechseln und oben „In die Daten übernehmen“ wählen.', 'Both codings must be written to the data and be up to date before agreement can be checked. To write one, switch to that coding and choose "Write to the data" above.')}</p>
      {/if}
    {/if}
  </section>
</div>

<style>
  .ke { display: flex; flex-direction: column; gap: var(--a3); }
  .ke-zaehler { margin: 0; }
  .ke .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); max-width: 66ch; }
  .ke-box { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a3); display: flex; flex-direction: column; gap: var(--a2); background: var(--blatt); max-width: 56rem; }
  .ke-box h3 { margin: 0; font-size: 1rem; }
  .ke-stand { display: inline-flex; align-items: center; gap: var(--a1); color: var(--tinte-2); }
  .ke-stand.ke-aktuell { color: var(--tinte); font-weight: 650; }
  .ke-stand.ke-geaendert { color: var(--tinte); font-weight: 650; }
  .ke-liste { margin: 0; padding-inline-start: 1.2em; }
  .ke :global(.ico) { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>
