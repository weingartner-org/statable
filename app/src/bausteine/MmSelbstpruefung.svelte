<script lang="ts">
  /**
   * Selbstprüfung (Stufe A2): eigene Kurzfassung nach MMAT 2018 (Teil 5) oder GRAMMS. Die Person setzt den Stand je Punkt; Statable zeigt nur Hinweise aus
   * dem Projekt und setzt nie etwas selbst. Keine Gesamtnote, keine Zählung „erfüllt“; gezählt wird nur, wie viele Punkte einen Stand haben.
   */
  import { L, s } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendere } from '../lib/kodieren.svelte';
  import { hinweise, punkteDer, punktStand, quelleText, setzePunkt, staendeDer, standText, type Liste } from '../lib/mm-selbstpruefung';
  import type { PruefStand, QualProjekt } from '../lib/qualprojekt';
  import type { DatenSicht } from '../lib/mixed';

  interface Props { q: QualProjekt; daten: DatenSicht }
  let { q, daten }: Props = $props();

  let liste = $state<Liste>('mmat');
  const punkte = $derived(punkteDer(liste));
  const staende = $derived(staendeDer(liste));
  const tipps = $derived(hinweise(q, s.integration, daten.zeilen.length));
  const bearbeitet = $derived(punkte.filter(p => punktStand(q, liste, p.kennung)).length);
  const listeName = (l: Liste) => (l === 'mmat' ? L('MMAT (Mixed Methods Appraisal Tool, Teil 5)', 'MMAT (Mixed Methods Appraisal Tool, part 5)') : L('GRAMMS (Good Reporting of A Mixed Methods Study)', 'GRAMMS (Good Reporting of A Mixed Methods Study)'));
  let entwurf = $state<Record<string, { fundstelle?: string; notiz?: string }>>({});

  function setzeStand(kennung: string, nummer: string, stand: PruefStand | null) {
    aendere(L(`Stand von Punkt ${nummer} zurückgenommen`, `Status of item ${nummer} undone`), q0 => setzePunkt(q0, liste, kennung, { stand }));
    sage(stand ? L(`Punkt ${nummer}: ${standText(liste, stand)}.`, `Item ${nummer}: ${standText(liste, stand)}.`) : L(`Punkt ${nummer}: noch nicht gesetzt.`, `Item ${nummer}: not set yet.`));
  }
  function speichereText(kennung: string, nummer: string) {
    const e = entwurf[kennung]; if (!e) return;
    aendere(L(`Text bei Punkt ${nummer} zurückgenommen`, `Text at item ${nummer} undone`), q0 => setzePunkt(q0, liste, kennung, { ...(e.fundstelle !== undefined ? { fundstelle: e.fundstelle } : {}), ...(e.notiz !== undefined ? { notiz: e.notiz } : {}) }));
    delete entwurf[kennung];
    sage(L(`Punkt ${nummer}: Text gespeichert.`, `Item ${nummer}: text saved.`));
  }
</script>

<div class="mm-teil">
  <h4 id="ko-mm-sp-t" tabindex="-1">{L('Ist meine Studie gut verbunden? (Selbstprüfung MMAT, GRAMMS)', 'Is my study well integrated? (self-check MMAT, GRAMMS)')}</h4>
  <p class="hilfe">{L('Sie prüfen Ihre Studie selbst. Statable setzt nichts für Sie und bildet keine Gesamtnote. Was es im Projekt sieht, steht als Hinweis dabei.', 'You check your study yourself. Statable sets nothing for you and forms no overall score. What it sees in the project is shown as a note.')}</p>

  <fieldset>
    <legend>{L('Welche Liste?', 'Which list?')}</legend>
    {#each ['mmat', 'gramms'] as l (l)}
      <label class="sp-wahl"><input type="radio" name="ko-mm-sp-liste" value={l} checked={liste === l} onchange={() => { liste = l as Liste; sage(L(`Liste gewählt: ${listeName(l as Liste)}.`, `List chosen: ${listeName(l as Liste)}.`)); }}>{listeName(l as Liste)}</label>
    {/each}
  </fieldset>
  <p class="hilfe" id="ko-mm-sp-quelle">{quelleText(liste)}</p>
  <p id="ko-mm-sp-zahl">{L(`${bearbeitet} von ${punkte.length} Punkten bearbeitet.`, `${bearbeitet} of ${punkte.length} items worked on.`)}</p>

  {#each punkte as p (p.kennung)}
    {@const st = punktStand(q, liste, p.kennung)}
    {@const e = entwurf[p.kennung]}
    <fieldset class="punkt" id="ko-mm-sp-{p.kennung}">
      <legend>{p.nummer}: {p.text()}</legend>
      <!-- U1: die Antworten nebeneinander statt je eine volle Karte (die Klasse „wahl“ traf die Kartenregel aus app.css) -->
      <div class="sp-staende">
      {#each staende as x (x)}
        <label class="sp-wahl"><input type="radio" name="ko-mm-sp-{liste}-{p.kennung}" value={x} checked={st?.stand === x} onchange={() => setzeStand(p.kennung, p.nummer, x)}>{standText(liste, x)}</label>
      {/each}
      <label class="sp-wahl"><input type="radio" name="ko-mm-sp-{liste}-{p.kennung}" value="" checked={!st} onchange={() => setzeStand(p.kennung, p.nummer, null)}>{L('noch nicht gesetzt', 'not set yet')}</label>
      </div>
      <div class="feld">
        <label for="ko-mm-sp-f-{p.kennung}">{L('Fundstelle (wo im Bericht?)', 'Where found (where in the report?)')}</label>
        <input id="ko-mm-sp-f-{p.kennung}" type="text" value={e?.fundstelle ?? st?.fundstelle ?? ''} oninput={ev => (entwurf[p.kennung] = { ...entwurf[p.kennung], fundstelle: ev.currentTarget.value })}>
      </div>
      <div class="feld">
        <label for="ko-mm-sp-n-{p.kennung}">{L('Notiz', 'Note')}</label>
        <textarea id="ko-mm-sp-n-{p.kennung}" rows="2" value={e?.notiz ?? st?.notiz ?? ''} oninput={ev => (entwurf[p.kennung] = { ...entwurf[p.kennung], notiz: ev.currentTarget.value })}></textarea>
      </div>
      <div class="knopfzeile"><button class="k" type="button" id="ko-mm-sp-sp-{p.kennung}" disabled={!e} onclick={() => speichereText(p.kennung, p.nummer)}>{L(`Fundstelle und Notiz zu ${p.nummer} speichern`, `Save location and note for ${p.nummer}`)}</button></div>
      {#each tipps[p.kennung] ?? [] as t (t)}<p class="hilfe">{L('Statable sieht im Projekt:', 'Statable sees in the project:')} {t}</p>{/each}
    </fieldset>
  {/each}
</div>

<style>
  .mm-teil { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h4 { margin: 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  p { margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); }
  fieldset { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a1); min-width: 0; }
  fieldset.punkt { border-top: 1px solid var(--linie); padding-top: var(--a3); }
  legend { font-weight: 650; padding: 0; margin-bottom: var(--a1); }
  .sp-wahl { display: inline-flex; gap: var(--a2); align-items: center; min-height: 24px; }
  .sp-wahl input { min-width: 24px; min-height: 24px; margin: 0; }
  .sp-staende { display: flex; flex-wrap: wrap; gap: var(--a1) var(--a4); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  .feld input, .feld textarea { width: 100%; box-sizing: border-box; font: inherit; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
</style>
