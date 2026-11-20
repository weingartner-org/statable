<script module lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { Simulation } from '../lib/lernlaborlauf.svelte';
  type Art = 'muenze' | 'wuerfel' | 'urne';
  interface Ausgang { schluessel: number; name: string; kurz: string; p: number; haeufig: number }
  interface Ergebnis { art: Art; N: number; startwert: number; ausgaenge: Ausgang[]; gewaehlt: number; verlauf: number[] }
  const z = $state({ art: 'wuerfel' as Art, p: '50', wuerfel: 1 as 1 | 2, gezinkt: false, q6: '50', rot: '3', blau: '7', ziehungen: '4', mit: false, N: 1000, ereignis: '', letzter: -1 });
  let erg = $state.raw<null | Ergebnis>(null);
  const sim = new Simulation();
</script>
<script lang="ts">
  import { untrack } from 'svelte';
  import { L, d } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { verzoegert } from '../lib/laedt.svelte';
  import { muenzwurf, urne, urneVerteilung, wuerfelVerteilung, wuerfelwurf } from '../lib/lernlabor';
  import { ereignisAugenzahl, ereignisMuenze, ereignisRot, ereignisSumme, lehreGrosseZahlen, leseAnteil, leseGanz, satzExperiment, wk } from '../lib/lernlaborsaetze';
  import LernlaborVerlauf from './LernlaborVerlauf.svelte';
  import LernlaborSaeulen from './LernlaborSaeulen.svelte';
  import Rechnet from './Rechnet.svelte';
  import LernlaborTabelle from './LernlaborTabelle.svelte';

  let { startwert, anstoss }: { startwert: number; anstoss: number } = $props();
  const anim = verzoegert(() => sim.laeuft);   // die Simulation ist so kurz, dass die Animation kaum zu sehen ist; die Regel (immer eine Anzeige beim Rechnen) gilt trotzdem

  /* ---------- Eingaben prüfen ---------- */
  const pMuenze = $derived(leseAnteil(z.p)), q6 = $derived(leseAnteil(z.q6));
  const rot = $derived(leseGanz(z.rot)), blau = $derived(leseGanz(z.blau)), ziehungen = $derived(leseGanz(z.ziehungen));
  const fehler = $derived.by((): string => {
    if (z.art === 'muenze') return Number.isNaN(pMuenze) ? L('Die Wahrscheinlichkeit muss zwischen 0 und 100 % liegen.', 'The probability must be between 0 and 100%.') : '';
    if (z.art === 'wuerfel') return z.gezinkt && Number.isNaN(q6) ? L('Die Wahrscheinlichkeit für die 6 muss zwischen 0 und 100 % liegen.', 'The probability of a six must be between 0 and 100%.') : '';
    if (!(rot >= 0 && blau >= 0 && rot <= 100000 && blau <= 100000 && rot + blau >= 1)) return L('Rote und blaue Kugeln: ganze Zahlen von 0 bis 100 000, zusammen mindestens eine Kugel.', 'Red and blue balls: whole numbers from 0 to 100,000, at least one ball together.');
    if (!(ziehungen >= 1 && ziehungen <= 30)) return L('Die Zahl der gezogenen Kugeln muss eine ganze Zahl von 1 bis 30 sein.', 'The number of balls drawn must be a whole number from 1 to 30.');
    if (!z.mit && ziehungen > rot + blau) return L('Ohne Zurücklegen kann man nicht mehr Kugeln ziehen, als in der Urne sind.', 'Without replacement you cannot draw more balls than are in the urn.');
    return '';
  });

  /** Die möglichen Ausgänge mit Wahrscheinlichkeit (exakt), ohne Häufigkeiten. */
  function ausgaenge(): Omit<Ausgang, 'haeufig'>[] {
    if (z.art === 'muenze') return [{ schluessel: 1, name: L('Treffer (Kopf)', 'Hit (heads)'), kurz: L('Treffer', 'Hit'), p: pMuenze }, { schluessel: 0, name: L('Kein Treffer (Zahl)', 'No hit (tails)'), kurz: L('Kein', 'No'), p: 1 - pMuenze }];
    if (z.art === 'wuerfel') {
      const v = wuerfelVerteilung(z.wuerfel, wuerfelP()), von = z.wuerfel === 1 ? 1 : 2;
      return v.map((p, k) => ({ schluessel: k, name: z.wuerfel === 1 ? ereignisAugenzahl(k) : ereignisSumme(k), kurz: String(k), p })).filter(a => a.schluessel >= von);
    }
    return urneVerteilung({ rot, blau, ziehungen, mitZuruecklegen: z.mit }).map((p, k) => ({ schluessel: k, name: ereignisRot(k), kurz: String(k), p }));
  }
  const wuerfelP = () => (z.gezinkt ? [0, 1, 2, 3, 4].map(() => (1 - q6) / 5).concat([q6]) : undefined);
  const auswahl = $derived(fehler ? [] : ausgaenge().filter(a => a.p > 0));
  const standardAusgang = () => { const a = auswahl; return a.reduce((best, x) => (x.p > best.p ? x : best), a[0]!).schluessel; };

  function simuliere() {
    if (fehler) return;
    const N = z.N, art = z.art, aus = ausgaenge();
    let gewaehlt = Number(z.ereignis);
    if (z.ereignis === '' || !auswahl.some(a => a.schluessel === gewaehlt)) { gewaehlt = art === 'muenze' ? 1 : standardAusgang(); z.ereignis = String(gewaehlt); }
    let haeufig: number[], verlauf: number[];
    if (art === 'muenze') { const r = muenzwurf({ p: pMuenze, N, startwert }); haeufig = [N - r.treffer, r.treffer]; verlauf = r.verlauf; }
    else if (art === 'wuerfel') { const r = wuerfelwurf({ wuerfel: z.wuerfel, p: wuerfelP(), N, startwert, beobachte: gewaehlt }); haeufig = r.haeufigkeit; verlauf = r.verlauf!; }
    else { const r = urne({ rot, blau, ziehungen, mitZuruecklegen: z.mit, N, startwert, beobachte: gewaehlt }); haeufig = r.haeufigkeit; verlauf = r.verlauf!; }
    erg = { art, N, startwert, gewaehlt, verlauf, ausgaenge: aus.map(a => ({ ...a, haeufig: art === 'muenze' ? (a.schluessel === 1 ? haeufig[1]! : haeufig[0]!) : haeufig[a.schluessel]! })) };
  }
  $effect(() => { const a = anstoss; untrack(() => { if (z.letzter !== a || !erg) { z.letzter = a; simuliere(); } }); });
  const gewaehlterAusgang = $derived(erg ? erg.ausgaenge.find(a => a.schluessel === erg!.gewaehlt) ?? null : null);
  const zeilen = $derived(erg ? erg.ausgaenge.map(a => ({ name: a.kurz, beob: a.haeufig / erg!.N, p: a.p })) : []);
  const wuerfelAnzahl = [1, 2] as const;
  function artWechsel() { z.ereignis = ''; }
