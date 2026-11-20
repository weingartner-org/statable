<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import type { EditorBefund } from '../lib/fragebogenplan-editor';
  import { VORLAGEN, vorlageName, vorlageKannBlock, vorlageHatFehlend, type VorlageId } from '../lib/fragebogenplan-vorlagen';
  import { ed, pretestKommentare } from '../lib/fragebogen-editor.svelte';
  import { anzeigeTitel, artWort, loescheMitRueckfrage, neuHinzu, verschiebeAuswahl, vorlageHinzu } from '../lib/fragebogen-aktionen.svelte';
  import Icon from './Icon.svelte';

  /**
   * Gliederung des Fragebogens (Fragebogen planen, 2C): Seiten, Fragen, Blöcke und Hinweise als verschachtelte Liste mit echten Knöpfen.
   * (Kein `role="tree"`, Entscheid nach der NVDA-Messung: Liste mit Knöpfen bleibt; die Pfeiltasten gelten nur im Fokusmodus, darum der Hinweis und die Knöpfe darunter.)
   * Der Name eines Eintrags klingt so: „Frage 2 von 5: <Text>, 2 Fehler“ (Position in der Seite, Trenner vor jeder Marke); „von 5“ und das Komma sind nur für Vorleser da.
   * Tastatur: Pfeile hoch/runter wählen (die Auswahl folgt dem Fokus), Pos1/Ende springen, Alt+Pfeil verschiebt, Entf löscht (mit Rückfrage), Eingabe springt ins Formular.
   * Nur ein Knopf der Liste ist per Tab erreichbar (der gewählte); danach geht es mit Tab weiter zum Formular.
   */
  let { plan, befunde }: { plan: FragebogenPlan; befunde: EditorBefund[] } = $props();

  const reihe = $derived(plan.elemente.flatMap(s => [s.id, ...s.elemente.map(e => e.id)]));
  const tabZiel = $derived(reihe.includes(ed.auswahl) ? ed.auswahl : (reihe[0] ?? ''));
  const fehlerJe = $derived.by(() => { const m = new Map<string, number>(); for (const b of befunde) if (b.art === 'fehler' && b.element) m.set(b.element, (m.get(b.element) ?? 0) + 1); return m; });
  const nFehler = $derived(befunde.filter(b => b.art === 'fehler').length);
  const nHinweise = $derived(befunde.filter(b => b.art === 'hinweis').length);
  const kommentare = $derived(pretestKommentare(plan));
  let wurzel = $state<HTMLElement>();

  const knopf = (id: string) => [...(wurzel?.querySelectorAll<HTMLElement>('[data-eid]') ?? [])].find(b => b.dataset.eid === id);
  $effect(() => {
    const id = ed.fokusAuf;
    if (!id || id.startsWith('liste:')) return;
    untrack(() => { void tick().then(() => { const b = knopf(id); if (b) { b.focus(); if (ed.fokusAuf === id) ed.fokusAuf = ''; } }); });
  });

  function gehe(id: string | undefined) { if (!id) return; ed.auswahl = id; knopf(id)?.focus(); }
  function taste(e: KeyboardEvent, id: string) {
    const i = reihe.indexOf(id);
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); verschiebeAuswahl(e.key === 'ArrowUp' ? -1 : 1, id); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); gehe(reihe[i + 1]); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); gehe(reihe[i - 1]); }
    else if (e.key === 'Home') { e.preventDefault(); gehe(reihe[0]); }
    else if (e.key === 'End') { e.preventDefault(); gehe(reihe.at(-1)); }
    else if (e.key === 'Delete') { e.preventDefault(); ed.auswahl = id; loescheMitRueckfrage(id); }
    else if (e.key === 'Enter') { e.preventDefault(); ed.auswahl = id; ed.fokusFormular++; }
  }

  /* Vorlagen */
  let vorlage = $state<VorlageId>('zustimmung5');
  let alsBlock = $state(false);
  let mitFehlend = $state(true);
  const gewaehlt = $derived(ed.auswahl ? L('Es kommt hinter das gewählte Element.', 'It goes after the selected element.') : L('Es kommt ans Ende.', 'It goes to the end.'));
</script>

