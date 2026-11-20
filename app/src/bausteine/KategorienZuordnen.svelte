<script lang="ts" module>
  let zaehler = 0;
</script>

<script lang="ts">
  /**
   * Antworten den Kategorien zuordnen (Welle 4, G7): eine Antwort nach der anderen oder als Liste, per Klick oder mit den Tasten 1 bis 9.
   * Die Tasten gelten NUR, solange der Fokus in der Zuordnung liegt (nie in einem Textfeld, nie im übrigen Blatt).
   * Drei Zustände je Antwort: keine Antwort (leer) · Antwort, noch offen · zugeordnet. Leer und offen sind fehlend und werden gezählt, nie still gefüllt.
   * Die Änderungen laufen über `tue` (Blatt: Rückgängig, Ergebnis aktualisieren, sichern).
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { ordne, leereAntwort, hatText, type Antwort, type AntwortZustand, type KatZustand } from '../lib/kategorisieren';

  let { z, antw, zs, tue, ansagen }: {
    z: KatZustand; antw: Antwort[]; zs: AntwortZustand[];
    tue: (f: () => void) => void;
    /** Meldung für Vorlesegeräte (Live-Region im Blatt) */
    ansagen: (text: string) => void;
  } = $props();

  const hilfeId = `kz-hilfe-${++zaehler}`;
  let ansicht = $state<'einzeln' | 'liste'>('einzeln');
  let nurOffen = $state(false);
  let sichtbarBis = $state(100);
  /** Die Zeile mit Tastaturfokus (roving) - Index in `antw` */
  let zeile = $state(0);
  /** Einzelansicht: aktuelle Stelle in der Liste der Antworten mit Text */
  let stelle = $state(0);

  const mitText = $derived(antw.flatMap((a, i) => (hatText(a) ? [i] : [])));
  const listeIdx = $derived(antw.flatMap((_, i) => (nurOffen ? (zs[i] === 'offen' ? [i] : []) : [i])));
  const kats = $derived(z.kategorien);
  const aktuell = $derived(mitText.length ? mitText[Math.min(stelle, mitText.length - 1)]! : -1);
  const zuordnung = (i: number): string[] => z.zuordnung[antw[i]!.schluessel] ?? [];
  const zustandText = (st: AntwortZustand) => (st === 'leer' ? L('keine Antwort', 'no answer') : st === 'offen' ? L('noch offen', 'still open') : L('zugeordnet', 'assigned'));

  /** Zuordnen oder zurücknehmen: eine Kategorie je Antwort ersetzt, ein erneuter Klick auf dieselbe nimmt sie zurück; mehrfach schaltet um. */
  function waehle(i: number, k: number): boolean {
    const a = antw[i], kat = kats[k];
    if (!a || !kat || !hatText(a)) return false;
    const an = !zuordnung(i).includes(kat.id);
    tue(() => ordne(z, a.schluessel, kat.id, an));
    ansagen(an ? L(`Antwort ${i + 1}: ${kat.name}.`, `Answer ${i + 1}: ${kat.name}.`) : L(`Antwort ${i + 1}: ${kat.name} zurückgenommen.`, `Answer ${i + 1}: ${kat.name} removed.`));
    return an;
  }
  function leeren(i: number) {
    const a = antw[i]; if (!a || !hatText(a) || !zuordnung(i).length) return;
    tue(() => leereAntwort(z, a.schluessel));
    ansagen(L(`Antwort ${i + 1}: Zuordnung zurückgenommen, die Antwort ist wieder offen.`, `Answer ${i + 1}: assignment removed, the answer is open again.`));
  }
  /** Die nächste Antwort mit Text nach `i`, die noch offen ist (sonst die nächste mit Text); -1, wenn es keine gibt. */
  const naechsteOffene = (i: number) => mitText.find(j => j > i && zs[j] === 'offen') ?? mitText.find(j => j !== i && zs[j] === 'offen') ?? -1;

  const darfTaste = (e: KeyboardEvent) => !(e.ctrlKey || e.metaKey || e.altKey) && !(e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]');

  /* ---- Liste ---- */
  async function zeileFokus(i: number) {
    zeile = i;
    if (!listeIdx.includes(i)) sichtbarBis = Math.max(sichtbarBis, i + 1);
    await tick();
    document.querySelector<HTMLElement>(`.kz-liste li[data-i="${i}"]`)?.focus();
  }
  function listeTaste(e: KeyboardEvent) {
    if (!darfTaste(e)) return;
    const li = (e.target as HTMLElement).closest<HTMLElement>('li[data-i]'); if (!li) return;
    const i = Number(li.dataset.i), p = listeIdx.indexOf(i);
    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const k = Number(e.key) - 1;
      if (k >= kats.length) { ansagen(L(`Es gibt keine Kategorie ${e.key}.`, `There is no category ${e.key}.`)); return; }
      const nachher = !z.mehrfach ? (listeIdx[p + 1] ?? i) : i;   // eine Kategorie je Antwort: weiter zur nächsten Zeile
      const an = waehle(i, k);
      if (an && nachher !== i) void zeileFokus(nachher); else void zeileFokus(i);
    } else if (e.key === '0') { e.preventDefault(); leeren(i); void zeileFokus(i); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const ziel = listeIdx[p + (e.key === 'ArrowDown' ? 1 : -1)];
      if (ziel !== undefined) { e.preventDefault(); void zeileFokus(ziel); }
    }
  }

  /* ---- Einzelansicht ---- */
  function geheZu(i: number) { const s2 = mitText.indexOf(i); if (s2 >= 0) stelle = s2; }
  function einzelnTaste(e: KeyboardEvent) {
    if (!darfTaste(e) || aktuell < 0) return;
    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const k = Number(e.key) - 1;
      if (k >= kats.length) { ansagen(L(`Es gibt keine Kategorie ${e.key}.`, `There is no category ${e.key}.`)); return; }
      weiter(waehle(aktuell, k));
    } else if (e.key === '0') { e.preventDefault(); leeren(aktuell); }
    else if (e.key === 'ArrowRight' && !(e.target as HTMLElement).closest('button')) { e.preventDefault(); stelle = Math.min(stelle + 1, mitText.length - 1); }
    else if (e.key === 'ArrowLeft' && !(e.target as HTMLElement).closest('button')) { e.preventDefault(); stelle = Math.max(stelle - 1, 0); }
  }
  /** Nach dem Zuordnen (eine Kategorie je Antwort) zur nächsten offenen Antwort. */
  function weiter(zugeordnet: boolean) {
    if (z.mehrfach || !zugeordnet) return;
    const n = naechsteOffene(aktuell);
    if (n >= 0) { geheZu(n); ansagen(L(`Weiter mit Antwort ${n + 1}.`, `Next: answer ${n + 1}.`)); }
  }
  const Anzahl = $derived(Lp(mitText.length, `${mitText.length} Antwort mit Text`, `${mitText.length} Antworten mit Text`, `${mitText.length} answer with text`, `${mitText.length} answers with text`));
