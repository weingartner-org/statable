<script lang="ts">
  import { L, d } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { entmarkiere, markiere, markiereGanz, markierungen, neueGruppe, sortiere, stufenName, verschiebe, type Faelle, type Gruppe, type SortSpalte, type Zitat } from '../lib/faelle';
  import Icon from './Icon.svelte';

  /**
   * Die Tabelle Fall × Spalten (Case Comparison Table): Kennung, Gruppe, Zahlen und Gruppen, Texte - vollständig und umbrochen, nie abgeschnitten.
   * Sortierbar nach jeder Spalte (nur die Anzeige). Ein Fall wechselt die Gruppe über die Auswahl in seiner Gruppen-Zelle (mit Tastatur bedienbar).
   * Zitate: ganze Antwort markieren, oder einen Satzteil auswählen und „Auswahl als Zitat markieren“; die Stelle wird als Zeichenbereich gespeichert.
   */
  let { e, gruppen, gruppeVon, farbe, tue }: { e: Faelle; gruppen: Gruppe[]; gruppeVon: Map<string, string>; farbe: (id: string) => number; tue: (text: string, fn: (x: Faelle) => void) => void } = $props();

  let sort = $state<SortSpalte | null>(null), abwaerts = $state(false);
  const namenVon = $derived(new Map(gruppen.map(g => [g.id, g.name])));
  const gruppenName = (i: number) => namenVon.get(gruppeVon.get(e.faelle[i]!.schluessel) ?? '') ?? '';
  const reihe = $derived(sortiere(e, e.faelle.map((_, i) => i), sort, abwaerts, gruppenName));
  const gleich = (a: SortSpalte | null, b: SortSpalte) => !!a && a.art === b.art && ('i' in a && 'i' in b ? a.i === b.i : true);
  function sortiereNach(spalte: SortSpalte) {
    if (gleich(sort, spalte)) { if (!abwaerts) abwaerts = true; else { sort = null; abwaerts = false; } }
    else { sort = spalte; abwaerts = false; }
  }
  const ariaSort = (spalte: SortSpalte): 'ascending' | 'descending' | 'none' => (gleich(sort, spalte) ? (abwaerts ? 'descending' : 'ascending') : 'none');

  /** Eine Zahl so, wie sie in den Daten steht (ohne Endnullen), mit dem Dezimalzeichen der Sprache. */
  const zeig = (qi: number, v: string | number | null) => (v === null ? '' : e.q[qi]!.art === 'zahl' ? zahlDe(v as number) : stufenName(e, qi, v));

  /* ---------- Gruppe wechseln ---------- */
  function wechsle(i: number, ziel: string) {
    const f = e.faelle[i]!;
    if (ziel === '__neu') {
      let id = '';
      tue(L(`Fall ${f.kennung} in eine neue Gruppe verschoben.`, `Case ${f.kennung} moved to a new group.`), x => { id = neueGruppe(x); verschiebe(x, f.schluessel, id); });
      return;
    }
    const name = namenVon.get(ziel) ?? '';
    tue(L(`Fall ${f.kennung} in die Gruppe „${name}“ verschoben.`, `Case ${f.kennung} moved to the group "${name}".`), x => verschiebe(x, f.schluessel, ziel));
  }

  /* ---------- Zitate ---------- */
  /** Die Zelle in Stücke mit ihrem Anfang im Text (für die Auswahl per Maus). */
  function stuecke(text: string, stellen: Zitat[]): { t: string; marke: boolean; von: number }[] {
    const aus: { t: string; marke: boolean; von: number }[] = [];
    let p = 0;
    for (const r of stellen) { if (r.von > p) aus.push({ t: text.slice(p, r.von), marke: false, von: p }); aus.push({ t: text.slice(r.von, r.bis), marke: true, von: r.von }); p = r.bis; }
    if (p < text.length || !aus.length) aus.push({ t: text.slice(p), marke: false, von: p });
    return aus;
  }
  const kurz = (t: string) => (t.length > 50 ? t.slice(0, 48).trimEnd() + ' …' : t);

  let wurzel = $state<HTMLElement>();
  let auswahl = $state<{ fall: string; spalte: string; von: number; bis: number } | null>(null);
  /** Position im Text einer Zelle für einen Rand der Auswahl; null, wenn der Rand außerhalb der Zelle liegt. */
  function punkt(knoten: Node, versatz: number, zelle: HTMLElement, ende: boolean): number | null {
    if (knoten.nodeType === 3) {
      const st = knoten.parentElement?.closest<HTMLElement>('[data-von]');
      return st && zelle.contains(st) ? Number(st.dataset.von) + versatz : null;
    }
    if (!zelle.contains(knoten) && knoten !== zelle) return null;
    return ende ? Number(zelle.dataset.laenge) : 0;
  }
  function lies() {
    const sel = typeof getSelection === 'function' ? getSelection() : null;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { auswahl = null; return; }
    const r = sel.getRangeAt(0), ort = r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentElement : (r.commonAncestorContainer as Element);
    const zelle = ort?.closest<HTMLElement>('.t-text');
    if (!zelle || !wurzel?.contains(zelle)) { auswahl = null; return; }
    const von = punkt(r.startContainer, r.startOffset, zelle, false), bis = punkt(r.endContainer, r.endOffset, zelle, true);
    auswahl = von === null || bis === null || bis <= von ? null : { fall: zelle.dataset.fall!, spalte: zelle.dataset.spalte!, von, bis };
  }
  $effect(() => {
    document.addEventListener('selectionchange', lies);
    return () => document.removeEventListener('selectionchange', lies);
  });
  function markiereAuswahl(i: number) {
    const a = auswahl; if (!a) return;
    const f = e.faelle[i]!;
    tue(L(`Zitat bei ${f.kennung} markiert.`, `Quote marked for ${f.kennung}.`), x => markiere(x, a.fall, a.spalte, a.von, a.bis));
    getSelection()?.removeAllRanges(); auswahl = null;
  }
  const ganzMarkiert = (fall: string, spalte: string, text: string) => { const m = markierungen(e, fall, spalte); return m.length === 1 && m[0]!.von === 0 && m[0]!.bis === text.length; };
  function ganz(i: number, ti: number) {
    const f = e.faelle[i]!, sp = e.t[ti]!.name, text = f.t[ti]!;
    if (ganzMarkiert(f.schluessel, sp, text)) tue(L(`Markierung bei ${f.kennung} aufgehoben.`, `Mark removed for ${f.kennung}.`), x => entmarkiere(x, f.schluessel, sp, 0));
    else tue(L(`Ganze Antwort bei ${f.kennung} markiert.`, `Whole answer marked for ${f.kennung}.`), x => markiereGanz(x, f.schluessel, sp));
  }
  function entferne(i: number, ti: number, stelle: number) {
    const f = e.faelle[i]!, sp = e.t[ti]!.name;
    tue(L(`Markierung bei ${f.kennung} entfernt.`, `Mark removed for ${f.kennung}.`), x => entmarkiere(x, f.schluessel, sp, stelle));
  }
  const ohneKennung = $derived(!e.kennung);
  const hatZustand = $derived(Object.keys(e.zustand.zuordnung).length > 0 || Object.keys(e.zustand.zitate).length > 0 || Object.keys(e.zustand.notizen).length > 0);
