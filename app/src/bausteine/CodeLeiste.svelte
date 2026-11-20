<script lang="ts">
  /**
   * Kodier-Arbeitsplatz, Code-Leiste (Stufe 6b, Fachblatt 3.3): Combobox mit Liste (kein Fenster), „Neuer Code“ und Schnellleiste 1 bis 9.
   * Enter gibt den Code und führt zurück in die Ansicht; Umschalt+Tab aus der Combobox führt (nur nach Enter/K in der Ansicht) zurück ohne Code.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { codePfad, kodierbareCodes } from '../lib/kodieren';
  import { kuerzen } from '../lib/kodieren.svelte';
  import type { Code } from '../lib/qualprojekt';

  interface Props {
    codes: Code[];
    /** Wofür der Code gegeben wird: „Satz 3“, „Zeichen 5 bis 40“ … leer = keine Stelle */
    stelle: string;
    schnell: string[];
    /** Wurde die Combobox über Enter/K in der Ansicht erreicht? Dann bringt Umschalt+Tab zurück. */
    ueberTaste: boolean;
    gib: (codeId: string) => void;
    neu: (name: string) => void;
    zurueck: () => void;
  }
  let { codes, stelle, schnell, ueberTaste, gib, neu, zurueck }: Props = $props();

  let suche = $state('');
  let aktiv = $state(-1);
  let eingabe = $state<HTMLInputElement>();
  const pfade = $derived(new Map(codes.map(c => [c.id, codePfad(codes, c.id)])));
  const alle = $derived(kodierbareCodes(codes));
  const text = $derived(suche.trim().toLowerCase());
  const passend = $derived(alle.filter(c => (pfade.get(c.id) ?? c.name).toLowerCase().includes(text)));
  const gleichName = $derived(text !== '' && alle.some(c => c.name.toLowerCase() === text || (pfade.get(c.id) ?? '').toLowerCase() === text));
  const zeigeNeu = $derived(text !== '' && !gleichName);
  const anzahl = $derived(passend.length + (zeigeNeu ? 1 : 0));
  const ziffer = (id: string): number => schnell.indexOf(id) + 1;
  const name = $derived(stelle ? L(`Code für ${stelle}`, `Code for ${stelle}`) : L('Code suchen', 'Search code'));
  const optId = (i: number): string | undefined => (i < 0 || i >= anzahl ? undefined : i < passend.length ? `ko-cl-o-${passend[i]!.id}` : 'ko-cl-neu');

  export function fokussiere() { void tick().then(() => eingabe?.focus()); }

  /* Trefferzahl: nur der letzte Stand wird angesagt (entprellt) */
  let letzteZahl = -1;
  let nimmZurueck: (() => void) | null = null;
  const trefferSatz = (n: number): string => Lp(n, '1 Code passt.', `${n} Codes passen.`, '1 code matches.', `${n} codes match.`);
  $effect(() => {
    const z = passend.length;
    if (z === letzteZahl) return;
    const erster = letzteZahl < 0; letzteZahl = z;
    if (erster || text === '') return;
    nimmZurueck?.();
    nimmZurueck = sageSpaeter(trefferSatz(z), 700);
  });
  $effect(() => { void suche; aktiv = -1; });

  function waehle(i: number) {
    if (i < 0 || i >= anzahl) return;
    nimmZurueck?.();
    if (i < passend.length) { const c = passend[i]!; suche = ''; gib(c.id); }
    else { const n = suche.trim(); suche = ''; neu(n); }
  }
  function taste(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!anzahl) { sage(L('Kein Code passt.', 'No code matches.')); return; }
      aktiv = Math.min(anzahl - 1, aktiv + 1);
      rolle();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!anzahl) return;
      aktiv = Math.max(0, aktiv - 1);
      rolle();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!stelle) { sage(L('Erst eine Stelle markieren, dann den Code geben.', 'Mark a passage first, then assign the code.')); return; }
      if (aktiv >= 0) waehle(aktiv);
      else if (anzahl === 1) waehle(0);
      else if (!anzahl) sage(L('Kein Code passt.', 'No code matches.'));
      else { nimmZurueck?.(); sage(Lp(anzahl, '1 Code passt. Mit Pfeil ab wählen.', `${anzahl} Codes passen. Mit Pfeil ab einen wählen.`, '1 code matches. Choose it with arrow down.', `${anzahl} codes match. Choose one with arrow down.`)); }
    } else if (e.key === 'Tab' && e.shiftKey && ueberTaste) {
      e.preventDefault();
      zurueck();
    }
  }
  function rolle() { void tick().then(() => { const id = optId(aktiv); if (id) document.getElementById(id)?.scrollIntoView({ block: 'nearest' }); }); }
  const beschreibung = (c: Code): string => {
    const z = ziffer(c.id);
    const ohnePunkt = (t: string): string => t.replace(/[\s.…]+$/u, '');
    const teile = [c.definition ? ohnePunkt(kuerzen(c.definition, 150)) : '', z ? L(`Ziffer ${z}`, `Digit ${z}`) : ''].filter(Boolean);
    return teile.length ? teile.join('. ') + '.' : '';
  };
  /** Vollständiger Name der Option: VoiceOver liest `aria-describedby` an Optionen nicht, `aria-label` immer */
  /* Der sichtbare Text (Pfad, dahinter die Schnell-Ziffer) steht vorn im Namen (WCAG 2.5.3, axe label-content-name-mismatch, Stufe 6c) */
  const optLabel = (c: Code): string => { const b = beschreibung(c); const z = ziffer(c.id); const p = (pfade.get(c.id) ?? c.name) + (z ? ` ${z}` : ''); return b ? `${p}. ${b}` : p; };
  const neuText = $derived(L(`Neuer Code: „${suche.trim()}“`, `New code: "${suche.trim()}"`));
