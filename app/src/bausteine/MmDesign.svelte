<script lang="ts">
  /**
   * Design-Steckbrief (Stufe A2): vier Fragen (Reihenfolge, Gewicht, Zweck, Integration), Schreibweise nach Morse, Name nach Creswell und Plano Clark,
   * Ablaufbild mit Textfassung. Statable fragt und benennt; es empfiehlt kein Design. Speichern über `aendere()` (Rückgängig), Ansagen über `sage()`.
   */
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendere } from '../lib/kodieren.svelte';
  import { MM_GEWICHTE, MM_INTEGRATION, MM_REIHENFOLGEN, MM_ZWECKE, type MmDesign as Steckbrief, type QualProjekt } from '../lib/qualprojekt';
  import { ablauf, ablaufText, designFragen, designName, gewichtText, integrationText, notation, reihenfolgeText, setzeDesign, zweckText } from '../lib/mm-design';

  interface Props { q: QualProjekt }
  let { q }: Props = $props();

  const d = $derived<Steckbrief>(q.mmDesign ?? { zwecke: [], integration: [], geaendert: 0 });
  const schreibweise = $derived(notation(d));
  const name = $derived(designName(d));
  const schritte = $derived(ablauf(d));
  const fragen = $derived(designFragen(d));
  let beschr = $state<string | null>(null);
  const beschrWert = $derived(beschr ?? d.beschreibung ?? '');

  function setze(text: string, f: (d0: Steckbrief) => Steckbrief, ansage: string) {
    aendere(text, q0 => setzeDesign(q0, f));
    sage(ansage);
  }
  const waehleReihenfolge = (r: typeof MM_REIHENFOLGEN[number]) =>
    setze(L('Reihenfolge im Design-Steckbrief zurückgenommen', 'Order in the design profile undone'), x => ({ ...x, reihenfolge: r }), L(`Reihenfolge gewählt: ${reihenfolgeText(r)}.`, `Order chosen: ${reihenfolgeText(r)}.`));
  const waehleGewicht = (g: typeof MM_GEWICHTE[number]) =>
    setze(L('Gewicht im Design-Steckbrief zurückgenommen', 'Priority in the design profile undone'), x => ({ ...x, gewicht: g }), L(`Gewicht gewählt: ${gewichtText(g)}.`, `Priority chosen: ${gewichtText(g)}.`));
  function schalteZweck(z: typeof MM_ZWECKE[number], an: boolean) {
    setze(L('Zweck im Design-Steckbrief zurückgenommen', 'Purpose in the design profile undone'), x => ({ ...x, zwecke: an ? [...x.zwecke.filter(w => w !== z), z] : x.zwecke.filter(w => w !== z) }),
      an ? L(`Zweck gewählt: ${zweckText(z)}.`, `Purpose chosen: ${zweckText(z)}.`) : L(`Zweck abgewählt: ${zweckText(z)}.`, `Purpose removed: ${zweckText(z)}.`));
  }
  function schalteIntegration(i: typeof MM_INTEGRATION[number], an: boolean) {
    setze(L('Integrationsart im Design-Steckbrief zurückgenommen', 'Type of integration in the design profile undone'), x => ({ ...x, integration: an ? [...x.integration.filter(w => w !== i), i] : x.integration.filter(w => w !== i) }),
      an ? L(`Integrationsart gewählt: ${integrationText(i)}.`, `Type of integration chosen: ${integrationText(i)}.`) : L(`Integrationsart abgewählt: ${integrationText(i)}.`, `Type of integration removed: ${integrationText(i)}.`));
  }
  function speichereBeschreibung() {
    if (beschr === null) return;
    const t = beschr;
    setze(L('Beschreibung im Design-Steckbrief zurückgenommen', 'Description in the design profile undone'), x => ({ ...x, beschreibung: t.trim() }), L('Beschreibung gespeichert.', 'Description saved.'));
    beschr = null;
  }
</script>

