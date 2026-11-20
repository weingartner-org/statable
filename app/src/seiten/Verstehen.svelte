<script lang="ts">
  import '../stil/verstehen.css';
  import { L, d, aktuelleSprache } from '../lib/sitzung.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import Rand, { type RandKontext } from '../bausteine/Rand.svelte';
  import VerstehenVerteilungen from '../bausteine/VerstehenVerteilungen.svelte';
  import VerstehenKennzahlen from '../bausteine/VerstehenKennzahlen.svelte';
  import VerstehenVergleich from '../bausteine/VerstehenVergleich.svelte';
  import VerstehenAnteilstest from '../bausteine/VerstehenAnteilstest.svelte';
  import VerstehenZuteilung from '../bausteine/VerstehenZuteilung.svelte';
  import Lernlabor from '../bausteine/Lernlabor.svelte';
  import VerstehenEffekt from '../bausteine/VerstehenEffekt.svelte';
  import VerstehenKennlinie from '../bausteine/VerstehenKennlinie.svelte';
  import VerstehenGerade from '../bausteine/VerstehenGerade.svelte';
  import VerstehenUeben from '../bausteine/VerstehenUeben.svelte';
  import VerstehenProbieren from '../bausteine/VerstehenProbieren.svelte';
  import LernSuche from '../bausteine/LernSuche.svelte';
  import { VERSTEHEN_KACHELN } from '../lernen/probierziele';
  import { THEMEN } from '../lernen/fragen';
  import { randWahl } from '../lib/randwahl.svelte';
  import { verstehenTitel } from '../lib/verstehen-titel';

  /** `teil`: die Kachel aus der Adresse (#verstehen/<kachel>); leer = die Übersicht. Keine Daten, kein Projekt, nichts landet in der .statable-Datei. */
  let { teil = '' }: { teil?: string } = $props();
  /** `teil` kann `ueben/<thema>` sein: die Kachel ist der erste Teil, der Rest das Thema. */
  const uebenThema = $derived(teil.startsWith('ueben/') ? teil.slice(6) : '');
  /** `probieren/<baustein>`: die Kachel „Ausprobieren“. */
  const probierTeil = $derived(teil.startsWith('probieren/') ? teil.slice(10) : '');
  /** `lernlabor/<reiter>`: öffnet das Lernlabor auf einem Karteireiter (Sprung aus der Suche). */
  const laborTeil = $derived(teil.startsWith('lernlabor/') ? teil.slice(10) : '');
  const kachel = $derived(laborTeil ? 'lernlabor' : teil === 'probieren' || probierTeil ? 'probieren' : (VERSTEHEN_KACHELN as readonly string[]).includes(teil) ? teil : (teil === 'ueben' || uebenThema) ? 'ueben' : '');
  const titel = $derived(verstehenTitel()[kachel] ?? L('Rechner und Regler', 'Calculators and sliders'));
  const intro = $derived(kachel === 'verteilungen' ? L('Wahrscheinlichkeiten, Quantile, Erwartungswert und Streuung für Normal-, t-, χ²-, F-, Binomial-, Poisson- und hypergeometrische Verteilung - und für eine eigene Tabelle. Mit Bild.', 'Probabilities, quantiles, mean and spread for the normal, t, χ², F, binomial, Poisson and hypergeometric distributions - and for your own table. With a picture.')
    : kachel === 'kennzahlen' ? d('Konfidenzintervall und Test für einen Anteil oder einen Mittelwert, wenn du nur die Zahlen hast, der nötige Stichprobenumfang für eine gewünschte Breite und Raten aus Ereignissen und Personenzeit.', 'Konfidenzintervall und Test für einen Anteil oder einen Mittelwert, wenn Sie nur die Zahlen haben, der nötige Stichprobenumfang für eine gewünschte Breite und Raten aus Ereignissen und Personenzeit.', 'Confidence interval and test for a proportion or a mean when you only have the numbers, the sample size needed for a desired width, and rates from events and person-time.')
    : kachel === 'vergleich' ? L('t-Test, Varianzanalyse, Korrelation und χ²-Test aus Mittelwert, Standardabweichung und n oder aus einer Tabelle - wie im Menü „Stats“ des TI-84, mit den Schritten für Taschenrechner und Excel.', 'T test, analysis of variance, correlation and χ² test from mean, standard deviation and n or from a table - like the "Stats" menu of the TI-84, with the steps for calculator and Excel.')
    : kachel === 'anteilstest' ? L('Der Binomialtest Schritt für Schritt: Ablehnungsbereich, tatsächliches α, p-Wert, Fehler 2. Art und Prognoseintervall.', 'The binomial test step by step: rejection region, actual α, p value, type II error and prediction interval.')
    : kachel === 'lernlabor' ? L('Ausprobieren statt glauben: Stichprobenverteilung, Bootstrap, Randomisierung, Zufallsexperimente, Vierfeldertafel und die Überdeckung von Konfidenzintervallen.', 'Try it instead of believing: sampling distribution, bootstrap, randomisation, random experiments, four-field table and the coverage of confidence intervals.')
    : kachel === 'zuteilung' ? L('Eine einfache Zufallsstichprobe aus einer Liste ziehen oder eine Zuteilungsliste mit Blöcken und Schichten erstellen - mit sichtbarem Startwert, als Lehrmittel.', 'Draw a simple random sample from a list or create an allocation list with blocks and strata - with a visible seed, as a teaching tool.')
    : kachel === 'effekt' ? L('Zwei Gruppen mit einem Schieberegler auseinanderziehen: Überlappung, Anteil über dem Mittelwert, Wahrscheinlichkeit der Überlegenheit und nötige Gruppengröße.', 'Pull two groups apart with a slider: overlap, share above the mean, probability of superiority and the group size needed.')
    : kachel === 'kennlinie' ? L('Schwierigkeit und Trennschärfe einer Testaufgabe mit Schiebereglern verändern und sehen, wie wahrscheinlich eine richtige Antwort bei jeder Fähigkeit ist.', 'Change the difficulty and discrimination of a test task with sliders and see how likely a right answer is at every ability.')
    : kachel === 'gerade' ? L('Regressionsgerade, Korrelation und Bestimmtheitsmaß an Punktwolken sehen: warum Zahlen allein täuschen können und ein Bild immer dazugehört.', 'See regression line, correlation and coefficient of determination on scatter plots: why numbers alone can deceive and a picture always belongs.')
    : kachel === 'probieren' ? L('Drei kleine Regler zum Ausprobieren: Cronbachs Alpha mit mehr Fragen, Konfidenzintervall mit mehr Personen, Vorhersagewert bei seltener Krankheit. Die Zahl ändert sich sofort.', 'Three small sliders to try: Cronbach\'s alpha with more questions, confidence interval with more people, predictive value for a rare disease. The numbers change at once.') + ' ' + L('Zwei weitere gehören zum Lernpfad „Das lineare Modell“: Modellwert mit kleinster Quadratsumme und Achsenbeginn eines Diagramms.', 'Two more belong to the learning path "The linear model": model value with the smallest sum of squares and axis start of a chart.')
    : kachel === 'ueben' ? L('Eine Frage nach der anderen, drei bis fünf Antworten, sofort die Erklärung. Fehler werden am Ende gesammelt und lassen sich noch einmal üben.', 'One question after the other, three to five answers, the explanation right away. Mistakes are collected at the end and can be practised again.')
    : '');
  const hilfeId = $derived(kachel ? (kachel === 'probieren' ? (probierTeil === 'intervall' ? 'konfidenzintervall' : probierTeil === 'vorhersage' ? 'vorhersagewert' : probierTeil === 'modell' ? 'lm-modell-fehler' : probierTeil === 'achse' ? 'lm-diagramme' : probierTeil === 'alpha' || !probierTeil ? 'reliabilitaet' : 'verstehen') : kachel === 'ueben' ? 'verstehen' : kachel === 'lernlabor' ? 'lernlabor' : kachel === 'vergleich' ? 'verstehen-kennzahlen' : `verstehen-${kachel}`) : 'verstehen');
  /** Die Seitenleiste erklärt, was man gerade ausprobiert (Johannes 30.10.): der Hilfe-Artikel zur Kachel, in der Übersicht die Kurzfassung. */
  const uebenHilfe = $derived(THEMEN.find(t => t.id === uebenThema)?.hilfe[0]);
  /** In einer Übungsrunde erklärt der Rand den Begriff der gerade gezeigten Frage (Johannes 31.10., `lernen/fragen-seite.ts`). */
  let uebenSeite = $state<{ id: string; titel: string }>();
  let lernFrage = $state('');
  const randKontext = $derived<RandKontext>(randWahl.k ?? (uebenSeite ? { titel: uebenSeite.titel, artikel: uebenSeite.id, teile: ['kurz'] } : { titel: kachel ? titel : L('Verstehen', 'Understand'), artikel: uebenHilfe ?? hilfeId, teile: kachel && kachel !== 'ueben' ? ['alles'] : ['kurz'] }));
