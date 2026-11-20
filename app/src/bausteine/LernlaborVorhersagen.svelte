<script module lang="ts">
  import type { MlMerkmal, MlZiel } from '../lib/ml';
  /** Zustand bleibt beim Wechsel der Karteireiter erhalten; gehört nicht zum Projekt. */
  const z = $state({ ziel: 'geschlecht' as MlZiel, m1: 'schnabel_tiefe' as MlMerkmal, m2: 'masse' as MlMerkmal, std: true, k: 15, anteil: '0.7', K: '5' });
</script>
<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { strom } from '../lib/lernlabor';
  import { zahlDe } from '../lib/format';
  import { prozent } from '../lib/lernlaborsaetze';
  import { faltenEinteilung, gitterVorhersage, konfusion, mlRechne, pinguinDaten, teile } from '../lib/ml';
  import { klassenNamen, lehreVorhersagen, merkmalName, mlSaetze, zielName } from '../lib/mlsaetze';
  import LernlaborKnnBild from './LernlaborKnnBild.svelte';
  import LernlaborKnnKurve from './LernlaborKnnKurve.svelte';
  import LernlaborTabelle from './LernlaborTabelle.svelte';
  import Icon from './Icon.svelte';

  /**
   * Lernlabor-Reiter „Vorhersagen (k-nächste Nachbarn)“ (V5, Fachblatt docs/ausbau/FACHBLATT-V5-MASCHINELLES-LERNEN.md):
   * Palmer-Pinguine, Trainings-/Testdaten nach dem Startwert, kNN, Konfusionsmatrix der Testdaten, Fehler gegen k mit Kreuzvalidierung.
   * Rechnet sofort und im Browser (unter 50 ms), darum ohne Lade-Animation.
   */
  let { startwert, anstoss }: { startwert: number; anstoss: number } = $props();
  const MERKMALE: MlMerkmal[] = ['schnabel_laenge', 'schnabel_tiefe', 'flosse', 'masse'];
  const fehler = $derived(z.m1 === z.m2 ? L('Bitte zwei verschiedene Maße wählen.', 'Please choose two different measurements.') : '');
  const dat = $derived(pinguinDaten(z.ziel, z.m1, z.m2));
  const namen = $derived(klassenNamen(z.ziel));
  const K = $derived(Number(z.K));
  const teilung = $derived.by(() => { void anstoss; return teile(dat.X.length, Number(z.anteil), strom(startwert, 0)); });
  const falte = $derived(faltenEinteilung(teilung.training.length, K, strom(startwert, 1)));
  const erg = $derived(fehler ? null : mlRechne({ X: dat.X, y: dat.y, nKlassen: dat.nKlassen, training: teilung.training, test: teilung.test, falte, K, standardisieren: z.std }));
  const maxK = $derived(erg ? erg.ks.at(-1)! : 51);
  const k = $derived(Math.min(z.k, maxK)), j = $derived(erg ? erg.ks.indexOf(k) : -1);
  const yTest = $derived(teilung.test.map(i => dat.y[i]!));
  const konf = $derived(erg && j >= 0 ? konfusion(yTest, erg.vorhersageTest[j]!, dat.nKlassen) : null);
  const saetze = $derived(erg && j >= 0 ? mlSaetze({ n: dat.X.length, nTraining: teilung.training.length, nTest: teilung.test.length, startwert, k, K, standardisieren: z.std, erg, j }) : []);

  function bereich(w: number[]): [number, number] { const lo = Math.min(...w), hi = Math.max(...w), r = (hi - lo) * 0.05 || 1; return [lo - r, hi + r]; }
  const bild = $derived.by(() => {
    if (!erg || j < 0) return null;
    const xB = bereich(dat.X.map(p => p[0]!)), yB = bereich(dat.X.map(p => p[1]!));
    const trX = teilung.training.map(i => dat.X[i]!), trY = teilung.training.map(i => dat.y[i]!);
    const werte = gitterVorhersage({ trainX: trX, trainY: trY, nKlassen: dat.nKlassen, k, skala: erg.skala, xBereich: xB, yBereich: yB, schritte: 48 });
    const vt = erg.vorhersageTest[j]!;
    const punkte = [
      ...teilung.training.map(i => ({ x: dat.X[i]![0]!, y: dat.X[i]![1]!, klasse: dat.y[i]!, test: false, falsch: false })),
      ...teilung.test.map((i, q) => ({ x: dat.X[i]![0]!, y: dat.X[i]![1]!, klasse: dat.y[i]!, test: true, falsch: vt[q] !== dat.y[i] }))
    ];
    return { punkte, gitter: { werte, xBereich: xB, yBereich: yB } };
  });

  function beispiel(ziel: MlZiel, m1: MlMerkmal, m2: MlMerkmal) { z.ziel = ziel; z.m1 = m1; z.m2 = m2; z.std = true; z.k = 15; }
</script>

