<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /** Karte der Fragen (klassische mehrdimensionale Skalierung) unter der Skalen-Karte: Fragen, die stark zusammenhängen, liegen nahe beieinander. Rechnet im Browser (lib/mds.ts), erst auf Klick. */
  import HilfeLink from './HilfeLink.svelte';
  import YTitel from './YTitel.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma } from '../lib/ergebnis';
  import { mds, abstandAusKorrelation, type MdsErgebnis, type MdsFehler } from '../lib/mds';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { planeBeschriftung } from '../lib/beschriftung';

  let { fragen, name }: { fragen: string[]; name: (n: string) => string } = $props();
  let res = $state<MdsErgebnis | MdsFehler | null>(null);
  $effect(() => { void fragen.join('|'); res = null; });
  const daten = $derived.by(() => {
    const ix = fragen.map(n => s.spalten.findIndex(c => c.name === n));
    if (ix.some(i => i < 0)) return null;
    const cs = ix.map(i => s.spalten[i]!), zeilen: number[][] = [];
    for (const z of s.zeilen) { const r = ix.map(i => z[i]); if (r.some((v, k) => typeof v !== 'number' || istFehlend(cs[k]!, v as number))) continue; zeilen.push(r as number[]); }
    return zeilen;
  });
  const r = $derived(res && !('fehler' in res) ? res : null);
  const pr = (v: number) => `${komma(v * 100, 0)} %`;
  const W = 560, H0 = 420, M = 50;
  /* Überdecken sich Namen, wird das Bild höher; hilft das nicht, stehen keine Namen im Bild (Meldung 01.11.). */
  const geruest = $derived.by(() => {
    if (!r) return null;
    const g = Math.max(...r.koord.flatMap(p => p.map(Math.abs)), 0.05) * 1.3;
    const plan = planeBeschriftung(r.koord.map((p, i) => ({ x: M + (W - 2 * M) * ((p[0]! + g) / (2 * g)) + 8, yAnteil: 1 - ((p[1] ?? 0) + g) / (2 * g), text: name(fragen[i]!) })), { flaeche: H0 - 2 * M, oben: M });
    return { g, plan, H: 2 * M + (H0 - 2 * M) * plan.faktor };
  });
  const H = $derived(geruest?.H ?? H0);
  const karte = $derived.by(() => {
    if (!geruest) return null;
    const g = geruest.g;
    return { g, plan: geruest.plan, X: (v: number) => M + (W - 2 * M) * ((v + g) / (2 * g)), Y: (v: number) => M + (H - 2 * M) * (1 - (v + g) / (2 * g)) };
  });
  const zeichnen = () => { res = daten && daten.length >= 10 ? mds(abstandAusKorrelation(daten), 2) : { fehler: 'abstaende' }; };
  const bt = $derived.by(() => {
    if (!r) return null;
    return bildtext('sonstiges', { artName: L('Karte der Fragen (mehrdimensionale Skalierung)', 'Map of the questions (multidimensional scaling)'),
      saetze: [L(`Fragen mit starkem Zusammenhang liegen nahe beieinander. Die zwei Dimensionen geben ${pr(r.gof1)} der Abstände wieder.`, `Questions with a strong relation lie close together. The two dimensions reproduce ${pr(r.gof1)} of the distances.`)],
      tabelle: { kopf: [L('Frage', 'Question'), `${L('Dimension', 'Dimension')} 1`, `${L('Dimension', 'Dimension')} 2`], zeilen: r.koord.map((p, i) => [name(fragen[i]!), zahlDe(p[0] ?? 0, 2), zahlDe(p[1] ?? 0, 2)]) } });
  });
</script>

<details class="auf" style="margin-top:var(--a4)"><summary>{L('Karte der Fragen (mehrdimensionale Skalierung)', 'Map of the questions (multidimensional scaling)')}</summary>
  <p class="heft-text">{L('Die Karte legt die Fragen so auf eine Fläche, dass Fragen mit starkem Zusammenhang nahe beieinander liegen und Fragen ohne Zusammenhang weit auseinander. So werden Gruppen zusammengehöriger Fragen sichtbar, auch bevor eine Faktorenanalyse gerechnet wird. Der Abstand zweier Fragen ist √(2 (1 − r)) mit der Korrelation r.', 'The map places the questions on a plane so that questions with a strong relation lie close together and questions without a relation lie far apart. This makes groups of questions that belong together visible, even before a factor analysis is calculated. The distance between two questions is √(2 (1 − r)) with the correlation r.')}</p>
  <p class="hilfe"><HilfeLink id="karte-der-fragen-mds" text={L('Hilfe: Karte der Fragen', 'Help: map of the questions')} /></p>
  <div class="knopfzeile"><button class="k" type="button" onclick={zeichnen} disabled={!daten}>{res ? L('Karte neu zeichnen', 'Redraw the map') : L('Karte der Fragen zeichnen', 'Draw the map of the questions')}</button></div>
  {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{L('Zu wenige Personen mit allen Antworten (mindestens 10) oder die Abstände sind nicht berechenbar.', 'Too few people with all answers (at least 10) or the distances cannot be calculated.')}</p>
  {:else if r && karte}
    <DiagrammExport titel={L('Karte der Fragen', 'Map of the questions')}>
      <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz}>
        {#each achsenMarken(-karte.g, karte.g) as v}<line x1={karte.X(v)} x2={karte.X(v)} y1={M} y2={H - M} stroke="var(--dg-gitter)" /><line x1={M} x2={W - M} y1={karte.Y(v)} y2={karte.Y(v)} stroke="var(--dg-gitter)" /><text x={karte.X(v)} y={H - M + 16} text-anchor="middle" class="klein">{zahlDe(v)}</text><text x={M - 8} y={karte.Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
        {#each r.koord as p, i (i)}<circle cx={karte.X(p[0]!)} cy={karte.Y(p[1] ?? 0)} r="5" fill="var(--dg-a)"><title>{name(fragen[i]!)}</title></circle>{#if karte.plan.zeigen[i]}<text x={karte.X(p[0]!) + 8} y={karte.Y(p[1] ?? 0) + 4} class="klein" fill="var(--dg-a)">{name(fragen[i]!)}</text>{/if}{/each}
        <text x={W / 2} y={H - 8} text-anchor="middle" class="klein">{L('Dimension', 'Dimension')} 1</text>
        <YTitel x={14} y={H / 2} laenge={H - 2 * M} text={L('Dimension', 'Dimension') + ' 2'} px={13} klasse="klein" />
      </svg>
    </DiagrammExport>
    {#if bt}<BildBeschreibung {...bt} />{/if}
    {#if karte.plan.gekuerzt}<p class="heft-text" style="color:var(--tinte-2)">{L('Zu viele Fragen für Namen im Bild: Der Name steht beim Zeigen auf den Punkt.', 'Too many questions for names in the picture: the name appears when you point at the dot.')}</p>{/if}
    <p class="heft-text" style="color:var(--tinte-2)">{L(`Die zwei Dimensionen geben ${pr(r.gof1)} der Abstände wieder (je näher an 100 %, desto treuer ist die Karte). Gelesen werden nur die Lagen der Punkte zueinander; wie die Karte gedreht oder gespiegelt ist, hat keine Bedeutung. Fragen, die am Rand allein liegen, hängen mit den übrigen kaum zusammen.`, `The two dimensions reproduce ${pr(r.gof1)} of the distances (the closer to 100 %, the more faithful the map). Only the positions of the points relative to each other are read; how the map is rotated or mirrored has no meaning. Questions that lie alone at the edge are hardly related to the others.`)}</p>
  {/if}
</details>
