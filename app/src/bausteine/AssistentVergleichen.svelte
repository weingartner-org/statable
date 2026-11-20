<script lang="ts">
  import { untrack } from 'svelte';
  import { s, L, Lp, d } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { AssistentFehler } from '../lib/datenassistent';
  import { anzeigeWert, fehlerSatz } from '../lib/datenassistentsaetze';
  import { ladeZweiteDatei, type ZweiteDatei } from '../lib/datenassistentlauf';
  import { vergleiche, abweichungenAlsTabelle } from '../lib/vergleichen';
  import { exportiereListeCsv } from '../lib/export';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  /**
   * „Datensätze vergleichen“ (S-F2 D6): Doppeleingabe von Fragebögen. Die offenen Daten sind Datei 1, die gewählte Datei ist Datei 2. Verglichen wird Zelle für Zelle über eine Schlüsselspalte;
   * das Ergebnis lässt sich als CSV speichern. Die Daten ändern sich nicht (kein Rückgängig-Schritt nötig).
   */
  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  let zweite = $state<ZweiteDatei | null>(null);
  let ladeFehler = $state('');
  let dateiFeld = $state<HTMLInputElement>();
  const laden = new Laedt();
  async function waehleDatei(e: Event) {
    const feld = e.currentTarget as HTMLInputElement, datei = feld.files?.[0];
    feld.value = '';
    if (!datei) return;
    ladeFehler = '';
    await laden.mit(async () => {
      try { zweite = await ladeZweiteDatei(datei, { projekt: true }); }
      catch (f) { zweite = null; ladeFehler = fehlerSatz(f instanceof AssistentFehler ? f : new AssistentFehler('lesen', datei.name)); }
    });
  }
  /** Schlüssel: leer = noch nicht gewählt, '#zeile' = ohne Schlüssel */
  let schluessel = $state('');
  let locker = $state(false);
  const gemeinsame = $derived(zweite ? daten.spalten.filter(a => zweite!.daten.spalten.some(b => b.name.toUpperCase() === a.name.toUpperCase())) : []);
  /** Beim Laden: eine gemeinsame Spalte, die wie eine Kennung heißt, vorschlagen. */
  $effect(() => {
    const z = zweite; if (!z) return;
    untrack(() => { schluessel = (gemeinsame.find(c => /(^|_)(id|kennung|code|nr|pid|fall)$|^(id|kennung|code|nr|pid)/i.test(c.name)) ?? gemeinsame[0])?.name ?? '#zeile'; });
  });
  const ergebnis = $derived(zweite && schluessel ? vergleiche(daten, zweite.daten, { schluessel: schluessel === '#zeile' ? null : schluessel, locker }) : null);
  const MAX = 200;
  const nenne = (l: string[], max = 12) => l.length > max ? `${l.slice(0, max).join(', ')} ${L(`und ${l.length - max} weitere`, `and ${l.length - max} more`)}` : l.join(', ');
  const spaltenVon = (d: Spalte[], n: string) => d.find(c => c.name.toUpperCase() === n.toUpperCase());

  const problem = $derived.by(() => {
    if (!zweite) return L('Zuerst die zweite Datei wählen.', 'First choose the second file.');
    const p = ergebnis?.problem;
    if (!p) return '';
    if (p.art === 'doppelt') return L(`In Datei ${p.datei} kommt der Schlüssel mehrfach vor: ${nenne(p.schluessel, 8)}. So lässt sich nicht vergleichen. Bitte erst die doppelten Fälle bereinigen (Daten bearbeiten → Doppelte Fälle) oder eine andere Schlüsselspalte wählen.`, `In file ${p.datei} the key occurs more than once: ${nenne(p.schluessel, 8)}. It cannot be compared like this. Please clean up the duplicate cases first (Edit data → Duplicate cases) or choose another key column.`);
    if (p.art === 'zeilenzahl') return d(`Ohne Schlüssel lässt sich nur vergleichen, wenn beide Dateien gleich viele Zeilen haben (Datei 1: ${p.n1}, Datei 2: ${p.n2}). Wähle eine Schlüsselspalte.`, `Ohne Schlüssel lässt sich nur vergleichen, wenn beide Dateien gleich viele Zeilen haben (Datei 1: ${p.n1}, Datei 2: ${p.n2}). Wählen Sie eine Schlüsselspalte.`, `Without a key the files can only be compared if they have the same number of rows (file 1: ${p.n1}, file 2: ${p.n2}). Choose a key column.`);
    if (p.art === 'schluessel') return L(`Die Schlüsselspalte gibt es in Datei ${p.datei} nicht.`, `The key column does not exist in file ${p.datei}.`);
    return L('Die beiden Dateien haben keine Spalte mit demselben Namen (außer dem Schlüssel). Es gibt nichts zu vergleichen.', 'The two files have no column with the same name (apart from the key). There is nothing to compare.');
  });
  const hinweise = $derived.by(() => {
    const e = ergebnis; if (!e || e.problem) return [];
    const h: string[] = [];
    if (e.nachZeile) h.push(L('Ohne Schlüssel wird nach der Zeilennummer verglichen. Das stimmt nur, wenn beide Dateien dieselben Fälle in derselben Reihenfolge haben.', 'Without a key the files are compared by row number. That is only right if both files have the same cases in the same order.'));
    if (e.spaltenNur1.length) h.push(L(`Nur in Datei 1 (nicht verglichen): ${nenne(e.spaltenNur1)}.`, `Only in file 1 (not compared): ${nenne(e.spaltenNur1)}.`));
    if (e.spaltenNur2.length) h.push(L(`Nur in Datei 2 (nicht verglichen): ${nenne(e.spaltenNur2)}.`, `Only in file 2 (not compared): ${nenne(e.spaltenNur2)}.`));
    if (e.typUnterschied.length) h.push(L(`Bei ${nenne(e.typUnterschied)} ist die Art verschieden (Zahl gegen Text); verglichen wird der Wert als Text.`, `For ${nenne(e.typUnterschied)} the type differs (number versus text); the value is compared as text.`));
    if (e.ohneSchluessel[0] || e.ohneSchluessel[1]) h.push(L(`Fälle ohne Schlüsselwert werden nicht verglichen (Datei 1: ${e.ohneSchluessel[0]}, Datei 2: ${e.ohneSchluessel[1]}).`, `Cases without a key value are not compared (file 1: ${e.ohneSchluessel[0]}, file 2: ${e.ohneSchluessel[1]}).`));
    return h;
  });
  function speichern() {
    if (!ergebnis || ergebnis.problem || !zweite) return;
    const t = abweichungenAlsTabelle(ergebnis, schluessel === '#zeile' ? L('Zeile', 'Row') : schluessel, L('Spalte', 'Column'), L('Datei 1', 'File 1'), L('Datei 2', 'File 2'));
    exportiereListeCsv(t.kopf, t.zeilen, `${s.projekt?.name ?? L('Daten', 'Data')} - ${L('Abweichungen', 'Differences')}`);
  }
  const wert = (sp: Spalte | undefined, v: Wert) => (v === null || v === '' ? L('(leer)', '(empty)') : sp ? anzeigeWert(sp, v) : String(v));