</script>

<div class="ll-raster">
  <div class="ll-eingaben">
    <h2 class="ll-h">{L('Das Experiment', 'The experiment')}</h2>
    <div class="eingabe"><span class="lbl" id="ll-zf-art-l">{L('Was wird gezogen oder geworfen?', 'What is drawn or thrown?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="ll-zf-art-l">
        <label><input type="radio" name="ll-zf-art" value="muenze" bind:group={z.art} onchange={artWechsel}>{L('Münze', 'Coin')}</label>
        <label><input type="radio" name="ll-zf-art" value="wuerfel" bind:group={z.art} onchange={artWechsel}>{L('Würfel', 'Dice')}</label>
        <label><input type="radio" name="ll-zf-art" value="urne" bind:group={z.art} onchange={artWechsel}>{L('Urne', 'Urn')}</label></div></div>
    {#if z.art === 'muenze'}
      <div class="eingabe"><label for="ll-zf-p">{L('Wahrscheinlichkeit für einen Treffer (Kopf), in Prozent', 'Probability of a hit (heads), in percent')}</label><input id="ll-zf-p" type="text" inputmode="decimal" bind:value={z.p} onchange={artWechsel} style="max-width:9ch"></div>
    {:else if z.art === 'wuerfel'}
      <div class="eingabe"><span class="lbl" id="ll-zf-w-l">{L('Anzahl der Würfel', 'Number of dice')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="ll-zf-w-l">{#each wuerfelAnzahl as w}<label><input type="radio" name="ll-zf-w" value={w} bind:group={z.wuerfel} onchange={artWechsel}>{w === 1 ? L('1 Würfel (Augenzahl)', '1 die (pips)') : L('2 Würfel (Augensumme)', '2 dice (sum)')}</label>{/each}</div></div>
      <div class="eingabe"><label class="ll-check"><input type="checkbox" bind:checked={z.gezinkt} onchange={artWechsel}> {L('Gezinkter Würfel', 'Loaded die')}</label>
        {#if z.gezinkt}<label for="ll-zf-q6">{L('Wahrscheinlichkeit für die 6, in Prozent (die anderen Augenzahlen teilen den Rest gleich auf)', 'Probability of a six, in percent (the other numbers share the rest equally)')}</label><input id="ll-zf-q6" type="text" inputmode="decimal" bind:value={z.q6} onchange={artWechsel} style="max-width:9ch">{/if}</div>
    {:else}
      <div class="ll-zeile"><div class="eingabe"><label for="ll-zf-rot">{L('Rote Kugeln', 'Red balls')}</label><input id="ll-zf-rot" type="text" inputmode="numeric" bind:value={z.rot} onchange={artWechsel} style="max-width:8ch"></div>
        <div class="eingabe"><label for="ll-zf-blau">{L('Blaue Kugeln', 'Blue balls')}</label><input id="ll-zf-blau" type="text" inputmode="numeric" bind:value={z.blau} onchange={artWechsel} style="max-width:8ch"></div>
        <div class="eingabe"><label for="ll-zf-zieh">{L('Gezogen (1 bis 30)', 'Drawn (1 to 30)')}</label><input id="ll-zf-zieh" type="text" inputmode="numeric" bind:value={z.ziehungen} onchange={artWechsel} style="max-width:8ch"></div></div>
      <div class="eingabe"><span class="lbl" id="ll-zf-mit-l">{L('Nach dem Ziehen', 'After drawing')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="ll-zf-mit-l"><label data-begriff="ziehen-ohne-zuruecklegen"><input type="radio" name="ll-zf-mit" value={false} bind:group={z.mit}>{L('ohne Zurücklegen', 'without replacement')}</label><label data-begriff="ziehen-mit-zuruecklegen"><input type="radio" name="ll-zf-mit" value={true} bind:group={z.mit}>{L('mit Zurücklegen', 'with replacement')}</label></div></div>
    {/if}
    {#if fehler}<p class="fehler" role="alert">{fehler}</p>{/if}
    <div class="eingabe"><label for="ll-zf-N">{L('Wiederholungen', 'Repetitions')}</label>
      <select id="ll-zf-N" bind:value={z.N}>{#each [10, 100, 1000, 10000, 100000] as v}<option value={v}>{zahlDe(v)}</option>{/each}</select></div>
    {#if auswahl.length > 1 && z.art !== 'muenze'}
      <div class="eingabe"><label for="ll-zf-e">{L('Ergebnis, dessen Häufigkeit im Verlaufsbild steht', 'Outcome whose frequency is shown in the history chart')}</label>
        <select id="ll-zf-e" bind:value={z.ereignis} onchange={() => queueMicrotask(simuliere)}>{#each auswahl as a}<option value={String(a.schluessel)}>{a.name}</option>{/each}</select></div>
    {/if}
    <button class="k haupt gross" type="button" onclick={simuliere} disabled={!!fehler || undefined}>{L('Experiment durchführen', 'Run the experiment')}</button>
  </div>

  <div class="ll-ergebnis" use:ergebnisAnsage={{ satz: '.ll-satz', anzahl: 1 }}>
    {#if anim.an}<div class="ll-rechnet"><Rechnet text={L('Das Experiment läuft …', 'The experiment is running …')} /></div>{/if}
    {#if erg && gewaehlterAusgang}
      {@const e = erg}
      <h2 class="ll-h">{L('Relative Häufigkeit gegen Wahrscheinlichkeit', 'Relative frequency versus probability')}</h2>
      <figure class="ll-bild"><LernlaborVerlauf verlauf={e.verlauf} p={gewaehlterAusgang.p} pText={`P = ${zahlDe(gewaehlterAusgang.p, 4)}`}
        xText={L('Zahl der Wiederholungen (logarithmische Achse)', 'Number of repetitions (logarithmic axis)')} yText={L('Relative Häufigkeit', 'Relative frequency')}
        titel={L(`Verlauf der relativen Häufigkeit für „${gewaehlterAusgang.name}“`, `History of the relative frequency of "${gewaehlterAusgang.name}"`)}
        beschreibung={L(`Nach ${e.N} Wiederholungen (Startwert ${e.startwert}) ist die relative Häufigkeit ${zahlDe(e.verlauf[e.N - 1]!, 4)}; die Wahrscheinlichkeit ist ${zahlDe(gewaehlterAusgang.p, 4)}. Am Anfang schwankt die Linie stark, später liegt sie nahe an der Wahrscheinlichkeit.`, `After ${e.N} repetitions (seed ${e.startwert}) the relative frequency is ${zahlDe(e.verlauf[e.N - 1]!, 4)}; the probability is ${zahlDe(gewaehlterAusgang.p, 4)}. At first the line varies a lot, later it stays close to the probability.`)} />
        <figcaption>{L('Durchgezogen: die relative Häufigkeit nach jeder Wiederholung. Gestrichelt: die Wahrscheinlichkeit.', 'Solid: the relative frequency after each repetition. Dashed: the probability.')}</figcaption></figure>
      <figure class="ll-bild"><LernlaborSaeulen {zeilen} nameText={L('Ergebnis', 'Outcome')} yText={L('Relative Häufigkeit bzw. P', 'Relative frequency or P')}
        beobText={L('beobachtet', 'observed')} pText={L('Wahrscheinlichkeit P', 'probability P')}
        titel={L('Beobachtete relative Häufigkeiten neben den Wahrscheinlichkeiten', 'Observed relative frequencies next to the probabilities')}
        beschreibung={L(`Für jedes Ergebnis eine volle Säule (beobachtet, ${e.N} Wiederholungen) und eine schraffierte Säule (Wahrscheinlichkeit). Die Zahlen stehen in der Tabelle darunter.`, `For each outcome a solid bar (observed, ${e.N} repetitions) and a hatched bar (probability). The numbers are in the table below.`)} /></figure>
      <LernlaborTabelle titel={L(`Alle Ergebnisse nach ${e.N} Wiederholungen`, `All outcomes after ${e.N} repetitions`)}><table class="ll-tabelle"><caption>{L(`Alle Ergebnisse nach ${e.N} Wiederholungen`, `All outcomes after ${e.N} repetitions`)}</caption>
        <thead><tr><th scope="col">{L('Ergebnis', 'Outcome')}</th><th scope="col">{L('Häufigkeit', 'Count')}</th><th scope="col">{L('Relative Häufigkeit', 'Relative frequency')}</th><th scope="col">{L('Wahrscheinlichkeit P (exakt)', 'Probability P (exact)')}</th></tr></thead>
        <tbody>{#each e.ausgaenge as a}<tr><th scope="row">{a.name}</th><td>{zahlDe(a.haeufig)}</td><td>{zahlDe(a.haeufig / e.N, 4)}</td><td>{wk(a.p)}</td></tr>{/each}</tbody></table></LernlaborTabelle>
      <p class="ll-satz" data-startwert={e.startwert}>{satzExperiment(gewaehlterAusgang.name, e.N, e.startwert, e.verlauf[e.N - 1]!, gewaehlterAusgang.p)}</p>
      <p class="ll-lehre">{lehreGrosseZahlen()}</p>
    {:else if !anim.an && !fehler}
      <p class="ll-lehre">{d('Wähle ein Experiment und führe es durch.', 'Wählen Sie ein Experiment und führen Sie es durch.', 'Choose an experiment and run it.')}</p>
    {/if}
  </div>
</div>

<style>
  .ll-check { display: inline-flex; align-items: center; gap: var(--a2); font-size: var(--gr-text) !important; color: var(--tinte) !important; font-weight: 400 !important; min-height: var(--ziel); }
  .ll-check input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 0; }
</style>
