<script lang="ts">
  /**
   * Code-Landkarte (Stufe 6c, Fachblatt 3.5): „Welche Codes kommen in denselben Dokumenten vor?“ Jaccard-Abstand über Dokumente (`codeAbstaende`),
   * klassische mehrdimensionale Skalierung (`mds`, lib/mds.ts). Rechnet erst auf Klick (Lade-Animation). Bild mit Beschreibung und darunter die Tabelle der Abstände.
   * Die Zeichenlogik entspricht `MdsBlock.svelte` (dort nicht umgebaut). Lesehinweis immer sichtbar: Nähe heißt nicht, dass Themen zusammenhängen.
   */
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { bildtext } from '../lib/bildtext';
  import { baumReihenfolge } from '../lib/kodieren';
  import { codeAbstaende, mittlereVerknuepfung } from '../lib/kodieren-ansichten';
  import { mds, type MdsErgebnis, type MdsFehler } from '../lib/mds';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { komma } from '../lib/ergebnis';
  import { zahlDe } from '../lib/format';
  import { planeBeschriftung } from '../lib/beschriftung';
  import type { Personen } from '../lib/qualauswertung';
  import type { QualProjekt } from '../lib/qualprojekt';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import YTitel from './YTitel.svelte';
  import Rechnet from './Rechnet.svelte';

  let { q, personen }: { q: QualProjekt; personen: Personen } = $props();

  const lade = new Laedt();
  let mass = $state<'jaccard' | 'sm'>('jaccard');
  let einheit = $state<'dokumente' | 'faelle'>('dokumente');
  interface Erg { codes: string[]; D: number[][]; ohne: string[]; bild: MdsErgebnis | MdsFehler; mass: 'jaccard' | 'sm'; einheit: 'dokumente' | 'faelle'; einheiten: number }
  let erg = $state<Erg | null>(null);
  $effect(() => { void q.kodierungen; void q.codes; void q.segmente; void personen; void mass; void einheit; erg = null; });

  const nameVon = (id: string): string => q.codes.find(c => c.id === id)?.name ?? id;
  const bild = $derived(erg && !('fehler' in erg.bild) ? erg.bild : null);
  const massName = (m: 'jaccard' | 'sm', e: 'dokumente' | 'faelle') => `${m === 'sm' ? L('Simple Matching', 'simple matching') : 'Jaccard'}, ${e === 'faelle' ? L('Einheit Fälle', 'unit cases') : L('Einheit Dokumente', 'unit documents')}`;
  const verbindungen = $derived(erg && erg.codes.length >= 2 ? mittlereVerknuepfung(erg.D) : []);
  const gruppeText = (idx: number[]): string => idx.map(i => nameVon(erg!.codes[i]!)).join(', ');
  const pr = (v: number) => `${komma(v * 100, 1)} %`;

  async function zeichnen() {
    await lade.mit(async () => {
      await tick();
      const a = codeAbstaende(q, { codes: baumReihenfolge(q.codes).map(e => e.code.id), kodierende: personen, mass, einheit });
      erg = { ...a, mass, einheit, bild: a.codes.length >= 3 ? mds(a.D, 2) : { fehler: 'zu-wenig-punkte' } };
    });
    await tick();
    const h = document.getElementById('ko-lk-erg-t'); h?.scrollIntoView({ block: 'nearest' }); h?.focus();
    sage(L('Code-Landkarte gezeichnet.', 'Code map drawn.'));
  }

  const W = 560, H0 = 420, M = 50;
  const geruest = $derived.by(() => {
    if (!bild || !erg) return null;
    const g = Math.max(...bild.koord.flatMap(p => p.map(Math.abs)), 0.05) * 1.3;
    const plan = planeBeschriftung(bild.koord.map((p, i) => ({ x: M + (W - 2 * M) * ((p[0]! + g) / (2 * g)) + 8, yAnteil: 1 - ((p[1] ?? 0) + g) / (2 * g), text: nameVon(erg!.codes[i]!) })), { flaeche: H0 - 2 * M, oben: M });
    return { g, plan, H: 2 * M + (H0 - 2 * M) * plan.faktor };
  });
  const H = $derived(geruest?.H ?? H0);
  const karte = $derived.by(() => {
    if (!geruest) return null;
    const g = geruest.g;
    return { g, plan: geruest.plan, X: (v: number) => M + (W - 2 * M) * ((v + g) / (2 * g)), Y: (v: number) => M + (H - 2 * M) * (1 - (v + g) / (2 * g)) };
  });
  const bt = $derived.by(() => {
    if (!bild || !erg) return null;
    const e = erg;
    return bildtext('sonstiges', {
      artName: L('Code-Landkarte (mehrdimensionale Skalierung)', 'Code map (multidimensional scaling)'),
      saetze: [L(`Codes, die oft in denselben Dokumenten vorkommen, liegen nahe beieinander. Die zwei Dimensionen geben ${pr(bild.gof1)} der Abstände wieder.`, `Codes that often occur in the same documents lie close together. The two dimensions reproduce ${pr(bild.gof1)} of the distances.`)],
      tabelle: { kopf: [L('Code', 'Code'), `${L('Dimension', 'Dimension')} 1`, `${L('Dimension', 'Dimension')} 2`], zeilen: bild.koord.map((p, i) => [nameVon(e.codes[i]!), zahlDe(p[0] ?? 0, 2), zahlDe(p[1] ?? 0, 2)]) },
    });
  });
