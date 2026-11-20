<script module lang="ts">
  /** Die Auswahl bleibt beim Wechsel zur Hilfe und zurück erhalten (Zustand nur im Modul, nie im Projekt). */
  const z = $state({ fall: 'a1', y: 8, gruppen: false });
</script>
<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import { ANSCOMBE, SIMPSON, anpassen, mitAusreisser, type Punkt } from '../lib/geradebild';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';

  const punkte = $derived<Punkt[]>(z.fall === 'a1' ? ANSCOMBE[0]! : z.fall === 'a2' ? ANSCOMBE[1]! : z.fall === 'a3' ? ANSCOMBE[2]! : z.fall === 'a4' ? ANSCOMBE[3]! : z.fall === 'simpson' ? SIMPSON : mitAusreisser(z.y));
  const g = $derived(anpassen(punkte));
  const teile = $derived(z.fall === 'simpson' && z.gruppen ? [0, 1, 2].map((k) => ({ k, g: anpassen(punkte.filter((p) => p.g === k)) })) : []);
  const vz = $derived(g.steigung < 0 ? '−' : '+');
  const W = 600, H = 300, X0 = 44, XR = 20, T0 = 16, U0 = 42;
  const xmax = $derived(z.fall === 'a4' ? 20 : z.fall === 'simpson' ? 12 : z.fall === 'ausreisser' ? 16 : 16);
  const ymax = $derived(z.fall === 'simpson' ? 16 : z.fall === 'ausreisser' ? 20 : 14);
  const px = (x: number) => X0 + (W - X0 - XR) * (x / xmax), py = (y: number) => T0 + (H - T0 - U0) * (1 - y / ymax);
  const linie = (a: number, b: number, x1: number, x2: number) => `M${px(x1).toFixed(1)},${py(a + b * x1).toFixed(1)} L${px(x2).toFixed(1)},${py(a + b * x2).toFixed(1)}`;
  const farbe = (k?: number) => (z.fall === 'simpson' && z.gruppen ? ['var(--dg-a)', 'var(--dg-b, var(--akzent))', 'var(--dg-c, var(--tinte-2))'][k ?? 0] : 'var(--dg-a)');
  const xs = $derived(Array.from({ length: 5 }, (_, i) => Math.round((xmax / 4) * i)));
  const ys = $derived(Array.from({ length: 5 }, (_, i) => Math.round((ymax / 4) * i)));
  const bt = $derived(bildtext('streu', {
    titel: L('Punktwolke mit Regressionsgerade', 'Scatter plot with regression line'),
    xAchse: { name: 'x', von: 0, bis: xmax }, yAchse: { name: 'y', von: 0, bis: ymax },
    ...(teile.length
      ? { gruppen: teile.map(t => ({ name: L(`Gruppe ${t.k + 1}`, `Group ${t.k + 1}`), punkte: punkte.filter(p => p.g === t.k).map(p => [p.x, p.y] as [number, number]), gerade: { a: t.g.achse, b: t.g.steigung, r2: t.g.r2 } })) }
      : { punkte: punkte.map(p => [p.x, p.y] as [number, number]), gerade: { a: g.achse, b: g.steigung, r2: g.r2 } })
  }));
</script>

