<script module lang="ts">
  /** Die Eingabe bleibt beim Wechsel zur Hilfe und zurück erhalten (Zustand nur im Modul, nie im Projekt). */
  const z = $state({ d: '0,5' });
  let lokal = false;
</script>
<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import { liesZahl } from '../lib/verteilungen';
  import { ueberlappung, u3, ueberlegenheit, personenJeGruppe, einordnungD } from '../lib/effektbild';
  import { lokalisiere } from '../lib/verstehenformat';
  import { ganzZahl, proz } from '../i18n/profil';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';

  if (!lokal) { lokal = true; lokalisiere(z, ['d']); }
  const d = $derived(liesZahl(z.d));
  const ok = $derived(Number.isFinite(d) && d >= -4 && d <= 4);
  const dAbs = $derived(Math.abs(d));
  const pz = (v: number) => proz(komma(v * 100, 1));
  const einordnung = $derived(ok ? [L('kleiner als „klein“', 'below "small"'), L('klein', 'small'), L('mittel', 'medium'), L('groß', 'large'), L('sehr groß', 'very large')][einordnungD(d)]! : '');
  const n = $derived(ok ? personenJeGruppe(d) : 0);
  const pdf = (x: number, mu: number) => Math.exp(-0.5 * (x - mu) ** 2) / Math.sqrt(2 * Math.PI);
  const W = 600, H = 260, X0 = 30, XR = 20, T0 = 16, U0 = 38;
  const lo = $derived(Math.min(0, d) - 3.5), hi = $derived(Math.max(0, d) + 3.5);
  const px = (x: number) => X0 + (W - X0 - XR) * ((x - lo) / (hi - lo)), py = (v: number) => T0 + (H - T0 - U0) * (1 - v / 0.43);
  const pfad = (mu: number, nur?: 'min') => Array.from({ length: 141 }, (_, i) => { const x = lo + (hi - lo) * i / 140; const v = nur ? Math.min(pdf(x, 0), pdf(x, d)) : pdf(x, mu); return `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(v).toFixed(1)}`; }).join(' ');
  const flaeche = $derived(ok ? `${pfad(0, 'min')} L${px(hi).toFixed(1)},${py(0)} L${px(lo).toFixed(1)},${py(0)} Z` : '');
  const marken = $derived(Array.from({ length: Math.floor(hi) - Math.ceil(lo) + 1 }, (_, i) => Math.ceil(lo) + i));
  const kurvenPunkte = (mu: number): [number, number][] => Array.from({ length: 71 }, (_, i) => { const x = lo + (hi - lo) * i / 70; return [x, pdf(x, mu)]; });
  const bt = $derived(bildtext('verteilung', {
    titel: L(`Zwei Normalverteilungen, um d = ${komma(d, 2)} versetzt`, `Two normal distributions shifted by d = ${komma(d, 2)}`),
    xAchse: { name: L('Standardabweichungen', 'Standard deviations'), von: lo, bis: hi }, yAchse: { name: L('Dichte', 'Density') },
    kurven: [{ name: L('Gruppe 1', 'Group 1'), punkte: kurvenPunkte(0) }, { name: L('Gruppe 2', 'Group 2'), punkte: kurvenPunkte(ok ? d : 0) }],
    marken: [{ name: L('Mittelwert Gruppe 1', 'Mean of group 1'), x: 0 }, { name: L('Mittelwert Gruppe 2', 'Mean of group 2'), x: ok ? d : 0 }]
  }));
</script>

