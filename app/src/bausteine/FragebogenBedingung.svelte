<script lang="ts">
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import type { FragebogenPlan, Frage } from '../lib/fragebogenplan';
  import {
    bedingungAusForm, bedingungSatz, elementVon, formAusBedingung, moeglicheFragen, operatorenFuer, operatorHatWert, setzeBedingung, alleFragen,
    type BedingungsForm, type BedingungsTeil, type Vergleich
  } from '../lib/fragebogenplan-editor';
  import { anzeigeSprache, anzeigeTitel } from '../lib/fragebogen-aktionen.svelte';
  import { tue } from '../lib/fragebogen-editor.svelte';
  import Icon from './Icon.svelte';

  /**
   * Bedingung („Nur zeigen, wenn …“) eines Elements oder einer Seite - über Auswahlfelder, nie als Text (Fragebogen planen, 2C).
   * Angezeigt wird sie zusätzlich als Satz. Fragen zur Auswahl sind nur die, die in der Reihenfolge DAVOR stehen (Verweise gehen nur nach hinten).
   */
  let { plan, id }: { plan: FragebogenPlan; id: string } = $props();

  const x = $derived(elementVon(plan, id));
  const sprache = $derived(anzeigeSprache(plan));
  const form = $derived(x ? formAusBedingung(x.wennGezeigt) : null);
  const fragen = $derived(moeglicheFragen(plan, id));
  const satz = $derived(x ? bedingungSatz(plan, x.wennGezeigt, sprache) : '');

  const OP: Record<Vergleich, () => string> = {
    '=': () => L('= (ist gleich)', '= (equals)'), '≠': () => L('≠ (ist nicht gleich)', '≠ (does not equal)'), '<': () => L('< (kleiner als)', '< (less than)'), '≤': () => L('≤ (höchstens)', '≤ (at most)'),
    '>': () => L('> (größer als)', '> (greater than)'), '≥': () => L('≥ (mindestens)', '≥ (at least)'),
    gewaehlt: () => L('enthält (ist angekreuzt)', 'includes (is ticked)'), nichtGewaehlt: () => L('enthält nicht (nicht angekreuzt)', 'does not include (not ticked)'),
    beantwortet: () => L('ist beantwortet', 'is answered'), unbeantwortet: () => L('ist nicht beantwortet', 'is not answered')
  };
  const frageVon = (fid: string): Frage | undefined => alleFragen(plan).find(f => f.id === fid);
  const hatListe = (f: Frage | undefined) => !!f && (f.typ === 'einfach' || f.typ === 'mehrfach' || f.typ === 'regler') && !!plan.antwortlisten.find(l => l.id === f.liste)?.optionen.length;
  const optionenVon = (f: Frage | undefined) => plan.antwortlisten.find(l => l.id === f?.liste)?.optionen ?? [];
  const wertTextVon = (o: { text: Record<string, string>; wert: number }) => o.text[sprache] || Object.values(o.text).find(Boolean) || String(o.wert);
  const neuerTeil = (): BedingungsTeil => {
    const f = fragen.at(-1);
    const op = operatorenFuer(f)[0]!;
    return { frage: f?.id ?? '', op, wert: hatListe(f) ? optionenVon(f)[0]!.wert : 0 };
  };

  function setze(neu: BedingungsForm | null, was: string) {
    const b = bedingungAusForm(neu);
    const t = b ? L(`${was}: ${bedingungSatz(plan, b, sprache)}.`, `${was}: ${bedingungSatz(plan, b, sprache)}.`) : L('Bedingung entfernt: Das Element wird immer gezeigt.', 'Condition removed: the element is always shown.');
    tue(t, p => setzeBedingung(p, id, b));
  }
  const kopie = (): BedingungsForm => (form && form !== 'komplex' ? { verknuepfung: form.verknuepfung, teile: form.teile.map(t => ({ ...t })) } : { verknuepfung: 'und', teile: [] });
  /** Nach „Filter hinzufügen“ landet der Fokus auf dem ersten Feld („Frage“) der neuen Bedingung, nicht auf dem Knopf darunter. */
  async function hinzu() {
    const f = kopie(); f.teile.push(neuerTeil());
    const neu = f.teile.length - 1;
    setze(f, L('Bedingung hinzugefügt', 'Condition added'));
    await tick();
    document.getElementById(`fb-bed-f-${id}-${neu}`)?.focus();
  }
  /** Name und Nummer der Frage: Fragen mit gleichem Text sind so zu unterscheiden („2. zustimmung: Wie sehr …“). */
  const alle = $derived(alleFragen(plan));
  const frageName = (f: Frage) => `${alle.findIndex(x => x.id === f.id) + 1}. ${f.name}: ${anzeigeTitel(plan, f)}`;
  function weg(i: number) { const f = kopie(); f.teile.splice(i, 1); setze(f.teile.length ? f : null, L('Bedingung entfernt', 'Condition removed')); }
  function frageAendern(i: number, fid: string) {
    const f = kopie(), t = f.teile[i]!, fr = frageVon(fid);
    t.frage = fid;
    if (!operatorenFuer(fr).includes(t.op)) t.op = operatorenFuer(fr)[0]!;
    if (hatListe(fr) && !optionenVon(fr).some(o => o.wert === t.wert)) t.wert = optionenVon(fr)[0]!.wert;
    setze(f, L('Frage der Bedingung geändert', 'Question of the condition changed'));
  }
  function opAendern(i: number, op: Vergleich) { const f = kopie(); f.teile[i]!.op = op; setze(f, L('Vergleich geändert', 'Comparison changed')); }
  function wertAendern(i: number, v: string) { const n = Number(v); if (v.trim() === '' || !Number.isFinite(n)) return; const f = kopie(); f.teile[i]!.wert = n; setze(f, L('Wert der Bedingung geändert', 'Value of the condition changed')); }
  function verknuepfen(v: 'und' | 'oder') { const f = kopie(); f.verknuepfung = v; setze(f, L('Verknüpfung geändert', 'Linking changed')); }
  const nummer = (i: number) => L(`Bedingung ${i + 1}`, `Condition ${i + 1}`);
