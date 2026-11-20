<script lang="ts">
  import { s, L, Lp, d } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { AssistentFehler } from '../lib/datenassistent';
  import { fehlerSatz } from '../lib/datenassistentsaetze';
  import { ladeZweiteDatei, wendeAn, type ZweiteDatei } from '../lib/datenassistentlauf';
  import { eigenschaftenUebernehmen, type Uebernahme } from '../lib/eigenschaften';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  /**
   * „Eigenschaften übernehmen“ (S-F2 D5; SPSS: Dateneigenschaften kopieren): Beschriftung, Wertelabels, Fehlend-Codes und Messniveau aus einer .sav oder .statable auf
   * Spalten mit gleichem Namen. Die Daten bleiben unverändert; ein Rückgängig-Schritt.
   */
  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  let quelle = $state<ZweiteDatei | null>(null);
  let ladeFehler = $state('');
  let dateiFeld = $state<HTMLInputElement>();
  const laden = new Laedt();
  async function waehleDatei(e: Event) {
    const feld = e.currentTarget as HTMLInputElement, datei = feld.files?.[0];
    feld.value = '';
    if (!datei) return;
    ladeFehler = '';
    await laden.mit(async () => {
      try { quelle = await ladeZweiteDatei(datei, { projekt: true }); }
      catch (f) { quelle = null; ladeFehler = fehlerSatz(f instanceof AssistentFehler ? f : new AssistentFehler('lesen', datei.name)); }
    });
  }
  let wahl = $state<Uebernahme>({ bezeichnung: true, werteLabels: true, fehlend: true, niveau: true });
  const plan = $derived(quelle ? eigenschaftenUebernehmen(daten, quelle.daten, wahl) : null);
  const mitAenderung = $derived(plan?.spalten.filter(x => x.aenderungen.length) ?? []);
  const nenne = (l: string[], max = 6) => l.length > max ? `${l.slice(0, max).join(', ')} ${L(`und ${l.length - max} weitere`, `and ${l.length - max} more`)}` : l.join(', ');
  const ART = () => ({ bezeichnung: L('Beschriftung', 'Label'), werteLabels: L('Wertelabels', 'Value labels'), fehlend: L('Keine Angabe', 'Missing values'), niveau: L('Messniveau', 'Level') });
  const NIV = () => ({ metrisch: L('Skala', 'Scale'), ordinal: L('ordinal', 'ordinal'), nominal: L('nominal', 'nominal') } as Record<string, string>);
  const zeige = (art: keyof Uebernahme, t: string) => (art === 'niveau' ? NIV()[t] ?? t : t === '' ? L('(leer)', '(empty)') : t);

  const hinweise = $derived.by(() => {
    if (!plan || !quelle) return [];
    const h: string[] = [];
    const passt = plan.spalten.filter(x => x.typPasstNicht).map(x => x.name);
    if (passt.length) h.push(Lp(passt.length, `Bei ${nenne(passt)} ist die Art anders (Text gegen Zahl): Wertelabels und „Keine Angabe“-Codes dieser Spalte werden nicht übernommen.`, `Bei ${nenne(passt)} ist die Art anders (Text gegen Zahl): Wertelabels und „Keine Angabe“-Codes dieser Spalten werden nicht übernommen.`, `For ${nenne(passt)} the type differs (text versus number): value labels and missing-value codes of this column are not copied.`, `For ${nenne(passt)} the type differs (text versus number): value labels and missing-value codes of these columns are not copied.`));
    const neu = plan.spalten.flatMap(x => x.aenderungen.filter(a => a.neuFehlend).map(a => ({ n: x.name, k: a.neuFehlend! })));
    if (neu.length) h.push(L(`Achtung: Mit den neuen „Keine Angabe“-Codes zählen bisher gültige Werte nicht mehr mit - ${neu.slice(0, 4).map(x => `${x.n}: ${x.k}`).join(', ')}${neu.length > 4 ? ' …' : ''}. Die Zahlen bleiben in den Daten stehen.`, `Note: with the new missing-value codes, values that were valid so far no longer count - ${neu.slice(0, 4).map(x => `${x.n}: ${x.k}`).join(', ')}${neu.length > 4 ? ' …' : ''}. The numbers stay in the data.`));
    if (plan.nurInQuelle.length) h.push(d(`In deinen Daten fehlen Spalten der Quelle: ${nenne(plan.nurInQuelle)}. Sie werden nicht angelegt.`, `In Ihren Daten fehlen Spalten der Quelle: ${nenne(plan.nurInQuelle)}. Sie werden nicht angelegt.`, `Columns of the source are missing in your data: ${nenne(plan.nurInQuelle)}. They are not created.`));
    if (plan.nurInDaten.length) h.push(L(`Ohne Gegenstück in der Quelle (bleiben unverändert): ${nenne(plan.nurInDaten)}.`, `No counterpart in the source (left unchanged): ${nenne(plan.nurInDaten)}.`));
    return h;
  });
  const problem = $derived(!quelle ? L('Zuerst die Quelldatei wählen.', 'First choose the source file.') : !Object.values(wahl).some(Boolean) ? d('Wähle mindestens eine Eigenschaft.', 'Wählen Sie mindestens eine Eigenschaft.', 'Choose at least one property.') : !plan?.spalten.length ? d('Keine Spalte der Quelle hat denselben Namen wie eine Spalte deiner Daten.', 'Keine Spalte der Quelle hat denselben Namen wie eine Spalte Ihrer Daten.', 'No column of the source has the same name as a column of your data.') : !plan.syntax ? L('Es gibt nichts zu ändern: die gewählten Eigenschaften sind schon gleich.', 'Nothing to change: the chosen properties are already the same.') : '');
  const lad = new Laedt();
  async function anwenden() {
    if (!plan?.syntax || !quelle) return;
    const q = quelle, sx = plan.syntax;
    await lad.mit(() => wendeAn(L(`Eigenschaften aus „${q.name}“ übernommen`, `Properties copied from "${q.name}"`), sx));
  }
