<script lang="ts">
  import { untrack } from 'svelte';
  import { ganzZahl } from '../i18n/profil';
  import type { OutputItem } from '../engine/types';
  import { s, L, d, melde, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { clusterGewaehlt, clusterSpaltenBefehl, K_MIN, type ClusterE } from '../lib/clusterblatt';
  import { clusterBerechnen, clusterMitK } from '../lib/clusterlauf';
  import { clusterSpalte, clusterWerteLabels, clusterSpaltenName, clusterGespeichertSatz } from '../lib/cluster';
  import { gueltigerName } from '../lib/skalabau';
  import { wendeAn } from '../lib/datenassistentlauf';
  import { Laedt } from '../lib/laedt.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import Ellbogenbild from './Ellbogenbild.svelte';
  import Dendrogramm from './Dendrogramm.svelte';
  import Clusterprofil from './Clusterprofil.svelte';
  import Ausgabe from './Ausgabe.svelte';
  import RStart from './RStart.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * Das Ergebnis der Cluster-Karte am Blatt (Später S-E, S2): Zahl der Gruppen (Ellbogen und Silhouette, k wählt die Person), Dendrogramm (Ward), Profile, Tabellen, Wege (Verfahren, Standardisierung, Startwert)
   * und - nur auf Wunsch - die Zugehörigkeit als neue Spalte. Eine andere Zahl der Gruppen rechnet sich aus den vorhandenen Lösungen; ein anderes Verfahren oder ein anderer Startwert rechnet in R neu.
   * Keine p-Werte zu den Unterschieden zwischen den Gruppen.
   */
  let { blatt, e, name, tabellen }: { blatt: Blatt; e: ClusterE; name: (n: string) => string; tabellen: OutputItem[] } = $props();
  const ID = 'cl';
  const r = $derived(clusterGewaehlt(e));
  const kMax = $derived(Math.max(...e.ks.map(x => x.k), K_MIN));
  const namen = $derived(e.gerechnet.map(name));
  let rechnet = $state(false), fehler = $state('');
  // Wahlen, die ein Neurechnen in R brauchen (erst mit „Neu rechnen“)
  let verfahren = $state<'ward' | 'kmeans'>(untrack(() => e.verfahren)), standardisiert = $state(untrack(() => e.standardisiert)), startwertText = $state(String(untrack(() => e.startwert)));
  const startwert = $derived(Number(startwertText));
  const startwertGueltig = $derived(Number.isInteger(startwert) && startwert >= 1 && startwert <= 2147483647);
  const geaendert = $derived(verfahren !== e.verfahren || standardisiert !== e.standardisiert || (verfahren === 'kmeans' && startwertGueltig && startwert !== e.startwert));
  let beschriftungsSpalte = $state('');
  const beschrifte = (fall: number): string => {
    const zeile = e.zeilen[fall];
    if (zeile === undefined) return String(fall + 1);
    if (!beschriftungsSpalte) return String(zeile);
    const i = s.spalten.findIndex(x => x.name === beschriftungsSpalte), v = i >= 0 ? s.zeilen[zeile - 1]?.[i] : undefined;
    const t = v === null || v === undefined || v === '' ? String(zeile) : String(v);
    return t.length > 16 ? t.slice(0, 15) + '…' : t;
  };

  function speichere(neu: ClusterE) { blatt.ergebnis = { typ: 'cluster', e: neu }; void sichern(); }
  function wechsleK(text: string) {
    const k = Number(text);
    if (!Number.isInteger(k) || !e.ks.some(x => x.k === k)) { melde(L(`Die Zahl der Gruppen liegt zwischen ${K_MIN} und ${kMax}.`, `The number of groups is between ${K_MIN} and ${kMax}.`)); return false; }
    speichere(clusterMitK(e, k));
    return true;
  }
  async function neuRechnen() {
    if (rechnet) return;
    if (verfahren === 'kmeans' && !startwertGueltig) { melde(L(`Der Startwert ist eine ganze Zahl von 1 bis ${ganzZahl(2147483647)}.`, `The seed is a whole number from 1 to ${ganzZahl(2147483647)}.`)); return; }
    rechnet = true; fehler = '';
    try {
      const neu = await clusterBerechnen(e.merkmale, { verfahren, standardisiert, startwert: verfahren === 'kmeans' && startwertGueltig ? startwert : e.startwert, k: e.k });
      speichere(neu);
      melde(L('Neu gerechnet.', 'Recalculated.'));
    } catch (x) { fehler = (x as Error).message; }
    finally { rechnet = false; }
  }

  /* ---------- Zugehörigkeit als neue Spalte ---------- */
  const vorhanden = $derived(s.spalten.map(x => x.name));
  let speicherName = $state(untrack(() => clusterSpaltenName(s.spalten.map(x => x.name))));
  const nameSchlecht = $derived(!gueltigerName(speicherName) ? L('Der Name ist kein gültiger Spaltenname (Buchstaben, Ziffern, Punkt, Unterstrich; kein Leerzeichen).', 'The name is not a valid column name (letters, digits, dot, underscore; no space).')
    : vorhanden.some(v => v.toUpperCase() === speicherName.toUpperCase()) ? L('Diesen Namen gibt es schon. Statable überschreibt nie.', 'This name already exists. Statable never overwrites.') : '');
  const spalte = $derived(r ? clusterSpalte(e.zeilen, r.zuordnung, e.zeilenGesamt) : []);
  const labels = $derived(r ? clusterWerteLabels(r.zuordnung) : {});
  const beschriftung = $derived(e.verfahren === 'ward' ? L(`Cluster (Ward, k = ${e.k})`, `Cluster (Ward, k = ${e.k})`) : L(`Cluster (k-Means, k = ${e.k})`, `Cluster (k-means, k = ${e.k})`));
  const befehl = $derived(!nameSchlecht && r ? clusterSpaltenBefehl(speicherName, spalte, labels, beschriftung) : '');
  const lad = new Laedt();
  async function speichern() {
    if (!befehl || lad.sichtbar) return;
    const ok = await lad.mit(() => wendeAn(L(`${speicherName} gespeichert (Cluster-Zugehörigkeit)`, `${speicherName} saved (cluster membership)`), befehl));
    if (ok) speichere({ ...e, gespeichert: { spalte: speicherName, k: e.k } });
  }
  const vorschau = $derived(e.zeilen.slice(0, 6).map((z, i) => ({ zeile: z, gruppe: r?.zuordnung[i] })));
</script>

{#if r}
  <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a2) 0">{L('Wie viele Gruppen?', 'How many groups?')}</h3>
  <DiagrammExport titel={`${L('Zahl der Gruppen', 'Number of groups')}: ${namen.slice(0, 3).join(', ')}`}><Ellbogenbild ks={e.ks} tss={e.tss} k={e.k} vorschlag={e.vorschlag} /></DiagrammExport>
  <div class="korr-wahl" style="margin-top:var(--a3)">
    <div class="eingabe" style="max-width:260px"><label for="{ID}-k">{L('Zahl der Gruppen (k)', 'Number of groups (k)')}</label>
      <input id="{ID}-k" type="number" min={K_MIN} max={kMax} step="1" value={e.k} aria-describedby="{ID}-k-h" onchange={(ev) => { if (!wechsleK(ev.currentTarget.value)) ev.currentTarget.value = String(e.k); }}>
      <p id="{ID}-k-h" class="hilfe">{#if e.vorschlag !== null}{L(`Die größte mittlere Silhouette hat k = ${e.vorschlag}. Das ist ein Hinweis, kein Gesetz: Die Zahl der Gruppen ist eine fachliche Entscheidung.`, `The largest mean silhouette is at k = ${e.vorschlag}. This is a hint, not a law: the number of groups is a decision of the subject.`)}{:else if e.ks.some(x => x.silhouette !== null)}{L('Bei jeder Zahl der Gruppen steht mindestens eine sehr kleine Gruppe (vermutlich Ausreißer); einen Hinweis auf k gibt Statable dann nicht. Der Ellbogen und die Fachfrage helfen bei der Wahl.', 'For every number of groups at least one very small group exists (probably outliers); Statable then gives no hint for k. The elbow and the subject question help with the choice.')}{:else}{L('Für diese Fallzahl wird keine Silhouette gerechnet; der Ellbogen und die Fachfrage helfen bei der Wahl.', 'No silhouette is calculated for this number of cases; the elbow and the subject question help with the choice.')}{/if}</p></div>
    {#if r.rueckfall}<p class="heft-text" style="margin-top:var(--a2)">{L('Bei mindestens einem Start brach das Standardverfahren (Hartigan-Wong) ab; dieser Start wurde mit Lloyd gerechnet.', 'At least one start of the standard algorithm (Hartigan-Wong) aborted; this start was calculated with Lloyd.')}</p>{/if}
  </div>

  {#if e.verfahren === 'ward' && e.ward}
    <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Wie sich die Fälle zusammenlegen', 'How the cases join together')}</h3>
    <DiagrammExport titel={`${L('Dendrogramm', 'Dendrogram')}: ${namen.slice(0, 3).join(', ')}`} klasse="dgx-scroll"><Dendrogramm mergeA={e.ward.mergeA} mergeB={e.ward.mergeB} hoehe={e.ward.hoehe} n={e.n} k={e.k} beschriftung={beschrifte} /></DiagrammExport>
    {#if e.n <= 60}
      <div class="eingabe" style="max-width:340px;margin-top:var(--a2)"><label for="{ID}-label">{L('Fälle beschriften mit', 'Label the cases with')}</label>
        <select id="{ID}-label" bind:value={beschriftungsSpalte} aria-describedby="{ID}-label-h"><option value="">{L('Zeilennummer', 'Row number')}</option>{#each s.spalten as c (c.name)}<option value={c.name}>{c.name}</option>{/each}</select>
        <p id="{ID}-label-h" class="hilfe">{L('Die Beschriftung dient nur der Anzeige.', 'The label is for display only.')}</p></div>
    {:else}<p class="hilfe" style="margin-top:var(--a2)">{L('Gestutzt: Das Bild zeigt die obersten 30 Verschmelzungen; die Blätter sind Gruppen mit ihrer Größe.', 'Truncated: the chart shows the top 30 merges; the leaves are groups with their size.')}</p>{/if}
  {/if}

  <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Wie sich die Gruppen unterscheiden', 'How the groups differ')}</h3>
  <DiagrammExport titel={`${L('Profile', 'Profiles')}: ${namen.slice(0, 3).join(', ')}`}><Clusterprofil p={e.profil} merkmale={namen} /></DiagrammExport>
{/if}

<Ausgabe items={tabellen} nurTabellen />

<details class="auf" style="margin-top:var(--a4)"><summary>{L('Weitere Wege: Verfahren, Standardisierung, Startwert', 'More options: method, standardization, seed')}</summary>
  <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Verfahren', 'Method')}</legend>
    <div class="segment" role="radiogroup">{#each [['ward', L('Ward (Dendrogramm)', 'Ward (dendrogram)')], ['kmeans', 'k-Means']] as [w, tx]}<label data-begriff={w === 'ward' ? 'hierarchisches-clustern' : 'k-means'}><input type="radio" name="{ID}-verfahren" value={w} bind:group={verfahren}>{tx}</label>{/each}</div>
    <p class="hilfe" style="margin-top:var(--a2)">{verfahren === 'ward' ? L('Ward legt Fälle schrittweise zusammen, immer die zwei, die die Streuung innerhalb der Gruppen am wenigsten erhöhen; bis 3 000 Fälle.', 'Ward joins cases step by step, always the two that raise the spread within the groups the least; up to 3,000 cases.')
      : L('k-Means sucht zu einer festen Zahl von Gruppen die Einteilung mit der kleinsten Streuung innerhalb der Gruppen, aus 25 Starts die beste. SPSS Quick Cluster rechnet ohne Zufallsstarts und kann ein schlechteres Ergebnis liefern.', 'k-means looks, for a fixed number of groups, for the division with the smallest spread within the groups, the best of 25 starts. SPSS Quick Cluster has no random starts and can give a worse result.')}</p></fieldset>
  <label data-begriff="standardisierung" class="schalter" style="margin-top:var(--a3)"><input type="checkbox" bind:checked={standardisiert}>{L('Merkmale z-standardisieren', 'Standardize the features (z)')}</label>
  <p class="hilfe">{L('Ohne Standardisierung bestimmt ein Merkmal mit großen Zahlen (zum Beispiel Stunden) die Gruppen allein. Das ist eine fachliche Entscheidung: Sinnvoll ist „aus“ nur, wenn alle Merkmale dieselbe Einheit haben (zum Beispiel alle 1 bis 5).', 'Without standardization a feature with large numbers (for example hours) alone determines the groups. This is a decision of the subject: "off" only makes sense if all features have the same unit (for example all 1 to 5).')}</p>
  {#if verfahren === 'kmeans'}
    <div class="eingabe" style="max-width:260px;margin-top:var(--a2)"><label for="{ID}-start">{L('Startwert für die Zufallsstarts', 'Seed for the random starts')}</label>
      <input id="{ID}-start" type="text" inputmode="numeric" autocomplete="off" bind:value={startwertText} aria-invalid={startwertGueltig ? undefined : 'true'} aria-describedby="{ID}-start-h">
      <p id="{ID}-start-h" class="hilfe">{L('Die Gruppen sind nach Größe nummeriert; bei einem anderen Startwert bleibt die Nummerierung gleich, wenn die Lösung gleich ist.', 'The groups are numbered by size; with a different seed the numbering stays the same if the solution is the same.')}</p></div>
  {/if}
  <RStart knopf={L('Mit diesen Wegen neu rechnen', 'Recalculate with these options')} los={neuRechnen} laeuft={rechnet} haupt={false} pakete={[]} gesperrt={!geaendert} />
  {#if !geaendert && !rechnet}<p class="hilfe">{d('Ändere einen der Wege, dann ist der Knopf frei.', 'Ändern Sie einen der Wege, dann ist der Knopf frei.', 'Change one of the options and the button becomes active.')}</p>{/if}
  {#if fehler}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehler}</p>{/if}
</details>

{#if r}
  <details class="auf" style="margin-top:var(--a3)"><summary>{L('Zugehörigkeit als neue Spalte speichern', 'Save the membership as a new column')}</summary>
    <p class="heft-text" style="margin:var(--a2) 0">{L(`Jede Zeile bekommt die Nummer ihrer Gruppe (1 = größte Gruppe), Zeilen mit fehlenden Werten bleiben leer. Statable legt eine neue Spalte an und überschreibt nie. ${clusterGespeichertSatz()}`, `Every row gets the number of its group (1 = largest group); rows with missing values stay empty. Statable creates a new column and never overwrites. ${clusterGespeichertSatz()}`)}</p>
    <div class="eingabe" style="max-width:320px"><label for="{ID}-name">{L('Name der neuen Spalte', 'Name of the new column')}</label>
      <input id="{ID}-name" type="text" autocomplete="off" spellcheck="false" bind:value={speicherName} aria-invalid={nameSchlecht ? 'true' : undefined} aria-describedby={nameSchlecht ? `${ID}-name-f` : undefined}>
      {#if nameSchlecht}<p id="{ID}-name-f" class="hilfe" role="alert">{nameSchlecht}</p>{/if}</div>
    <div style="overflow-x:auto"><table class="apa" style="margin-top:var(--a3)"><caption><b>{L('Vorschau', 'Preview')}</b><i>{L('Die ersten gerechneten Zeilen', 'The first calculated rows')}</i></caption>
      <thead><tr><th scope="col">{L('Zeile', 'Row')}</th><th scope="col">{speicherName}</th></tr></thead>
      <tbody>{#each vorschau as v (v.zeile)}<tr><th scope="row">{v.zeile}</th><td>{v.gruppe ?? '-'}</td></tr>{/each}</tbody></table></div>
    <div class="knopfzeile" style="margin-top:var(--a3)">
      <button class="k haupt" type="button" disabled={lad.sichtbar} aria-disabled={befehl ? undefined : 'true'} onclick={speichern}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{L('Spalte speichern', 'Save column')}</button>
    </div>
    {#if e.gespeichert}<p class="heft-text" role="status" style="margin-top:var(--a2)">{L(`Gespeichert in der Spalte „${e.gespeichert.spalte}“ (k = ${e.gespeichert.k}). ${clusterGespeichertSatz()}`, `Saved in the column "${e.gespeichert.spalte}" (k = ${e.gespeichert.k}). ${clusterGespeichertSatz()}`)}</p>{/if}
  </details>
{/if}
<p class="hilfe" style="margin-top:var(--a3)"><HilfeLink id="frage-cluster" text={L('Hilfe: Clusteranalyse lesen und berichten', 'Help: reading and reporting a cluster analysis')} /></p>