<div class="ll-raster">
  <div class="ll-eingaben">
    <h2 class="ll-h">{L('Modell und Daten', 'Model and data')}</h2>
    <div class="eingabe"><label for="ll-kv-ziel">{L('Was soll vorhergesagt werden? (Klasse)', 'What should be predicted? (class)')}</label>
      <select id="ll-kv-ziel" bind:value={z.ziel}><option value="geschlecht">{zielName('geschlecht')}</option><option value="art">{zielName('art')}</option></select></div>
    <div class="eingabe"><label for="ll-kv-m1">{L('Erstes Maß (waagrecht)', 'First measurement (horizontal)')}</label>
      <select id="ll-kv-m1" bind:value={z.m1} aria-invalid={fehler ? 'true' : undefined} aria-describedby={fehler ? 'll-kv-fehler' : undefined}>{#each MERKMALE as m}<option value={m}>{merkmalName(m)}</option>{/each}</select></div>
    <div class="eingabe"><label for="ll-kv-m2">{L('Zweites Maß (senkrecht)', 'Second measurement (vertical)')}</label>
      <select id="ll-kv-m2" bind:value={z.m2} aria-invalid={fehler ? 'true' : undefined} aria-describedby={fehler ? 'll-kv-fehler' : undefined}>{#each MERKMALE as m}<option value={m}>{merkmalName(m)}</option>{/each}</select></div>
    <div class="eingabe"><label for="ll-kv-k">{L(`k: Zahl der Nachbarn (k-nächste Nachbarn), jetzt ${k}`, `k: number of neighbours (k-nearest neighbours), now ${k}`)}</label>
      <input id="ll-kv-k" type="range" min="1" max={maxK} step="2" bind:value={z.k} aria-valuetext={`k = ${k}`}>
      {#if erg && erg.bestesK !== k}<button class="k klein-knopf" type="button" onclick={() => { if (erg) z.k = erg.bestesK; }}>{L(`k = ${erg.bestesK} aus der Kreuzvalidierung nehmen`, `Use k = ${erg.bestesK} from cross-validation`)}</button>{/if}</div>
    <div class="eingabe"><label class="ll-check" data-begriff="standardisierung"><input type="checkbox" bind:checked={z.std}> {L('Maße standardisieren (z-Werte aus den Trainingsdaten)', 'Standardise the measurements (z-scores from the training data)')}</label></div>
    <div class="ll-zeile">
      <div class="eingabe"><label for="ll-kv-anteil">{L('Anteil Trainingsdaten', 'Share of training data')}</label>
        <select id="ll-kv-anteil" bind:value={z.anteil}><option value="0.5">50 %</option><option value="0.7">70 %</option><option value="0.8">80 %</option></select></div>
      <div class="eingabe"><label for="ll-kv-K">{L('Kreuzvalidierung: Falten', 'Cross-validation: folds')}</label>
        <select id="ll-kv-K" bind:value={z.K}><option value="5">5</option><option value="10">10</option></select></div>
    </div>
    {#if fehler}<p class="banner" id="ll-kv-fehler"><Icon n="hinweis" /><span>{fehler}</span></p>{/if}
    <div class="ll-zeile" role="group" aria-label={L('Beispiele', 'Examples')}>
      <button class="k klein-knopf" type="button" onclick={() => beispiel('geschlecht', 'schnabel_tiefe', 'masse')}>{L('Beispiel: Geschlecht aus Schnabeltiefe und Körpermasse', 'Example: sex from bill depth and body mass')}</button>
      <button class="k klein-knopf" type="button" onclick={() => beispiel('art', 'schnabel_laenge', 'flosse')}>{L('Beispiel: Art aus Schnabel- und Flossenlänge', 'Example: species from bill and flipper length')}</button>
    </div>
    <p class="hilfe">{L('Daten: Palmer-Pinguine (Gorman, Williams und Fraser 2014; palmerpenguins, CC0).', 'Data: Palmer penguins (Gorman, Williams and Fraser 2014; palmerpenguins, CC0).')}</p>
  </div>

  <div class="ll-ergebnis" use:ergebnisAnsage={{ satz: '.ll-satz', anzahl: 1 }}>
    {#if erg && konf && bild}
      <div class="ll-satz">{#each saetze as satz}<p>{satz}</p>{/each}</div>
      <LernlaborKnnBild punkte={bild.punkte} gitter={bild.gitter} klassen={namen} xText={merkmalName(z.m1)} yText={merkmalName(z.m2)} titel={L(`Pinguine nach ${merkmalName(z.m1)} und ${merkmalName(z.m2)}, Vorhersage mit k = ${k}`, `Penguins by ${merkmalName(z.m1)} and ${merkmalName(z.m2)}, prediction with k = ${k}`)} {k} />
      <LernlaborTabelle titel={L('Konfusionsmatrix der Testdaten', 'Confusion matrix of the test data')}><table class="ll-tabelle"><caption>{L(`Konfusionsmatrix der Testdaten (k = ${k}): Zeilen wahre Klasse, Spalten vorhergesagte Klasse; Sensitivität = Anteil richtig erkannt`, `Confusion matrix of the test data (k = ${k}): rows true class, columns predicted class; sensitivity = share correctly identified`)}</caption>
        <thead><tr><td></td>{#each namen as n}<th scope="col">{n}</th>{/each}<th scope="col">{L('Sensitivität', 'Sensitivity')}</th></tr></thead>
        <tbody>{#each konf as zeile, c}{@const summe = zeile.reduce((a, b) => a + b, 0)}<tr><th scope="row">{namen[c]}</th>{#each zeile as v, q}<td class:diag={q === c}>{zahlDe(v)}</td>{/each}<td>{summe ? `${prozent(zeile[c]! / summe, 1)} (${zahlDe(zeile[c]!)}/${zahlDe(summe)})` : '-'}</td></tr>{/each}</tbody>
      </table></LernlaborTabelle>
      <LernlaborKnnKurve ks={erg.ks} training={erg.fehlerTraining} test={erg.fehlerTest} cv={erg.fehlerCV} {k} bestesK={erg.bestesK} titel={L('Fehlerrate gegen k: Training, Test und Kreuzvalidierung', 'Error rate against k: training, test and cross-validation')} />
      <p class="ll-lehre">{lehreVorhersagen()} <a href="#lernen/pfad/maschinelles-lernen">{L('Mehr dazu: Lernpfad „Maschinelles Lernen verstehen (Machine Learning)“', 'More: learning path "Understanding machine learning"')}</a></p>
    {/if}
  </div>
</div>

<style>
  td.diag { font-weight: 650; }
</style>