<div class="vst-raster">
  <div class="vst-links">
    <fieldset class="vst-gruppe"><legend>{L('Wie weit liegen die Gruppen auseinander?', 'How far apart are the groups?')}</legend>
      <div class="eingabe" style="max-width:260px"><label for="ve-d">{L('Effektstärke d (in Standardabweichungen)', 'Effect size d (in standard deviations)')}</label>
        <input id="ve-d" type="text" inputmode="decimal" bind:value={z.d} aria-invalid={!ok} aria-describedby={(!ok) ? 've-fehler' : undefined} /></div>
      <input type="range" min="0" max="3" step="0.1" aria-label={L('Effektstärke d einstellen', 'Set effect size d')} aria-valuetext={L(`Effektstärke d ${komma(dAbs, 1)}`, `Effect size d ${komma(dAbs, 1)}`)} value={ok ? dAbs : 0} oninput={(e) => { z.d = komma(Number((e.currentTarget as HTMLInputElement).value), 1); }} />
      <div class="knopfzeile">{#each [0.2, 0.5, 0.8, 1.2] as v (v)}<button class="k leise" type="button" onclick={() => { z.d = komma(v, 1); }}>d = {komma(v, 1)}</button>{/each}</div>
      {#if !ok}<p class="heft-text" role="alert" id="ve-fehler" style="color:var(--fehler, #b3261e)">{L('Bitte eine Zahl zwischen −4 und 4 eingeben.', 'Please enter a number between −4 and 4.')}</p>{/if}
    </fieldset>
    <p class="heft-text" style="color:var(--tinte-2)">{L('Die Gruppen sind hier gleich groß und gleich breit gestreut (zwei Normalverteilungen). Die Einordnung klein, mittel, groß ist eine Verabredung von Cohen (1988) und gilt nicht in jedem Fach gleich.', 'Here the groups have the same size and the same spread (two normal distributions). The labels small, medium, large are a convention by Cohen (1988) and do not apply equally in every field.')}</p>
  </div>
  <div class="vst-rechts">
    {#if ok}
      <section class="vst-ergebnis" aria-labelledby="ve-erg"><h2 id="ve-erg">d = {komma(d, 2)}: {einordnung}</h2>
        <ul class="heft-text">
          <li>{L(`Die beiden Verteilungen überlappen zu ${pz(ueberlappung(d))}.`, `The two distributions overlap by ${pz(ueberlappung(d))}.`)}</li>
          <li>{L(`Von der Gruppe mit dem höheren Mittelwert liegen ${pz(u3(dAbs))} über dem Mittelwert der anderen Gruppe.`, `Of the group with the higher mean, ${pz(u3(dAbs))} lie above the mean of the other group.`)}</li>
          <li>{L(`Zieht man je eine Person zufällig, hat in ${pz(ueberlegenheit(dAbs))} der Fälle die Person aus der Gruppe mit dem höheren Mittelwert den höheren Wert.`, `If one person is drawn at random from each, in ${pz(ueberlegenheit(dAbs))} of the cases the person from the group with the higher mean has the higher value.`)}</li>
          <li>{Number.isFinite(n) ? L(`Um so einen Unterschied mit einem zweiseitigen Test (α = 5 %) in 80 % der Studien zu finden, braucht es etwa ${ganzZahl(n)} Personen je Gruppe.`, `To find such a difference with a two-sided test (α = 5%) in 80% of studies, about ${ganzZahl(n)} people per group are needed.`) : L('Ohne Unterschied lässt sich nichts finden.', 'Without a difference there is nothing to find.')}</li>
        </ul>
      </section>
      <section class="vst-bild" aria-labelledby="ve-bild"><h2 id="ve-bild" class="nur-vorleser">{L('Bild', 'Picture')}</h2>
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz}>
          <path d={flaeche} fill="var(--tinte-2, #888)" fill-opacity="0.3" />
          <path d={pfad(0)} fill="none" stroke="var(--dg-a)" stroke-width="2.5" />
          <path d={pfad(d)} fill="none" stroke="var(--dg-b, var(--akzent))" stroke-width="2.5" />
          <line x1={X0} x2={W - XR} y1={py(0)} y2={py(0)} stroke="var(--tinte-2, #666)" />
          {#each marken as m (m)}<text x={px(m)} y={H - U0 + 16} text-anchor="middle" class="klein">{m}</text>{/each}
          <text x={(X0 + W - XR) / 2} y={H - 6} text-anchor="middle" class="klein">{L('Standardabweichungen', 'Standard deviations')}</text>
        </svg>
        <BildBeschreibung {...bt} beschreibung={[L(`Zwei Glockenkurven, um ${komma(d, 2)} Standardabweichungen versetzt; die Überlappung ist grau.`, `Two bell curves shifted by ${komma(d, 2)} standard deviations; the overlap is grey.`), ...bt.beschreibung]} />
      </section>
    {/if}
  </div>
</div>