</script>

<div class="tisch"><section class="blatt rund vst" aria-labelledby="vs-t">
  <SeitenKopf titelId="vs-t" {titel} hilfe={{ id: hilfeId, text: L('Hilfe zu Verstehen', 'Help on Understand') }} zurueck={uebenThema ? 'verstehen/ueben' : kachel ? 'verstehen' : true}>
    {#snippet untertitel()}<p>{kachel ? intro : d('Rechnen und Ausprobieren ohne eigene Daten: Verteilungen, Intervalle, Tests und Zufallsexperimente zum Verstehen. Du brauchst dafür kein Projekt, nichts wird gespeichert.', 'Rechnen und Ausprobieren ohne eigene Daten: Verteilungen, Intervalle, Tests und Zufallsexperimente zum Verstehen. Sie brauchen dafür kein Projekt, nichts wird gespeichert.', 'Calculating and experimenting without data of your own: distributions, intervals, tests and random experiments for understanding. You need no project for this, nothing is saved.')}</p>{/snippet}
  </SeitenKopf>

  {#if kachel === 'verteilungen'}<VerstehenVerteilungen />
  {:else if kachel === 'kennzahlen'}<VerstehenKennzahlen />
  {:else if kachel === 'vergleich'}<VerstehenVergleich />
  {:else if kachel === 'anteilstest'}<VerstehenAnteilstest />
  {:else if kachel === 'lernlabor'}<Lernlabor reiter={laborTeil} />
  {:else if kachel === 'zuteilung'}<VerstehenZuteilung />
  {:else if kachel === 'effekt'}<VerstehenEffekt />
  {:else if kachel === 'kennlinie'}<VerstehenKennlinie />
  {:else if kachel === 'gerade'}<VerstehenGerade />
  {:else if kachel === 'probieren'}<VerstehenProbieren teil={probierTeil} />
  {:else if kachel === 'ueben'}<VerstehenUeben thema={uebenThema} bind:seite={uebenSeite} />
  {:else}
    <p><a href="#lernen">{L('Zurück zu Lernen: Einheiten mit Erklärung, Beispiel, Regler und Fragen', 'Back to Learning: units with explanation, example, slider and questions')}</a></p>
    <LernSuche bind:frage={lernFrage} />
    {#if !lernFrage.trim()}<section class="vst-gruppe-kacheln" aria-labelledby="vs-rechnen"><h2 id="vs-rechnen">{L('Rechnen', 'Calculate')} · 5</h2>
    <ul class="vst-kacheln">
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="verteilung" /><h3><a href="#verstehen/verteilungen">{L('Verteilungen berechnen: Wahrscheinlichkeitsverteilungen', 'Calculate distributions: probability distributions')}</a></h3></div>
        <p>{L('Wahrscheinlichkeit, Quantil, Erwartungswert: Normal, t, χ², F, Binomial, Poisson, hypergeometrisch und eigene Tabelle - mit Bild.', 'Probability, quantile, mean: normal, t, χ², F, binomial, Poisson, hypergeometric and your own table - with a picture.')}</p></li>
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="rechnen" /><h3><a href="#verstehen/kennzahlen">{L('Aus Kennzahlen rechnen: Konfidenzintervall und Test', 'Calculate from summary numbers: confidence interval and test')}</a></h3></div>
        <p>{d('Nur Anzahl und n, Mittelwert und Standardabweichung oder Ereignisse und Personenzeit: Intervall, Test, Effektstärke, Raten - und wie groß die Stichprobe sein muss.', 'Nur Anzahl und n, Mittelwert und Standardabweichung oder Ereignisse und Personenzeit: Intervall, Test, Effektstärke, Raten - und wie groß die Stichprobe sein muss.', 'Only count and n, mean and standard deviation, or events and person-time: interval, test, effect size, rates - and how large the sample must be.')}</p></li>
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="rechnen" /><h3><a href="#verstehen/vergleich">{L('Gruppen aus Kennzahlen vergleichen: t-Test, Varianzanalyse, χ²-Test', 'Compare groups from summary numbers: t test, analysis of variance, χ² test')}</a></h3></div>
        <p>{L('t-Test, Varianzanalyse, Korrelation und χ²-Test aus x̄, s und n oder einer Tabelle - mit den Schritten für TI-84 und Excel.', 'T test, analysis of variance, correlation and χ² test from x̄, s and n or a table - with the steps for TI-84 and Excel.')}</p></li>
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="gluehbirne" /><h3><a href="#verstehen/anteilstest">{L('Anteilstest verstehen: Binomialtest', 'Understand the test for a proportion: binomial test')}</a></h3></div>
        <p>{L('Binomialtest mit Ablehnungsbereich, tatsächlichem α, p-Wert, Teststärke und Prognoseintervall - wie in der Schule und der Hochschule.', 'Binomial test with rejection region, actual α, p value, power and prediction interval - as taught in school and university.')}</p></li>
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="gruppen" /><h3><a href="#verstehen/zuteilung">{L('Zufall zuteilen: Zufallsstichprobe und Randomisierung', 'Allocate by chance: random sample and randomisation')}</a></h3></div>
        <p>{L('Eine Zufallsstichprobe aus einer Liste ziehen oder Personen auf Gruppen verteilen (Randomisierung): Blöcke, Schichten, sichtbarer Startwert. Ein Lehrmittel, keine echte Studienrandomisierung.', 'Draw a random sample from a list or distribute people to groups (randomisation): blocks, strata, visible seed. A teaching tool, not a real study randomisation.')}</p></li>
    </ul></section>
    <section class="vst-gruppe-kacheln" aria-labelledby="vs-sehen"><h2 id="vs-sehen">{L('Ausprobieren und sehen', 'Try out and see')} · 6</h2>
    <ul class="vst-kacheln">
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="faktor" /><h3><a href="#verstehen/lernlabor">{L('Lernlabor: Wahrscheinlichkeit und Stichproben', 'Learning lab: probability and samples')}</a></h3></div>
        <p>{L('Ausprobieren statt glauben: Stichproben ziehen, Bootstrap, Randomisierung, Zufallsexperimente, Vierfeldertafel und Überdeckung.', 'Try it instead of believing: draw samples, bootstrap, randomisation, random experiments, four-field table and coverage.')}</p></li>
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="gruppen" /><h3><a href="#verstehen/effekt">{L('Effektstärke sehen: Cohens d und Teststärke', 'See the effect size: Cohen\'s d and power')}</a></h3></div>
        <p>{L('Cohens d an zwei Glockenkurven mit einem Schieberegler: Wie groß ist ein kleiner, mittlerer, großer Unterschied, und wie viele Personen braucht man, um ihn zu finden (Teststärke)?', 'Cohen\'s d on two bell curves with a slider: how big is a small, medium, large difference, and how many people are needed to find it (power)?')}</p></li>
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="skala" /><h3><a href="#verstehen/kennlinie">{L('Aufgabe und Kennlinie: Item-Response-Theorie (Rasch, 2PL)', 'Task and characteristic curve: item response theory (Rasch, 2PL)')}</a></h3></div>
        <p>{L('Schwierigkeit und Trennschärfe einer Testaufgabe mit Schiebereglern: wie wahrscheinlich ist eine richtige Antwort bei welcher Fähigkeit? Zum Verstehen von Rasch- und 2PL-Modell.', 'Difficulty and discrimination of a test task with sliders: how likely is a right answer at which ability? For understanding the Rasch and the 2PL model.')}</p></li>
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="rechnen" /><h3><a href="#verstehen/gerade">{L('Gerade zum Anfassen: Regression und Korrelation', 'A line to play with: regression and correlation')}</a></h3></div>
        <p>{L('Regressionsgerade und Korrelation an Punktwolken: Anscombes Quartett, ein Punkt zum Verschieben und das Simpson-Paradox.', 'Regression line and correlation on scatter plots: Anscombe\'s quartet, a point to move and the Simpson paradox.')}</p></li>
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="gluehbirne" /><h3><a href="#verstehen/probieren">{L('Ausprobieren: Was verändert das Ergebnis?', 'Try it out: what changes the result?')}</a></h3></div>
        <p>{L('Cronbachs Alpha mit mehr Fragen, Konfidenzintervall mit mehr Personen, Vorhersagewert bei seltener Krankheit - drei kleine Regler.', 'Cronbach\'s alpha with more questions, confidence interval with more people, predictive value for a rare disease - three small sliders.')}</p></li>
      <li class="vst-kachel"><div class="vst-kachel-kopf"><Icon n="frage" /><h3><a href="#verstehen/ueben">{L('Üben: Fragen mit Erklärung', 'Practise: questions with explanations')}</a></h3></div>
        <p>{L('Fragen zu Faktorenanalyse, Skalen, Regression und mehr: drei bis fünf Antworten, sofort die Erklärung, am Ende die Fehler zum Wiederholen.', 'Questions on factor analysis, scales, regression and more: three to five answers, the explanation right away, the mistakes at the end to go over again.')}</p></li>
    </ul></section>{/if}
  {/if}
</section><Rand kontext={randKontext} mitVerlauf={false} /></div>