</script>

<div class="cl">
  <label for="ko-cl-suche" class="beschriftung" data-nolink>{name}</label>
  <input id="ko-cl-suche" type="text" role="combobox" aria-expanded="true" aria-controls="ko-cl-liste" aria-autocomplete="list" autocomplete="off" spellcheck="false"
    aria-activedescendant={optId(aktiv)} aria-describedby="ko-cl-kurz" placeholder={L('Code suchen oder neu anlegen', 'Search or create a code')} bind:value={suche} bind:this={eingabe} onkeydown={taste}>
  <p class="hilfe" id="ko-cl-kurz">{L('Tippen sucht. Pfeil ab wählt. Enter gibt den Code. Umschalt+Tab zurück ohne Code.', 'Typing searches. Arrow down chooses. Enter assigns the code. Shift+Tab goes back without a code.')}</p>
  {#if stelle}<p class="hilfe" data-nolink>{L(`Gewählte Stelle: ${stelle}.`, `Chosen passage: ${stelle}.`)}</p>{/if}
  {#if alle.length === 0 && !zeigeNeu}<p class="hilfe">{L('Es gibt noch keine Codes. Tippen Sie einen Namen: Sie können ihn dann als neuen Code anlegen.', 'There are no codes yet. Type a name: you can then create it as a new code.')}</p>{/if}
  <div id="ko-cl-liste" class="liste" role="listbox" aria-label={L('Codes', 'Codes')} data-nolink>
    {#each passend as c, i (c.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus (Fokus läuft über aria-activedescendant der Combobox) -->
      <div id="ko-cl-o-{c.id}" class="opt" class:fokus={i === aktiv} role="option" aria-selected={i === aktiv ? 'true' : 'false'}
        aria-label={optLabel(c)} aria-setsize={anzahl} aria-posinset={i + 1}
        onclick={() => { if (!stelle) sage(L('Erst eine Stelle markieren, dann den Code geben.', 'Mark a passage first, then assign the code.')); else waehle(i); }}>
        <span aria-hidden="true">{pfade.get(c.id)}</span>{#if ziffer(c.id)} <span class="z" aria-hidden="true">{ziffer(c.id)}</span>{/if}
      </div>
    {/each}
    {#if zeigeNeu}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus (Fokus läuft über aria-activedescendant der Combobox) -->
      <div id="ko-cl-neu" class="opt neu" class:fokus={aktiv === passend.length} role="option" aria-selected={aktiv === passend.length ? 'true' : 'false'}
        aria-label={neuText} aria-setsize={anzahl} aria-posinset={passend.length + 1}
        onclick={() => { if (!stelle) sage(L('Erst eine Stelle markieren, dann den Code geben.', 'Mark a passage first, then assign the code.')); else waehle(passend.length); }}>
        <span aria-hidden="true">{neuText}</span>
      </div>
    {/if}
  </div>

  {#if schnell.length}
    <ul id="ko-cl-schnell" class="schnell" aria-label={L('Schnellleiste, Ziffern 1 bis 9', 'Quick bar, digits 1 to 9')}>
      {#each schnell as id, i (id)}
        <li><button class="k" id="ko-cl-{i + 1}" type="button" aria-label={L(`Ziffer ${i + 1}: ${pfade.get(id) ?? ''}`, `Digit ${i + 1}: ${pfade.get(id) ?? ''}`)} onclick={() => gib(id)}><span aria-hidden="true">{i + 1} {pfade.get(id)}</span></button></li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .cl { display: flex; flex-direction: column; gap: var(--a2); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .beschriftung { font-weight: 600; }
  input[role="combobox"] { width: 100%; box-sizing: border-box; }
  .liste { max-height: 14rem; overflow: auto; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); }
  .opt { display: flex; justify-content: space-between; gap: var(--a2); padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); cursor: pointer; }
  .opt.fokus { outline: 3px solid var(--fokus); outline-offset: -3px; background: var(--akzent-hell); }
  .neu { font-style: italic; }
  .z { font-size: var(--gr-klein); color: var(--tinte-2); }
  .schnell { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--a2); }
</style>
