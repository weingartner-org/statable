<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { L, d, waehle } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { komma } from '../lib/ergebnis';
  import type { Rechenaufgabe, Zahl } from '../lernen/rechenaufgaben';
  import { leererRechenStand, tippe, pruefeSchritt, zeigeWeg, aufgabeFertig, ersterOffenerSchritt, richtigeSchritte, type Urteil } from '../lernen/rechnen';

  /**
   * Baustein „Selbst rechnen“ (Johannes 05.11.2026): kurze Lage, kleine Datentabelle, je Schritt eine Frage mit Zahlenfeld, Prüfen, gezieltem Tipp und Rechenweg.
   * Neben jedem Schritt steht, warum man so rechnet. Ergebnisse zählen nur im Lernstand dieses Browsers: `beiFertig` meldet, wenn alle Schritte richtig sind.
   * Screenreader: eine Live-Region sagt jedes Urteil an (Tabelle als echte Tabelle mit Überschriften); nach einem richtigen Schritt springt der Fokus zum nächsten offenen Feld, nach einem falschen bleibt er im Feld.
   */
  let { aufgabe, fertig = false, beiFertig }: { aufgabe: Rechenaufgabe; fertig?: boolean; beiFertig?: () => void } = $props();

  const n = untrack(() => aufgabe.schritte.length);
  let st = $state(leererRechenStand(n));
  let wegOffen = $state<boolean[]>(Array.from({ length: n }, () => false));
  let fertigEl = $state<HTMLElement>();

  /** Zahl im Format des Projekts: ganze Zahl ohne, sonst mit zwei Nachkommastellen, wenn nichts anderes gewünscht ist. */
  const z: Zahl = (x, stellen) => komma(x, stellen ?? (Number.isInteger(x) ? 0 : 2));
  const zelle = (c: unknown): string => (typeof c === 'number' ? (Number.isInteger(c) ? String(c) : komma(c, 1)) : typeof c === 'string' ? c : waehle(c as { de: string; en: string }));
  const istZahl = (c: unknown) => typeof c === 'number';

  function text(u: Urteil | undefined, i: number): { art: 'ok' | 'nein' | 'info'; t: string } | undefined {
    const s = aufgabe.schritte[i]!, x = st.schritte[i]!;
    if (!u) return x.richtig ? { art: 'ok', t: x.mitWeg ? L('Richtig, mit Hilfe des Rechenwegs.', 'Correct, with the help of the working.') : L('Richtig.', 'Correct.') } : undefined;
    if (u.art === 'leer') return { art: 'info', t: L('Bitte zuerst eine Zahl eingeben.', 'Please enter a number first.') };
    if (u.art === 'keineZahl') return { art: 'info', t: L('Das ist keine Zahl. Als Dezimalzeichen gehen Komma und Punkt.', 'That is not a number. Comma and point both work as the decimal sign.') };
    if (u.art === 'richtig') return { art: 'ok', t: x.mitWeg ? L('Richtig, mit Hilfe des Rechenwegs.', 'Correct, with the help of the working.') : L('Richtig.', 'Correct.') };
    const tipp = waehle(u.fehler !== undefined ? s.fehler[u.fehler]!.tipp : s.tipp);
    const mehr = x.versuche >= 2 && !x.wegGesehen ? ' ' + L('Der Rechenweg zeigt die Zwischenschritte.', 'The working shows the intermediate steps.') : '';
    return { art: 'nein', t: `${L('Noch nicht richtig.', 'Not right yet.')} ${tipp}${mehr}` };
  }

  const feld = (i: number) => document.getElementById(`ra-${aufgabe.id}-f${i}`) as HTMLInputElement | null;
  async function pruefen(i: number) {
    const s = aufgabe.schritte[i]!;
    const war = aufgabeFertig(st);
    const { stand, urteil } = pruefeSchritt(st, i, s);
    st = stand;
    const t = text(urteil, i)!;
    const next = ersterOffenerSchritt(stand);
    sage(`${L(`Schritt ${i + 1}`, `Step ${i + 1}`)}: ${t.t}${urteil.art === 'richtig' ? (next >= 0 ? ' ' + L(`Weiter mit Schritt ${next + 1}.`, `Next: step ${next + 1}.`) : ' ' + L('Alle Schritte sind richtig.', 'All steps are correct.')) : ''}`);
    if (urteil.art === 'richtig') {
      await tick();
      if (next >= 0) feld(next)?.focus();
      else fertigEl?.focus();
    } else { feld(i)?.focus(); feld(i)?.select(); }
    if (!war && aufgabeFertig(stand)) beiFertig?.();
  }
  function weg(i: number) {
    wegOffen[i] = !wegOffen[i];
    if (wegOffen[i]) st = zeigeWeg(st, i);
  }
  const rueck = $derived(aufgabe.schritte.map((_, i) => text(st.schritte[i]!.urteil, i)));
  const fertigJetzt = $derived(aufgabeFertig(st));