</script>

<div class="kz">
  <div class="kz-kopf">
    <div class="segment" role="group" aria-label={L('Ansicht der Zuordnung', 'View of the assignment')}>
      <label><input type="radio" name="kz-ansicht" value="einzeln" bind:group={ansicht}>{L('Eine Antwort nach der anderen', 'One answer at a time')}</label>
      <label><input type="radio" name="kz-ansicht" value="liste" bind:group={ansicht}>{L('Als Liste', 'As a list')}</label>
    </div>
    <span class="kz-zahl">{Anzahl}</span>
  </div>
  <p class="hilfe" id={hilfeId}>{L('Per Klick oder mit den Tasten 1 bis 9 (0 nimmt die Zuordnung zurück). Die Tasten gelten nur, solange der Fokus hier in der Zuordnung liegt, nicht in einem Textfeld.', 'By click or with the keys 1 to 9 (0 removes the assignment). The keys only work while the focus is here in the assignment, not in a text field.')}</p>

  {#if !kats.length}
    <p class="heft-text">{L('Zuerst mindestens eine Kategorie anlegen (oben bei „Kategorien“).', 'First create at least one category (above under "Categories").')}</p>
  {:else if !mitText.length}
    <p class="heft-text">{L('In der Spalte steht keine Antwort mit Text.', 'The column contains no answer with text.')}</p>
  {:else if ansicht === 'einzeln'}
    {@const a = antw[aktuell]!}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="kz-einzeln" role="group" tabindex="0" aria-describedby={hilfeId} aria-label={L(`Zuordnung: Antwort ${aktuell + 1}, ${zustandText(zs[aktuell]!)}`, `Assignment: answer ${aktuell + 1}, ${zustandText(zs[aktuell]!)}`)} onkeydown={einzelnTaste}>
      <p class="kz-nr">{L(`Antwort ${aktuell + 1}`, `Answer ${aktuell + 1}`)} <span class="kz-st kz-{zs[aktuell]}">{zustandText(zs[aktuell]!)}</span> <span class="kz-pos">{L(`(${Math.min(stelle, mitText.length - 1) + 1} von ${mitText.length})`, `(${Math.min(stelle, mitText.length - 1) + 1} of ${mitText.length})`)}</span></p>
      <p class="kz-text kz-gross">{a.text}</p>
      <div class="kz-chips" role="group" aria-label={L('Kategorien', 'Categories')}>
        {#each kats as k, j (k.id)}
          <button type="button" class="kz-chip" aria-pressed={zuordnung(aktuell).includes(k.id)} onclick={() => weiter(waehle(aktuell, j))}>{#if j < 9}<kbd aria-hidden="true">{j + 1}</kbd>{/if}{k.name}</button>
        {/each}
      </div>
      <div class="knopfzeile">
        <button type="button" class="k leise" disabled={stelle <= 0} onclick={() => (stelle = Math.max(0, stelle - 1))}>{L('Zurück', 'Back')}</button>
        <button type="button" class="k leise" disabled={stelle >= mitText.length - 1} onclick={() => (stelle = Math.min(mitText.length - 1, stelle + 1))}>{L('Weiter', 'Next')}</button>
        <button type="button" class="k" disabled={naechsteOffene(aktuell) < 0} onclick={() => geheZu(naechsteOffene(aktuell))}>{L('Nächste offene', 'Next open one')}</button>
        <button type="button" class="k leise" disabled={!zuordnung(aktuell).length} onclick={() => leeren(aktuell)}>{L('Zuordnung zurücknehmen', 'Remove assignment')}</button>
      </div>
    </div>
  {:else}
    <label class="schalter"><input type="checkbox" bind:checked={nurOffen}>{L('Nur Antworten zeigen, die noch offen sind', 'Only show answers that are still open')}</label>
    {#if !listeIdx.length}
      <p class="heft-text" role="status">{L('Keine Antwort ist mehr offen.', 'No answer is open any more.')}</p>
    {:else}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <ol class="kz-liste" aria-describedby={hilfeId} aria-label={L('Antworten zuordnen', 'Assign answers')} onkeydown={listeTaste}>
        {#each listeIdx.slice(0, sichtbarBis) as i (i)}
          {@const a = antw[i]!}
          {@const st = zs[i]!}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <li data-i={i} class="kz-zeile kz-{st}" tabindex={zeile === i || (!listeIdx.includes(zeile) && i === listeIdx[0]) ? 0 : -1} onfocusin={() => (zeile = i)} aria-label={L(`Antwort ${i + 1}, ${zustandText(st)}`, `Answer ${i + 1}, ${zustandText(st)}`)}>
            <span class="kz-nr2" aria-hidden="true">{i + 1}</span>
            <span class="kz-text">{#if st === 'leer'}<em>{L('(keine Antwort)', '(no answer)')}</em>{:else}{a.text}{/if}</span>
            {#if st !== 'leer'}
              <span class="kz-chips" role="group" aria-label={L(`Kategorien für Antwort ${i + 1}`, `Categories for answer ${i + 1}`)}>
                {#each kats as k, j (k.id)}
                  <button type="button" class="kz-chip" tabindex={zeile === i ? 0 : -1} aria-pressed={zuordnung(i).includes(k.id)} onclick={() => waehle(i, j)}>{#if j < 9}<kbd aria-hidden="true">{j + 1}</kbd>{/if}{k.name}</button>
                {/each}
              </span>
            {/if}
            <span class="kz-st kz-{st}">{zustandText(st)}</span>
          </li>
        {/each}
      </ol>
      {#if listeIdx.length > sichtbarBis}
        <div class="knopfzeile"><button type="button" class="k leise" onclick={() => (sichtbarBis += 100)}>{L(`Weitere 100 zeigen (${listeIdx.length - sichtbarBis} übrig)`, `Show 100 more (${listeIdx.length - sichtbarBis} left)`)}</button></div>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .kz { display: flex; flex-direction: column; gap: var(--a3); }
  .kz-kopf { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: center; }
  .kz-zahl { color: var(--tinte-2); font-size: var(--gr-klein); }
  .kz .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); max-width: 62ch; }
  .kz-einzeln { border: 1px solid var(--linie); border-radius: var(--r-gross, var(--r-klein)); padding: var(--a3); background: var(--blatt); display: flex; flex-direction: column; gap: var(--a3); }
  .kz-nr { margin: 0; font-weight: 650; display: flex; flex-wrap: wrap; gap: var(--a2); align-items: baseline; }
  .kz-pos { color: var(--tinte-2); font-weight: 400; font-size: var(--gr-klein); }
  .kz-text { overflow-wrap: anywhere; white-space: pre-wrap; margin: 0; min-width: 0; }
  .kz-gross { font-size: 1.1em; line-height: 1.5; max-width: 62ch; }
  .kz-chips { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .kz-chip { display: inline-flex; align-items: center; gap: var(--a1); min-height: var(--ziel); padding: 0 var(--a3); border: 1.5px solid var(--linie-stark, var(--linie)); border-radius: 999px; background: var(--blatt); color: var(--tinte); font: inherit; cursor: pointer; }
  .kz-chip kbd { font: 650 var(--gr-klein) var(--schrift-ui); color: var(--tinte-2); border: 1px solid var(--linie); border-radius: 4px; padding: 0 .35em; background: transparent; }
  .kz-chip[aria-pressed="true"] { background: var(--akzent); border-color: var(--akzent); color: var(--auf-akzent, #fff); font-weight: 650; }
  .kz-chip[aria-pressed="true"] kbd { color: inherit; border-color: currentColor; }
  .kz-chip:focus-visible, .kz-einzeln:focus-visible, .kz-zeile:focus-visible { outline: 3px solid var(--akzent); outline-offset: 2px; }
  .kz-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; border-top: 1px solid var(--linie); max-width: 62rem; }
  .kz-zeile { display: grid; grid-template-columns: 2.2em minmax(0, 1fr) auto; grid-template-areas: 'nr text st' '. chips chips'; gap: var(--a2) var(--a3); padding: var(--a2) var(--a2); border-bottom: 1px solid var(--linie); align-items: start; }
  .kz-nr2 { grid-area: nr; text-align: right; color: var(--tinte-2); font-variant-numeric: tabular-nums; font-size: var(--gr-klein); padding-top: .2em; }
  .kz-zeile .kz-text { grid-area: text; }
  .kz-zeile .kz-chips { grid-area: chips; }
  .kz-zeile > .kz-st { grid-area: st; }
  .kz-st { font-size: var(--gr-klein); color: var(--tinte-2); white-space: nowrap; }
  .kz-st.kz-offen { color: var(--tinte); font-weight: 650; }
  .kz-leer { color: var(--tinte-2); }
</style>
