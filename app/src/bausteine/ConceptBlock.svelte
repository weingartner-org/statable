<script lang="ts">
  /**
   * B3 Teil 4b: „Welche Aussagen gehören zusammen? (Concept Mapping)“ unter der Skalen-Auswertung.
   * Zeilen = Personen (je Zeile das Sortieren einer Person), Spalten = Aussagen (Zahl = Nummer des Stapels). Zahl der Gruppen legt die Person fest.
   * Rechnet sofort im Browser (lib/conceptmap.ts, Kern; lib/conceptblock.ts, Daten und R-Skript). Beschreibend, ohne Deutung; Gruppen benennt die Person.
   * Noch nicht in 4b: Sortieren am Bildschirm und Bewertungen (4b-2). Fachblatt docs/ausbau/FACHBLATT-B3-TEXTANALYSE.md, Teil 4.
   */
  import HilfeLink from './HilfeLink.svelte';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { bildtext } from '../lib/bildtext';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import { csvZelle } from '../lib/protokoll';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { conceptRechne, type ConceptErgebnis } from '../lib/conceptmap';
  import { baueCmSkript, cmDaten, CM_MAX_SPALTEN, CM_MIN_PERSONEN, CM_MIN_SPALTEN, type CmDatenFehler } from '../lib/conceptblock';

  let { spalten }: { spalten: string[] } = $props();
  const kennung = $props.id();
  const nm = (n: string) => s.spalten.find(c => c.name === n)?.bezeichnung.trim() || n;
  const passt = $derived(spalten.length >= CM_MIN_SPALTEN && spalten.length <= CM_MAX_SPALTEN && spalten.every(n => s.spalten.some(c => c.name === n && c.art === 'zahl')));

  let gruppen = $state<number | null>(3);
  const d = $derived(passt ? cmDaten(s.spalten, s.zeilen, spalten) : null);
  const fehlerD = $derived(d && 'fehler' in d ? d.fehler : null);
  const ok = $derived(d && !('fehler' in d) ? d : null);
  const kMax = $derived(Math.min(15, Math.floor(spalten.length / 2)));
  const kOk = $derived(typeof gruppen === 'number' && Number.isInteger(gruppen) && gruppen >= 2 && gruppen <= kMax);
  const erg = $derived(ok && kOk ? conceptRechne(ok.sorts, gruppen!) : null);
  const e = $derived(erg && !('fehler' in erg && erg.fehler) ? (erg as ConceptErgebnis) : null);
  const fehlerR = $derived(erg && 'fehler' in erg && erg.fehler ? erg.fehler : null);
  const z = (v: number, n = 2) => (Number.isFinite(v) ? komma(v, n) : '-');
  const FORM = ['kreis', 'quadrat', 'dreieck', 'raute'] as const;

  const fehlerText = (f: CmDatenFehler['fehler']) => f === 'zu-wenig-personen' ? L(`Es braucht mindestens ${CM_MIN_PERSONEN} Personen (Zeilen) mit vollständigem Sortieren.`, `At least ${CM_MIN_PERSONEN} people (rows) with a complete sorting are needed.`)
    : L(`Wählen Sie ${CM_MIN_SPALTEN} bis ${CM_MAX_SPALTEN} Aussagen (Spalten).`, `Choose ${CM_MIN_SPALTEN} to ${CM_MAX_SPALTEN} statements (columns).`);

  const W = 560, H = 380, R = 28;
  const ber = $derived.by(() => {
    if (!e) return null;
    const xs = e.koord.map(r => r[0]!), ys = e.koord.map(r => r[1]!);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const bx = x1 - x0 || 1, by = y1 - y0 || 1;
    return { xp: (v: number) => R + ((v - x0) / bx) * (W - 2 * R), yp: (v: number) => H - R - ((v - y0) / by) * (H - 2 * R) };
  });
  const groessen = $derived(e ? Array.from({ length: gruppen! }, (_, g) => e.gruppe.filter(x => x === g + 1).length) : []);

  const bt = $derived(e ? bildtext('sonstiges', {
    artName: L('Karte der Aussagen', 'Map of the statements'),
    saetze: [L(`Streudiagramm: jeder Punkt ist eine Aussage (${e.aussagen} Aussagen, ${gruppen} Gruppen, Gruppengrößen ${groessen.join(', ')}). Nahe Punkte wurden von vielen Personen zusammengelegt. Jede Gruppe hat eine eigene Form.`, `Scatter plot: each point is a statement (${e.aussagen} statements, ${gruppen} groups, group sizes ${groessen.join(', ')}). Close points were put together by many people. Each group has its own shape.`)],
    tabelle: { kopf: [L('Aussage', 'Statement'), L('Gruppe', 'Group')], zeilen: e.gruppe.map((g, a) => [String(a + 1), String(g)]) }
  }) : null);

  function csv() {
    if (!e) return;
    const kopf = [L('Aussage', 'Statement'), L('Gruppe', 'Group'), L('Karte waagerecht', 'Map horizontal'), L('Karte senkrecht', 'Map vertical')];
    const t = '﻿' + [kopf, ...e.gruppe.map((g, a) => [nm(spalten[a]!), g, e.koord[a]![0]!, e.koord[a]![1]!])]
      .map(r => r.map(csvZelle).join(';')).join('\r\n') + '\r\n';
    herunterladen(new TextEncoder().encode(t), 'concept-mapping-gruppen.csv', 'text/csv;charset=utf-8');
    melde(L('Tabelle als CSV gespeichert.', 'Table saved as CSV.'));
  }
  function rSkript() {
    if (!e) return;
    try {
      const sk = baueCmSkript({ spalten: s.spalten, zeilen: s.zeilen, benutzt: [...spalten], gruppen: gruppen!, titel: L('Concept Mapping', 'Concept mapping'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if passt}
  <details class="auf cmap" style="margin-top:var(--a4)"><summary>{L('Welche Aussagen gehören zusammen? (Concept Mapping, Karte aus Sortierungen)', 'Which statements belong together? (concept mapping, map from sortings)')}</summary>
    <p class="heft-text">{L('Beim Concept Mapping legt jede Person die Aussagen auf Stapel nach Ähnlichkeit. Jede Zeile ist das Sortieren einer Person, jede Spalte eine Aussage, die Zahl ist die Nummer des Stapels. Aussagen, die viele Personen zusammenlegen, liegen auf der Karte nah beieinander. Statable bildet daraus Gruppen (Ward-Verfahren). Wie viele Gruppen Sie betrachten, legen Sie selbst fest; was eine Gruppe inhaltlich bedeutet und wie sie heißt, entscheiden Sie, nicht Statable.', 'In concept mapping each person puts the statements onto piles by similarity. Each row is one person\'s sorting, each column a statement, the number is the pile. Statements that many people put together lie close together on the map. Statable forms groups from this (Ward method). How many groups you look at is for you to decide; what a group means and what it is called is for you to decide, not Statable.')}</p>
    <p class="hilfe"><HilfeLink id="concept-mapping" text={L('Hilfe: Concept Mapping', 'Help: concept mapping')} /></p>
    <div class="eingabe" style="max-width:240px"><label for="cm-k-{kennung}">{L(`Zahl der Gruppen (2 bis ${kMax})`, `Number of groups (2 to ${kMax})`)}</label><input id="cm-k-{kennung}" type="number" min="2" max={kMax} step="1" inputmode="numeric" bind:value={gruppen} /></div>
    {#if fehlerD}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(fehlerD)}</p>
    {:else if ok && !kOk}<p class="heft-text" style="color:var(--fehler, #b3261e)">{L(`Die Zahl der Gruppen muss eine ganze Zahl von 2 bis ${kMax} sein.`, `The number of groups must be a whole number from 2 to ${kMax}.`)}</p>
    {:else if fehlerR}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerR === 'alle-gleich' ? L('Alle Personen haben alle Aussagen auf denselben Stapel gelegt; daraus lässt sich keine Karte bilden.', 'All people put all statements on the same pile; no map can be formed.') : fehlerR === 'abstaende' ? L('Aus diesen Sortierungen ließ sich keine Karte berechnen.', 'No map could be calculated from these sortings.') : L('Die Daten reichen nicht für eine Karte.', 'The data are not enough for a map.')}</p>
    {:else if e && ok && ber}
      <p class="heft-text">{L(`${e.personen} Personen, ${e.aussagen} Aussagen, ${gruppen} Gruppen${ok.weg ? ` (${ok.weg} Zeilen mit Lücken bleiben außen vor)` : ''}. Die beiden Achsen der Karte geben ${z(e.gof1 * 100, 0)} Prozent der Unterschiede zwischen den Aussagen wieder (Hinweis: Statable nutzt die klassische, nicht die nichtmetrische Skalierung; das Bild ist ähnlich, aber nicht gleich wie in anderer Software). Gruppengrößen: ${groessen.map((n, g) => `${g + 1}: ${n}`).join(', ')}.`, `${e.personen} people, ${e.aussagen} statements, ${gruppen} groups${ok.weg ? ` (${ok.weg} rows with gaps are left out)` : ''}. The two axes of the map reproduce ${z(e.gof1 * 100, 0)} percent of the differences between the statements (note: Statable uses classical, not non-metric scaling; the picture is similar but not identical to other software). Group sizes: ${groessen.map((n, g) => `${g + 1}: ${n}`).join(', ')}.`)}</p>
      <figure class="ll-bild">
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz} style="max-width:{W}px">
          <rect x="1" y="1" width={W - 2} height={H - 2} fill="none" stroke="var(--dg-gitter)" stroke-width="1" />
          {#each e.koord as r, a (a)}{@const x = ber.xp(r[0]!)}{@const y = ber.yp(r[1]!)}{@const g = e.gruppe[a]! - 1}{@const f = FORM[g % FORM.length]}{@const farbe = g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'}
            {#if f === 'kreis'}<circle cx={x} cy={y} r="8" fill="var(--papier, #fff)" stroke={farbe} stroke-width="2" />
            {:else if f === 'quadrat'}<rect x={x - 7} y={y - 7} width="14" height="14" fill="var(--papier, #fff)" stroke={farbe} stroke-width="2" />
            {:else if f === 'dreieck'}<polygon points="{x},{y - 9} {x + 8.5},{y + 7} {x - 8.5},{y + 7}" fill="var(--papier, #fff)" stroke={farbe} stroke-width="2" />
            {:else}<polygon points="{x},{y - 9} {x + 9},{y} {x},{y + 9} {x - 9},{y}" fill="var(--papier, #fff)" stroke={farbe} stroke-width="2" />{/if}
            <text x={x} y={y + 3.5} text-anchor="middle" class="klein" style="font-weight:700" fill="var(--tinte)">{a + 1}</text>
          {/each}
        </svg>
        <figcaption>{L('Jeder Punkt ist eine Aussage (Nummer = Reihenfolge der Spalten). Nahe Punkte wurden oft zusammengelegt. Form und Linienart (Kreis, Quadrat, Dreieck, Raute, dann wieder von vorn) unterscheiden die Gruppen; die Zahlen der Gruppen stehen in der Tabelle.', 'Each point is a statement (number = order of the columns). Close points were often put together. Shape tells the groups apart (circle, square, triangle, diamond, then again from the start); the group numbers are in the table.')}</figcaption>
      </figure>
      {#if bt}<BildBeschreibung {...bt} />{/if}
      <div style="overflow-x:auto" role="region" tabindex="0" aria-label={L('Tabelle der Aussagen und Gruppen', 'Table of statements and groups')}><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Aussagen, Gruppe und Lage auf der Karte', 'Statements, group and position on the map')}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Aussage', 'Statement')}</th><th scope="col">{L('Gruppe', 'Group')}</th><th scope="col">{L('Karte waagerecht', 'Map horizontal')}</th><th scope="col">{L('Karte senkrecht', 'Map vertical')}</th></tr></thead>
        <tbody>{#each e.gruppe as g, a (a)}<tr><th scope="row" style="text-align: start">{a + 1}. {nm(spalten[a]!)}</th><td style="text-align:end">{g}</td><td style="text-align:end">{z(e.koord[a]![0]!)}</td><td style="text-align:end">{z(e.koord[a]![1]!)}</td></tr>{/each}</tbody>
      </table></div>
      <div class="knopfzeile"><button class="k" type="button" onclick={csv}>{L('Als CSV speichern', 'Save as CSV')}</button><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Statable zeigt Zahlen, es deutet nichts. Die Gruppen sind ein Vorschlag aus den Sortierungen; prüfen Sie, ob sie inhaltlich Sinn ergeben, und benennen Sie sie selbst.', 'Statable shows numbers; it interprets nothing. The groups are a suggestion from the sortings; check whether they make sense in terms of content, and name them yourself.')}</p>
    {/if}
  </details>
{/if}