</script>

<fieldset class="bed">
  <legend>{L('Filter: Wann wird dieses Element gezeigt?', 'Filter: when is this element shown?')}</legend>
  <p class="satz" data-testid="fb-bedingungssatz">{satz}</p>

  {#if form === 'komplex'}
    <p class="hilfe">{L('Diese Bedingung ist verschachtelt (zum Beispiel aus einem Import). Hier lässt sie sich ansehen und entfernen, aber nicht umbauen.', 'This condition is nested (for example from an import). Here you can view and remove it, but not rebuild it.')}</p>
    <button class="k" type="button" onclick={() => setze(null, '')}><Icon n="zu" />{L('Bedingung entfernen', 'Remove condition')}</button>
  {:else}
    {#if form}
      {#if form.teile.length > 1}
        <div class="eingabe">
          <label for="fb-bed-verkn-{id}">{L('Mehrere Bedingungen', 'Several conditions')}</label>
          <select id="fb-bed-verkn-{id}" value={form.verknuepfung} onchange={(e) => verknuepfen(e.currentTarget.value as 'und' | 'oder')}>
            <option value="und">{L('Alle müssen zutreffen (und)', 'All must apply (and)')}</option>
            <option value="oder">{L('Eine genügt (oder)', 'One is enough (or)')}</option>
          </select>
        </div>
      {/if}
      {#each form.teile as t, i (i)}
        {@const fr = frageVon(t.frage)}
        <fieldset class="teil">
          <legend>{nummer(i)}</legend>
          <div class="eingabe">
            <label for="fb-bed-f-{id}-{i}">{L('Frage', 'Question')}</label>
            <select id="fb-bed-f-{id}-{i}" value={t.frage} onchange={(e) => frageAendern(i, e.currentTarget.value)}>
              {#if !fragen.some(f => f.id === t.frage)}<option value={t.frage}>{L('(Frage fehlt oder steht weiter hinten)', '(question missing or further back)')}</option>{/if}
              {#each fragen as f (f.id)}<option value={f.id}>{frageName(f)}</option>{/each}
            </select>
          </div>
          <div class="eingabe">
            <label for="fb-bed-o-{id}-{i}">{L('Vergleich', 'Comparison')}</label>
            <select id="fb-bed-o-{id}-{i}" value={t.op} onchange={(e) => opAendern(i, e.currentTarget.value as Vergleich)}>
              {#each operatorenFuer(fr) as op (op)}<option value={op}>{OP[op]()}</option>{/each}
            </select>
          </div>
          {#if operatorHatWert(t.op)}
            <div class="eingabe">
              {#if hatListe(fr)}
                <label for="fb-bed-w-{id}-{i}">{L('Antwort', 'Answer')}</label>
                <select id="fb-bed-w-{id}-{i}" value={t.wert} onchange={(e) => wertAendern(i, e.currentTarget.value)}>
                  {#each optionenVon(fr) as o (o.id)}<option value={o.wert}>{wertTextVon(o)}</option>{/each}
                </select>
              {:else}
                <label for="fb-bed-w-{id}-{i}">{L('Zahl', 'Number')}</label>
                <input type="number" id="fb-bed-w-{id}-{i}" value={t.wert} onchange={(e) => wertAendern(i, e.currentTarget.value)}>
              {/if}
            </div>
          {/if}
          <button class="k leise" type="button" onclick={() => weg(i)}><Icon n="zu" />{L(`${nummer(i)} entfernen`, `Remove ${nummer(i).toLowerCase()}`)}</button>
        </fieldset>
      {/each}
    {/if}
    <button class="k" type="button" disabled={fragen.length === 0} aria-describedby={fragen.length === 0 ? `fb-bed-leer-${id}` : undefined} onclick={hinzu}><Icon n="plus" />{form ? L('Weitere Bedingung hinzufügen', 'Add another condition') : L('Filter hinzufügen', 'Add filter')}</button>
    {#if fragen.length === 0}<p class="hilfe" id="fb-bed-leer-{id}">{L('Davor steht noch keine Frage, auf die sich ein Filter beziehen könnte.', 'There is no question before this one that a filter could refer to.')}</p>{/if}
  {/if}
</fieldset>

<style>
  .bed { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a3); margin: 0 0 var(--a3); min-width: 0; display: flex; flex-direction: column; gap: var(--a2); align-items: flex-start; }
  .bed legend { font-size: var(--gr-klein); font-weight: 650; padding: 0 var(--a1); }
  .bed :global(.eingabe) { width: 100%; }
  .teil { border: 1px dashed var(--linie-stark); border-radius: var(--r-klein); padding: var(--a2) var(--a3); width: 100%; min-width: 0; display: flex; flex-direction: column; gap: var(--a2); align-items: flex-start; }
  .teil legend { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; }
  .satz { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
</style>
