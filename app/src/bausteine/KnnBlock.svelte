<script lang="ts">
  /**
   * V5 Teil 3: „Wie gut sagt mein Modell neue Fälle voraus? (k-nächste Nachbarn, Kreuzvalidierung)“ unter „Lässt sich etwas vorhersagen?“, neben dem Entscheidungsbaum.
   * Eigene Daten: Ziel mit 2 bis 8 Gruppen, Zahlen-Spalten als Merkmale. Rechnet im Browser (lib/knnblock.ts, Kern lib/ml.ts), erst auf Klick; R-Skript mit derselben Aufteilung.
   * Fachblatt docs/ausbau/FACHBLATT-V5-MASCHINELLES-LERNEN.md, Abschnitt 10. Statable deutet nichts: Zahlen, Bild und beschreibende Sätze.
   */
  import HilfeLink from './HilfeLink.svelte';
  import { sage } from '../lib/ansage';
  import Rechnet from './Rechnet.svelte';
  import LernlaborKnnKurve from './LernlaborKnnKurve.svelte';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma } from '../lib/ergebnis';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { KNN_MAX, KNN_MIN, baueKnnSkript, knnDaten, knnRechne, type KnnDaten, type KnnErgebnis, type KnnFehler } from '../lib/knnblock';

  const kennung = $props.id();
  const name = (c: { name: string; bezeichnung: string }) => c.bezeichnung.trim() || c.name;
  const stufen = (c: (typeof s.spalten)[number]) => {
    const i = s.spalten.indexOf(c), w = new Set<string>();
    for (const z of s.zeilen) { const v = z[i]; if (v === null || v === undefined || v === '' || (typeof v === 'number' && istFehlend(c, v))) continue; w.add(String(v)); if (w.size > 8) break; }
    return w.size;
  };
  const zielKandidaten = $derived(s.spalten.filter(c => c.art !== 'datum' && (() => { const n = stufen(c); return n >= 2 && n <= 8; })()));
  let ziel = $state(''), merkmale = $state<string[]>([]), std = $state(true), startwert = $state(1), laeuft = $state(false);
  let res = $state<{ d: KnnDaten; r: KnnErgebnis; ziel: string; merkmale: string[]; std: boolean; startwert: number } | KnnFehler | null>(null);
  const merkmalKandidaten = $derived(s.spalten.filter(c => c.name !== ziel && c.art === 'zahl'));
  $effect(() => { void ziel; void merkmale.join('|'); void std; void startwert; res = null; });
  $effect(() => { const gut = merkmale.filter(n => n !== ziel && s.spalten.some(c => c.name === n && c.art === 'zahl')); if (gut.length !== merkmale.length) merkmale = gut; });
  const umschalten = (n: string, an: boolean) => { merkmale = an ? [...merkmale, n] : merkmale.filter(x => x !== n); };

  async function rechnen() {
    if (laeuft || !ziel || !merkmale.length) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const sw = Number.isInteger(startwert) && startwert >= 1 ? startwert : 1;
    const d = knnDaten(s.spalten, s.zeilen, ziel, merkmale);
    res = 'fehler' in d ? d : { d, r: knnRechne(d, sw, std), ziel, merkmale: [...merkmale], std, startwert: sw };
    laeuft = false;
    // Ansage über die zentrale Live-Region (keine eigene): Fehler dringlich, sonst die ersten zwei Sätze
    if ('fehler' in res) sage(fehlerText(res), 'dringend'); else sage(saetzeVon(res).slice(0, 2).join(' '));
  }
  const ok = $derived(res && !('fehler' in res) ? res : null);
  const pr = (v: number) => (Number.isFinite(v) ? `${komma(v * 100, 1)} %` : '-');
  const fehlerText = (f: KnnFehler) => f.fehler === 'eine-klasse' ? L('Das Ziel hat nur eine Gruppe; es braucht mindestens zwei.', 'The target has only one group; at least two are needed.')
    : f.fehler === 'zu-viele-klassen' ? L('Das Ziel hat mehr als acht Gruppen.', 'The target has more than eight groups.')
    : f.fehler === 'zu-wenig-faelle' ? L(`Zu wenige Fälle mit allen Angaben (mindestens ${KNN_MIN}).`, `Too few cases with all answers (at least ${KNN_MIN}).`)
    : f.fehler === 'zu-viele-faelle' ? L(`Mehr als ${komma(KNN_MAX, 0)} Fälle mit allen Angaben: Das rechnet der Browser zu lange. Bitte vorher Fälle auswählen (Daten → Fälle auswählen).`, `More than ${komma(KNN_MAX, 0)} cases with all answers: that takes the browser too long. Please select cases first (Data → Select cases).`)
    : L('Bitte mindestens eine Zahlen-Spalte als Merkmal wählen.', 'Please choose at least one number column as a feature.');

  /** Beschreibende Sätze (keine Deutung): Aufteilung, gewähltes k, drei Fehlerraten, Vergleich mit Raten. */
  const saetze = $derived(ok ? saetzeVon(ok) : []);
  function saetzeVon(ok: { d: KnnDaten; r: KnnErgebnis; startwert: number }): string[] {
    const { d, r } = ok, e = r.erg, j = r.j, k = e.bestesK;
    const tr = e.fehlerTraining[j]!, cv = e.fehlerCV[j]!, te = e.fehlerTest[j]!;
    const aus = [
      L(`${d.X.length} Fälle gehen ein: ${r.training.length} Trainingsdaten, ${r.test.length} Testdaten (Startwert ${ok.startwert}).`, `${d.X.length} cases are included: ${r.training.length} training data, ${r.test.length} test data (seed ${ok.startwert}).`)
        + (d.weg ? ' ' + L(`${d.weg} Fälle mit Lücken bleiben außen vor.`, `${d.weg} cases with gaps are left out.`) : ''),
      L(`Die 5-fache Kreuzvalidierung in den Trainingsdaten wählt k = ${k}. Fehlerrate bei k = ${k}: Training ${pr(tr)}, Kreuzvalidierung ${pr(cv)}, Testdaten ${pr(te)}.`, `5-fold cross-validation in the training data chooses k = ${k}. Error rate at k = ${k}: training ${pr(tr)}, cross-validation ${pr(cv)}, test data ${pr(te)}.`),
      L(`Auf den Testdaten stimmt die Vorhersage bei ${pr(r.trefferquote)} der Fälle (Trefferquote). Wer immer die im Training häufigste Gruppe „${d.klassen[r.ratenKlasse]}“ rät, liegt bei ${pr(r.raten)} richtig.`, `On the test data the prediction is right for ${pr(r.trefferquote)} of the cases (accuracy). Always guessing the group most frequent in training, "${d.klassen[r.ratenKlasse]}", is right for ${pr(r.raten)}.`)
    ];
    if (te - tr >= 0.05) aus.push(L(`Der Testfehler liegt ${komma((te - tr) * 100, 1)} Prozentpunkte über dem Trainingsfehler: Das Modell passt besser zu den Fällen, die es kennt, als zu neuen (Überanpassung).`, `The test error is ${komma((te - tr) * 100, 1)} percentage points above the training error: the model fits the cases it knows better than new ones (overfitting).`));
    if (r.trefferquote <= r.raten + 0.02) aus.push(L('Auf den Testdaten ist das Modell nicht besser als Raten.', 'On the test data the model is not better than guessing.'));
    return aus;
  }

  function rSkript() {
    if (!ok) return;
    try {
      const sk = baueKnnSkript({ spalten: s.spalten, zeilen: s.zeilen, ziel: ok.ziel, merkmale: ok.merkmale, d: ok.d, r: ok.r, standardisieren: ok.std, startwert: ok.startwert, titel: L('k-naechste Nachbarn', 'k-nearest neighbours'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if zielKandidaten.length && s.spalten.some(c => c.art === 'zahl')}
  <details class="auf knn" style="margin-top:var(--a4)"><summary>{L('Wie gut sagt mein Modell neue Fälle voraus? (k-nächste Nachbarn, Kreuzvalidierung)', 'How well does my model predict new cases? (k-nearest neighbours, cross-validation)')}</summary>
    <p class="heft-text">{L('k-nächste Nachbarn (k-nearest neighbours, kNN) sagt die Gruppe eines Falls so voraus wie die Mehrheit der k ähnlichsten Fälle in den Trainingsdaten. Statable lernt an 70 % der Fälle, wählt k mit 5-facher Kreuzvalidierung nur in diesen Trainingsdaten und prüft erst danach an den übrigen 30 % (Testdaten), wie gut die Vorhersage bei neuen Fällen stimmt.', 'k-nearest neighbours (kNN) predicts the group of a case like the majority of the k most similar cases in the training data. Statable learns on 70 % of the cases, chooses k with 5-fold cross-validation in these training data only, and only then checks on the other 30 % (test data) how well the prediction works for new cases.')}</p>
    <p class="hilfe"><HilfeLink id="ml-knn" text={L('Hilfe: k-nächste Nachbarn', 'Help: k-nearest neighbours')} /> <a href="#lernen/pfad/maschinelles-lernen">{L('Mehr dazu: Lernpfad „Maschinelles Lernen verstehen (Machine Learning)“', 'More: learning path "Understanding machine learning"')}</a></p>
    <div class="eingabe" style="max-width:340px"><label for="knn-z-{kennung}">{L('Welche Gruppe soll vorhergesagt werden?', 'Which group should be predicted?')}</label>
      <select id="knn-z-{kennung}" bind:value={ziel}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zielKandidaten as c (c.name)}<option value={c.name}>{name(c)}</option>{/each}</select></div>
    {#if ziel}
      <fieldset style="border:0;padding:0;margin:var(--a2) 0"><legend style="font-weight:600">{L('Aus welchen Zahlen-Spalten? (Merkmale)', 'From which number columns? (features)')}</legend>
        {#each merkmalKandidaten as c (c.name)}<label class="schalter" style="display:inline-flex;margin-inline-end:var(--a4)"><input type="checkbox" checked={merkmale.includes(c.name)} onchange={(ev) => umschalten(c.name, ev.currentTarget.checked)} />{name(c)}</label>{/each}
      </fieldset>
      <div class="knn-zeile">
        <label class="schalter"><input type="checkbox" bind:checked={std} /> {L('Merkmale standardisieren (z-Werte aus den Trainingsdaten)', 'Standardise the features (z-scores from the training data)')}</label>
        <div class="eingabe knn-start"><label for="knn-s-{kennung}">{L('Startwert der Aufteilung', 'Seed of the split')}</label><input id="knn-s-{kennung}" type="number" min="1" step="1" inputmode="numeric" bind:value={startwert} /></div>
      </div>
      <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft || !merkmale.length}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{L('Vorhersage prüfen', 'Check the prediction')}{/if}</button></div>
    {/if}
    {#if res && 'fehler' in res}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if ok}
      <div class="knn-saetze">{#each saetze as t}<p class="heft-text">{t}</p>{/each}</div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Konfusionsmatrix der Testdaten (k = ${ok.r.erg.bestesK}): Zeilen wahre Gruppe, Spalten vorhergesagte Gruppe`, `Confusion matrix of the test data (k = ${ok.r.erg.bestesK}): rows true group, columns predicted group`)}</b></caption>
        <thead><tr><td></td>{#each ok.d.klassen as k (k)}<th scope="col">{k}</th>{/each}<th scope="col">{L('Richtig erkannt (Sensitivität)', 'Correctly identified (sensitivity)')}</th></tr></thead>
        <tbody>{#each ok.r.konf as zeile, i (i)}<tr><th scope="row" style="text-align: start">{ok.d.klassen[i]}</th>{#each zeile as v, j (j)}<td style="text-align:end" class:diag={i === j}>{v}</td>{/each}<td style="text-align:end">{pr(ok.r.richtig[i]!)}</td></tr>{/each}</tbody>
      </table></div>
      <LernlaborKnnKurve ks={ok.r.erg.ks} training={ok.r.erg.fehlerTraining} test={ok.r.erg.fehlerTest} cv={ok.r.erg.fehlerCV} k={ok.r.erg.bestesK} bestesK={ok.r.erg.bestesK} titel={L('Fehlerrate gegen k: Training, Test und Kreuzvalidierung', 'Error rate against k: training, test and cross-validation')} />
      <div class="knopfzeile"><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Das Ergebnis hängt von der zufälligen Aufteilung ab: Ein anderer Startwert gibt andere Zahlen. kNN beschreibt, was zu diesen Daten passt, keine Ursachen; ob die Vorhersage für einen Zweck taugt, entscheiden Sie. Bei seltenen Gruppen sagt die Trefferquote allein wenig: Schauen Sie auf „Richtig erkannt“ je Gruppe.', 'The result depends on the random split: another seed gives other numbers. kNN describes what fits these data, not causes; whether the prediction is good enough for a purpose is your decision. With rare groups the accuracy alone says little: look at "correctly identified" for each group.')}</p>
    {/if}
  </details>
{/if}

<style>
  .knn-zeile { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: end; margin-block: var(--a2); }
  .knn-start { max-width: 200px; margin: 0; }
  .knn :global(.ll-bild) { margin: var(--a2) 0; min-width: 0; }
  .knn :global(.ll-bild figcaption) { font-size: var(--gr-klein); color: var(--tinte-2); max-width: var(--breite-text); margin-top: var(--a1); }
  td.diag { font-weight: 650; }
</style>