</script>

<AssistentRahmen id="eigenschaften" titel={L('Eigenschaften übernehmen', 'Copy data properties')} befehlName={L('Eigenschaften übernehmen', 'Copy data properties')}
  einleitung={d('Beschriftungen, Wertelabels, „Keine Angabe“-Codes und Messniveau aus einer anderen Datei auf deine Spalten übertragen. Die Spalten werden über den Namen zugeordnet. Die Daten selbst bleiben unverändert.', 'Beschriftungen, Wertelabels, „Keine Angabe“-Codes und Messniveau aus einer anderen Datei auf Ihre Spalten übertragen. Die Spalten werden über den Namen zugeordnet. Die Daten selbst bleiben unverändert.', 'Copy labels, value labels, missing-value codes and measurement level from another file to your columns. Columns are matched by name. The data themselves stay unchanged.')}
  syntax={plan?.syntax ?? ''} {problem} {hinweise}
  anwendenText={L('Eigenschaften übernehmen', 'Copy properties')} anwenden={anwenden} kannAnwenden={!problem} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-feld"><span class="lbl">{L('Quelldatei', 'Source file')}</span>
      <div class="knopfzeile">
        <input class="nur-vorleser" type="file" id="ei-datei" tabindex="-1" aria-label={L('Datei auswählen', 'Choose file')} accept=".sav,.zsav,.statable" bind:this={dateiFeld} onchange={waehleDatei}>
        <button class="k" type="button" disabled={laden.aktiv} onclick={() => dateiFeld?.click()}>{#if laden.sichtbar}<Rechnet imKnopf />{:else}<Icon n="ordner" />{/if}{quelle ? L('Andere Datei wählen', 'Choose another file') : L('Datei wählen', 'Choose file')}</button>
        {#if quelle}<span class="as-satz">{L(`„${quelle.name}“: ${quelle.daten.spalten.length} Spalten`, `"${quelle.name}": ${quelle.daten.spalten.length} columns`)}</span>{/if}
      </div>
      <span class="as-hilfe">{L('SPSS (.sav) oder Statable-Projekt (.statable). Die Datei bleibt auf diesem Gerät.', 'SPSS (.sav) or Statable project (.statable). The file stays on this device.')}</span>
      {#if ladeFehler}<p class="as-problem" role="status">{ladeFehler}</p>{/if}
    </div>
    <fieldset class="as-gruppe"><legend>{L('Was soll übernommen werden?', 'What should be copied?')}</legend>
      <div class="as-chips">
        {#each ['bezeichnung', 'werteLabels', 'fehlend', 'niveau'] as const as a}<label class="as-chip"><input type="checkbox" bind:checked={wahl[a]}>{ART()[a]}</label>{/each}
      </div>
    </fieldset>
  {/snippet}

  {#snippet vorschau()}
    {#if !plan}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald die Quelldatei gewählt ist.', 'The preview appears as soon as the source file is chosen.')}</p>
    {:else}
      <p class="as-satz">{L(`${plan.spalten.length} Spalten passen nach dem Namen, bei ${mitAenderung.length} ändert sich etwas.`, `${plan.spalten.length} columns match by name, ${mitAenderung.length} would change.`)}</p>
      {#if mitAenderung.length}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Was sich ändert', 'What changes')}>
          <table class="as-tab"><thead><tr><th scope="col">{L('Spalte', 'Column')}</th><th scope="col">{L('Eigenschaft', 'Property')}</th><th scope="col">{L('Jetzt', 'Now')}</th><th scope="col">{L('Danach', 'After')}</th></tr></thead>
            <tbody>{#each mitAenderung as x}{#each x.aenderungen as a, i}<tr><th scope="row">{i === 0 ? x.name : ''}</th><td>{ART()[a.art]}</td><td>{zeige(a.art, a.vorher)}</td><td>{zeige(a.art, a.nachher)}</td></tr>{/each}{/each}</tbody></table></div>
      {/if}
    {/if}
  {/snippet}
</AssistentRahmen>