</script>

<div class="lk" role="group" aria-label={L('Code-Landkarte', 'Code map')}>
  <h3 id="ko-lk-t">{L('Code-Landkarte', 'Code map')}</h3>
  <p class="hilfe">{L('Codes, die oft in denselben Dokumenten vorkommen, liegen nahe beieinander. Nur die Lage zueinander zählt, die Achsen bedeuten nichts. Gemeinsames Vorkommen heißt nicht, dass die Themen zusammenhängen.', 'Codes that often occur in the same documents lie close together. Only the position relative to each other counts, the axes mean nothing. Occurring together does not mean that the topics are related.')}</p>
  <div class="wahlzeile">
    <div class="feld">
      <label for="ko-lk-mass">{L('Abstand', 'Distance')}</label>
      <select id="ko-lk-mass" bind:value={mass}>
        <option value="jaccard">{L('Jaccard: nur gemeinsames Vorkommen zählt', 'Jaccard: only occurring together counts')}</option>
        <option value="sm">{L('Simple Matching: auch gemeinsames Fehlen zählt (bei 0/1 gleich Gower)', 'Simple matching: also being absent together counts (for 0/1 the same as Gower)')}</option>
      </select>
    </div>
    <div class="feld">
      <label for="ko-lk-einheit">{L('Einheit', 'Unit')}</label>
      <select id="ko-lk-einheit" bind:value={einheit}>
        <option value="dokumente">{L('Dokumente', 'Documents')}</option>
        <option value="faelle">{L('Fälle', 'Cases')}</option>
      </select>
    </div>
  </div>
  <div class="knopfzeile"><button class="k haupt" id="ko-lk-zeichnen" type="button" disabled={!q.kodierungen.length} aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void zeichnen(); }}>{erg ? L('Landkarte neu zeichnen', 'Redraw the map') : L('Landkarte zeichnen', 'Draw the map')}</button></div>
  {#if !q.kodierungen.length}<p class="hilfe">{L('Für die Landkarte braucht es Kodierungen.', 'The map needs codings.')}</p>{/if}
  {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Landkarte wird berechnet …', 'Calculating the map …')} /></p>{/if}

  {#if erg}
    <h4 id="ko-lk-erg-t" tabindex="-1">{L('Ergebnis der Landkarte', 'Result of the map')}</h4>
    {#if erg.ohne.length}
      <p class="hilfe" data-nolink>{L(`Ohne Beleg und darum nicht im Bild: ${erg.ohne.map(nameVon).join(', ')}.`, `Without passages and therefore not in the picture: ${erg.ohne.map(nameVon).join(', ')}.`)}</p>
    {/if}
    {#if erg.codes.length < 3}
      <p>{L('Für ein Bild braucht es mindestens drei Codes mit Belegen. Mit weniger Codes gibt es nur die Tabelle der Abstände.', 'A picture needs at least three codes with passages. With fewer codes there is only the table of distances.')}</p>
    {:else if !bild}
      <p>{L('Die Abstände lassen sich nicht in ein Bild umrechnen.', 'The distances cannot be turned into a picture.')}</p>
    {:else if karte}
      <DiagrammExport titel={L('Code-Landkarte', 'Code map')}>
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz}>
          {#each achsenMarken(-karte.g, karte.g) as v}<line x1={karte.X(v)} x2={karte.X(v)} y1={M} y2={H - M} stroke="var(--dg-gitter)" /><line x1={M} x2={W - M} y1={karte.Y(v)} y2={karte.Y(v)} stroke="var(--dg-gitter)" /><text x={karte.X(v)} y={H - M + 16} text-anchor="middle" class="klein">{zahlDe(v)}</text><text x={M - 8} y={karte.Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
          {#each bild.koord as p, i (i)}<circle cx={karte.X(p[0]!)} cy={karte.Y(p[1] ?? 0)} r="5" fill="var(--dg-a)"><title>{nameVon(erg.codes[i]!)}</title></circle>{#if karte.plan.zeigen[i]}<text x={karte.X(p[0]!) + 8} y={karte.Y(p[1] ?? 0) + 4} class="klein" fill="var(--dg-a)">{nameVon(erg.codes[i]!)}</text>{/if}{/each}
          <text x={W / 2} y={H - 8} text-anchor="middle" class="klein">{L('Dimension', 'Dimension')} 1</text>
          <YTitel x={14} y={H / 2} laenge={H - 2 * M} text={L('Dimension', 'Dimension') + ' 2'} px={13} klasse="klein" />
        </svg>
      </DiagrammExport>
      {#if bt}<BildBeschreibung {...bt} />{/if}
      {#if karte.plan.gekuerzt}<p class="hilfe">{L('Zu viele Codes für Namen im Bild: Der Name steht beim Zeigen auf den Punkt.', 'Too many codes for names in the picture: the name appears when you point at the dot.')}</p>{/if}
      <p class="hilfe">{L(`Das Bild gibt ${pr(bild.gof1)} der Abstände wieder (GOF).`, `The picture reproduces ${pr(bild.gof1)} of the distances (GOF).`)}</p>
    {/if}
    {#if erg.codes.length}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="rahmen" role="region" tabindex="0" aria-label={L('Abstände der Codes, seitlich scrollbar', 'Distances of the codes, scrollable sideways')}>
        <table class="tab">
          <caption>{erg.mass === 'sm' ? L(`Abstände zwischen den Codes (${massName(erg.mass, erg.einheit)}; 0 = immer zusammen, höher = seltener zusammen)`, `Distances between the codes (${massName(erg.mass, erg.einheit)}; 0 = always together, higher = less often together)`) : L(`Abstände zwischen den Codes (${massName(erg.mass, erg.einheit)}; 0 = immer zusammen, 1 = nie zusammen)`, `Distances between the codes (${massName(erg.mass, erg.einheit)}; 0 = always together, 1 = never together)`)}</caption>
          <thead><tr><th scope="col">{L('Code', 'Code')}</th>{#each erg.codes as c (c)}<th scope="col" data-nolink>{nameVon(c)}</th>{/each}</tr></thead>
          <tbody>{#each erg.D as zeile, i (erg.codes[i])}<tr><th scope="row" data-nolink>{nameVon(erg.codes[i]!)}</th>{#each zeile as v, j (j)}<td>{zahlDe(v, 2)}</td>{/each}</tr>{/each}</tbody>
        </table>
      </div>
    {/if}
    {#if verbindungen.length}
      <h5 id="ko-lk-clu-t">{L('Gruppen von Codes (hierarchische Clusteranalyse, mittlere Verknüpfung)', 'Groups of codes (hierarchical cluster analysis, average linkage)')}</h5>
      <p class="hilfe">{L('Nur eine Rechnung: Codes, die oft zusammen vorkommen, landen früh in einer Gruppe. Das heißt nicht, dass sie inhaltlich zusammengehören; Gruppen bilden Sie selbst.', 'Just a calculation: codes that often occur together end up in a group early. That does not mean they belong together in content; you form groups yourself.')}</p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="rahmen" role="region" tabindex="0" aria-label={L('Gruppen von Codes, seitlich scrollbar', 'Groups of codes, scrollable sideways')}>
        <table class="tab" id="ko-lk-clu">
          <caption>{L(`Gruppen von Codes (hierarchische Clusteranalyse, mittlere Verknüpfung; ${massName(erg.mass, erg.einheit)})`, `Groups of codes (hierarchical cluster analysis, average linkage; ${massName(erg.mass, erg.einheit)})`)}</caption>
          <thead><tr><th scope="col">{L('Schritt', 'Step')}</th><th scope="col">{L('verbunden', 'joined')}</th><th scope="col">{L('mit', 'with')}</th><th scope="col">{L('Abstand', 'Distance')}</th></tr></thead>
          <tbody>{#each verbindungen as v, i (i)}<tr><th scope="row">{i + 1}</th><td data-nolink>{gruppeText(v.a)}</td><td data-nolink>{gruppeText(v.b)}</td><td>{zahlDe(v.hoehe, 2)}</td></tr>{/each}</tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<style>
  .lk { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  h5 { margin: var(--a2) 0 0; font: 650 var(--gr-klein)/1.3 var(--schrift-ui); }
  .wahlzeile { display: flex; flex-wrap: wrap; gap: var(--a3); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); min-width: 0; }
  .feld select { font: inherit; max-width: 100%; }
  h4 { margin: var(--a2) 0 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab caption { text-align: start; font-weight: 600; padding-bottom: var(--a1); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: middle; }
  .tab thead th { font-weight: 650; }
</style>
