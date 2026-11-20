<script module lang="ts">
  /** Die Regler bleiben beim Wechsel zur Hilfe und zurück erhalten (Zustand nur im Modul, nie im Projekt). */
  const z = $state({ k: 6, r: 0.25, n: 20, s: 10, sens: 90, spez: 90, haeuf: 1, m: 3, achse: 0 });
</script>
<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import { alphaAusK, intervallBreite, vierfeld } from '../lib/probieren';
  import { PROBIER_TEILE } from '../lernen/probierziele';
  import { ganzZahl, proz } from '../i18n/profil';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';

  /** `teil`: alpha, intervall oder vorhersage; es steht immer nur ein Baustein da. */
  let { teil = 'alpha' }: { teil?: string } = $props();
  const wahl = $derived((PROBIER_TEILE as readonly string[]).includes(teil) ? teil : 'alpha');
  const name = (t: string) => t === 'alpha' ? L('Alpha: Zahl der Fragen', 'Alpha: number of questions') : t === 'intervall' ? L('Intervall: Zahl der Personen', 'Interval: number of people') : t === 'modell' ? L('Modellwert: Wo liegt die kleinste Quadratsumme?', 'Model value: where is the smallest sum of squares?') : t === 'achse' ? L('Achse: Wie sehr täuscht ein später Achsenbeginn?', 'Axis: how much does a late axis start mislead?') : L('Vorhersagewert: seltene Krankheit', 'Predictive value: rare disease');
  const pz = (v: number) => proz(komma(v * 100, 1));
  const set = (k: 'k' | 'r' | 'n' | 's' | 'sens' | 'spez' | 'haeuf' | 'm' | 'achse') => (e: Event) => { z[k] = Number((e.currentTarget as HTMLInputElement).value); };

  // a) Alpha
  const alpha = $derived(alphaAusK(z.k, z.r));
  const k2 = $derived(z.k * 2);
  const W = 600, H = 260, X0 = 44, XR = 20, T0 = 16, U0 = 42;
  const ax = (k: number) => X0 + (W - X0 - XR) * ((k - 2) / 28), ay = (a: number) => T0 + (H - T0 - U0) * (1 - a);
  const kurve = $derived(Array.from({ length: 29 }, (_, i) => `${i ? 'L' : 'M'}${ax(i + 2).toFixed(1)},${ay(alphaAusK(i + 2, z.r)).toFixed(1)}`).join(' '));

  // b) Konfidenzintervall
  const ki = $derived(intervallBreite(z.n, z.s));
  const ki4 = $derived(intervallBreite(z.n * 4, z.s));
  const KI_MAX = 40;
  const ix = (v: number) => X0 + (W - X0 - XR) * ((v + KI_MAX) / (2 * KI_MAX));
  const bar = (h: number) => ({ x: ix(-h), b: Math.max(ix(h) - ix(-h), 3) });

  // d) Modellwert: Quadratsumme der Abweichungen von einem frei gewählten Wert (Daten wie in der Rechenaufgabe „Ergebnis = Modell + Fehler“)
  const MW = [4, 10, 2, 9, 5];
  const mwMittel = MW.reduce((a, v) => a + v, 0) / MW.length;
  const qsMit = (m: number) => MW.reduce((a, v) => a + (v - m) ** 2, 0);
  const qsMin = qsMit(mwMittel);
  const mx = (v: number) => X0 + (W - X0 - XR) * (v / 12);

  // e) Achse: zwei Säulen (80 und 90), Achsenbeginn wählbar
  const SA = 80, SB = 90;
  const hA = $derived(SA - z.achse), hB = $derived(SB - z.achse);
  const echt = (SB - SA) / SA * 100;
  const scheinbar = $derived((hB - hA) / hA * 100);
  const SH = 200, SY0 = 24;
  const sy = (h: number) => (SH * h) / (SB - z.achse);

  // c) Vorhersagewert
  const vf = $derived(vierfeld(z.sens / 100, z.spez / 100, z.haeuf / 100));
  const positiv = $derived(vf.tp + vf.fp);
  const BW = W - X0 - XR;
  const wTp = $derived(positiv > 0 ? BW * vf.tp / positiv : 0);

  // Bildtexte (Barrierefreiheit): ein Text je Bild
  const btAlpha = $derived(bildtext('linie', {
    titel: L(`Alpha nach Zahl der Fragen bei r = ${komma(z.r, 2)}`, `Alpha by number of questions at r = ${komma(z.r, 2)}`),
    xAchse: { name: L('Zahl der Fragen', 'Number of questions'), von: 2, bis: 30 }, yAchse: { name: 'Alpha', von: 0, bis: 1 },
    x: Array.from({ length: 29 }, (_, i) => i + 2), reihen: [{ werte: Array.from({ length: 29 }, (_, i) => alphaAusK(i + 2, z.r)) }]
  }));
  const btIntervall = $derived(bildtext('sonstiges', {
    artName: L('Balkenbild', 'Bar picture'), titel: L('Zwei Bereiche um den Mittelwert', 'Two ranges around the mean'),
    xAchse: { name: L('Abstand zum Mittelwert der Stichprobe', 'Distance from the sample mean'), von: -KI_MAX, bis: KI_MAX },
    saetze: [L(`Ein Balken je Zahl der Personen, jeweils symmetrisch um den Mittelwert (Linie bei 0).`, `One bar per number of people, each symmetric around the mean (line at 0).`)],
    tabelle: { kopf: [L('Personen (n)', 'People (n)'), L('Halbe Breite', 'Half width'), L('Breite', 'Width')], zeilen: [[ganzZahl(z.n), komma(ki.halb, 1), komma(ki.breite, 1)], [ganzZahl(z.n * 4), komma(ki4.halb, 1), komma(ki4.breite, 1)]] }
  }));
  const btVorhersage = $derived(bildtext('sonstiges', {
    artName: L('Balken', 'Bar'), titel: L('Alle positiven Ergebnisse', 'All positive results'),
    saetze: [L('Ein Balken, in zwei Teile geteilt: richtige und falsche positive Ergebnisse.', 'One bar divided into two parts: right and false positive results.')],
    kennwerte: [{ name: L('richtig', 'right'), wert: komma(vf.tp, 1) }, { name: L('falsch', 'false'), wert: komma(vf.fp, 1) }]
  }));
  const btModell = $derived(bildtext('sonstiges', {
    artName: L('Zahlengerade', 'Number line'), titel: L('Fünf Werte und ein Modellwert', 'Five values and a model value'),
    xAchse: { name: L('Lernstunden', 'Study hours'), von: 0, bis: 12 },
    saetze: [L(`Modellwert ${komma(z.m, 1)}; die Abweichungen sind Strecken von jedem Wert zum Modellwert. Quadratsumme ${komma(qsMit(z.m), 1)}.`, `Model value ${komma(z.m, 1)}; the deviations are segments from each value to the model value. Sum of squares ${komma(qsMit(z.m), 1)}.`)],
    tabelle: { kopf: [L('Nr', 'No'), L('Wert', 'Value'), L('Abweichung', 'Deviation'), L('Quadrat', 'Square')], zeilen: MW.map((v, i) => [i + 1, komma(v, 1), komma(v - z.m, 1), komma((v - z.m) ** 2, 2)]) }
  }));
  const btAchse = $derived(bildtext('saeulen', {
    titel: L('Zwei Säulen mit den Werten 80 und 90', 'Two columns with the values 80 and 90'), kategorien: ['A', 'B'], wertName: L('Höhe im Bild', 'Height in the picture'),
    reihen: [{ werte: [hA, hB] }], yAchse: { name: L('Wert', 'Value'), von: z.achse, bis: SB }
  }));