</script>

<div class="fall-bereich" bind:this={wurzel}>
  <h4 id="fall-t">{L(`Die Fälle (${e.faelle.length})`, `The cases (${e.faelle.length})`)}</h4>
  <p class="klein">{d('Klick auf eine Spaltenüberschrift sortiert die Tabelle (nur die Anzeige). In der Spalte „Gruppe“ wählst du, in welche Gruppe ein Fall gehört. Einen Teil einer Antwort wählst du mit der Maus oder mit Umschalt + Pfeiltasten aus; dann erscheint „Auswahl als Zitat markieren“.', 'Ein Klick auf eine Spaltenüberschrift sortiert die Tabelle (nur die Anzeige). In der Spalte „Gruppe“ wählen Sie, in welche Gruppe ein Fall gehört. Einen Teil einer Antwort wählen Sie mit der Maus oder mit Umschalt + Pfeiltasten aus; dann erscheint „Auswahl als Zitat markieren“.', 'Clicking a column heading sorts the table (display only). In the "Group" column you choose which group a case belongs to. Select part of an answer with the mouse or with Shift + arrow keys; then "Mark selection as quote" appears.')}</p>
  {#if ohneKennung && hatZustand}
    <p class="klein hinweis" role="note"><Icon n="info" /><span>{L('Ohne Kennung hängen Gruppen, Notizen und Markierungen an der Zeilennummer der Daten. Wurden Zeilen eingefügt, gelöscht oder umsortiert, ist die Zuordnung noch einmal zu prüfen.', 'Without a case ID, groups, notes and marks are tied to the row number of the data. If rows were inserted, deleted or re-sorted, the assignment needs to be checked again.')}</span></p>
  {/if}
  <!-- Rollbarer Bereich: mit Tab erreichbar, damit die Tabelle auch ohne Maus gescrollt werden kann -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="scroll" role="region" aria-labelledby="fall-t" tabindex="0">
    <table class="faelle-tabelle">
      <caption class="nur-vorleser">{L('Fälle mit Gruppe, Zahlen und Aussagen', 'Cases with group, numbers and statements')}</caption>
      <thead>
        <tr>
          <th scope="col" aria-sort={ariaSort({ art: 'kennung' })}><button type="button" class="sort" onclick={() => sortiereNach({ art: 'kennung' })}>{e.kennung ? (e.kennungName ?? e.kennung) : L('Zeile', 'Row')}<Icon n={gleich(sort, { art: 'kennung' }) ? (abwaerts ? 'runter' : 'hoch') : 'winkel'} /></button></th>
          <th scope="col" class="g-kopf" aria-sort={ariaSort({ art: 'gruppe' })}><button type="button" class="sort" onclick={() => sortiereNach({ art: 'gruppe' })}>{L('Gruppe', 'Group')}<Icon n={gleich(sort, { art: 'gruppe' }) ? (abwaerts ? 'runter' : 'hoch') : 'winkel'} /></button></th>
          {#each e.q as sp, qi (sp.name)}
            <th scope="col" aria-sort={ariaSort({ art: 'q', i: qi })}><button type="button" class="sort" onclick={() => sortiereNach({ art: 'q', i: qi })}>{sp.bezeichnung}<Icon n={gleich(sort, { art: 'q', i: qi }) ? (abwaerts ? 'runter' : 'hoch') : 'winkel'} /></button></th>
          {/each}
          {#each e.t as sp, ti (sp.name)}
            <th scope="col" class="t-kopf" aria-sort={ariaSort({ art: 't', i: ti })}><button type="button" class="sort" onclick={() => sortiereNach({ art: 't', i: ti })}>{sp.bezeichnung}<Icon n={gleich(sort, { art: 't', i: ti }) ? (abwaerts ? 'runter' : 'hoch') : 'winkel'} /></button></th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each reihe as i (e.faelle[i]!.schluessel)}
          {@const f = e.faelle[i]!}
          {@const gid = gruppeVon.get(f.schluessel) ?? ''}
          <tr>
            <th scope="row" class="kennung">{f.kennung}</th>
            <td class="g-zelle" style="--gf:var(--gruppe-{farbe(gid)})">
              <label class="gruppenwahl">
                <span class="g-punkt" aria-hidden="true"></span>
                <span class="g-name">{namenVon.get(gid) ?? ''}</span>
                <Icon n="winkel" />
                <select class="g-select" aria-label={L(`Gruppe von Fall ${f.kennung}: ${namenVon.get(gid) ?? ''} - ändern`, `Group of case ${f.kennung}: ${namenVon.get(gid) ?? ''} - change`)} onchange={(ev) => { const v = ev.currentTarget.value; wechsle(i, v); if (v === '__neu') ev.currentTarget.value = gid; }}>
                  {#each gruppen as g (g.id)}<option value={g.id} selected={g.id === gid}>{g.name}</option>{/each}
                  <option value="__neu">{L('Neue Gruppe …', 'New group …')}</option>
                </select>
              </label>
            </td>
            {#each e.q as sp, qi (sp.name)}
              {@const v = f.q[qi] ?? null}
              <td class="q-zelle" class:zahl={sp.art === 'zahl'}>{#if v === null}<span class="leer" aria-hidden="true">-</span><span class="nur-vorleser">{L('keine Angabe', 'no answer')}</span>{:else}{zeig(qi, v)}{/if}</td>
            {/each}
            {#each e.t as sp, ti (sp.name)}
              {@const text = f.t[ti] ?? ''}
              {@const marken = markierungen(e, f.schluessel, sp.name)}
              <td class="t-zelle">
                {#if text}
                  <div class="t-text" data-fall={f.schluessel} data-spalte={sp.name} data-laenge={text.length}>{#each stuecke(text, marken) as st (st.von)}{#if st.marke}<mark data-von={st.von}>{st.t}</mark>{:else}<span data-von={st.von}>{st.t}</span>{/if}{/each}</div>
                  <div class="t-knoepfe">
                    <button type="button" class="k klein leise" onclick={() => ganz(i, ti)}>{ganzMarkiert(f.schluessel, sp.name, text) ? L('Markierung aufheben', 'Remove mark') : L('Ganze Antwort markieren', 'Mark whole answer')}<span class="nur-vorleser"> ({f.kennung})</span></button>
                    {#if auswahl && auswahl.fall === f.schluessel && auswahl.spalte === sp.name}
                      <button type="button" class="k klein haupt" onmousedown={(ev) => ev.preventDefault()} onclick={() => markiereAuswahl(i)}>{L('Auswahl als Zitat markieren', 'Mark selection as quote')}<span class="nur-vorleser"> ({f.kennung})</span></button>
                    {/if}
                  </div>
                  {#if marken.length}
                    <ul class="marken" aria-label={L(`Markierte Zitate von ${f.kennung}`, `Marked quotes of ${f.kennung}`)}>
                      {#each marken as m, mi (m.von)}<li><q>{kurz(m.text)}</q><button type="button" class="x" aria-label={L(`Markierung „${kurz(m.text)}“ entfernen`, `Remove the mark "${kurz(m.text)}"`)} onclick={() => entferne(i, ti, mi)}>×</button></li>{/each}
                    </ul>
                  {/if}
                {:else}<span class="leer" aria-hidden="true">-</span><span class="nur-vorleser">{L('keine Angabe', 'no answer')}</span>{/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .fall-bereich { margin-top: var(--a5); }
  h4 { margin: 0 0 var(--a2); font-size: var(--gr-h2); }
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0 0 var(--a3); max-width: var(--breite-text); }
  .hinweis { display: flex; gap: var(--a2); align-items: flex-start; padding: var(--a2) var(--a3); background: var(--blatt-2); border-radius: var(--r-klein); }
  .scroll { position: relative; overflow: auto; max-height: min(75vh, 60rem); border: 1px solid var(--linie); border-radius: var(--r-klein); max-width: 100%; }
  .scroll:focus-visible { outline: var(--fokus-outline); outline-offset: -3px; }
  table { border-collapse: collapse; width: 100%; font: 400 var(--gr-text)/1.45 var(--schrift-heft); }
  th, td { text-align: start; vertical-align: top; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); }
  thead th { position: sticky; top: 0; background: var(--blatt-2); font-weight: 600; white-space: nowrap; }
  thead th.t-kopf { white-space: normal; }
  .sort { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: var(--a1); font-weight: 600; color: var(--tinte); border-radius: var(--r-klein); padding: 0 var(--a1); }
  .sort:hover { color: var(--akzent-druck); }
  .sort:focus-visible { box-shadow: var(--fokus-ring); }
  .sort :global(svg) { width: 14px; height: 14px; opacity: .7; }
  th.kennung { font-weight: 600; white-space: nowrap; background: var(--blatt); }
  .g-zelle { min-width: 14rem; max-width: 20rem; }
  .gruppenwahl { position: relative; display: flex; gap: var(--a2); align-items: flex-start; cursor: pointer; border-radius: var(--r-klein); padding: var(--a1) var(--a2); border: 1px dashed var(--linie-stark); }
  .gruppenwahl:hover { background: var(--akzent-hell); }
  .gruppenwahl:focus-within { box-shadow: var(--fokus-ring); }
  .g-punkt { flex: none; width: .7rem; height: .7rem; margin-top: .4rem; border-radius: 50%; background: var(--gf); }
  .g-name { flex: 1; overflow-wrap: anywhere; }
  .gruppenwahl :global(svg) { flex: none; width: 14px; height: 14px; margin-top: .3rem; }
  .g-select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
  .q-zelle { white-space: nowrap; }
  .q-zelle.zahl { text-align: right; font-variant-numeric: tabular-nums; }
  .t-zelle { min-width: 18rem; max-width: 32rem; }
  .t-text { white-space: pre-wrap; overflow-wrap: anywhere; }
  mark { background: var(--akzent-hell); color: var(--tinte); border-bottom: 2px solid var(--akzent); border-radius: 2px; }
  .t-knoepfe { display: flex; gap: var(--a2); flex-wrap: wrap; margin-top: var(--a2); }
  .t-knoepfe :global(.k) { white-space: normal; }
  .marken { list-style: none; margin: var(--a2) 0 0; padding: 0; display: flex; gap: var(--a1); flex-wrap: wrap; }
  .marken li { display: inline-flex; align-items: center; gap: var(--a1); padding: 0 var(--a2); background: var(--akzent-hell); border-radius: var(--r-rund); font-size: var(--gr-klein); }
  .marken q { quotes: "„" "“"; }
  .x { all: unset; cursor: pointer; padding: 0 var(--a1); font-size: 1.1rem; line-height: 1; color: var(--akzent-tinte); border-radius: var(--r-klein); }
  .x:focus-visible { box-shadow: var(--fokus-ring); }
  .leer { color: var(--tinte-2); }
</style>
