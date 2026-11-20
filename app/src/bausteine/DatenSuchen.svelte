<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { s, L, Lp, d, melde, meldeFehler, aendereDaten } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { suchen, ersetzeTreffer, type SuchModus } from '../lib/suchenersetzen';
  import { geheZuZelle } from '../lib/gehezu';
  import { Laedt } from '../lib/laedt.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  /**
   * In der Datenansicht: „Gehe zu“ (eine Zahl = Zeile, „4 5“ = Spalte 4 und Zeile 5, „D5“ = Zelle D5) und Suchen mit Ersetzen.
   * Suchen: Lupe, die beim Hineinklicken breit wird; Eingabetaste springt in die Zelle des ersten Treffers (Fokus in der Zelle),
   * Strg+Bild ab / F3 weiter, Strg+Bild auf / Umschalt+F3 zurück, dazu zwei Pfeile. Ersetzen ist ein Symbol daneben und klappt eine schmale Zeile auf.
   * Ersetzen ist ein Rückgängig-Schritt mit Protokolleintrag. Rechnung: lib/suchenersetzen.ts, lib/gehezu.ts.
   */
  let { geheZu }: { geheZu: (zeile: number, spalte?: number | null) => void } = $props();
  const kennung = $props.id();

  /* ---------- Gehe zu ---------- */
  let nummer = $state('');
  function gehen(ev: SubmitEvent) {
    ev.preventDefault();
    const r = geheZuZelle(nummer, s.zeilen.length, s.spalten.length);
    if ('fehler' in r) {
      meldeFehler(r.fehler === 'leer' ? L('Bitte eine Zeile oder Zelle eingeben, zum Beispiel 5, 4 5 oder D5.', 'Please enter a row or a cell, for example 5, 4 5 or D5.')
        : r.fehler === 'keine-zelle' ? L('Das ist keine Zeile oder Zelle. Beispiele: 5 (Zeile 5), 4 5 (Spalte 4, Zeile 5), D5.', 'That is not a row or a cell. Examples: 5 (row 5), 4 5 (column 4, row 5), D5.')
        : r.fehler === 'zeile' ? L(`So viele Zeilen gibt es nicht. Die letzte Zeile hat die Nummer ${r.grenze}.`, `There are not that many rows. The last row has the number ${r.grenze}.`)
        : L(`So viele Spalten gibt es nicht. Es gibt ${r.grenze} Spalten.`, `There are not that many columns. There are ${r.grenze} columns.`));
      return;
    }
    geheZu(r.zeile, r.spalte);
    melde(r.spalte === null ? L(`Zeile ${r.zeile + 1} von ${s.zeilen.length}.`, `Row ${r.zeile + 1} of ${s.zeilen.length}.`)
      : L(`Zeile ${r.zeile + 1}, Spalte ${s.spalten[r.spalte]!.name}.`, `Row ${r.zeile + 1}, column ${s.spalten[r.spalte]!.name}.`));
  }

  /* ---------- Suchen und Ersetzen ---------- */
  let suche = $state(''), ersatz = $state(''), spalte = $state(''), modus = $state<SuchModus>('teil'), gross = $state(false);
  let ersetzenAn = $state(false), optOffen = $state(false);
  /** Aktueller Treffer (ab 0, -1 = noch keiner angesprungen). */
  let aktuell = $state(-1);
  const wahl = $derived(spalte === '' || s.spalten.some(x => x.name === spalte) ? spalte : '');
  const plan = $derived(suche !== '' ? suchen({ spalten: s.spalten as Spalte[], zeilen: s.zeilen as Wert[][] }, { spalten: wahl ? [wahl] : null, suche, ersatz, modus, gross }) : null);
  const laedt = new Laedt();
  const nenne = (l: string[], max = 6) => (l.length > max ? `${l.slice(0, max).join(', ')} ${L(`und ${l.length - max} weitere`, `and ${l.length - max} more`)}` : l.join(', '));
  const ersetzbar = $derived(plan ? plan.anzahl - plan.nichtErsetzbar : 0);
  const satz = $derived.by(() => {
    if (!plan) return L('Suchtext eingeben, dann stehen die Treffer hier.', 'Enter a search text; the hits then appear here.');
    if (plan.fehler === 'keine-spalte') return L('Diese Spalte gibt es nicht mehr.', 'This column no longer exists.');
    if (!plan.anzahl) return L('Keine Treffer.', 'No hits.');
    return Lp(plan.anzahl, `1 Treffer in ${nenne(plan.inSpalten)}.`, `${plan.anzahl} Treffer in ${nenne(plan.inSpalten)}.`, `1 hit in ${nenne(plan.inSpalten)}.`, `${plan.anzahl} hits in ${nenne(plan.inSpalten)}.`);
  });
  /** Kurz neben den Pfeilen: „3 von 83“, „83 Treffer“ oder „Keine Treffer“. */
  const zahl = $derived.by(() => {
    if (!plan) return '';
    if (!plan.anzahl) return L('Keine Treffer', 'No hits');
    return aktuell >= 0 ? L(`${aktuell + 1} von ${plan.anzahl}`, `${aktuell + 1} of ${plan.anzahl}`) : Lp(plan.anzahl, '1 Treffer', `${plan.anzahl} Treffer`, '1 hit', `${plan.anzahl} hits`);
  });
  /** Zur Zelle des nächsten (1) oder vorigen (-1) Treffers; der Fokus steht danach in der Zelle. */
  function treffer(richtung: 1 | -1) {
    if (!plan) { melde(L('Bitte erst einen Suchtext eingeben.', 'Please enter a search text first.')); return; }
    if (!plan.treffer.length) { melde(L('Keine Treffer.', 'No hits.')); return; }
    const n = plan.treffer.length;
    aktuell = aktuell < 0 ? (richtung === 1 ? 0 : n - 1) : (aktuell + richtung + n) % n;
    const t = plan.treffer[aktuell]!;
    geheZu(t.zeile, t.spalte);
    melde(L(`Treffer ${aktuell + 1} von ${n}: Zeile ${t.zeile + 1}, Spalte ${t.name}.`, `Hit ${aktuell + 1} of ${n}: row ${t.zeile + 1}, column ${t.name}.`));
  }
  /** Strg+Bild ab / Strg+Bild auf und F3 / Umschalt+F3 gehen in der ganzen Seite zum nächsten oder vorigen Treffer, solange gesucht wird. */
  function taste(e: KeyboardEvent) {
    if (suche === '' || !plan?.treffer.length) return;
    const ctrl = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
    if ((ctrl && (e.key === 'PageDown' || e.key === 'PageUp')) || (e.key === 'F3' && !e.ctrlKey && !e.altKey)) {
      e.preventDefault();
      treffer(e.key === 'PageUp' || (e.key === 'F3' && e.shiftKey) ? -1 : 1);
    }
  }
  function zu() { suche = ''; aktuell = -1; ersetzenAn = false; optOffen = false; }
  async function ersetzen() {
    if (!plan || !ersetzbar) return;
    const { daten, ersetzt } = ersetzeTreffer({ spalten: s.spalten as Spalte[], zeilen: s.zeilen as Wert[][] }, plan);
    const text = Lp(ersetzt, `Ersetzt: „${suche}“ durch „${ersatz}“ (${ersetzt} Zelle)`, `Ersetzt: „${suche}“ durch „${ersatz}“ (${ersetzt} Zellen)`, `Replaced: "${suche}" with "${ersatz}" (${ersetzt} cell)`, `Replaced: "${suche}" with "${ersatz}" (${ersetzt} cells)`);
    await laedt.mit(async () => {
      const ok = await aendereDaten(text, $state.snapshot(s.spalten) as Spalte[], daten.zeilen.map(z => [...z]) as Wert[][], true, { art: 'zelle' });
      if (ok) melde(text + '.', true);
    });
  }