</script>

<AssistentRahmen id="vergleichen" titel={L('Datensätze vergleichen', 'Compare datasets')} befehlName={L('Datensätze vergleichen', 'Compare datasets')}
  einleitung={d('Zwei Dateien Zelle für Zelle vergleichen, zum Beispiel bei einer Doppeleingabe von Fragebögen. Datei 1 sind die offenen Daten, Datei 2 wählst du hier. Die Daten werden nicht verändert.', 'Zwei Dateien Zelle für Zelle vergleichen, zum Beispiel bei einer Doppeleingabe von Fragebögen. Datei 1 sind die offenen Daten, Datei 2 wählen Sie hier. Die Daten werden nicht verändert.', 'Compare two files cell by cell, for example for double entry of questionnaires. File 1 is the open data, you choose file 2 here. The data are not changed.')}
  {problem} {hinweise}
  anwendenText={L('Abweichungen als CSV speichern', 'Save differences as CSV')} anwenden={speichern} kannAnwenden={!!ergebnis && !ergebnis.problem && ergebnis.abweichungen.length > 0}>
  {#snippet haupt()}
    <div class="as-feld"><span class="lbl">{L('Zweite Datei', 'Second file')}</span>
      <div class="knopfzeile">
        <input class="nur-vorleser" type="file" id="vg-datei" tabindex="-1" aria-label={L('Datei auswählen', 'Choose file')} accept=".sav,.zsav,.statable,.dta,.sas7bdat,.xpt,.csv,.txt,.tsv,.xlsx,.xlsm,.xls,.ods" bind:this={dateiFeld} onchange={waehleDatei}>
        <button class="k" type="button" disabled={laden.aktiv} onclick={() => dateiFeld?.click()}>{#if laden.sichtbar}<Rechnet imKnopf />{:else}<Icon n="ordner" />{/if}{zweite ? L('Andere Datei wählen', 'Choose another file') : L('Datei wählen', 'Choose file')}</button>
        {#if zweite}<span class="as-satz">{L(`„${zweite.name}“: ${zweite.daten.zeilen.length} Fälle, ${zweite.daten.spalten.length} Spalten`, `"${zweite.name}": ${zweite.daten.zeilen.length} cases, ${zweite.daten.spalten.length} columns`)}</span>{/if}
      </div>
      <span class="as-hilfe">{L('SPSS (.sav), Statable-Projekt, Stata, CSV oder Excel. Die Datei bleibt auf diesem Gerät.', 'SPSS (.sav), Statable project, Stata, CSV or Excel. The file stays on this device.')}</span>
      {#if ladeFehler}<p class="as-problem" role="status">{ladeFehler}</p>{/if}
    </div>
    {#if zweite}
      <div class="as-felder">
        <div class="as-feld"><label for="vg-k">{L('Schlüsselspalte (in beiden Dateien)', 'Key column (in both files)')}</label>
          <select id="vg-k" bind:value={schluessel}>{#each gemeinsame as c}<option value={c.name}>{c.bezeichnung ? `${c.name} - ${c.bezeichnung}` : c.name}</option>{/each}<option value="#zeile">{L('Ohne Schlüssel (nach Zeilennummer)', 'No key (by row number)')}</option></select>
          <span class="as-hilfe">{L('Eine Spalte, die in jeder Datei einen Fall eindeutig nennt, zum Beispiel eine Nummer.', 'A column that names each case uniquely in each file, for example a number.')}</span></div>
      </div>
      <label class="as-eins"><input type="checkbox" bind:checked={locker}><span>{L('Leerzeichen am Rand und Groß/Klein nicht beachten', 'Ignore spaces at the edges and upper/lower case')}</span></label>
    {/if}
  {/snippet}

  {#snippet vorschau()}
    {#if !zweite}<p class="as-hilfe">{L('Das Ergebnis erscheint, sobald die zweite Datei gewählt ist.', 'The result appears as soon as the second file is chosen.')}</p>
    {:else if ergebnis && !ergebnis.problem}
      <p class="as-satz">{ergebnis.abweichungen.length
        ? `${Lp(ergebnis.abweichungen.length, `${ergebnis.abweichungen.length} Abweichung`, `${ergebnis.abweichungen.length} Abweichungen`, `${ergebnis.abweichungen.length} difference`, `${ergebnis.abweichungen.length} differences`)} ${Lp(ergebnis.jeSpalte.length, `in ${ergebnis.jeSpalte.length} Spalte`, `in ${ergebnis.jeSpalte.length} Spalten`, `in ${ergebnis.jeSpalte.length} column`, `in ${ergebnis.jeSpalte.length} columns`)} ${Lp(ergebnis.verglichenFaelle, `bei ${ergebnis.verglichenFaelle} verglichenem Fall`, `bei ${ergebnis.verglichenFaelle} verglichenen Fällen`, `across ${ergebnis.verglichenFaelle} compared case`, `across ${ergebnis.verglichenFaelle} compared cases`)} (${Lp(ergebnis.verglichenSpalten.length, `${ergebnis.verglichenSpalten.length} Spalte`, `${ergebnis.verglichenSpalten.length} Spalten`, `${ergebnis.verglichenSpalten.length} column`, `${ergebnis.verglichenSpalten.length} columns`)}).`
        : `${L('Keine Abweichung:', 'No difference:')} ${Lp(ergebnis.verglichenFaelle, `${ergebnis.verglichenFaelle} Fall`, `${ergebnis.verglichenFaelle} Fälle`, `${ergebnis.verglichenFaelle} case`, `${ergebnis.verglichenFaelle} cases`)} ${L('und', 'and')} ${Lp(ergebnis.verglichenSpalten.length, `${ergebnis.verglichenSpalten.length} Spalte`, `${ergebnis.verglichenSpalten.length} Spalten`, `${ergebnis.verglichenSpalten.length} column`, `${ergebnis.verglichenSpalten.length} columns`)} ${L('sind gleich.', 'are identical.')}`}</p>
      {#if ergebnis.nurIn1.length || ergebnis.nurIn2.length}
        <p class="as-satz">{#if ergebnis.nurIn1.length}{Lp(ergebnis.nurIn1.length, 'Fall nur in Datei 1', 'Fälle nur in Datei 1', 'Case only in file 1', 'Cases only in file 1')} ({nenne(ergebnis.nurIn1)}).{' '}{/if}{#if ergebnis.nurIn2.length}{Lp(ergebnis.nurIn2.length, 'Fall nur in Datei 2', 'Fälle nur in Datei 2', 'Case only in file 2', 'Cases only in file 2')} ({nenne(ergebnis.nurIn2)}).{/if}</p>
      {/if}
      {#if ergebnis.jeSpalte.length}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Abweichungen je Spalte', 'Differences per column')}>
          <table class="as-tab"><thead><tr><th scope="col">{L('Spalte', 'Column')}</th><th scope="col" class="zahl">{L('Abweichungen', 'Differences')}</th></tr></thead>
            <tbody>{#each ergebnis.jeSpalte as j}<tr><th scope="row">{j.spalte}</th><td class="zahl">{j.anzahl}</td></tr>{/each}</tbody></table></div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Abweichungen, Zelle für Zelle', 'Differences, cell by cell')}>
          <table class="as-tab"><thead><tr><th scope="col">{schluessel === '#zeile' ? L('Zeile', 'Row') : schluessel}</th><th scope="col">{L('Spalte', 'Column')}</th><th scope="col">{L('Datei 1', 'File 1')}</th><th scope="col">{L('Datei 2', 'File 2')}</th></tr></thead>
            <tbody>{#each ergebnis.abweichungen.slice(0, MAX) as a}<tr><th scope="row">{a.schluessel}</th><td>{a.spalte}</td><td>{wert(spaltenVon(daten.spalten, a.spalte), a.wert1)}</td><td>{wert(spaltenVon(zweite.daten.spalten, a.spalte), a.wert2)}</td></tr>{/each}</tbody></table></div>
        {#if ergebnis.abweichungen.length > MAX}<p class="as-hilfe">{L(`Hier stehen die ersten ${MAX}. Alle ${ergebnis.abweichungen.length} stehen in der CSV-Datei.`, `The first ${MAX} are shown here. All ${ergebnis.abweichungen.length} are in the CSV file.`)}</p>{/if}
      {/if}
    {:else}<p class="as-hilfe">{L('Solange etwas fehlt oder gesperrt ist, gibt es kein Ergebnis (siehe Hinweis).', 'As long as something is missing or blocked there is no result (see note).')}</p>{/if}
  {/snippet}
</AssistentRahmen>