</script>

<div class="ra">
  <p class="ra-lage">{waehle(aufgabe.lage)}</p>

  <div class="vst-rollt">
    <table class="vst-tabelle ra-tab">
      <caption>{waehle(aufgabe.tabelle.titel)}</caption>
      <thead><tr>{#each aufgabe.tabelle.kopf as k, j (j)}<th scope="col" class:zahl-sp={j > 0}>{waehle(k)}</th>{/each}</tr></thead>
      <tbody>
        {#each aufgabe.tabelle.zeilen as zeile, r (r)}
          <tr>{#each zeile as c, j (j)}{#if j === 0}<th scope="row">{zelle(c)}</th>{:else}<td class:zahl-sp={istZahl(c)}>{zelle(c)}</td>{/if}{/each}</tr>
        {/each}
      </tbody>
    </table>
  </div>

  <p class="ln-stand">{L(`${richtigeSchritte(st)} von ${n} Schritten richtig`, `${richtigeSchritte(st)} of ${n} steps correct`)}</p>

  <ol class="ra-schritte">
    {#each aufgabe.schritte as s, i (s.id)}
      {@const x = st.schritte[i]!}
      {@const r = rueck[i]}
      <li class="ra-schritt" class:ra-ok={x.richtig}>
        <div class="ra-links">
          <h3 id="ra-{aufgabe.id}-h{i}">{L(`Schritt ${i + 1}`, `Step ${i + 1}`)}: <span class="ra-frage">{waehle(s.frage)}</span></h3>
          <form class="ra-form" onsubmit={(e) => { e.preventDefault(); pruefen(i); }}>
            <input id="ra-{aufgabe.id}-f{i}" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" value={x.eingabe}
              aria-labelledby="ra-{aufgabe.id}-h{i}{s.einheit ? ` ra-${aufgabe.id}-e${i}` : ''}" aria-describedby="ra-{aufgabe.id}-r{i}" aria-invalid={r?.art === 'nein' || r?.art === 'info' ? 'true' : undefined}
              oninput={(e) => { st = tippe(st, i, e.currentTarget.value); }} />
            {#if s.einheit}<span class="ra-einheit" aria-hidden="true">{waehle(s.einheit)}</span><span id="ra-{aufgabe.id}-e{i}" hidden>{L('Einheit: ', 'Unit: ')}{waehle(s.einheit)}</span>{/if}
            <button type="submit" class="k haupt">{L('Prüfen', 'Check')}</button>
            <button type="button" class="k leise" aria-expanded={wegOffen[i]} aria-controls="ra-{aufgabe.id}-w{i}" onclick={() => weg(i)}>{wegOffen[i] ? L('Rechenweg verbergen', 'Hide the working') : L('Rechenweg zeigen', 'Show the working')}</button>
          </form>
          <p id="ra-{aufgabe.id}-r{i}" class="ra-rueck" class:ra-gut={r?.art === 'ok'} class:ra-schlecht={r?.art === 'nein'}>{#if r}<span class="ra-marke" aria-hidden="true">{r.art === 'ok' ? '✓' : r.art === 'nein' ? '✗' : '!'}</span> {r.t}{/if}</p>
          {#if wegOffen[i]}
            <div id="ra-{aufgabe.id}-w{i}" class="ra-weg"><h4>{L('Rechenweg', 'The working')}</h4>
              <ol>{#each s.weg(z) as p, k (k)}<li>{waehle(p)}</li>{/each}</ol>
              {#if !x.richtig}<p class="ln-klein">{L('Das Ergebnis jetzt selbst eintragen und prüfen: erst dann zählt der Schritt.', 'Now enter the result yourself and check it: only then does the step count.')}</p>{/if}
            </div>
          {:else}<div id="ra-{aufgabe.id}-w{i}" hidden></div>{/if}
        </div>
        <aside class="ra-warum" aria-label={L(`Warum so? Schritt ${i + 1}`, `Why this way? Step ${i + 1}`)}>
          <h4>{L('Warum so?', 'Why this way?')}</h4>
          <p>{waehle(s.warum)}</p>
        </aside>
      </li>
    {/each}
  </ol>

  <div class="ra-fertig" hidden={!fertigJetzt}>
    {#if fertigJetzt}
      <h3 tabindex="-1" bind:this={fertigEl}>{L('Geschafft: alle Schritte stimmen.', 'Done: all steps are correct.')}</h3>
      <p>{waehle(aufgabe.merke)}</p>
      <p>{waehle(aufgabe.ausprobieren)}</p>
    {/if}
  </div>
  {#if fertig && !fertigJetzt}<p class="ln-hinweis">{d('Diese Aufgabe ist schon durchgemacht. Du kannst sie noch einmal rechnen.', 'Diese Aufgabe ist schon durchgemacht. Sie können sie noch einmal rechnen.', 'You have already completed this task. You can work it out again.')}</p>{/if}
</div>