<section class="gl" aria-label={L('Gliederung des Fragebogens', 'Outline of the questionnaire')} bind:this={wurzel}>
  <h2 id="fb-gl-t" tabindex="-1">{L('Gliederung', 'Outline')}</h2>
  <p class="heft-text befund-kopf" data-testid="fb-befundzahl">
    {#if nFehler + nHinweise === 0}{L('Keine offenen Fehler oder Hinweise.', 'No open errors or notes.')}
    {:else}{Lp(nFehler, `${nFehler} offener Fehler`, `${nFehler} offene Fehler`, `${nFehler} open error`, `${nFehler} open errors`)}, {Lp(nHinweise, `${nHinweise} Hinweis`, `${nHinweise} Hinweise`, `${nHinweise} note`, `${nHinweise} notes`)}.
      <button class="k leise" type="button" onclick={() => document.getElementById('fb-befunde-t')?.focus()}>{L('Zu den Befunden', 'Go to the findings')}</button>{/if}
  </p>

  <div class="knoepfe" role="group" aria-label={L('Hinzufügen', 'Add')}>
    <button class="k" type="button" onclick={() => neuHinzu('seite')}><Icon n="plus" />{L('Seite hinzufügen', 'Add page')}</button>
    <button class="k" type="button" onclick={() => neuHinzu('frage')}><Icon n="plus" />{L('Frage hinzufügen', 'Add question')}</button>
    <button class="k" type="button" onclick={() => neuHinzu('block')}><Icon n="plus" />{L('Block hinzufügen', 'Add block')}</button>
    <button class="k" type="button" onclick={() => neuHinzu('hinweis')}><Icon n="plus" />{L('Hinweis hinzufügen', 'Add note')}</button>
  </div>

  <details class="auf vorlagen" id="fb-vorlagen">
    <summary id="fb-vorlagen-sum">{L('Vorlage einfügen', 'Insert a template')}</summary>
    <div class="eingabe">
      <label for="fb-vorlage">{L('Vorlage', 'Template')}</label>
      <select id="fb-vorlage" bind:value={vorlage}>{#each VORLAGEN as v (v)}<option value={v}>{vorlageName(v)}</option>{/each}</select>
    </div>
    {#if vorlageKannBlock(vorlage)}<label class="schalter"><input type="checkbox" bind:checked={alsBlock}>{L('Als Block mit drei Aussagen', 'As a block with three statements')}</label>{/if}
    {#if vorlageHatFehlend(vorlage)}<label class="schalter"><input type="checkbox" bind:checked={mitFehlend}>{L('Mit „weiß nicht“ und „keine Angabe“ (Fehlendcodes -8 und -9)', 'With "don\'t know" and "no answer" (missing codes -8 and -9)')}</label>{/if}
    <p class="hilfe">{gewaehlt} {L('Die Texte sind Vorschläge: Sie lassen sich frei ändern.', 'The texts are suggestions: you can change them freely.')}</p>
    <button class="k" type="button" onclick={() => vorlageHinzu(vorlage, { block: alsBlock && vorlageKannBlock(vorlage), fehlend: mitFehlend })}><Icon n="plus" />{L('Vorlage einfügen', 'Insert template')}</button>
  </details>
  {#if ed.vorlagenHinweis}
    <div class="banner ruhig"><Icon n="hinweis" /><p>{ed.vorlagenHinweis}</p>
      <button class="k leise" type="button" onclick={() => (ed.vorlagenHinweis = '')}>{L('Hinweis schließen', 'Close note')}</button></div>
  {/if}

  {#if plan.elemente.length === 0}
    <p class="heft-text leer">{L('Der Fragebogen ist noch leer. Fügen Sie eine Seite oder gleich eine Frage hinzu.', 'The questionnaire is still empty. Add a page or a question straight away.')}</p>
  {:else}
    <p class="hilfe" id="fb-gl-tasten">{L('Pfeiltasten und Alt plus Pfeil wirken im Fokusmodus; sonst die Knöpfe Nach oben, Nach unten und Löschen unter der Liste benutzen. Eingabe springt zum Formular.', 'Arrow keys and Alt plus arrow work in focus mode; otherwise use the buttons Move up, Move down and Delete below the list. Enter jumps to the form.')}</p>
    <ul class="seiten" aria-labelledby="fb-gl-t" aria-describedby="fb-gl-tasten">
      {#each plan.elemente as seite, si (seite.id)}
        <li>
          <button type="button" class="eintrag seite" data-eid={seite.id} tabindex={tabZiel === seite.id ? 0 : -1} aria-current={ed.auswahl === seite.id ? 'true' : undefined}
            onclick={() => (ed.auswahl = seite.id)} onkeydown={(e) => taste(e, seite.id)}>
            <span class="art">{artWort('seite')} {si + 1}</span><span class="nur-vorleser"> {L(`von ${plan.elemente.length}`, `of ${plan.elemente.length}`)}:</span> <span class="titel">{anzeigeTitel(plan, seite)}</span>
            {#if seite.wennGezeigt}<span class="nur-vorleser">, </span><span class="marke">{L('mit Filter', 'with filter')}</span>{/if}
            {#if fehlerJe.get(seite.id)}<span class="nur-vorleser">, </span><span class="marke fehler">{Lp(fehlerJe.get(seite.id)!, '1 Fehler', `${fehlerJe.get(seite.id)} Fehler`, '1 error', `${fehlerJe.get(seite.id)} errors`)}</span>{/if}
          </button>
          {#if seite.elemente.length}
            <ul class="elemente" aria-label={L(`Inhalt von Seite ${si + 1}`, `Content of page ${si + 1}`)}>
              {#each seite.elemente as el, ei (el.id)}
                <li>
                  <button type="button" class="eintrag" data-eid={el.id} tabindex={tabZiel === el.id ? 0 : -1} aria-current={ed.auswahl === el.id ? 'true' : undefined}
                    onclick={() => (ed.auswahl = el.id)} onkeydown={(e) => taste(e, el.id)}>
                    <span class="art">{artWort(el.art)}</span><span class="nur-vorleser"> {L(`${ei + 1} von ${seite.elemente.length}`, `${ei + 1} of ${seite.elemente.length}`)}:</span> <span class="titel">{anzeigeTitel(plan, el)}</span>
                    {#if el.wennGezeigt}<span class="nur-vorleser">, </span><span class="marke">{L('mit Filter', 'with filter')}</span>{/if}
                    {#if kommentare[el.id]?.length}<span class="nur-vorleser">, </span><span class="marke">{Lp(kommentare[el.id]!.length, '1 Kommentar', `${kommentare[el.id]!.length} Kommentare`, '1 comment', `${kommentare[el.id]!.length} comments`)}</span>{/if}
                    {#if fehlerJe.get(el.id)}<span class="nur-vorleser">, </span><span class="marke fehler">{Lp(fehlerJe.get(el.id)!, '1 Fehler', `${fehlerJe.get(el.id)} Fehler`, '1 error', `${fehlerJe.get(el.id)} errors`)}</span>{/if}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </li>
      {/each}
    </ul>
    <div class="knoepfe" role="group" aria-label={L('Auswahl ordnen', 'Arrange the selection')}>
      <button class="k leise" type="button" disabled={!ed.auswahl} onclick={() => verschiebeAuswahl(-1)}><Icon n="hoch" />{L('Nach oben', 'Move up')}</button>
      <button class="k leise" type="button" disabled={!ed.auswahl} onclick={() => verschiebeAuswahl(1)}><Icon n="runter" />{L('Nach unten', 'Move down')}</button>
      <button class="k leise" type="button" disabled={!ed.auswahl} onclick={() => loescheMitRueckfrage()}><Icon n="zu" />{L('Löschen', 'Delete')}</button>
    </div>
  {/if}
</section>

<style>
  .gl { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  .gl h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .befund-kopf { margin: 0; }
  .knoepfe { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .seiten, .elemente { list-style: none; margin: 0; padding: 0; }
  .elemente { margin: var(--a1) 0 var(--a2) var(--a4); border-inline-start: 2px solid var(--linie); padding-inline-start: var(--a2); }
  .seiten > li + li { margin-top: var(--a2); }
  .eintrag { display: flex; flex-wrap: wrap; gap: 0 var(--a2); align-items: baseline; width: 100%; text-align: start; min-height: var(--ziel); padding: var(--a1) var(--a2); background: var(--blatt); color: var(--tinte); border: 1px solid transparent; border-radius: var(--r-klein); font: inherit; cursor: pointer; overflow-wrap: anywhere; }
  .eintrag:hover { background: var(--blatt-2); }
  .eintrag:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  .eintrag[aria-current='true'] { background: var(--akzent-hell); border-color: var(--akzent); font-weight: 600; }
  .seite { font-weight: 650; }
  .art { color: var(--tinte-2); font-size: var(--gr-klein); font-weight: 600; }
  .marke { font-size: var(--gr-klein); border: 1px solid var(--linie-stark); border-radius: 999px; padding: 0 var(--a2); color: var(--tinte-2); font-weight: 500; }
  .marke.fehler { border-color: var(--tinte); color: var(--tinte); font-weight: 650; }
  .vorlagen { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); }
  .vorlagen > :global(*:not(summary)) { margin-top: var(--a2); }
  .schalter { display: flex; gap: var(--a2); align-items: center; }
  .leer { color: var(--tinte-2); }
</style>