</script>

<div class="vst-raster">
  <div class="vst-links">
    <nav aria-label={L('Bausteine zum Ausprobieren', 'Things to try')}>
      <ul class="knopfzeile" style="list-style:none;padding:0;margin:0">
        {#each PROBIER_TEILE as t (t)}<li><a class="k {wahl === t ? '' : 'leise'}" href="#verstehen/probieren/{t}" aria-current={wahl === t ? 'page' : undefined}>{name(t)}</a></li>{/each}
      </ul>
    </nav>
    {#if wahl === 'alpha'}
      <fieldset class="vst-gruppe"><legend>{L('Eine Skala aus mehreren Fragen', 'A scale made of several questions')}</legend>
        <div class="eingabe"><label for="vp-k">{L('Zahl der Fragen', 'Number of questions')}: <output for="vp-k">{z.k}</output></label>
          <input id="vp-k" type="range" min="2" max="30" step="1" aria-label={L('Zahl der Fragen', 'Number of questions')} aria-valuetext={L(`${z.k} Fragen`, `${z.k} questions`)} value={z.k} oninput={set('k')} /></div>
        <div class="eingabe"><label for="vp-r">{L('Mittlerer Zusammenhang der Fragen (r)', 'Average relation between the questions (r)')}: <output for="vp-r">{komma(z.r, 2)}</output></label>
          <input id="vp-r" type="range" min="0.05" max="0.8" step="0.05" aria-label={L('Mittlerer Zusammenhang der Fragen (r)', 'Average relation between the questions (r)')} aria-valuetext={L(`Zusammenhang r ${komma(z.r, 2)}`, `Relation r ${komma(z.r, 2)}`)} value={z.r} oninput={set('r')} /></div>
      </fieldset>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Rechnung: α = k · r / (1 + (k − 1) · r). Sie gilt, wenn alle Fragen gleich stark zusammenhängen. Echte Daten weichen etwas ab.', 'Calculation: α = k · r / (1 + (k − 1) · r). It holds if all questions are related equally strongly. Real data differ a little.')}</p>
    {:else if wahl === 'intervall'}
      <fieldset class="vst-gruppe"><legend>{L('Eine Stichprobe und ihr Mittelwert', 'A sample and its mean')}</legend>
        <div class="eingabe"><label for="vp-n">{L('Zahl der Personen (n)', 'Number of people (n)')}: <output for="vp-n">{ganzZahl(z.n)}</output></label>
          <input id="vp-n" type="range" min="5" max="400" step="1" aria-label={L('Zahl der Personen (n)', 'Number of people (n)')} aria-valuetext={L(`${ganzZahl(z.n)} Personen`, `${ganzZahl(z.n)} people`)} value={z.n} oninput={set('n')} /></div>
        <div class="eingabe"><label for="vp-s">{L('Streuung (Standardabweichung)', 'Spread (standard deviation)')}: <output for="vp-s">{z.s}</output></label>
          <input id="vp-s" type="range" min="1" max="30" step="1" aria-label={L('Streuung (Standardabweichung)', 'Spread (standard deviation)')} aria-valuetext={L(`Streuung ${z.s}`, `Spread ${z.s}`)} value={z.s} oninput={set('s')} /></div>
      </fieldset>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Rechnung: Mittelwert ± t · s / √n, mit dem t-Wert für n − 1 Freiheitsgrade und 95 %.', 'Calculation: mean ± t · s / √n, with the t value for n − 1 degrees of freedom and 95%.')}</p>
    {:else if wahl === 'vorhersage'}
      <fieldset class="vst-gruppe"><legend>{L('Ein Test auf eine Krankheit', 'A test for a disease')}</legend>
        <div class="eingabe"><label for="vp-se">{L('Sensitivität (Kranke, die erkannt werden)', 'Sensitivity (sick people who are detected)')}: <output for="vp-se">{proz(String(z.sens))}</output></label>
          <input id="vp-se" type="range" min="50" max="100" step="1" aria-label={L('Sensitivität (Kranke, die erkannt werden)', 'Sensitivity (sick people who are detected)')} aria-valuetext={L(`Sensitivität ${proz(String(z.sens))}`, `Sensitivity ${proz(String(z.sens))}`)} value={z.sens} oninput={set('sens')} /></div>
        <div class="eingabe"><label for="vp-sp">{L('Spezifität (Gesunde, die ein negatives Ergebnis bekommen)', 'Specificity (healthy people who get a negative result)')}: <output for="vp-sp">{proz(String(z.spez))}</output></label>
          <input id="vp-sp" type="range" min="50" max="100" step="1" aria-label={L('Spezifität (Gesunde, die ein negatives Ergebnis bekommen)', 'Specificity (healthy people who get a negative result)')} aria-valuetext={L(`Spezifität ${proz(String(z.spez))}`, `Specificity ${proz(String(z.spez))}`)} value={z.spez} oninput={set('spez')} /></div>
        <div class="eingabe"><label for="vp-h">{L('Häufigkeit der Krankheit', 'How common the disease is')}: <output for="vp-h">{proz(komma(z.haeuf, 1))}</output></label>
          <input id="vp-h" type="range" min="0.1" max="50" step="0.1" aria-label={L('Häufigkeit der Krankheit', 'How common the disease is')} aria-valuetext={L(`Häufigkeit ${proz(komma(z.haeuf, 1))}`, `Frequency ${proz(komma(z.haeuf, 1))}`)} value={z.haeuf} oninput={set('haeuf')} /></div>
      </fieldset>
    {:else if wahl === 'modell'}
      <fieldset class="vst-gruppe"><legend>{L('Fünf Werte und ein Modell', 'Five values and a model')}</legend>
        <div class="eingabe"><label for="vp-m">{L('Modellwert (Vorhersage für alle)', 'Model value (prediction for everybody)')}: <output for="vp-m">{komma(z.m, 1)}</output></label>
          <input id="vp-m" type="range" min="0" max="12" step="0.5" aria-label={L('Modellwert (Vorhersage für alle)', 'Model value (prediction for everybody)')} aria-valuetext={L(`Modellwert ${komma(z.m, 1)}`, `Model value ${komma(z.m, 1)}`)} value={z.m} oninput={set('m')} /></div>
      </fieldset>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Die fünf Werte sind Lernstunden: 4, 10, 2, 9 und 5. Quadratsumme = Summe aus (Wert − Modellwert)². Beim Mittelwert 6 ist sie am kleinsten.', 'The five values are study hours: 4, 10, 2, 9 and 5. Sum of squares = sum of (value − model value)². At the mean 6 it is smallest.')}</p>
    {:else}
      <fieldset class="vst-gruppe"><legend>{L('Zwei Säulen: 80 und 90', 'Two columns: 80 and 90')}</legend>
        <div class="eingabe"><label for="vp-a">{L('Die Achse beginnt bei', 'The axis starts at')}: <output for="vp-a">{z.achse}</output></label>
          <input id="vp-a" type="range" min="0" max="76" step="2" aria-label={L('Die Achse beginnt bei', 'The axis starts at')} aria-valuetext={L(`Achse beginnt bei ${z.achse}`, `Axis starts at ${z.achse}`)} value={z.achse} oninput={set('achse')} /></div>
      </fieldset>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Zwei Mensen: 80 % und 90 % Zufriedenheit. Das Auge vergleicht die Höhen der Säulen im Bild. Wie viel höher wirkt B, wenn die Achse später beginnt?', 'Two canteens: 80% and 90% satisfaction. The eye compares the heights of the columns in the picture. How much higher does B look when the axis starts later?')}</p>
    {/if}
  </div>
  <div class="vst-rechts">
    {#if wahl === 'alpha'}
      <section class="vst-ergebnis" aria-labelledby="vp-erg"><h2 id="vp-erg">α = {komma(alpha, 2)}</h2>
        <p class="heft-text">{L(`Mit ${z.k} Fragen und einem mittleren Zusammenhang von r = ${komma(z.r, 2)} kommt α = ${komma(alpha, 2)} heraus. Mit doppelt so vielen Fragen (${k2}) wäre es bei gleichem Zusammenhang α = ${komma(alphaAusK(k2, z.r), 2)}.`, `With ${z.k} questions and an average relation of r = ${komma(z.r, 2)}, α = ${komma(alpha, 2)}. With twice as many questions (${k2}) and the same relation, α would be ${komma(alphaAusK(k2, z.r), 2)}.`)}</p>
        <p class="heft-text">{L('Alpha steigt also schon durch mehr Fragen, auch wenn die Fragen nicht besser zusammenhängen. Ein hohes Alpha allein sagt darum nicht, dass die Fragen zusammenpassen.', 'So alpha rises just because there are more questions, even if the questions are not related any better. A high alpha alone therefore does not show that the questions fit together.')}</p>
      </section>
      <section class="vst-bild" aria-labelledby="vp-bild"><h2 id="vp-bild" class="nur-vorleser">{L('Bild', 'Picture')}</h2>
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={btAlpha.kurz}>
          <path d={kurve} fill="none" stroke="var(--dg-a)" stroke-width="2.5" />
          <line x1={X0} x2={W - XR} y1={ay(0)} y2={ay(0)} stroke="var(--tinte-2, #666)" />
          <line x1={X0} x2={X0} y1={ay(1)} y2={ay(0)} stroke="var(--tinte-2, #666)" />
          <circle cx={ax(z.k)} cy={ay(alpha)} r="6" fill="var(--dg-b, var(--akzent))" />
          {#each [2, 10, 20, 30] as m (m)}<text x={ax(m)} y={H - U0 + 16} text-anchor="middle" class="klein">{m}</text>{/each}
          {#each [0, 0.5, 1] as m (m)}<text x={X0 - 6} y={ay(m) + 4} text-anchor="end" class="klein">{komma(m, 1)}</text>{/each}
          <text x={(X0 + W - XR) / 2} y={H - 6} text-anchor="middle" class="klein">{L('Zahl der Fragen', 'Number of questions')}</text>
        </svg>
        <BildBeschreibung {...btAlpha} />
      </section>
    {:else if wahl === 'intervall'}
      <section class="vst-ergebnis" aria-labelledby="vp-erg"><h2 id="vp-erg">{L(`Breite ${komma(ki.breite, 1)}`, `Width ${komma(ki.breite, 1)}`)}</h2>
        <p class="heft-text">{L(`Mit ${ganzZahl(z.n)} Personen und einer Streuung von ${z.s} reicht das Intervall vom Mittelwert der Stichprobe minus ${komma(ki.halb, 1)} bis plus ${komma(ki.halb, 1)}. Es ist ${komma(ki.breite, 1)} breit.`, `With ${ganzZahl(z.n)} people and a spread of ${z.s}, the interval runs from the sample mean minus ${komma(ki.halb, 1)} to plus ${komma(ki.halb, 1)}. It is ${komma(ki.breite, 1)} wide.`)}</p>
        <p class="heft-text">{L(`Mit 4-mal so vielen Personen (${ganzZahl(z.n * 4)}) wäre es nur ${komma(ki4.breite, 1)} breit, etwa halb so breit. Mehr Personen machen das Intervall schmaler: Es zeigt genauer, welche Werte nach den Daten gut möglich sind.`, `With 4 times as many people (${ganzZahl(z.n * 4)}) it would be only ${komma(ki4.breite, 1)} wide, about half as wide. More people make the interval narrower: it shows more precisely which values are well possible according to the data.`)}</p>
      </section>
      <section class="vst-bild" aria-labelledby="vp-bild"><h2 id="vp-bild" class="nur-vorleser">{L('Bild', 'Picture')}</h2>
        <svg class="diagramm" viewBox="0 0 {W} {H - 60}" role="img" aria-label={btIntervall.kurz}>
          {#each [{ i: ki, y: 40, n: z.n, f: 'var(--dg-a)' }, { i: ki4, y: 100, n: z.n * 4, f: 'var(--dg-b, var(--akzent))' }] as r (r.y)}
            {@const b = bar(r.i.halb)}
            <text x={X0} y={r.y - 12} class="klein">n = {ganzZahl(r.n)}</text>
            <rect x={b.x} y={r.y} width={b.b} height="22" rx="4" fill={r.f} />
          {/each}
          <line x1={ix(0)} x2={ix(0)} y1="20" y2="140" stroke="var(--tinte-2, #666)" stroke-dasharray="4 3" />
          <line x1={X0} x2={W - XR} y1="145" y2="145" stroke="var(--tinte-2, #666)" />
          {#each [-40, -20, 0, 20, 40] as m (m)}<text x={ix(m)} y="162" text-anchor="middle" class="klein">{m > 0 ? '+' : m < 0 ? '−' : ''}{Math.abs(m)}</text>{/each}
          <text x={(X0 + W - XR) / 2} y="188" text-anchor="middle" class="klein">{L('Abstand zum Mittelwert der Stichprobe', 'Distance from the sample mean')}</text>
        </svg>
        <BildBeschreibung {...btIntervall} />
      </section>
    {:else if wahl === 'vorhersage'}
      <section class="vst-ergebnis" aria-labelledby="vp-erg"><h2 id="vp-erg">{L(`Ein positives Ergebnis stimmt in ${pz(vf.ppv)}`, `A positive result is right in ${pz(vf.ppv)}`)}</h2>
        <p class="heft-text">{L(`Von 1000 Personen sind ${komma(vf.tp + vf.fn, 1)} krank. Der Test fällt bei ${komma(positiv, 1)} Personen positiv aus; davon sind ${komma(vf.tp, 1)} wirklich krank und ${komma(vf.fp, 1)} gesund.`, `Of 1000 people, ${komma(vf.tp + vf.fn, 1)} are sick. The test is positive for ${komma(positiv, 1)} people; of these ${komma(vf.tp, 1)} are really sick and ${komma(vf.fp, 1)} are healthy.`)}</p>
        <p class="heft-text">{L(`Positiver Vorhersagewert: ${pz(vf.ppv)} der positiven Ergebnisse stimmen. Negativer Vorhersagewert: ${pz(vf.npv)} der negativen Ergebnisse stimmen.`, `Positive predictive value: ${pz(vf.ppv)} of the positive results are right. Negative predictive value: ${pz(vf.npv)} of the negative results are right.`)}</p>
        <p class="heft-text">{L('Bei einer seltenen Krankheit sind viele positive Ergebnisse falsch, auch bei einem guten Test. Je häufiger die Krankheit ist, desto höher ist der positive Vorhersagewert.', 'When a disease is rare, many positive results are false, even with a good test. The more common the disease, the higher the positive predictive value.')}</p>
      </section>
      <section class="vst-bild" aria-labelledby="vp-bild"><h2 id="vp-bild">{L('Vierfeldertafel für 1000 Personen', 'Four-field table for 1000 people')}</h2>
        <table class="vst-tabelle">
          <thead><tr><th scope="col"></th><th scope="col">{L('Test positiv', 'Test positive')}</th><th scope="col">{L('Test negativ', 'Test negative')}</th></tr></thead>
          <tbody>
            <tr><th scope="row">{L('Krank', 'Sick')}</th><td>{komma(vf.tp, 1)}</td><td>{komma(vf.fn, 1)}</td></tr>
            <tr><th scope="row">{L('Gesund', 'Healthy')}</th><td>{komma(vf.fp, 1)}</td><td>{komma(vf.tn, 1)}</td></tr>
          </tbody>
        </table>
        <svg class="diagramm" viewBox="0 0 {W} 90" role="img" aria-label={btVorhersage.kurz}>
          <text x={X0} y="18" class="klein">{L('Alle positiven Ergebnisse', 'All positive results')}</text>
          <rect x={X0} y="28" width={Math.max(wTp, wTp > 0 ? 2 : 0)} height="26" fill="var(--dg-a)" />
          <rect x={X0 + wTp} y="28" width={BW - wTp} height="26" fill="var(--tinte-2, #888)" fill-opacity="0.5" />
          <text x={X0} y="74" class="klein">{L('richtig', 'right')}: {komma(vf.tp, 1)} · {L('falsch', 'false')}: {komma(vf.fp, 1)}</text>
        </svg>
        <BildBeschreibung {...btVorhersage} />
      </section>
    {:else if wahl === 'modell'}
      <section class="vst-ergebnis" aria-labelledby="vp-erg"><h2 id="vp-erg">{L(`Quadratsumme ${komma(qsMit(z.m), 1)}`, `Sum of squares ${komma(qsMit(z.m), 1)}`)}</h2>
        <p class="heft-text">{L(`Mit dem Modellwert ${komma(z.m, 1)} liegt die Quadratsumme der Abweichungen bei ${komma(qsMit(z.m), 1)}. Beim Mittelwert ${komma(mwMittel, 1)} wäre sie ${komma(qsMin, 1)}, der kleinste mögliche Wert.`, `With the model value ${komma(z.m, 1)} the sum of squared deviations is ${komma(qsMit(z.m), 1)}. At the mean ${komma(mwMittel, 1)} it would be ${komma(qsMin, 1)}, the smallest possible value.`)}</p>
        <p class="heft-text">{L('Jeder andere Wert gibt eine größere Quadratsumme. Darum ist der Mittelwert das einfachste Modell, das die Daten am besten trifft.', 'Every other value gives a larger sum of squares. That is why the mean is the simplest model that fits the data best.')}</p>
      </section>
      <section class="vst-bild" aria-labelledby="vp-bild"><h2 id="vp-bild" class="nur-vorleser">{L('Bild', 'Picture')}</h2>
        <svg class="diagramm" viewBox="0 0 {W} 190" role="img" aria-label={btModell.kurz}>
          {#each MW as v, i (i)}
            <line x1={mx(v)} x2={mx(z.m)} y1={28 + i * 26} y2={28 + i * 26} stroke="var(--dg-b, var(--akzent))" stroke-width="2.5" />
            <circle cx={mx(v)} cy={28 + i * 26} r="6" fill="var(--dg-a)" stroke="var(--blatt)" stroke-width="1.2" />
          {/each}
          <line x1={mx(z.m)} x2={mx(z.m)} y1="10" y2="150" stroke="var(--tinte, #222)" stroke-width="2" stroke-dasharray="5 3" />
          <line x1={X0} x2={W - XR} y1="155" y2="155" stroke="var(--tinte-2, #666)" />
          {#each [0, 2, 4, 6, 8, 10, 12] as m (m)}<text x={mx(m)} y="172" text-anchor="middle" class="klein">{m}</text>{/each}
          <text x={(X0 + W - XR) / 2} y="188" text-anchor="middle" class="klein">{L('Lernstunden', 'Study hours')}</text>
        </svg>
        <BildBeschreibung {...btModell} />
      </section>
    {:else}
      <section class="vst-ergebnis" aria-labelledby="vp-erg"><h2 id="vp-erg">{L(`B wirkt ${komma(scheinbar, 0)} % höher`, `B looks ${komma(scheinbar, 0)}% higher`)}</h2>
        <p class="heft-text">{L(`Echt ist B um ${komma(echt, 1)} % höher als A (90 gegen 80). Mit dem Achsenbeginn ${z.achse} sind die Säulen ${hA} und ${hB} hoch; B wirkt ${komma(scheinbar, 0)} % höher.`, `In truth B is ${komma(echt, 1)}% higher than A (90 against 80). With the axis starting at ${z.achse} the columns are ${hA} and ${hB} high; B looks ${komma(scheinbar, 0)}% higher.`)}</p>
        <p class="heft-text">{z.achse === 0 ? L('Bei Achsenbeginn 0 stimmt der Eindruck des Bildes mit den Zahlen überein.', 'With the axis starting at 0 the impression of the picture matches the numbers.') : L(`Das Bild übertreibt den Unterschied auf das ${komma(scheinbar / echt, 1)}-Fache.`, `The picture exaggerates the difference to ${komma(scheinbar / echt, 1)} times.`)}</p>
      </section>
      <section class="vst-bild" aria-labelledby="vp-bild"><h2 id="vp-bild" class="nur-vorleser">{L('Bild', 'Picture')}</h2>
        <svg class="diagramm" viewBox="0 0 {W} {SH + SY0 + 40}" role="img" aria-label={btAchse.kurz}>
          <rect x={mx(2)} y={SY0 + SH - sy(hA)} width="110" height={sy(hA)} fill="var(--dg-a)" />
          <rect x={mx(7)} y={SY0 + SH - sy(hB)} width="110" height={sy(hB)} fill="var(--dg-b, var(--akzent))" />
          <line x1={X0} x2={W - XR} y1={SY0 + SH} y2={SY0 + SH} stroke="var(--tinte-2, #666)" />
          <text x={mx(2) + 55} y={SY0 + SH + 18} text-anchor="middle" class="klein">A: 80</text>
          <text x={mx(7) + 55} y={SY0 + SH + 18} text-anchor="middle" class="klein">B: 90</text>
          <text x={X0} y={SY0 + SH + 36} class="klein">{L(`Achse beginnt bei ${z.achse}`, `Axis starts at ${z.achse}`)}</text>
        </svg>
        <BildBeschreibung {...btAchse} />
      </section>
    {/if}
  </div>
</div>