<div class="mm-teil">
  <h4 id="ko-mm-de-t" tabindex="-1">{L('Welches Design hat meine Studie? (Design-Steckbrief, Mixed-Methods-Design)', 'Which design does my study have? (design profile, mixed methods design)')}</h4>
  <p class="hilfe">{L('Statable fragt und benennt; es empfiehlt kein Design. Die Fragen folgen Schoonenboom und Johnson (2017): Reihenfolge, Gewicht, Zweck und Ort der Verbindung. Zweck nach Greene, Caracelli und Graham (1989), Art der Verbindung nach Fetters, Curry und Creswell (2013).', 'Statable asks and names; it does not recommend a design. The questions follow Schoonenboom and Johnson (2017): order, priority, purpose and point of linking. Purpose after Greene, Caracelli and Graham (1989), type of linking after Fetters, Curry and Creswell (2013).')}</p>

  <fieldset>
    <legend>{L('1. In welcher Reihenfolge erheben Sie Zahlen und Texte? (Zeitfolge, timing)', '1. In which order do you collect numbers and texts? (timing)')}</legend>
    {#each MM_REIHENFOLGEN as r (r)}
      <label class="eigen-wahl"><input type="radio" name="ko-mm-de-reihe" value={r} checked={d.reihenfolge === r} onchange={() => waehleReihenfolge(r)}>{reihenfolgeText(r)}</label>
    {/each}
  </fieldset>

  <fieldset>
    <legend>{L('2. Welcher Teil ist wichtiger? (Gewicht, priority)', '2. Which part is more important? (priority)')}</legend>
    {#each MM_GEWICHTE as g (g)}
      <label class="eigen-wahl"><input type="radio" name="ko-mm-de-gewicht" value={g} checked={d.gewicht === g} onchange={() => waehleGewicht(g)}>{gewichtText(g)}</label>
    {/each}
  </fieldset>

  <fieldset>
    <legend>{L('3. Wozu verbinden Sie beides? Mehrere sind möglich. (Zweck, purpose)', '3. Why do you combine both? Several are possible. (purpose)')}</legend>
    {#each MM_ZWECKE as z (z)}
      <label class="eigen-wahl"><input type="checkbox" name="ko-mm-de-zweck" value={z} checked={d.zwecke.includes(z)} onchange={e => schalteZweck(z, e.currentTarget.checked)}>{zweckText(z)}</label>
    {/each}
  </fieldset>

  <fieldset>
    <legend>{L('4. Wie und wo verbinden Sie beides? Mehrere sind möglich. (Integration, integration)', '4. How and where do you link both? Several are possible. (integration)')}</legend>
    {#each MM_INTEGRATION as i (i)}
      <label class="eigen-wahl"><input type="checkbox" name="ko-mm-de-integr" value={i} checked={d.integration.includes(i)} onchange={e => schalteIntegration(i, e.currentTarget.checked)}>{integrationText(i)}</label>
    {/each}
  </fieldset>

  <div class="feld">
    <label for="ko-mm-de-besch">{L('Eigene Beschreibung (in eigenen Worten)', 'Own description (in your own words)')}</label>
    <textarea id="ko-mm-de-besch" rows="4" value={beschrWert} oninput={e => (beschr = e.currentTarget.value)}></textarea>
    <div class="knopfzeile"><button class="k" type="button" id="ko-mm-de-besch-sp" disabled={beschr === null} onclick={speichereBeschreibung}>{L('Beschreibung speichern', 'Save description')}</button></div>
  </div>

  <h5 id="ko-mm-de-erg-t">{L('Ergebnis: Schreibweise und Name', 'Result: notation and name')}</h5>
  {#if d.reihenfolge === undefined}
    <p class="hilfe">{L('Beantworten Sie die erste Frage, dann zeigt Statable Schreibweise und Name.', 'Answer the first question and Statable shows the notation and name.')}</p>
  {:else}
    {#if schreibweise}
      <p>{L('Schreibweise:', 'Notation:')} <strong id="ko-mm-de-notation">{schreibweise}</strong></p>
      <p class="hilfe">{L('Nach Morse (1991): Großbuchstaben (QUAN, QUAL) bezeichnen den Hauptteil, Kleinbuchstaben (quan, qual) den ergänzenden Teil. „+“ heißt gleichzeitig, „→“ heißt nacheinander.', 'After Morse (1991): capital letters (QUAN, QUAL) mark the main part, lower case (quan, qual) the supporting part. "+" means at the same time, "→" means one after the other.')}</p>
    {/if}
    {#if name}
      <p>{L('Name:', 'Name:')} <strong id="ko-mm-de-name">{name.en}</strong> ({L('deutsch', 'German')}: {name.de})</p>
      <p class="hilfe">{L('Englischer Name nach Creswell und Plano Clark (2018); deutsch nach Kuckartz (2014).', 'English name after Creswell and Plano Clark (2018); German after Kuckartz (2014).')}</p>
    {:else}
      <p id="ko-mm-de-keinname">{L('Für mehrphasige Designs gibt es keinen Standardnamen. Beschreiben Sie Ihr Design in eigenen Worten.', 'There is no standard name for multiphase designs. Describe your design in your own words.')}</p>
    {/if}
    {#if schritte.length}
      <h5 id="ko-mm-de-ablauf-t">{L('Ablauf', 'Sequence')}</h5>
      <div class="ablauf" aria-hidden="true">
        {#each schritte as schritt, i (i)}
          {#if i > 0}<span class="pfeil">↓</span>{/if}
          <div class="reihe">{#each schritt as k (k)}<span class="kasten">{k}</span>{/each}</div>
        {/each}
      </div>
      <p class="hilfe" id="ko-mm-de-ablauf-text">{ablaufText(schritte)}</p>
    {/if}
  {/if}

  {#if fragen.length}
    <h5 id="ko-mm-de-fragen-t">{L('Zum Nachdenken', 'Something to think about')}</h5>
    <ul class="fragen">{#each fragen as f (f.kennung)}<li>{f.text}</li>{/each}</ul>
    <p class="hilfe">{L('Das sind Fragen, keine Empfehlungen. Sie entscheiden.', 'These are questions, not recommendations. You decide.')}</p>
  {/if}
</div>

<style>
  .mm-teil { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h4 { margin: 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  h5 { margin: var(--a2) 0 0; font: 650 var(--gr-klein)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  p { margin: 0; }
  fieldset { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a1); }
  legend { font-weight: 650; padding: 0; margin-bottom: var(--a1); }
  .eigen-wahl { display: flex; gap: var(--a2); align-items: flex-start; }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  .feld textarea { width: 100%; box-sizing: border-box; font: inherit; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .ablauf { display: flex; flex-direction: column; align-items: flex-start; gap: var(--a1); }
  .reihe { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .kasten { border: 1px solid var(--linie); border-radius: 6px; padding: var(--a2) var(--a3); }
  .pfeil { padding-inline-start: var(--a3); color: var(--tinte-2); }
  .fragen { margin: 0; padding-inline-start: 1.2em; }
</style>
