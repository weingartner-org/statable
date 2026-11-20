<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import {
    aendereListe, FEHLEND_ARTEN, FEHLEND_CODE, leerLok, listeBenutzer, listeBenutzung, listeLoeschen, neueListe, optionHinzu, optionLoeschen, optionVerschieben, setzeFehlend, type Fehlend
  } from '../lib/fragebogenplan-editor';
  import { anzeigeTitel } from '../lib/fragebogen-aktionen.svelte';
  import { ed, tue } from '../lib/fragebogen-editor.svelte';
  import Icon from './Icon.svelte';

  /**
   * Antwortlisten (Fragebogen planen, 2C): jede Liste einmal anlegen, in vielen Fragen benutzen („in 5 Fragen benutzt“).
   * Optionen mit Code, Text je Sprache, Fehlend-Art (-8/-9/-7 voreingestellt) und „schließt andere aus“.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  const sprachen = $derived(plan.sprachen);
  const liste = $derived(plan.antwortlisten.find(l => l.id === ed.liste) ?? plan.antwortlisten[0] ?? null);
  const benutzer = $derived(liste ? listeBenutzer(plan, liste.id) : []);
  const benutzt = $derived(liste ? listeBenutzung(plan, liste.id) : 0);
  let wurzel = $state<HTMLElement>();

  const FEHLEND_NAME = (a: Fehlend) => a === 'weissNicht' ? L('weiß nicht', "don't know") : a === 'keineAngabe' ? L('keine Angabe', 'no answer') : L('trifft nicht zu', 'does not apply');
  $effect(() => {
    const id = ed.fokusAuf;
    if (!id.startsWith('liste:') || ed.ansicht !== 'listen') return;
    untrack(() => { void tick().then(() => { const b = [...(wurzel?.querySelectorAll<HTMLElement>('[data-lid]') ?? [])].find(x => x.dataset.lid === id.slice(6)); if (b) { b.focus(); if (ed.fokusAuf === id) ed.fokusAuf = ''; } }); });
  });

  function neu() {
    const n = neueListe(plan, 'liste');
    tue(L('Neue Antwortliste angelegt.', 'New answer list created.'), () => n.plan);
    ed.liste = n.id; ed.fokusAuf = 'liste:' + n.id;
  }
  const lid = () => liste!.id;
  function aendern(text: string, fn: (l: NonNullable<typeof liste>) => void) { tue(text, p => aendereListe(p, lid(), fn)); }
  function codeSetzen(el: HTMLInputElement, optId: string, nr: number, alt: number) {
    const v = el.value, n = Number(v.replace(',', '.'));
    if (v.trim() === '' || !Number.isInteger(n)) { el.value = String(alt); sage(L('Der Code muss eine ganze Zahl sein. Der alte Code bleibt.', 'The code must be a whole number. The old code stays.')); return; }
    aendern(L(`Code der Antwort ${nr} geändert: ${n}.`, `Code of answer ${nr} changed: ${n}.`), l => { const o = l.optionen.find(z => z.id === optId); if (o) o.wert = n; });
  }
  function hinzu(art?: Fehlend) {
    const r = optionHinzu(plan, lid(), art);
    const nr = (liste?.optionen.length ?? 0) + 1;
    tue(art ? L(`Antwort „${FEHLEND_NAME(art)}“ (Code ${FEHLEND_CODE[art]}) hinzugefügt: Antwort ${nr}.`, `Answer "${FEHLEND_NAME(art)}" (code ${FEHLEND_CODE[art]}) added: answer ${nr}.`) : L(`Antwort hinzugefügt: Antwort ${nr}.`, `Answer added: answer ${nr}.`), () => r.plan);
    void tick().then(() => { const z = [...(wurzel?.querySelectorAll<HTMLInputElement>('table.opt tbody tr:last-child input[type=text]') ?? [])]; z[0]?.focus(); });
  }
  function loeschen() {
    const l = liste!, r = listeLoeschen(plan, l.id);
    if (!r) return;
    tue(L(`Antwortliste „${l.name}“ gelöscht.`, `Answer list "${l.name}" deleted.`), () => r);
    ed.liste = '';
  }
  function zuElement(id: string) { ed.ansicht = 'gliederung'; ed.auswahl = id; ed.fokusAuf = id; }
</script>

<section class="li" bind:this={wurzel} aria-label={L('Antwortlisten', 'Answer lists')}>
  <div class="links">
    <h2 id="fb-li-t">{L('Antwortlisten', 'Answer lists')}</h2>
    <p class="hilfe">{L('Eine Liste legen Sie einmal an und benutzen sie in vielen Fragen.', 'You create a list once and use it in many questions.')}</p>
    <ul class="listen" aria-labelledby="fb-li-t">
      {#each plan.antwortlisten as l (l.id)}
        <li><button type="button" class="eintrag" data-lid={l.id} aria-current={liste?.id === l.id ? 'true' : undefined} onclick={() => (ed.liste = l.id)}>
          <span class="titel">{l.name}</span>
          <span class="marke">{Lp(listeBenutzung(plan, l.id), 'in 1 Frage benutzt', `in ${listeBenutzung(plan, l.id)} Fragen benutzt`, 'used in 1 question', `used in ${listeBenutzung(plan, l.id)} questions`)}</span></button></li>
      {/each}
    </ul>
    {#if !plan.antwortlisten.length}<p class="heft-text leer">{L('Noch keine Antwortliste.', 'No answer list yet.')}</p>{/if}
    <button class="k" type="button" onclick={neu}><Icon n="plus" />{L('Neue Liste', 'New list')}</button>
  </div>

  {#if liste}
    {#key liste.id}
    <div class="rechts">
      <h3 id="fb-li-name-t">{L('Liste', 'List')}: {liste.name}</h3>
      <div class="eingabe">
        <label for="fb-li-name">{L('Name der Liste (zum Wiedererkennen)', 'Name of the list (to recognise it)')}</label>
        <input type="text" id="fb-li-name" value={liste.name} onchange={(e) => aendern(L(`Listenname geändert: ${e.currentTarget.value}.`, `List name changed: ${e.currentTarget.value}.`), l => { l.name = e.currentTarget.value.trim() || l.name; })}>
      </div>
      <label class="schalter"><input type="checkbox" checked={liste.geordnet} onchange={(e) => aendern(e.currentTarget.checked ? L('Die Liste ist geordnet.', 'The list is ordered.') : L('Die Liste ist nicht geordnet.', 'The list is not ordered.'), l => { l.geordnet = e.currentTarget.checked; })}>{L('Geordnet (die Antworten haben eine feste Reihenfolge, zum Beispiel von „nie“ bis „immer“)', 'Ordered (the answers have a fixed order, for example from "never" to "always")')}</label>

      <p class="hilfe" data-testid="fb-listenbenutzung">{Lp(benutzt, 'Diese Liste wird in 1 Frage benutzt.', `Diese Liste wird in ${benutzt} Fragen benutzt.`, 'This list is used in 1 question.', `This list is used in ${benutzt} questions.`)}</p>
      {#if benutzer.length}
        <ul class="benutzer" aria-label={L('Benutzt von', 'Used by')}>{#each benutzer as b (b.id)}<li><button class="k leise" type="button" onclick={() => zuElement(b.id)}>{anzeigeTitel(plan, b)}</button></li>{/each}</ul>
      {/if}

      <p class="hilfe">{L('Jede Antwortstufe braucht einen Text, auch wenn er nicht sichtbar ist. Sonst hören Menschen mit Screenreader nur Zahlen.', 'Every answer level needs a text, even if it is not visible. Otherwise people with a screen reader only hear numbers.')}</p>
      <div class="rolle" role="region" tabindex="0" aria-label={L('Tabelle der Antworten', 'Table of answers')}>
        <table class="opt">
          <caption class="nur-vorleser">{L(`Antworten der Liste ${liste.name}`, `Answers of the list ${liste.name}`)}</caption>
          <thead><tr>
            <th scope="col">{L('Nr.', 'No.')}</th><th scope="col">{L('Code', 'Code')}</th>
            {#each sprachen as sp (sp)}<th scope="col">{L('Text', 'Text')} {sp}</th>{/each}
            <th scope="col">{L('Fehlend-Art', 'Missing kind')}</th><th scope="col">{L('Schließt andere aus', 'Excludes others')}</th><th scope="col">{L('Ordnen', 'Arrange')}</th>
          </tr></thead>
          <tbody>
            {#each liste.optionen as o, i (o.id)}
              <tr>
                <th scope="row">{i + 1}</th>
                <td><input type="number" step="1" class="code" aria-label={L(`Code der Antwort ${i + 1}`, `Code of answer ${i + 1}`)} value={o.wert} onchange={(e) => codeSetzen(e.currentTarget, o.id, i + 1, o.wert)}></td>
                {#each sprachen as sp (sp)}
                  <td><input type="text" lang={sp} aria-label={L(`Text ${sp}, Antwort ${i + 1}`, `Text ${sp}, answer ${i + 1}`)} value={o.text[sp] ?? ''} aria-invalid={(o.text[sp] ?? '').trim() ? undefined : 'true'} aria-describedby={(o.text[sp] ?? '').trim() ? undefined : 'fb-li-pflicht'}
                    onchange={(e) => aendern(L(`Text der Antwort ${i + 1} (${sp}) geändert.`, `Text of answer ${i + 1} (${sp}) changed.`), l => { const z = l.optionen.find(q => q.id === o.id); if (z) z.text = { ...(z.text ?? leerLok(plan)), [sp]: e.currentTarget.value }; })}></td>
                {/each}
                <td>
                  <select aria-label={L(`Fehlend-Art der Antwort ${i + 1}`, `Missing kind of answer ${i + 1}`)} value={o.fehlend ?? ''} onchange={(e) => { const v = (e.currentTarget.value || undefined) as Fehlend | undefined; tue(v ? L(`Antwort ${i + 1} ist jetzt „${FEHLEND_NAME(v)}“ (Fehlendcode ${FEHLEND_CODE[v]}).`, `Answer ${i + 1} is now "${FEHLEND_NAME(v)}" (missing code ${FEHLEND_CODE[v]}).`) : L(`Antwort ${i + 1} ist eine gültige Antwort.`, `Answer ${i + 1} is a valid answer.`), p => setzeFehlend(p, lid(), o.id, v)); }}>
                    <option value="">{L('gültige Antwort', 'valid answer')}</option>
                    {#each FEHLEND_ARTEN as a (a)}<option value={a}>{FEHLEND_NAME(a)} ({FEHLEND_CODE[a]})</option>{/each}
                  </select>
                </td>
                <td><label class="schalter"><input type="checkbox" checked={!!o.ausschliessend} onchange={(e) => aendern(e.currentTarget.checked ? L(`Antwort ${i + 1} schließt andere aus.`, `Answer ${i + 1} excludes others.`) : L(`Antwort ${i + 1} schließt andere nicht mehr aus.`, `Answer ${i + 1} no longer excludes others.`), l => { const z = l.optionen.find(q => q.id === o.id); if (z) { if (e.currentTarget.checked) z.ausschliessend = true; else delete z.ausschliessend; } })}><span class="nur-vorleser">{L(`Antwort ${i + 1} schließt andere aus`, `Answer ${i + 1} excludes others`)}</span><span aria-hidden="true">{L('ausschließend', 'exclusive')}</span></label></td>
                <td class="aktion">
                  <button class="k leise nur-symbol" type="button" aria-label={L(`Antwort ${i + 1} nach oben`, `Move answer ${i + 1} up`)} onclick={() => { const r = optionVerschieben(plan, lid(), o.id, -1); if (r.ok) tue(L(`Antwort ${i + 1} verschoben: Position ${r.stelle} von ${r.von}.`, `Answer ${i + 1} moved: position ${r.stelle} of ${r.von}.`), () => r.plan); }}><Icon n="hoch" /></button>
                  <button class="k leise nur-symbol" type="button" aria-label={L(`Antwort ${i + 1} nach unten`, `Move answer ${i + 1} down`)} onclick={() => { const r = optionVerschieben(plan, lid(), o.id, 1); if (r.ok) tue(L(`Antwort ${i + 1} verschoben: Position ${r.stelle} von ${r.von}.`, `Answer ${i + 1} moved: position ${r.stelle} of ${r.von}.`), () => r.plan); }}><Icon n="runter" /></button>
                  <button class="k leise nur-symbol" type="button" aria-label={L(`Antwort ${i + 1} löschen`, `Delete answer ${i + 1}`)} onclick={() => tue(L(`Antwort ${i + 1} gelöscht.`, `Answer ${i + 1} deleted.`), p => optionLoeschen(p, lid(), o.id))}><Icon n="zu" /></button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="hilfe" id="fb-li-pflicht">{L('Felder mit fehlendem Text sind als ungültig markiert: Der Text ist Pflicht, in jeder Sprache.', 'Fields with a missing text are marked invalid: the text is required, in every language.')}</p>
      <div class="zeile">
        <button class="k" type="button" onclick={() => hinzu()}><Icon n="plus" />{L('Antwort hinzufügen', 'Add answer')}</button>
        {#each FEHLEND_ARTEN as a (a)}<button class="k" type="button" onclick={() => hinzu(a)}><Icon n="plus" />{L(`„${FEHLEND_NAME(a)}“ (${FEHLEND_CODE[a]}) hinzufügen`, `Add "${FEHLEND_NAME(a)}" (${FEHLEND_CODE[a]})`)}</button>{/each}
      </div>
      <div class="zeile">
        <button class="k" type="button" aria-disabled={benutzt > 0 ? 'true' : undefined} aria-describedby={benutzt > 0 ? 'fb-li-loeschen-h' : undefined} onclick={() => { if (benutzt === 0) loeschen(); }}><Icon n="zu" />{L('Liste löschen', 'Delete list')}</button>
        {#if benutzt > 0}<span class="hilfe" id="fb-li-loeschen-h">{L('Die Liste wird noch benutzt und lässt sich nicht löschen. Wählen Sie zuerst in den Fragen eine andere.', 'The list is still in use and cannot be deleted. First choose another one in the questions.')}</span>{/if}
      </div>
    </div>
    {/key}
  {/if}
</section>

<style>
  .li { display: grid; grid-template-columns: minmax(12rem, 1fr) minmax(0, 3fr); gap: var(--a4); }
  :global(:where(:root.eng-1000)) .li { grid-template-columns: minmax(0, 1fr); }
  .links, .rechts { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; align-items: flex-start; }
  .links h2, .rechts h3 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; overflow-wrap: anywhere; }
  .rechts > :global(.eingabe) { width: 100%; max-width: 32rem; }
  .listen, .benutzer { list-style: none; margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column; gap: var(--a1); }
  .benutzer { flex-direction: row; flex-wrap: wrap; }
  .eintrag { display: flex; flex-direction: column; align-items: flex-start; width: 100%; text-align: start; min-height: var(--ziel); padding: var(--a1) var(--a2); background: var(--blatt); color: var(--tinte); border: 1px solid transparent; border-radius: var(--r-klein); font: inherit; cursor: pointer; overflow-wrap: anywhere; }
  .eintrag:hover { background: var(--blatt-2); }
  .eintrag:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  .eintrag[aria-current='true'] { background: var(--akzent-hell); border-color: var(--akzent); font-weight: 600; }
  .marke { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 500; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .zeile { display: flex; gap: var(--a2); flex-wrap: wrap; align-items: center; }
  .schalter { display: flex; gap: var(--a2); align-items: center; }
  .leer { color: var(--tinte-2); }
  .rolle { position: relative; overflow-x: auto; max-width: 100%; width: 100%; }
  .rolle:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  table.opt { border-collapse: collapse; width: 100%; }
  table.opt th, table.opt td { padding: var(--a1) var(--a2); text-align: start; border-bottom: 1px solid var(--linie); vertical-align: middle; }
  table.opt input[type='text'], table.opt input[type='number'], table.opt select { font: inherit; min-height: var(--ziel); padding: var(--a1) var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  table.opt input[type='text'] { width: 100%; min-width: 9rem; }
  table.opt input.code { width: 5rem; }
  .aktion { white-space: nowrap; }
</style>