</script>

<svelte:window onkeydown={taste} />

<div class="ds">
  <div class="ds-zeile">
    <div class="ds-suche" role="search">
      <div class="ds-feld ds-lupe" class:ds-gefuellt={suche !== ''}>
        <label for="{kennung}-s" class="ds-lupe-symbol" data-tipp={L('Suchen: Eingabetaste springt in die Zelle des Treffers, Strg+Bild ab oder F3 zum nächsten', 'Find: Enter jumps into the cell of the hit, Ctrl+Page Down or F3 for the next one')}><Icon n="suche" /><span class="nur-vorleser">{L('In den Daten suchen', 'Search in the data')}</span></label>
        <input id="{kennung}-s" type="text" autocomplete="off" placeholder={L('In den Daten suchen …', 'Search in the data …')} bind:value={suche}
          oninput={() => { aktuell = -1; }}
          onkeydown={(e) => {
            if (e.key === 'Escape' && suche) { e.preventDefault(); e.stopPropagation(); zu(); }
            else if (e.key === 'Enter') { e.preventDefault(); treffer(e.shiftKey ? -1 : 1); }
          }}>
      </div>
      {#if suche !== ''}
        <button class="k leise nur-symbol" type="button" aria-label={L('Vorheriger Treffer', 'Previous hit')} data-tipp={L('Vorheriger Treffer (Strg+Bild auf, Umschalt+F3)', 'Previous hit (Ctrl+Page Up, Shift+F3)')} onclick={() => treffer(-1)}><Icon n="hoch" /></button>
        <button class="k leise nur-symbol" type="button" aria-label={L('Nächster Treffer', 'Next hit')} data-tipp={L('Nächster Treffer (Strg+Bild ab, F3, Eingabetaste im Suchfeld)', 'Next hit (Ctrl+Page Down, F3, Enter in the search field)')} onclick={() => treffer(1)}><Icon n="runter" /></button>
        <span class="ds-zahl">{zahl}</span>
        <details class="ds-opt" bind:open={optOffen}>
          <summary class="k leise nur-symbol" aria-label={L('Suchoptionen', 'Search options')} data-tipp={L('Suchoptionen: Spalte, Teiltext, Groß und klein', 'Search options: column, part of text, upper and lower case')}><Icon n="zahnrad" /></summary>
          <div class="ds-opt-box">
            <div class="eingabe"><label for="{kennung}-sp">{L('In Spalte', 'In column')}</label>
              <select id="{kennung}-sp" value={wahl} onchange={(e) => { spalte = (e.currentTarget as HTMLSelectElement).value; aktuell = -1; }}><option value="">{L('Alle Spalten', 'All columns')}</option>{#each s.spalten as sp (sp.name)}<option value={sp.name}>{sp.name}</option>{/each}</select></div>
            <fieldset class="ds-modus"><legend>{L('Text vergleichen', 'Compare text')}</legend>
              <label><input type="radio" name="{kennung}-m" value="zelle" bind:group={modus} onchange={() => (aktuell = -1)}>{L('Ganze Zelle', 'Whole cell')}</label>
              <label><input type="radio" name="{kennung}-m" value="teil" bind:group={modus} onchange={() => (aktuell = -1)}>{L('Teiltext', 'Part of the text')}</label>
              <label><input type="checkbox" bind:checked={gross} onchange={() => (aktuell = -1)}>{L('Groß und klein unterscheiden', 'Match upper and lower case')}</label>
            </fieldset>
            <p class="hilfe">{L('Gesucht wird, was in der Zelle steht, auch die Beschriftung von Zahlencodes („2 weiblich“). Mit „Ganze Zelle“ gilt eine Zahl exakt (1,5 findet 1,5, nie 15), mit „Teiltext“ auch Teile. Datumsspalten werden nicht durchsucht.', 'The search looks at what the cell shows, including the label of number codes ("2 female"). With "Whole cell" a number must match exactly (1.5 finds 1.5, never 15), with "Part of the text" parts match too. Date columns are not searched.')}</p>
          </div>
        </details>
        <button class="k leise nur-symbol" class:ds-an={ersetzenAn} type="button" aria-pressed={ersetzenAn} aria-label={L('Ersetzen', 'Replace')} data-tipp={L('Treffer durch einen anderen Text ersetzen', 'Replace hits with another text')} onclick={() => (ersetzenAn = !ersetzenAn)}><Icon n="umkodieren" /></button>
        <button class="k leise nur-symbol" type="button" aria-label={L('Suchen beenden', 'Close search')} data-tipp={L('Suchen beenden (Esc)', 'Close search (Esc)')} onclick={zu}><Icon n="zu" /></button>
      {/if}
    </div>
    <form class="ds-feld ds-zeilenfeld" onsubmit={gehen}>
      <label class="nur-vorleser" for="{kennung}-z">{L('Zu Zeile oder Zelle springen', 'Go to row or cell')}</label>
      <input id="{kennung}-z" type="text" autocomplete="off" placeholder={L('Zu Zelle springen …', 'Go to …')} bind:value={nummer} aria-describedby="{kennung}-zh"
        data-tipp={L('Eine Zahl: Zeile. Zwei Zahlen „4 5“: Spalte 4, Zeile 5. „D5“: Zelle D5.', 'One number: row. Two numbers "4 5": column 4, row 5. "D5": cell D5.')}>
      <span id="{kennung}-zh" class="nur-vorleser">{L(`Eine Zahl von 1 bis ${s.zeilen.length} ist die Zeile, 4 5 ist Spalte 4 und Zeile 5, D5 ist Spalte D und Zeile 5. Eingabetaste springt.`, `A number from 1 to ${s.zeilen.length} is the row, 4 5 is column 4 and row 5, D5 is column D and row 5. Enter jumps.`)}</span>
    </form>
  </div>
  <div class="ds-vorschau" use:ergebnisAnsage={{ satz: '.ds-satz, .ds-warn', anzahl: 2 }}>
    <p class="ds-satz nur-vorleser">{suche !== '' ? satz : ''}</p>
  </div>
  {#if suche !== '' && ersetzenAn}
    <div class="ds-ers" role="group" aria-label={L('Ersetzen', 'Replace')}>
      <div class="ds-feld"><label for="{kennung}-e" class="nur-vorleser">{L('Ersetzen durch', 'Replace with')}</label><input id="{kennung}-e" type="text" autocomplete="off" placeholder={L('Ersetzen durch … (leer: Zelle leeren)', 'Replace with … (empty: clear the cell)')} bind:value={ersatz}></div>
      <button class="k haupt" type="button" disabled={!ersetzbar || laedt.aktiv} onclick={ersetzen}>{#if laedt.sichtbar}<Rechnet imKnopf />{/if}{ersetzbar ? Lp(ersetzbar, 'Diesen Treffer ersetzen', `Alle ${ersetzbar} Treffer ersetzen`, 'Replace this hit', `Replace all ${ersetzbar} hits`) : L('Nichts zu ersetzen', 'Nothing to replace')}</button>
      <span class="hilfe">{d('Mit „Rückgängig“ nimmst du das Ersetzen zurück.', 'Mit „Rückgängig“ nehmen Sie das Ersetzen zurück.', 'Use "Undo" to take the replacement back.')}</span>
      {#if plan?.nichtErsetzbar}<span class="ds-warn">{L(`${plan.nichtErsetzbar} Treffer werden nicht ersetzt: Beschriftungen, nur teilweise gefundene Zahlen und Zahlen, wenn „${ersatz}“ keine Zahl ist.`, `${plan.nichtErsetzbar} hits are not replaced: labels, parts of numbers, and numbers when "${ersatz}" is not a number.`)}</span>{/if}
    </div>
  {/if}
</div>

<style>
  .ds { margin: var(--a2) 0; display: flex; flex-direction: column; gap: var(--a2); }
  .ds-zeile { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2) var(--a3); }
  .ds-suche { display: inline-flex; align-items: center; gap: var(--a1); flex-wrap: wrap; }
  .ds-feld { display: inline-flex; align-items: center; gap: var(--a2); padding: 0 var(--a3); min-height: var(--ziel, 2.25rem); border: 1px solid var(--linie-stark); border-radius: var(--r); background: var(--blatt); color: var(--tinte-2); }
  .ds-feld:focus-within { box-shadow: var(--fokus-ring); }
  .ds-feld input { border: 0; background: none; box-shadow: none; outline: none; min-height: 0; padding: var(--a1) 0; width: 14rem; max-width: 100%; color: var(--tinte); }
  .ds-zeilenfeld input { width: 11rem; }
  /* Suchfeld: immer offen, Lupe links im Feld, sichtbarer Platzhalter. */
  .ds-lupe { padding: 0 var(--a3); cursor: text; min-width: 0; flex: 1 1 10rem; max-width: 14rem; }
  .ds-lupe-symbol { display: inline-flex; align-items: center; cursor: text; }
  .ds-lupe input { flex: 1 1 auto; min-width: 0; width: 100%; margin-inline-start: var(--a1); }
  .ds-zahl { font-size: var(--gr-klein); color: var(--tinte-2); white-space: nowrap; padding: 0 var(--a1); }
  .ds-an { background: var(--akzent-hell); color: var(--akzent-tinte); }
  .ds-opt { position: relative; }
  .ds-opt > summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
  .ds-opt > summary::-webkit-details-marker { display: none; }
  .ds-opt-box { position: absolute; z-index: 20; top: calc(100% + 4px); inset-inline-start: 0; min-width: 17rem; display: flex; flex-direction: column; gap: var(--a2); padding: var(--a3); background: var(--blatt-gehoben, var(--blatt)); border: 1px solid var(--linie-stark); border-radius: var(--r); box-shadow: var(--schatten, 0 6px 20px rgba(0,0,0,.15)); }
  .ds-modus { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a1); }
  .ds-modus legend { padding: 0; margin-bottom: var(--a1); }
  .ds-modus label { display: inline-flex; align-items: center; gap: var(--a2); min-height: var(--ziel); }
  .ds-modus input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 0; }
  .ds-ers { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2) var(--a3); }
  .ds-ers .ds-feld input { width: 16rem; }
  .ds-vorschau { min-height: 0; }
  .ds-satz { margin: 0; }
  .ds-warn { color: var(--fehler-tinte, var(--fehler, #8a1c13)); font-weight: 600; }
</style>