<div class="vst-raster">
  <div class="vst-links">
    <label class="eingabe"><span>{L('Punktwolke', 'Scatter plot')}</span>
      <select bind:value={z.fall}>
        <option data-begriff="anscombe-quartett" value="a1">{L('Anscombe 1: gewöhnliche Wolke', 'Anscombe 1: ordinary cloud')}</option>
        <option data-begriff="anscombe-quartett" value="a2">{L('Anscombe 2: Bogen', 'Anscombe 2: curve')}</option>
        <option data-begriff="anscombe-quartett" value="a3">{L('Anscombe 3: ein Ausreißer', 'Anscombe 3: one outlier')}</option>
        <option data-begriff="anscombe-quartett" value="a4">{L('Anscombe 4: ein einzelner Hebelpunkt', 'Anscombe 4: one single leverage point')}</option>
        <option data-begriff="ausreisser" value="ausreisser">{L('Eigener Punkt zum Verschieben', 'Your own point to move')}</option>
        <option data-begriff="simpson-paradox" value="simpson">{L('Drei Gruppen (Simpson-Paradox)', 'Three groups (Simpson paradox)')}</option>
      </select></label>
    {#if z.fall === 'ausreisser'}
      <label class="eingabe"><span>{L('Höhe (y) des Punktes ganz rechts', 'Height (y) of the point on the far right')}: <b>{komma(z.y, 1)}</b></span>
        <input type="range" min="0" max="20" step="0.5" aria-label={L('Höhe (y) des Punktes ganz rechts', 'Height (y) of the point on the far right')} aria-valuetext={L(`Höhe ${komma(z.y, 1)}`, `Height ${komma(z.y, 1)}`)} value={z.y} oninput={(e) => { z.y = Number((e.currentTarget as HTMLInputElement).value); }} /></label>
    {/if}
    {#if z.fall === 'simpson'}
      <label data-begriff="simpson-paradox" class="eingabe"><input type="checkbox" bind:checked={z.gruppen} /> {L('Die drei Gruppen einzeln ansehen', 'Look at the three groups separately')}</label>
    {/if}
    <p class="heft-text" style="color:var(--tinte-2)">{z.fall === 'simpson' ? L('Erfundenes Lehrbeispiel: Über alle Punkte fällt die Gerade, in jeder Gruppe steigt sie. Welche Aussage stimmt, hängt davon ab, ob die Gruppen eine Rolle spielen.', 'Invented teaching example: over all points the line falls, in every group it rises. Which statement is right depends on whether the groups matter.') : z.fall === 'ausreisser' ? L('Zehn Punkte liegen nahe an einer steigenden Geraden (erfunden). Wird der elfte Punkt verschoben, zeigt sich, wie stark er Gerade und Korrelation allein bestimmt.', 'Ten points lie close to a rising line (invented). When the eleventh point is moved, it shows how strongly it alone determines line and correlation.') : L('Anscombe (1973): vier Punktwolken mit fast gleichen Kennzahlen, aber ganz verschiedenem Aussehen. Darum immer zuerst ein Bild ansehen.', 'Anscombe (1973): four scatter plots with almost the same summary numbers but very different appearance. So always look at a picture first.')}</p>
  </div>
  <div class="vst-rechts">
    <section class="vst-ergebnis" aria-labelledby="vg-erg"><h2 id="vg-erg">{L('Gerade und Zusammenhang', 'Line and association')}</h2>
      <ul class="heft-text">
        <li>{L(`Gerade: y = ${komma(g.achse, 2)} ${vz} ${komma(Math.abs(g.steigung), 2)} · x`, `Line: y = ${komma(g.achse, 2)} ${vz} ${komma(Math.abs(g.steigung), 2)} · x`)}</li>
        <li>{L(`Korrelation r = ${komma(g.r, 3)}`, `Correlation r = ${komma(g.r, 3)}`)}</li>
        <li>{L(`Bestimmtheitsmaß R² = ${komma(g.r2, 3)}`, `Coefficient of determination R² = ${komma(g.r2, 3)}`)}</li>
      </ul>
      {#each teile as t (t.k)}
        <p class="heft-text">{L(`Gruppe ${t.k + 1}: Steigung ${komma(t.g.steigung, 2)}, r = ${komma(t.g.r, 2)}`, `Group ${t.k + 1}: slope ${komma(t.g.steigung, 2)}, r = ${komma(t.g.r, 2)}`)}</p>
      {/each}
      <p class="heft-text">{z.fall === 'a1' ? L('Hier passt die Gerade gut zur Wolke.', 'Here the line fits the cloud well.') : z.fall === 'a2' ? L('Die Zahlen sind fast dieselben wie in Wolke 1, aber der Zusammenhang ist ein Bogen. Eine Gerade passt nicht.', 'The numbers are almost the same as in cloud 1, but the association is a curve. A line does not fit.') : z.fall === 'a3' ? L('Ein einziger Punkt zieht die Gerade nach oben. Ohne ihn wäre die Wolke fast perfekt gerade.', 'A single point pulls the line upwards. Without it the cloud would be almost perfectly straight.') : z.fall === 'a4' ? L('Alle Punkte bis auf einen haben denselben x-Wert. Die ganze Gerade hängt an diesem einen Punkt.', 'All points but one have the same x value. The whole line depends on this one point.') : z.fall === 'simpson' ? (z.gruppen ? L('Jede Gruppe für sich zeigt einen steigenden Zusammenhang. Die gemeinsame Gerade fällt nur, weil die Gruppen verschieden hoch liegen.', 'Each group on its own shows a rising association. The joint line falls only because the groups lie at different heights.') : L('Über alle Punkte fällt die Gerade. Mit der Auswahl „Die drei Gruppen einzeln ansehen“ zeigt sich, was sich ändert.', 'Over all points the line falls. With the option "Look at the three groups separately" it shows what changes.')) : L('Wird der Punkt nach oben und unten verschoben, wechselt r von nahe 1 bis weit darunter, obwohl zehn Punkte unverändert bleiben.', 'When the point is moved up and down, r goes from close to 1 to far below, although ten points stay unchanged.')}</p>
    </section>
    <section class="vst-bild" aria-labelledby="vg-bild"><h2 id="vg-bild" class="nur-vorleser">{L('Bild', 'Picture')}</h2>
      <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz}>
        {#each ys as v (v)}<line x1={X0} x2={W - XR} y1={py(v)} y2={py(v)} stroke="var(--dg-gitter)" /><text x={X0 - 6} y={py(v) + 4} text-anchor="end" class="klein">{v}</text>{/each}
        {#each xs as v (v)}<text x={px(v)} y={H - U0 + 16} text-anchor="middle" class="klein">{v}</text>{/each}
        {#if teile.length}
          {#each teile as t (t.k)}<path d={linie(t.g.achse, t.g.steigung, 1 + t.k * 3, 5 + t.k * 3)} stroke={farbe(t.k)} stroke-width="2.5" fill="none" />{/each}
          <path d={linie(g.achse, g.steigung, 0.5, 11.5)} stroke="var(--tinte-2, #666)" stroke-width="2" stroke-dasharray="6 4" fill="none" />
        {:else}
          <path d={linie(g.achse, g.steigung, 0, xmax)} stroke="var(--dg-b, var(--akzent))" stroke-width="2.5" fill="none" />
        {/if}
        {#each punkte as p, i (i)}<circle cx={px(p.x)} cy={py(p.y)} r="4.5" fill={farbe(p.g)} stroke="var(--blatt)" stroke-width="1.2" />{/each}
        <text x={(X0 + W - XR) / 2} y={H - 6} text-anchor="middle" class="klein">x</text>
      </svg>
      <BildBeschreibung {...bt} />
    </section>
  </div>
</div>
